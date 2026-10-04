// Intentos de envío (migración 0002). La clave de idempotencia se inserta antes de
// llamar a la API (R-20); el resultado se registra después.

import { createHash } from 'node:crypto'

import type { AttemptState } from '../domain/reply.ts'
import type { Sql } from './database.ts'
import type { OutboundMessage } from './store.ts'

export const bodyDigest = (body: string): Buffer => createHash('sha256').update(body, 'utf8').digest()

export interface AttemptRow {
  readonly id: number
  readonly state: AttemptState
  readonly bodySha256: Buffer
  readonly messageId: number | null
  readonly errorCode: number | null
  readonly errorTitle: string | null
  readonly createdAt: Date
}

const ATTEMPT_COLUMNS = (sql: Sql) => sql`
  id, state, body_sha256 as "bodySha256", message_id as "messageId",
  error_code as "errorCode", error_title as "errorTitle", created_at as "createdAt"`

type RawAttempt = Omit<AttemptRow, 'id' | 'messageId'> & { id: string; messageId: string | null }
const toAttempt = (r: RawAttempt): AttemptRow => ({
  ...r,
  id: Number(r.id),
  messageId: r.messageId === null ? null : Number(r.messageId),
})

export const findAttempt = async (sql: Sql, key: string): Promise<AttemptRow | null> => {
  const [row] = await sql<RawAttempt[]>`
    select ${ATTEMPT_COLUMNS(sql)} from communication.outbound_attempt where idempotency_key = ${key}`
  return row === undefined ? null : toAttempt(row)
}

export interface NewAttempt {
  readonly key: string
  readonly phoneNumberId: string
  readonly waId: string
  readonly bsuid: string | null
  readonly body: string
}

/** Inserta el intento en `pending`. Devuelve `null` si la clave ya existía: no se envía de nuevo. */
export const insertAttempt = async (sql: Sql, a: NewAttempt): Promise<number | null> => {
  const rows = await sql<{ id: string }[]>`
    insert into communication.outbound_attempt
      (idempotency_key, phone_number_id, wa_id, bsuid, body, body_sha256)
    values (${a.key}, ${a.phoneNumberId}, ${a.waId}, ${a.bsuid}, ${a.body}, ${bodyDigest(a.body)})
    on conflict (idempotency_key) do nothing
    returning id`
  const [row] = rows
  return row === undefined ? null : Number(row.id)
}

/**
 * La API aceptó: el saliente y el cierre del intento van en una sola transacción. Si
 * falla, el intento queda `pending` y se ve como sin confirmar; no se pierde.
 */
export const settleAccepted = async (sql: Sql, attemptId: number, message: OutboundMessage): Promise<number> =>
  sql.begin(async (tx) => {
    const [row] = await tx<{ id: string }[]>`
      insert into communication.message
        (wamid, direction, phone_number_id, wa_id, bsuid, body, wa_timestamp)
      values
        (${message.wamid}, 'outbound', ${message.phoneNumberId}, ${message.recipient.waId},
         ${message.recipient.bsuid}, ${message.body}, ${message.sentAt})
      returning id`
    if (row === undefined) throw new Error('insert en message sin returning')
    const updated = await tx`
      update communication.outbound_attempt
      set state = 'accepted', wamid = ${message.wamid}, message_id = ${row.id}, body = null, settled_at = now()
      where id = ${attemptId} and state = 'pending'`
    if (updated.count !== 1) throw new Error('el intento ya no estaba pending')
    return Number(row.id)
  })

/** Cierra un intento que no se aceptó. Solo desde `pending`: un resultado no se reescribe. */
export const settleNotAccepted = async (
  sql: Sql,
  attemptId: number,
  outcome: { readonly state: 'rejected'; readonly code: number | null; readonly title: string }
    | { readonly state: 'unconfirmed'; readonly title: string; readonly wamid?: string },
): Promise<void> => {
  const code = outcome.state === 'rejected' ? outcome.code : null
  // El `wamid` de un aceptado que no se pudo persistir se conserva para reconciliar
  // (hallazgo C2 de la revisión ciega). No llega a la UI: `listOpenAttempts` no lo lee.
  const wamid = outcome.state === 'unconfirmed' ? (outcome.wamid ?? null) : null
  await sql`
    update communication.outbound_attempt
    set state = ${outcome.state}, error_code = ${code}, error_title = ${outcome.title}, wamid = ${wamid},
        settled_at = now()
    where id = ${attemptId} and state = 'pending'`
}

export interface OpenAttemptRow {
  readonly id: number
  readonly state: 'pending' | 'unconfirmed'
  /** `null` si la retención ya lo borró. */
  readonly body: string | null
  readonly errorTitle: string | null
  readonly createdAt: Date
}

/** Los intentos que pudieron haber salido sin confirmación, para el hilo del participante. */
export const listOpenAttempts = async (sql: Sql, waId: string): Promise<OpenAttemptRow[]> => {
  const rows = await sql<(Omit<OpenAttemptRow, 'id'> & { id: string })[]>`
    select id, state, body, error_title as "errorTitle", created_at as "createdAt"
    from communication.outbound_attempt
    where wa_id = ${waId} and state in ('pending', 'unconfirmed')
    order by created_at, id`
  return rows.map((r) => ({ ...r, id: Number(r.id) }))
}

/**
 * Un `pending` creado antes de `olderThan` quedó así porque el proceso cayó: se cierra
 * como `unconfirmed`, que es lo que ya mostraba el hilo. Desde ahí corre su retención;
 * sin esto, el texto de un intento caído no se borraría nunca. `settled_at` usa el mismo
 * `now` que el corte de la retención, para que no se cierre y se borre en la misma pasada.
 */
export const settleStalePendingAttempts = async (sql: Sql, olderThan: Date, now: Date): Promise<number> => {
  const result = await sql`
    update communication.outbound_attempt
    set state = 'unconfirmed', error_title = 'el proceso no registró el resultado del envío', settled_at = ${now}
    where state = 'pending' and created_at < ${olderThan}`
  return result.count
}

/**
 * Retención de intentos (D-0065, ajuste del owner en T-0025): borra el texto de los
 * `rejected` y `unconfirmed` cerrados antes de `cutoff`. La fila queda, sin contenido,
 * para que el intento sin confirmar no desaparezca del hilo.
 */
export const clearSettledAttemptBodies = async (sql: Sql, cutoff: Date): Promise<number> => {
  const result = await sql`
    update communication.outbound_attempt set body = null
    where state in ('rejected', 'unconfirmed') and settled_at < ${cutoff} and body is not null`
  return result.count
}
