import assert from 'node:assert/strict'
import { after, before, beforeEach, describe, it } from 'node:test'

import type { Sql } from '../persistence/database.ts'
import { openTestDatabase, truncateAll } from '../persistence/testing.ts'
import { recordDelivery } from '../persistence/store.ts'
import { applyRetention, purgeExpiredDeliveries } from './operations.ts'
import { reprocessDeliveries } from './reprocess.ts'
import { readFixture, sign, statusPayload, TEST_APP_SECRET, TEST_PHONE_NUMBER_ID, TEST_VERIFY_TOKEN, textPayload, webhookPost } from './testing.ts'
import { createWebhookHandler, deliveryStore } from './webhook.ts'

let sql: Sql
let deliver: (body: string) => Promise<void>

before(async () => {
  sql = await openTestDatabase()
  const handle = createWebhookHandler({
    verifyToken: TEST_VERIFY_TOKEN,
    appSecret: TEST_APP_SECRET,
    phoneNumberId: TEST_PHONE_NUMBER_ID,
    store: deliveryStore(sql),
  })
  deliver = async (body) => {
    const { process } = await handle(webhookPost(body, sign(body)))
    await process?.()
  }
})
beforeEach(() => truncateAll(sql))
after(() => sql.end())

const count = async (table: string): Promise<number> => {
  const [row] = await sql.unsafe<{ n: number }[]>(`select count(*)::int as n from communication.${table}`)
  return row?.n ?? -1
}

describe('retención de entregas crudas (D-0065)', () => {
  it('borra las de más de 30 días y no toca mensajes, estados ni tipos fuera de alcance', async () => {
    await deliver(textPayload({ wamid: 'wamid.SYNTH-R-VIEJO', timestamp: 1790000000 }))
    await deliver(statusPayload({ wamid: 'wamid.SYNTH-R-OUT', status: 'read', timestamp: 1790000000 }))
    await deliver(readFixture('inbound-image.json'))
    await deliver(textPayload({ wamid: 'wamid.SYNTH-R-NUEVO', timestamp: 1790000100 }))
    await sql`
      update communication.webhook_delivery set received_at = now() - interval '31 days'
      where id in (select id from communication.webhook_delivery order by id limit 3)`

    assert.equal(await purgeExpiredDeliveries(sql), 3)
    assert.equal(await count('webhook_delivery'), 1)
    assert.equal(await count('message'), 2)
    assert.equal(await count('outbound_status'), 1)
    assert.equal(await count('unsupported_message'), 1)
  })

  it('el corte es estricto: una entrega de exactamente 30 días se conserva', async () => {
    await deliver(textPayload({ wamid: 'wamid.SYNTH-R-BORDE', timestamp: 1790000000 }))
    const now = new Date('2026-11-01T00:00:00Z')
    await sql`update communication.webhook_delivery set received_at = ${new Date('2026-10-02T00:00:00Z')}`
    assert.equal(await purgeExpiredDeliveries(sql, now), 0)
    await sql`update communication.webhook_delivery set received_at = ${new Date('2026-10-01T23:59:59Z')}`
    assert.equal(await purgeExpiredDeliveries(sql, now), 1)
  })

  it('no borra las failed ni las pending vencidas: son la única copia de lo no recuperado (T-0026)', async () => {
    await deliver('no es json')
    await recordDelivery(sql, textPayload({ wamid: 'wamid.SYNTH-R-PEND', timestamp: 1790000000 }))
    await deliver(textPayload({ wamid: 'wamid.SYNTH-R-OK', timestamp: 1790000000 }))
    await sql`update communication.webhook_delivery set received_at = now() - interval '31 days'`

    assert.equal(await purgeExpiredDeliveries(sql), 1)
    const left = await sql<{ processing: string }[]>`select processing from communication.webhook_delivery order by id`
    assert.deepEqual(left.map((r) => r.processing), ['failed', 'pending'])
    const result = await applyRetention(sql)
    assert.deepEqual([result.deliveries, result.unprocessedKept], [0, 2])
  })

  it('una vez reprocesada, la vencida entra en la retención y su mensaje queda', async () => {
    await recordDelivery(sql, textPayload({ wamid: 'wamid.SYNTH-R-TARDE', timestamp: 1790000000 }))
    await sql`update communication.webhook_delivery set received_at = now() - interval '31 days'`
    assert.equal(await purgeExpiredDeliveries(sql), 0)

    assert.equal((await reprocessDeliveries(sql, { phoneNumberId: TEST_PHONE_NUMBER_ID })).processed, 1)
    assert.equal(await purgeExpiredDeliveries(sql), 1)
    assert.equal(await count('webhook_delivery'), 0)
    assert.equal(await count('message'), 1)
  })
})
