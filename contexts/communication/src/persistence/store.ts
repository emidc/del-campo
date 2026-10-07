// Escrituras y lecturas del esquema `communication`. Idempotentes donde Meta puede
// repetir: cada mensaje se persiste una sola vez por `wamid`, y un estado solo avanza.

import { appliedCount, deliveryOutcome, type InboundText, type ParsedDelivery, type Participant, type StatusUpdate } from '../domain/payload.ts'
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
 * Cuánto espera un lock el procesamiento de una entrega. Sin tope, una transacción ajena
 * abierta con el mismo `wamid` lo traba sin límite, y en el reproceso traba también a
 * todas las entregas que siguen en el lote (revisión fría de T-0026, S-HOL). Al vencer,
 * Postgres cancela la sentencia y la entrega queda `failed`, visible y reprocesable.
 */
export const LOCK_TIMEOUT = '5s'

/** Pone el tope de `LOCK_TIMEOUT` a los locks del resto de `tx`. */
export const boundLockWaits = async (tx: TransactionSql): Promise<void> => {
  await tx.unsafe(`set local lock_timeout = '${LOCK_TIMEOUT}'`)
}

/**
 * Persiste el contenido de una entrega dentro de `tx` y registra cómo terminó, con el
 * número contra el que se filtró. Si hubo elementos descartados, la entrega queda
 * `failed` con los motivos, aunque lo válido se haya guardado: así se ve y se puede
 * reprocesar, que es idempotente. Si todo era de otro número, queda `ignored`.
 */
