// Escrituras y lecturas del esquema `communication`. Idempotentes donde Meta puede
// repetir: cada mensaje se persiste una sola vez por `wamid`, y un estado solo avanza.

import type { InboundText, ParsedDelivery, Participant, StatusUpdate } from '../domain/payload.ts'
import { outranks, type OutboundStatus } from '../domain/status.ts'
import type { Sql, TransactionSql } from './database.ts'

export interface Delivery {
  readonly id: number
  readonly receivedAt: Date
}

/** Guarda la entrega cruda. Se llama antes de responder 200: lo que no se guarda, se pierde. */
export const recordDelivery = async (sql: Sql, bodyRaw: string): Promise<Delivery> => {
  const [row] = await sql<{ id: string; receivedAt: Date }[]>`
    insert into communication.webhook_delivery (signature, body_raw)
    values ('valid', ${bodyRaw})
    returning id, received_at as "receivedAt"`
  if (row === undefined) throw new Error('insert en webhook_delivery sin returning')
  return { id: Number(row.id), receivedAt: row.receivedAt }
}

const insertText = async (tx: TransactionSql, m: InboundText, receivedAt: Date): Promise<void> => {
  await tx`
    insert into communication.message
      (wamid, direction, phone_number_id, wa_id, bsuid, profile_name, body, wa_timestamp, received_at)
    values
      (${m.wamid}, 'inbound', ${m.phoneNumberId}, ${m.participant.waId}, ${m.participant.bsuid},
       ${m.profileName}, ${m.body}, ${m.waTimestamp}, ${receivedAt})
    on conflict (wamid) do nothing`
}

/**
 * El último estado, por la regla de dominio y no por orden de llegada. El insert cubre
 * el primer estado de un `wamid`; si ya había uno, se bloquea la fila y se compara.
 */
const applyStatus = async (tx: TransactionSql, s: StatusUpdate): Promise<void> => {
  const inserted = await tx`
    insert into communication.outbound_status (wamid, status, status_at, error_code, error_title)
    values (${s.wamid}, ${s.status}, ${s.statusAt}, ${s.error?.code ?? null}, ${s.error?.title ?? null})
    on conflict (wamid) do nothing
    returning wamid`
  if (inserted.length > 0) return

  const [current] = await tx<{ status: OutboundStatus }[]>`
    select status from communication.outbound_status where wamid = ${s.wamid} for update`
  if (current === undefined || !outranks(s.status, current.status)) return
  await tx`
    update communication.outbound_status
    set status = ${s.status}, status_at = ${s.statusAt},
        error_code = ${s.error?.code ?? null}, error_title = ${s.error?.title ?? null},
        updated_at = now()
    where wamid = ${s.wamid}`
}

/**
 * Persiste el contenido de una entrega en una sola transacción y la marca procesada. Si
 * hubo elementos descartados, la entrega queda `failed` con los motivos, aunque lo
 * válido se haya guardado: así se ve y se puede reprocesar, que es idempotente.
 */
export const processDelivery = async (sql: Sql, delivery: Delivery, parsed: ParsedDelivery): Promise<void> => {
  // Los estados se aplican en orden de `wamid`: dos entregas con estados de los mismos
  // salientes toman los `for update` en el mismo orden y no se traban entre sí. El
  // resultado no cambia, porque un estado solo avanza (nota N5 de la revisión ciega).
  // Los textos NO se reordenan: su orden de inserción es el desempate del hilo para los
  // mensajes del mismo segundo, y el `wamid` no es cronológico (hallazgo 7 de T-0020).
  const statuses = [...parsed.statuses].sort((a, b) => (a.wamid < b.wamid ? -1 : a.wamid > b.wamid ? 1 : 0))
  await sql.begin(async (tx) => {
    for (const m of parsed.texts) await insertText(tx, m, delivery.receivedAt)
    for (const u of parsed.unsupported) {
      await tx`
        insert into communication.unsupported_message
          (wamid, type, phone_number_id, wa_id, bsuid, wa_timestamp, received_at)
        values
          (${u.wamid}, ${u.type}, ${u.phoneNumberId}, ${u.participant.waId}, ${u.participant.bsuid},
           ${u.waTimestamp}, ${delivery.receivedAt})
        on conflict (wamid) do nothing`
    }
    for (const s of statuses) await applyStatus(tx, s)

    const error = parsed.discarded.length === 0
      ? null
      : `${String(parsed.discarded.length)} elemento(s) descartado(s): ${parsed.discarded.join('; ')}`
    await tx`
      update communication.webhook_delivery
      set processing = ${error === null ? 'processed' : 'failed'}, processed_at = now(), processing_error = ${error}
      where id = ${delivery.id}`
  })
}

