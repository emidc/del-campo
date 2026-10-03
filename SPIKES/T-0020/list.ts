// Lista los mensajes en orden estable. No imprime el contenido: solo su largo.
import { connect } from './db.ts'

const sql = connect(process.env.DATABASE_URL)
try {
  const rows = await sql<{ wa_timestamp: Date; direction: string; wa_message_id: string; wa_id: string; body_length: number | null }[]>`
    select wa_timestamp, direction, wa_message_id, wa_id, length(body) as body_length
    from message
    order by wa_timestamp, wa_message_id`
  for (const r of rows) {
    const who = '…' + r.wa_id.slice(-4)
    const len = r.body_length === null ? 'sin cuerpo' : `${String(r.body_length)} car.`
    console.log(`${r.wa_timestamp.toISOString()}  ${r.direction.padEnd(8)}  ${who}  ${r.wa_message_id}  (${len})`)
  }
  console.log(`${String(rows.length)} mensajes.`)
} finally {
  await sql.end()
}