export const applyDelivery = async (
  tx: TransactionSql,
  delivery: Delivery,
  parsed: ParsedDelivery,
  phoneNumberFilter: string,
): Promise<void> => {
  // Los estados se aplican en orden de `wamid`: dos entregas con estados de los mismos
  // salientes toman los `for update` en el mismo orden y no se traban entre sí. El
  // resultado no cambia, porque un estado solo avanza (nota N5 de la revisión ciega).
  // Los textos NO se reordenan: su orden de inserción es el desempate del hilo para los
  // mensajes del mismo segundo, y el `wamid` no es cronológico (hallazgo 7 de T-0020).
  const statuses = [...parsed.statuses].sort((a, b) => (a.wamid < b.wamid ? -1 : a.wamid > b.wamid ? 1 : 0))
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
    set processing = ${deliveryOutcome(parsed)}, processed_at = now(), processing_error = ${error},
        applied_count = ${appliedCount(parsed)}, ignored_count = ${parsed.ignored},
        phone_number_filter = ${phoneNumberFilter}
    where id = ${delivery.id}`
}

/** `applyDelivery` en su propia transacción: todo o nada. */
export const processDelivery = async (
  sql: Sql,
  delivery: Delivery,
  parsed: ParsedDelivery,
  phoneNumberFilter: string,
): Promise<void> => {
  await sql.begin(async (tx) => {
    await boundLockWaits(tx)
    await applyDelivery(tx, delivery, parsed, phoneNumberFilter)
  })
}

/**
 * Registra que el procesamiento falló. Solo el mensaje del error: los detalles de
 * Postgres traen valores. Una entrega que otro ya procesó no vuelve a `failed`. Una
 * `ignored` sí: si su reproceso falla, queda a la vista como cualquier otra.
 */
export const markDeliveryFailed = async (sql: Sql | TransactionSql, deliveryId: number, error: unknown): Promise<void> => {
  const message = error instanceof Error ? error.message : 'error desconocido'
  await sql`
    update communication.webhook_delivery
    set processing = 'failed', processed_at = now(), processing_error = ${message}
    where id = ${deliveryId} and processing <> 'processed'`
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

export interface DeletedDeliveries {
  readonly processed: number
  /** Las `ignored` borradas: se informan aparte, porque pueden ser lo de un número mal configurado. */
  readonly ignored: number
}

/**
 * Borra las entregas crudas `processed` e `ignored` recibidas antes de `cutoff`: las dos
 * ya tienen un resultado y el crudo vive 30 días (D-0065). No toca ninguna otra tabla.
 * Las `pending` y `failed` no se borran: su cuerpo crudo es la única copia de lo que
 * todavía no llegó a `message`, y borrarlo sería perderlo en silencio (T-0026).
 */
export const deleteSettledDeliveriesReceivedBefore = async (sql: Sql, cutoff: Date): Promise<DeletedDeliveries> => {
  const rows = await sql<{ processing: string }[]>`
    delete from communication.webhook_delivery
    where received_at < ${cutoff} and processing in ('processed', 'ignored')
    returning processing`
  const ignored = rows.filter((r) => r.processing === 'ignored').length
  return { processed: rows.length - ignored, ignored }
}

/** Las entregas sin procesar que la retención conserva por estar vencidas. */
export const countUnprocessedDeliveriesReceivedBefore = async (sql: Sql, cutoff: Date): Promise<number> => {
  const [row] = await sql<{ n: number }[]>`
    select count(*)::int as n from communication.webhook_delivery
    where received_at < ${cutoff} and processing in ('pending', 'failed')`
  return row?.n ?? 0
}

/**
 * Las entregas que esperan reproceso: `failed`; `pending` recibidas antes de
 * `stalledBefore`; e `ignored` filtradas contra otro número que `phoneNumberId`, es
 * decir, antes de que se corrigiera el número configurado.
 */
export const listDeliveriesToReprocess = async (
  sql: Sql,
  stalledBefore: Date,
  phoneNumberId: string,
  limit: number,
): Promise<number[]> => {
  // Primero las que nunca se reprocesaron y después las que hace más que no: una entrega
  // que falla siempre no tapa a las demás.
  const rows = await sql<{ id: string }[]>`
    select id from communication.webhook_delivery
    where processing = 'failed' or (processing = 'pending' and received_at < ${stalledBefore})
       or (processing = 'ignored' and phone_number_filter <> ${phoneNumberId})
    order by last_reprocessed_at nulls first, id
    limit ${limit}`
  return rows.map((r) => Number(r.id))
}

export interface ClaimedDelivery extends Delivery {
  readonly bodyRaw: string
}

/**
 * Bloquea una entrega que sigue esperando reproceso y cuenta el intento. `null` si ya no
 * espera (otro la procesó) o si otro reproceso la tiene bloqueada.
 */
export const claimDeliveryForReprocess = async (
  tx: TransactionSql,
  id: number,
  stalledBefore: Date,
  phoneNumberId: string,
): Promise<ClaimedDelivery | null> => {
  const [row] = await tx<{ receivedAt: Date; bodyRaw: string }[]>`
    select received_at as "receivedAt", body_raw as "bodyRaw"
    from communication.webhook_delivery
    where id = ${id}
      and (processing = 'failed' or (processing = 'pending' and received_at < ${stalledBefore})
           or (processing = 'ignored' and phone_number_filter <> ${phoneNumberId}))
    for update skip locked`
  if (row === undefined) return null
  await tx`
    update communication.webhook_delivery
    set reprocess_count = reprocess_count + 1, last_reprocessed_at = now()
    where id = ${id}`
  return { id, receivedAt: row.receivedAt, bodyRaw: row.bodyRaw }
}

export interface DeliveryBacklog {
  /** La última entrega recibida, procesada o no. */
  readonly lastReceivedAt: Date | null
  /** El último procesamiento completo. */
  readonly lastProcessedAt: Date | null
  readonly failed: number
  /** `pending` recibidas antes de `stalledBefore`: nadie las está procesando. */
  readonly stalled: number
  /** La recepción de la entrega sin procesar más vieja, `failed` o atascada. */
  readonly oldestUnprocessedAt: Date | null
  /** `ignored` recibidas desde `ignoredSince`: todo su contenido era de otro número. */
  readonly ignored: number
}

export const deliveryBacklog = async (sql: Sql, stalledBefore: Date, ignoredSince: Date): Promise<DeliveryBacklog> => {
  const [row] = await sql<DeliveryBacklog[]>`
    select
      (select max(received_at) from communication.webhook_delivery) as "lastReceivedAt",
      (select max(processed_at) from communication.webhook_delivery where processing = 'processed') as "lastProcessedAt",
      (select count(*)::int from communication.webhook_delivery
       where processing = 'ignored' and received_at >= ${ignoredSince}) as ignored,
      count(*) filter (where processing = 'failed')::int as failed,
      count(*) filter (where processing = 'pending')::int as stalled,
      min(received_at) as "oldestUnprocessedAt"
    from communication.webhook_delivery
    where processing = 'failed' or (processing = 'pending' and received_at < ${stalledBefore})`
  if (row === undefined) throw new Error('el atraso de entregas no devolvió fila')
  return row
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
