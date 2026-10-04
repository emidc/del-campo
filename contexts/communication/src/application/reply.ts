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
import type { Sql } from '../persistence/database.ts'
import { outboundMessageProblem } from './operations.ts'

export interface ReplyDeps {
  readonly sql: Sql
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

export const sendReply = async (deps: ReplyDeps, request: ReplyRequest): Promise<ReplyResult> => {
  const now = deps.now ?? (() => new Date())
  const log = deps.log ?? (() => undefined)
  const { idempotencyKey: key, body } = request

  if (!isIdempotencyKey(key)) return { kind: 'invalid', reason: 'la clave de idempotencia no es válida' }
  const bodyProblem = replyBodyProblem(body)
  if (bodyProblem !== null) return { kind: 'invalid', reason: bodyProblem }

  // Primero la clave: la repetición de un intento devuelve su resultado aunque la
  // ventana se haya cerrado después.
  const existing = await findAttempt(deps.sql, key)
  if (existing !== null) return fromExisting(existing, body, now())

  const found = await conversationParticipant(deps.sql, request.conversationId)
  if (found === null) return { kind: 'not-found' }
  const { participant } = found
  if (participant.waId === null) return { kind: 'no-phone' }
  // El servidor decide la ventana, aunque la petición no venga del botón.
  if (!serviceWindow(await lastInboundAt(deps.sql, participant), now()).open) return { kind: 'window-closed' }

  const attemptId = await insertAttempt(deps.sql, {
    key,
    phoneNumberId: deps.phoneNumberId,
    waId: participant.waId,
    bsuid: participant.bsuid,
    body,
  })
  if (attemptId === null) {
    // Otro request con la misma clave ganó la inserción entre la lectura y acá.
    const winner = await findAttempt(deps.sql, key)
    return winner === null ? { kind: 'in-progress' } : fromExisting(winner, body, now())
  }

  let outcome: SendOutcome
  try {
    outcome = await deps.send(participant.waId, body)
  } catch {
    outcome = { kind: 'unconfirmed', reason: 'error inesperado al llamar a la API' }
  }

  if (outcome.kind === 'rejected') {
    await settleNotAccepted(deps.sql, attemptId, { state: 'rejected', code: outcome.code, title: outcome.title })
    log(`intento ${String(attemptId)}: rechazado por la API (código ${String(outcome.code)})`)
    return outcome
  }
  if (outcome.kind === 'unconfirmed') {
    await settleNotAccepted(deps.sql, attemptId, { state: 'unconfirmed', title: outcome.reason })
    log(`intento ${String(attemptId)}: sin confirmar`)
    return outcome
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
    const messageId = await settleAccepted(deps.sql, attemptId, message)
    log(`intento ${String(attemptId)}: aceptado, mensaje ${String(messageId)}`)
    return { kind: 'sent', messageId }
  } catch {
    // La API aceptó y no se pudo persistir: pudo haber salido. Si tampoco esto se
    // puede escribir, el intento queda `pending` y el hilo lo muestra igual.
    const reason = 'la API aceptó el envío pero no se pudo registrar'
    await settleNotAccepted(deps.sql, attemptId, { state: 'unconfirmed', title: reason, wamid: outcome.wamid }).catch(
      () => undefined,
    )
    log(`intento ${String(attemptId)}: aceptado sin persistir`)
    return { kind: 'unconfirmed', reason }
  }
}
