// Reenvía dos veces el mismo payload sintético al servidor local, firmado como Meta, y
// verifica: una fila en `message`, dos en `webhook_delivery`. Usa un wamid nuevo por
// corrida para poder repetirse sobre la misma base.
import { readFileSync } from 'node:fs'
import { connect } from './db.ts'
import { sign } from './server.ts'

const env = process.env
const port = Number(env.PORT ?? 8787)
const secret = env.WHATSAPP_APP_SECRET || undefined
const wamid = `wamid.SYNTH-REPLAY-${String(Date.now())}`

const fixture = readFileSync(new URL('fixtures/inbound-text.json', import.meta.url), 'utf8')
const body = fixture.replace('wamid.SYNTH-INBOUND-0001', wamid)

for (const intento of [1, 2]) {
  const headers: Record<string, string> = { 'content-type': 'application/json' }
  if (secret !== undefined) headers['x-hub-signature-256'] = sign(body, secret)
  const res = await fetch(`http://localhost:${String(port)}/webhook`, { method: 'POST', headers, body })
  console.log(`envío ${String(intento)}: HTTP ${String(res.status)}`)
  if (res.status !== 200) process.exit(1)
}

const sql = connect(env.DATABASE_URL)
try {
  let deliveries = 0
  for (let i = 0; i < 50; i++) {
    const [row] = await sql<{ n: number }[]>`select count(*)::int as n from webhook_delivery where processed_at is not null and body_raw like ${`%${wamid}%`}`
    deliveries = row?.n ?? 0
    if (deliveries >= 2) break
    await new Promise((r) => setTimeout(r, 100))
  }
  const [msg] = await sql<{ n: number }[]>`select count(*)::int as n from message where wa_message_id = ${wamid}`
  const messages = msg?.n ?? 0
  console.log(`${wamid}: webhook_delivery=${String(deliveries)} message=${String(messages)}`)
  const ok = deliveries === 2 && messages === 1
  console.log(ok ? 'OK: dos entregas, una sola fila.' : 'FALLA: se esperaba webhook_delivery=2 y message=1.')
  process.exitCode = ok ? 0 : 1
} finally {
  await sql.end()
}
