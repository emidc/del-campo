// Lecturas de la UI (T-0025): la lista de conversaciones y el hilo con sus marcadores. El
// estado de las entregas está en store.ts (`deliveryBacklog`).
//
// Una conversación es un participante. Su clave de agrupación es el `wa_id` o, si falta,
// el BSUID; su id es el menor id de las filas de ese grupo en `message` y en
// `unsupported_message`, que comparten secuencia (migración 0002). Así un participante
// que solo mandó tipos fuera de alcance también tiene conversación (hallazgo A1 de la
// revisión ciega). Es un id opaco y estable (los mensajes no se borran, R-23) que no
// codifica el teléfono: la URL no lleva `wa_id` ni `wamid`. Limitación aceptada en
// T-0025: si un participante pierde el teléfono a mitad de la prueba, su conversación
// aparece partida en dos.
//
// Lo que sale de acá hacia la app no lleva el `wa_id` completo: solo sus últimos 4
// dígitos.

import type { Participant } from '../domain/payload.ts'
import type { Sql } from './database.ts'

export interface ConversationRow {
  readonly id: number
  readonly profileName: string | null
  readonly waIdLast4: string | null
  /** Solo cuando falta el teléfono. */
  readonly bsuid: string | null
  readonly lastMessageAt: Date
  /** El último entrante, de texto o de un tipo fuera de alcance: los dos abren la ventana. */
  readonly lastInboundAt: Date | null
}

export const listConversations = async (sql: Sql): Promise<ConversationRow[]> => {
  const rows = await sql<(Omit<ConversationRow, 'id'> & { id: string })[]>`
    with activity as (
      select coalesce(wa_id, 'bsuid:' || bsuid) as k, id, wa_id, bsuid, profile_name,
             wa_timestamp, direction = 'inbound' as inbound
      from communication.message
      union all
      select coalesce(wa_id, 'bsuid:' || bsuid), id, wa_id, bsuid, null, wa_timestamp, true
      from communication.unsupported_message
    )
    select min(id) as id,
           (array_agg(profile_name order by wa_timestamp desc, id desc)
              filter (where profile_name is not null))[1] as "profileName",
           right(min(wa_id), 4) as "waIdLast4",
           case when min(wa_id) is null
                then (array_agg(bsuid order by id desc) filter (where bsuid is not null))[1] end as bsuid,
           max(wa_timestamp) as "lastMessageAt",
           max(wa_timestamp) filter (where inbound) as "lastInboundAt"
    from activity
    group by k
    order by max(wa_timestamp) desc, min(id) desc`
  return rows.map((r) => ({ ...r, id: Number(r.id) }))
}

export interface ConversationParticipant {
  readonly participant: Participant
  readonly profileName: string | null
}

/**
 * El participante de una conversación por su id opaco. Solo un id que sea el primero de
 * su grupo es una conversación: cualquier otro id devuelve `null`.
 */
export const conversationParticipant = async (sql: Sql, id: number): Promise<ConversationParticipant | null> => {
  if (!Number.isSafeInteger(id) || id <= 0) return null
  const [row] = await sql<{ waId: string | null; bsuid: string | null }[]>`
    with rows as (
      select id, wa_id, bsuid from communication.message
      union all
      select id, wa_id, bsuid from communication.unsupported_message
    )
    select r.wa_id as "waId", r.bsuid
    from rows r
    where r.id = ${id}
      and r.id = (select min(o.id) from rows o
                  where coalesce(o.wa_id, 'bsuid:' || o.bsuid) = coalesce(r.wa_id, 'bsuid:' || r.bsuid))`
  if (row === undefined) return null
  const participant = { waId: row.waId, bsuid: row.bsuid }
  const [name] = await sql<{ profileName: string }[]>`
    select profile_name as "profileName" from communication.message
    where profile_name is not null
      and ((${participant.waId}::text is not null and wa_id = ${participant.waId})
        or (${participant.waId}::text is null and wa_id is null and bsuid = ${participant.bsuid}))
    order by wa_timestamp desc, id desc limit 1`
  return { participant, profileName: name?.profileName ?? null }
}

/** El último entrante del participante, de cualquier tipo. */
export const lastInboundAt = async (sql: Sql, participant: Participant): Promise<Date | null> => {
  const [row] = await sql<{ at: Date | null }[]>`
    select max(wa_timestamp) as at from (
      select wa_timestamp, wa_id, bsuid from communication.message where direction = 'inbound'
      union all
      select wa_timestamp, wa_id, bsuid from communication.unsupported_message
    ) i
    where (${participant.waId}::text is not null and i.wa_id = ${participant.waId})
       or (${participant.bsuid}::text is not null and i.bsuid = ${participant.bsuid})`
  return row?.at ?? null
}

export interface UnsupportedRow {
  readonly type: string
  readonly waTimestamp: Date
}

/** Los entrantes fuera de alcance del participante: tipo y hora, sin contenido ni `wamid`. */
export const listUnsupported = async (sql: Sql, participant: Participant): Promise<UnsupportedRow[]> =>
  sql<UnsupportedRow[]>`
    select type, wa_timestamp as "waTimestamp"
    from communication.unsupported_message
    where (${participant.waId}::text is not null and wa_id = ${participant.waId})
       or (${participant.bsuid}::text is not null and bsuid = ${participant.bsuid})
    order by wa_timestamp, id`
