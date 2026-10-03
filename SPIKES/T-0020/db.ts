import postgres from 'postgres'
import type { Parsed } from './parse.ts'

export const SPIKE_DB = 'delcampo_spike_t0020'
export type Sql = postgres.Sql

/** Se niega a conectarse a cualquier base que no sea la del spike. */
export function connect(databaseUrl: string | undefined): Sql {
  if (databaseUrl === undefined) throw new Error('Falta DATABASE_URL (ver .env.example).')
  const name = new URL(databaseUrl).pathname.slice(1)
  if (name !== SPIKE_DB) throw new Error(`DATABASE_URL apunta a "${name}"; el spike solo usa ${SPIKE_DB}.`)
  return postgres(databaseUrl, { max: 5, onnotice: () => undefined })
}

export async function recordDelivery(sql: Sql, bodyRaw: string, signature: 'valid' | 'unchecked'): Promise<number> {
  let body: string | null = null
  try {
    JSON.parse(bodyRaw)
    body = bodyRaw
  } catch {
    // Se guarda igual el texto crudo: la entrega existió.
  }
  const [row] = await sql<{ id: string }[]>`
    insert into webhook_delivery (signature, body_raw, body)
    values (${signature}, ${bodyRaw}, ${body}::jsonb)
    returning id`
  if (row === undefined) throw new Error('insert sin returning')
  return Number(row.id)
}

/** Persiste el contenido de una entrega. Idempotente por wamid. */
export async function processDelivery(sql: Sql, deliveryId: number, parsed: Parsed): Promise<void> {
  await sql.begin(async (tx) => {
    for (const m of parsed.messages) {
      await tx`
        insert into message (wa_message_id, direction, phone_number_id, wa_id, body, wa_timestamp, delivery_id, raw)
        values (${m.wamid}, 'inbound', ${m.phoneNumberId}, ${m.waId}, ${m.body}, ${m.waTimestamp},
                ${deliveryId}, ${JSON.stringify(m.raw)}::jsonb)
        on conflict (wa_message_id) do nothing`
    }
    for (const s of parsed.statuses) {
      await tx`
        insert into message_status (wa_message_id, status, recipient_id, wa_timestamp, delivery_id, raw)
        values (${s.wamid}, ${s.status}, ${s.recipientId}, ${s.waTimestamp}, ${deliveryId}, ${JSON.stringify(s.raw)}::jsonb)
        on conflict (wa_message_id, status) do nothing`
      // El saliente se observa solo por sus estados: el primero que llega crea la fila,
      // sin cuerpo (los statuses no lo traen).
      await tx`
        insert into message (wa_message_id, direction, phone_number_id, wa_id, body, wa_timestamp, delivery_id, raw)
        values (${s.wamid}, 'outbound', ${s.phoneNumberId}, ${s.recipientId}, null, ${s.waTimestamp},
                ${deliveryId}, ${JSON.stringify(s.raw)}::jsonb)
        on conflict (wa_message_id) do nothing`
    }
    for (const i of parsed.ignored) {
      await tx`
        insert into ignored_message (wa_message_id, type, delivery_id, raw)
        values (${i.wamid}, ${i.type}, ${deliveryId}, ${JSON.stringify(i.raw)}::jsonb)
        on conflict (wa_message_id) do nothing`
    }
    await tx`update webhook_delivery set processed_at = now(), error = null where id = ${deliveryId}`
  })
}

export async function markFailed(sql: Sql, deliveryId: number, error: unknown): Promise<void> {
  const text = error instanceof Error ? error.message : String(error)
  await sql`update webhook_delivery set error = ${text} where id = ${deliveryId}`
}
