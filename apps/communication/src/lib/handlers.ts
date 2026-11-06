// La lógica de los route handlers, sin Next.js, para probarla con `Request` estándar.
// Cada `route.ts` es un envoltorio de una línea sobre esto, siempre detrás de
// `withSession` salvo la entrada con Google, el logout y el webhook.

import {
  conversationList,
  conversationThread,
  sendReply,
  type ConversationList,
  type ConversationThread,
  type DeliveryHealth,
  type Phase,
  type ReplyResult,
  type Sql,
} from '@del-campo/communication'

import { actorPuede, type Datos } from './acceso.ts'
import { cookiesDeSalida } from './entrada.ts'
import { FOREIGN_ORIGIN, json, sameOrigin, type Env } from './guard.ts'
import type { SendSetup } from './server.ts'

/** Ids de conversación: enteros positivos, sin ceros a la izquierda. */
export const parseConversationId = (raw: string): number | null =>
  /^[1-9]\d{0,15}$/.test(raw) && Number.isSafeInteger(Number(raw)) ? Number(raw) : null

const iso = (d: Date | null): string | null => (d === null ? null : d.toISOString())

export const deliveriesBody = (d: DeliveryHealth) => ({
  lastDeliveryAt: iso(d.lastDeliveryAt),
  lastProcessedAt: iso(d.lastProcessedAt),
  failed: d.failed,
  stalled: d.stalled,
  oldestUnprocessedAt: iso(d.oldestUnprocessedAt),
  ignored: d.ignored,
})

export const listBody = (list: ConversationList) => ({
  deliveries: deliveriesBody(list.deliveries),
  conversations: list.conversations.map((c) => ({
    id: c.id,
    profileName: c.profileName,
    waIdLast4: c.waIdLast4,
    bsuid: c.bsuid,
    lastMessageAt: c.lastMessageAt.toISOString(),
    windowOpen: c.window.open,
  })),
})

export const threadBody = (thread: ConversationThread, canSend: boolean, mayReply = true) => ({
  id: thread.id,
  label: thread.label,
  deliveries: deliveriesBody(thread.deliveries),
  window: { open: thread.window.open, closesAt: iso(thread.window.closesAt) },
  // Sin el permiso de responder, la UI no muestra el formulario (decisión del owner, T-0035).
  mayReply,
  canReply: mayReply && thread.canReply && canSend,
  replyBlockedReason: !mayReply
    ? null
    : !thread.canReply
    ? 'El participante no tiene teléfono: Cloud API envía a un wa_id.'
    : !canSend
      ? 'El envío no está configurado en este entorno.'
      : null,
  items: thread.items.map((i) => ({ ...i, at: i.at.toISOString() })),
})

export const listConversationsResponse = async (datos: Datos): Promise<Response> =>
  json(listBody(await datos('conversacion.consultar', (sql) => conversationList(sql))))

export const threadResponse = async (datos: Datos, rawId: string, canSend: boolean): Promise<Response> => {
  const id = parseConversationId(rawId)
  if (id === null) return json({ error: 'conversación inexistente' }, 404)
  const found = await datos('conversacion.consultar', async (sql, actor) => ({
    thread: await conversationThread(sql, id),
    mayReply: actorPuede(actor, 'conversacion.responder'),
  }))
  if (found.thread === null) return json({ error: 'conversación inexistente' }, 404)
  return json(threadBody(found.thread, canSend, found.mayReply))
}

const MAX_REPLY_REQUEST_BYTES = 64 * 1024

const REPLY_STATUS: Record<ReplyResult['kind'], number> = {
  sent: 201,
  rejected: 502,
  unconfirmed: 502,
  'in-progress': 409,
  invalid: 400,
  'key-reused': 409,
  'not-found': 404,
  'no-phone': 409,
  'window-closed': 409,
}

const REPLY_MESSAGE: Record<ReplyResult['kind'], string> = {
  sent: 'Enviado.',
  rejected: 'WhatsApp rechazó el envío. No se envió nada.',
  unconfirmed: 'No se sabe si el mensaje salió. Queda en el hilo como intento sin confirmar: revisá antes de reenviar.',
  'in-progress': 'Este envío ya está en curso.',
  invalid: 'El mensaje no es válido.',
  'key-reused': 'El texto cambió respecto del intento anterior. Volvé a enviarlo.',
  'not-found': 'La conversación no existe.',
  'no-phone': 'El participante no tiene teléfono: no se puede responder desde acá.',
  'window-closed': 'La ventana de 24 h está cerrada: no se puede enviar texto libre.',
}

export interface ReplyHandlerDeps {
  /** La conexión de la app: `sendReply` la pide, pero cada fase corre por `phase`. */
  readonly sql: () => Sql
  readonly datos: Datos
  readonly setup: SendSetup | null
  readonly log?: (line: string) => void
}

export const replyResponse = async (request: Request, rawId: string, deps: ReplyHandlerDeps): Promise<Response> => {
  const id = parseConversationId(rawId)
  if (id === null) return json({ kind: 'not-found', message: REPLY_MESSAGE['not-found'] }, 404)
  if (deps.setup === null) return json({ kind: 'not-configured', message: 'El envío no está configurado.' }, 503)

  const declared = Number(request.headers.get('content-length') ?? '0')
  if (declared > MAX_REPLY_REQUEST_BYTES) return json({ kind: 'invalid', message: 'Pedido demasiado grande.' }, 413)
  let payload: unknown
  try {
    const text = await request.text()
    if (text.length > MAX_REPLY_REQUEST_BYTES) return json({ kind: 'invalid', message: 'Pedido demasiado grande.' }, 413)
    payload = JSON.parse(text)
  } catch {
    return json({ kind: 'invalid', message: REPLY_MESSAGE.invalid }, 400)
  }
  const fields = typeof payload === 'object' && payload !== null ? (payload as Record<string, unknown>) : {}
  const key = fields.idempotencyKey
  const body = fields.body
  if (typeof key !== 'string' || typeof body !== 'string') {
    return json({ kind: 'invalid', message: REPLY_MESSAGE.invalid }, 400)
  }

  // Primero, si quien pide puede responder: así un rol sin permiso recibe su explicación
  // antes de que se escriba nada. Cada fase del envío vuelve a pasar por la base, así que
  // una baja durante el envío se respeta igual (ver `sendReply`).
  const author = await deps.datos('conversacion.responder', (_sql, actor) => Promise.resolve(actor.autor))
  const phase: Phase = (op) => deps.datos('conversacion.responder', (sql) => op(sql))
  const result = await sendReply(
    {
      sql: deps.sql(),
      phase,
      author,
      send: deps.setup.send,
      phoneNumberId: deps.setup.phoneNumberId,
      ...(deps.log ? { log: deps.log } : {}),
    },
    { idempotencyKey: key, conversationId: id, body },
  )
  const detail =
    result.kind === 'rejected' ? { code: result.code, title: result.title }
      : result.kind === 'unconfirmed' ? { reason: result.reason }
        : result.kind === 'invalid' ? { reason: result.reason }
          : {}
  return json({ kind: result.kind, message: REPLY_MESSAGE[result.kind], ...detail }, REPLY_STATUS[result.kind])
}

/** Borra la cookie de sesión de Google y vuelve al login. */
export const logoutResponse = (request: Request, env: Env = process.env): Response => {
  if (!sameOrigin(request)) return FOREIGN_ORIGIN()
  const headers = new Headers({ location: new URL('/login', request.url).toString(), 'cache-control': 'no-store' })
  for (const cookie of cookiesDeSalida(env)) headers.append('set-cookie', cookie)
  return new Response(null, { status: 303, headers })
}
