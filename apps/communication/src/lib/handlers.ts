// La lógica de los route handlers, sin Next.js, para probarla con `Request` estándar.
// Cada `route.ts` es un envoltorio de una línea sobre esto, siempre detrás de
// `withSession` salvo el login, el logout y el webhook.

import {
  conversationList,
  conversationThread,
  sendReply,
  type ConversationList,
  type ConversationThread,
  type DeliveryHealth,
  type ReplyResult,
  type Sql,
} from '@del-campo/communication'

import { authConfigFromEnv, issueSession, SESSION_COOKIE, sessionCookieHeader, verifyCredentials } from './auth.ts'
import { FOREIGN_ORIGIN, json, NOT_CONFIGURED, sameOrigin, type Env } from './guard.ts'
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

export const threadBody = (thread: ConversationThread, canSend: boolean) => ({
  id: thread.id,
  label: thread.label,
  deliveries: deliveriesBody(thread.deliveries),
  window: { open: thread.window.open, closesAt: iso(thread.window.closesAt) },
  canReply: thread.canReply && canSend,
  replyBlockedReason: !thread.canReply
    ? 'El participante no tiene teléfono: Cloud API envía a un wa_id.'
    : !canSend
      ? 'El envío no está configurado en este entorno.'
      : null,
  items: thread.items.map((i) => ({ ...i, at: i.at.toISOString() })),
})

export const listConversationsResponse = async (sql: Sql): Promise<Response> =>
  json(listBody(await conversationList(sql)))

export const threadResponse = async (sql: Sql, rawId: string, canSend: boolean): Promise<Response> => {
  const id = parseConversationId(rawId)
  if (id === null) return json({ error: 'conversación inexistente' }, 404)
  const thread = await conversationThread(sql, id)
  if (thread === null) return json({ error: 'conversación inexistente' }, 404)
  return json(threadBody(thread, canSend))
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
  readonly sql: Sql
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

  const result = await sendReply(
    { sql: deps.sql, send: deps.setup.send, phoneNumberId: deps.setup.phoneNumberId, ...(deps.log ? { log: deps.log } : {}) },
    { idempotencyKey: key, conversationId: id, body },
  )
  const detail =
    result.kind === 'rejected' ? { code: result.code, title: result.title }
      : result.kind === 'unconfirmed' ? { reason: result.reason }
        : result.kind === 'invalid' ? { reason: result.reason }
          : {}
  return json({ kind: result.kind, message: REPLY_MESSAGE[result.kind], ...detail }, REPLY_STATUS[result.kind])
}

const redirectTo = (request: Request, path: string, cookie?: string): Response =>
  new Response(null, {
    status: 303,
    headers: {
      location: new URL(path, request.url).toString(),
      'cache-control': 'no-store',
      ...(cookie === undefined ? {} : { 'set-cookie': cookie }),
    },
  })

/** Formulario de login. Sin configuración, 503: no hay modo abierto. */
export const loginResponse = async (request: Request, env: Env): Promise<Response> => {
  const result = authConfigFromEnv(env)
  if (!result.ok) return NOT_CONFIGURED()
  if (!sameOrigin(request)) return FOREIGN_ORIGIN()
  let user = ''
  let password = ''
  try {
    const form = await request.formData()
    const u = form.get('user')
    const p = form.get('password')
    user = typeof u === 'string' ? u : ''
    password = typeof p === 'string' ? p : ''
  } catch {
    return redirectTo(request, '/login?error=1')
  }
  if (password.length > 1024 || !(await verifyCredentials(result.config, user, password))) {
    return redirectTo(request, '/login?error=1')
  }
  return redirectTo(request, '/', sessionCookieHeader(issueSession(result.config), request.url))
}

export const logoutResponse = (request: Request): Response => {
  if (!sameOrigin(request)) return FOREIGN_ORIGIN()
  return redirectTo(request, '/login', `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0`)
}
