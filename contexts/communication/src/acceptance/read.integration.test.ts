import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { before, after, beforeEach, it } from 'node:test'
import { openTestDatabase, truncateAll } from '../persistence/testing.ts'
import type { Sql } from '../persistence/database.ts'
import { createWebhookHandler, deliveryStore } from '../application/webhook.ts'
import { reprocessDeliveries } from '../application/reprocess.ts'
import { TEST_APP_SECRET, TEST_VERIFY_TOKEN, TEST_PHONE_NUMBER_ID, textPayload, webhookPost } from '../application/testing.ts'
import { readReport } from './read.ts'
import type { Manifest } from './manifest.ts'
let sql: Sql
const runSql = async (file: string) => {
  const conn = await sql.reserve()
  try { await conn.unsafe(readFileSync(new URL(`../../acceptance/${file}`, import.meta.url), 'utf8')).simple() }
  finally { conn.release() }
}
before(async () => { sql = await openTestDatabase() })
beforeEach(async () => { await runSql('restore.sql'); await truncateAll(sql) })
after(async () => { await runSql('restore.sql'); await sql.end() })
const insert = async (code: string, waId: string, direction = 'inbound', time = '2026-10-10T00:01:00Z', number = TEST_PHONE_NUMBER_ID) => {
  const [r] = await sql<{ id: string }[]>`insert into communication.message
    (wamid, direction, phone_number_id, wa_id, body, wa_timestamp, received_at)
    values (${code + waId + number}, ${direction}, ${number}, ${waId}, ${code + ' texto privado'}, ${time}, ${time}::timestamptz + interval '1 second') returning id`
  assert.ok(r); return Number(r.id)
}
it('consulta saneada: aísla número, participante, orden, ventana y textos privados', async () => {
  const p1 = await insert('CO01-P1-101', '15550001'), p2 = await insert('CO01-P2-101', '15550002')
  await insert('CO01-P1-102', '15550001', 'outbound', '2026-10-10T00:02:00Z')
  await insert('CO01-P1-103', '15550001', 'outbound', '2026-10-11T00:01:00Z') // borde cerrado
  await insert('CO01-P1-101', '15550001', 'inbound', '2026-10-10T00:01:00Z', '800000000009999')
  const m: Manifest = { start: '2026-10-10T00:00:00Z', end: '2026-10-13T00:00:00Z', phoneNumberId: TEST_PHONE_NUMBER_ID,
    participants: { P1: p1, P2: p2 }, deployedAndSubscribed: false, outage: null,
    messages: ['CO01-P1-101', 'CO01-P2-101', 'CO01-P1-102', 'CO01-P1-103'].map((marker, i) => ({
      marker, direction: i < 2 ? 'inbound' : 'outbound', sentAt: '2026-10-10T00:01:00Z', phoneOrder: i + 1,
      seenInUi: true, seenOnPhone: true, fromUi: i >= 2, observedStatus: null })) }
  const report = await readReport(sql, m)
  assert.equal(report.measurements.persisted, 4)
  assert.deepEqual(report.findings.repeated, [])
  assert.deepEqual(report.findings.closedWindow, ['CO01-P1-103'])
  assert.equal(report.criteria.replies, false) // no accepted attempt: no afirmar origen UI
  for (const secret of ['15550001', '15550002', 'texto privado', TEST_PHONE_NUMBER_ID]) assert.ok(!JSON.stringify(report).includes(secret))
  await assert.rejects(readReport(sql, { ...m, participants: { P1: 999999, P2: p2 } }), /CO01_PARTICIPANTS_INVALID/)
})
it('ensaya el SQL de fallo, restauración y reproceso dos veces sin duplicación', async () => {
  const handle = createWebhookHandler({ appSecret: TEST_APP_SECRET, verifyToken: TEST_VERIFY_TOKEN, phoneNumberId: TEST_PHONE_NUMBER_ID, store: deliveryStore(sql) })
  const body = textPayload({ wamid: 'wamid.SYNTHETIC-CO01', timestamp: Math.floor(Date.now() / 1000), body: 'CO01-P1-901' })
  await runSql('fail-one.sql')
  const received = await handle(webhookPost(body))
  assert.equal(received.response.status, 200)
  await received.process?.()
  const [failed] = await sql`select processing from communication.webhook_delivery`
  assert.equal(failed?.processing, 'failed')
  assert.equal((await sql`select id from communication.message`).length, 0)
  await runSql('restore.sql')
  const first = await reprocessDeliveries(sql, { phoneNumberId: TEST_PHONE_NUMBER_ID })
  assert.equal(first.processed, 1)
  const second = await reprocessDeliveries(sql, { phoneNumberId: TEST_PHONE_NUMBER_ID })
  assert.equal(second.processed, 0)
  const retry = await handle(webhookPost(body)); await retry.process?.()
  assert.equal((await sql`select id from communication.message`).length, 1)
})
