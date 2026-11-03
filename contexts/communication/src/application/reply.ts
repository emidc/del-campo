// Responder desde el hilo (T-0025). El orden es el de R-20: la clave de idempotencia
// se persiste antes de llamar a la API, y un intento que ya existe nunca se vuelve a
// enviar. Cloud API no ofrece cómo verificar si un envío salió, así que lo que no se
// sabe queda `unconfirmed`, visible en el hilo, y lo decide el operador.

import { isIdempotencyKey, replyBodyProblem, visibleAttemptState, type AttemptState } from '../domain/reply.ts'
import { serviceWindow } from '../domain/window.ts'
import type { SendOutcome, TextSender } from '../integration/cloud-api.ts'
import {
  bodyDigest,
  findAttempt,
  insertAttempt,
  settleAccepted,
  settleNotAccepted,
  type AttemptRow,
} from '../persistence/attempts.ts'
import { conversationParticipant, lastInboundAt } from '../persistence/conversations.ts'
import { auditar } from '../persistence/acceso.ts'
import type { Conexion, Sql } from '../persistence/database.ts'
import type { Participant } from '../domain/payload.ts'
import { outboundMessageProblem } from './operations.ts'

/**
 * Corre una fase de acceso a la base. Por defecto, con `sql` tal cual, como siempre. Con
 * AUTH_MODE=oidc la app pasa una que la corre dentro de `conPrincipal`, como
 * `communication_app` y a nombre de quien responde (T-0035).
 */
export type Phase = <T>(op: (sql: Conexion) => Promise<T>) => Promise<T>

export interface ReplyDeps {
  readonly sql: Sql
  readonly phase?: Phase
  /** Quién responde (`app_user.id`). Sin él, el intento no tiene autor: la credencial compartida. */
  readonly author?: string | null
  readonly send: TextSender
  /** El número de Del Campo desde el que se envía. */
  readonly phoneNumberId: string
  readonly now?: () => Date
  /** Solo ids y estados: nada de contenido, teléfonos ni `wamid` (R-19). */
  readonly log?: (line: string) => void
}

export interface ReplyRequest {
  readonly idempotencyKey: string
  readonly conversationId: number
  readonly body: string
}

export type ReplyResult =
  | { readonly kind: 'sent'; readonly messageId: number }
  | { readonly kind: 'rejected'; readonly code: number | null; readonly title: string }
  | { readonly kind: 'unconfirmed'; readonly reason: string }
  /** Otro request con la misma clave está enviando. */
  | { readonly kind: 'in-progress' }
  | { readonly kind: 'invalid'; readonly reason: string }
  /** La misma clave con otro texto: se rechaza sin enviar. */
  | { readonly kind: 'key-reused' }
  | { readonly kind: 'not-found' }
  | { readonly kind: 'no-phone' }
  | { readonly kind: 'window-closed' }

const fromExisting = (attempt: AttemptRow, body: string, now: Date): ReplyResult => {
  if (!attempt.bodySha256.equals(bodyDigest(body))) return { kind: 'key-reused' }
  const state: AttemptState = attempt.state
  switch (state) {
    case 'accepted':
      return attempt.messageId === null
        ? { kind: 'unconfirmed', reason: 'intento aceptado sin mensaje' }
        : { kind: 'sent', messageId: attempt.messageId }
    case 'rejected':
      return { kind: 'rejected', code: attempt.errorCode, title: attempt.errorTitle ?? 'la API rechazó el envío' }
    case 'unconfirmed':
      return { kind: 'unconfirmed', reason: attempt.errorTitle ?? 'no se sabe si el mensaje salió' }
    case 'pending':
      // Un pending viejo es un proceso que cayó: el hilo ya lo muestra sin confirmar, y
      // la respuesta tiene que decir lo mismo, no "en curso" para siempre (hallazgo C1
      // de la revisión ciega). Tampoco se reenvía: pudo haber salido.
      return visibleAttemptState('pending', attempt.createdAt, now) === 'sending'
        ? { kind: 'in-progress' }
        : { kind: 'unconfirmed', reason: 'el proceso no registró el resultado del envío' }
  }
}

/** Resultado de la primera fase: o ya hay respuesta, o hay un intento nuevo que enviar. */
type Prepared =
  | { readonly kind: 'done'; readonly result: ReplyResult }
  | { readonly kind: 'send'; readonly attemptId: number; readonly participant: Participant & { readonly waId: string } }