/** Registra que el procesamiento falló. Solo el mensaje del error: los detalles de Postgres traen valores. */
export const markDeliveryFailed = async (sql: Sql, deliveryId: number, error: unknown): Promise<void> => {
  const message = error instanceof Error ? error.message : 'error desconocido'
  await sql`
    update communication.webhook_delivery
    set processing = 'failed', processed_at = now(), processing_error = ${message}
    where id = ${deliveryId}`
}

export interface OutboundMessage {
  /** El `wamid` que devolvió la API de envío. */
  readonly wamid: string
  /** El número de Del Campo desde el que se envió. */
  readonly phoneNumberId: string
  readonly recipient: Participant
  readonly body: string
  /** Cuándo la API aceptó el envío. */
  readonly sentAt: Date
}

/** Persiste un saliente ya aceptado por la API. Un `wamid` repetido es un error, no un no-op. */
export const insertOutboundMessage = async (sql: Sql, m: OutboundMessage): Promise<number> => {
  const [row] = await sql<{ id: string }[]>`
    insert into communication.message
      (wamid, direction, phone_number_id, wa_id, bsuid, body, wa_timestamp)
    values
      (${m.wamid}, 'outbound', ${m.phoneNumberId}, ${m.recipient.waId}, ${m.recipient.bsuid},
       ${m.body}, ${m.sentAt})
    returning id`
  if (row === undefined) throw new Error('insert en message sin returning')
  return Number(row.id)
}

/** Borra las entregas crudas recibidas antes de `cutoff`. No toca ninguna otra tabla. */
export const deleteDeliveriesReceivedBefore = async (sql: Sql, cutoff: Date): Promise<number> => {
  const result = await sql`delete from communication.webhook_delivery where received_at < ${cutoff}`
  return result.count
}

export interface ThreadMessage {
  readonly id: number
  readonly wamid: string
  readonly direction: 'inbound' | 'outbound'
  readonly body: string
  readonly waTimestamp: Date
  readonly receivedAt: Date
  /** Solo en salientes; `null` mientras no llegó ningún estado. */
  readonly status: OutboundStatus | null
  readonly errorCode: number | null
  readonly errorTitle: string | null
}

/**
 * Los mensajes de un participante, en orden de WhatsApp. Los empates del mismo segundo
 * se resuelven por orden de inserción, no por `wamid` (hallazgo 7 de T-0020).
 */
export const listThread = async (sql: Sql, participant: Participant): Promise<ThreadMessage[]> => {
  if (participant.waId === null && participant.bsuid === null) return []
  const rows = await sql<(Omit<ThreadMessage, 'id'> & { id: string })[]>`
    select m.id, m.wamid, m.direction, m.body,
           m.wa_timestamp as "waTimestamp", m.received_at as "receivedAt",
           s.status, s.error_code as "errorCode", s.error_title as "errorTitle"
    from communication.message m
    left join communication.outbound_status s
      on m.direction = 'outbound' and s.wamid = m.wamid
    where (${participant.waId}::text is not null and m.wa_id = ${participant.waId})
       or (${participant.bsuid}::text is not null and m.bsuid = ${participant.bsuid})
    order by m.wa_timestamp, m.id`
  return rows.map((r) => ({ ...r, id: Number(r.id) }))
}