const prepare = async (
  sql: Conexion,
  deps: ReplyDeps,
  request: ReplyRequest,
  now: () => Date,
): Promise<Prepared> => {
  const { idempotencyKey: key, body } = request
  const done = (result: ReplyResult): Prepared => ({ kind: 'done', result })

  // Primero la clave: la repetición de un intento devuelve su resultado aunque la
  // ventana se haya cerrado después.
  const existing = await findAttempt(sql, key)
  if (existing !== null) return done(fromExisting(existing, body, now()))

  const found = await conversationParticipant(sql, request.conversationId)
  if (found === null) return done({ kind: 'not-found' })
  const { participant } = found
  if (participant.waId === null) return done({ kind: 'no-phone' })
  // El servidor decide la ventana, aunque la petición no venga del botón.
  if (!serviceWindow(await lastInboundAt(sql, participant), now()).open) return done({ kind: 'window-closed' })

  const attemptId = await insertAttempt(sql, {
    key,
    phoneNumberId: deps.phoneNumberId,
    waId: participant.waId,
    bsuid: participant.bsuid,
    body,
    createdBy: deps.author ?? null,
  })
  if (attemptId === null) {
    // Otro request con la misma clave ganó la inserción entre la lectura y acá.
    const winner = await findAttempt(sql, key)
    return done(winner === null ? { kind: 'in-progress' } : fromExisting(winner, body, now()))
  }
  return { kind: 'send', attemptId, participant: { ...participant, waId: participant.waId } }
}

/** Un envío desde la UI es un cambio de estado: queda en la auditoría, sin texto ni teléfono. */
const auditReply = async (sql: Conexion, deps: ReplyDeps, attemptId: number, result: ReplyResult): Promise<void> => {
  if (deps.author === undefined || deps.author === null) return
  await auditar(sql, {
    actor: deps.author,
    origen: 'app',
    accion: 'conversacion.responder',
    tipoObjeto: 'outbound_attempt',
    idObjeto: String(attemptId),
    resultado: result.kind === 'sent' ? 'ok' : 'error',
    motivo: result.kind === 'sent' ? null : result.kind === 'rejected' ? 'RECHAZADO' : 'SIN_CONFIRMAR',
  })
}

export const sendReply = async (deps: ReplyDeps, request: ReplyRequest): Promise<ReplyResult> => {
  const now = deps.now ?? (() => new Date())
  const log = deps.log ?? (() => undefined)
  const phase: Phase = deps.phase ?? ((op) => op(deps.sql))
  const { idempotencyKey: key, body } = request

  if (!isIdempotencyKey(key)) return { kind: 'invalid', reason: 'la clave de idempotencia no es válida' }
  const bodyProblem = replyBodyProblem(body)
  if (bodyProblem !== null) return { kind: 'invalid', reason: bodyProblem }

  // Fase 1: la clave queda persistida antes de llamar a la API (R-20). Con AUTH_MODE=oidc,
  // corre en su propia transacción restringida, que termina antes de la llamada: la red
  // nunca corre dentro de una transacción.
  const prepared = await phase((sql) => prepare(sql, deps, request, now))
  if (prepared.kind === 'done') return prepared.result
  const { attemptId, participant } = prepared

  let outcome: SendOutcome
  try {
    outcome = await deps.send(participant.waId, body)
  } catch {
    outcome = { kind: 'unconfirmed', reason: 'error inesperado al llamar a la API' }
  }

  // Fase 2: el resultado. Si la persona fue dada de baja mientras se enviaba, esta fase no
  // corre y el intento queda `pending`, que el hilo muestra como sin confirmar: no se
  // pierde ni se registra a nombre de quien ya no tiene acceso.
  if (outcome.kind === 'rejected') {
    const result: ReplyResult = outcome
    await phase(async (sql) => {
      await settleNotAccepted(sql, attemptId, { state: 'rejected', code: outcome.code, title: outcome.title })
      await auditReply(sql, deps, attemptId, result)
    })
    log(`intento ${String(attemptId)}: rechazado por la API (código ${String(outcome.code)})`)
    return result
  }
  if (outcome.kind === 'unconfirmed') {
    const result: ReplyResult = outcome
    await phase(async (sql) => {
      await settleNotAccepted(sql, attemptId, { state: 'unconfirmed', title: outcome.reason })
      await auditReply(sql, deps, attemptId, result)
    })
    log(`intento ${String(attemptId)}: sin confirmar`)
    return result
  }

  const message = {
    wamid: outcome.wamid,
    phoneNumberId: deps.phoneNumberId,
    recipient: participant,
    body,
    sentAt: now(),
  }
  const problem = outboundMessageProblem(message)
  try {
    if (problem !== null) throw new Error(problem)
    const messageId = await phase(async (sql) => {
      const id = await settleAccepted(sql, attemptId, message)
      await auditReply(sql, deps, attemptId, { kind: 'sent', messageId: id })
      return id
    })
    log(`intento ${String(attemptId)}: aceptado, mensaje ${String(messageId)}`)
    return { kind: 'sent', messageId }
  } catch {
    // La API aceptó y no se pudo persistir: pudo haber salido. Si tampoco esto se
    // puede escribir, el intento queda `pending` y el hilo lo muestra igual.
    const reason = 'la API aceptó el envío pero no se pudo registrar'
    const result: ReplyResult = { kind: 'unconfirmed', reason }
    await phase(async (sql) => {
      await settleNotAccepted(sql, attemptId, { state: 'unconfirmed', title: reason, wamid: outcome.wamid })
      await auditReply(sql, deps, attemptId, result)
    }).catch(() => undefined)
    log(`intento ${String(attemptId)}: aceptado sin persistir`)
    return result
  }
}
