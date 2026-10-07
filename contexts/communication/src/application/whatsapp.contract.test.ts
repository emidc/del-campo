// Contrato contra payloads reales de Cloud API, capturados en T-0020 y redactados (R-27):
// `fixtures/real-*.redacted.json`, copiados tal cual de SPIKES/T-0020/fixtures/. Prueban
// que el parseo y la persistencia aceptan la forma que Meta manda de verdad —con BSUID,
// `pricing` y `contacts` en los estados—, no la que uno imagina.
//
// Los dos se redactaron por separado: el `wamid.SYNTH-REDACTED-0001` de uno y del otro
// no son el mismo mensaje (SPIKES/T-0020-integracion-whatsapp.md, "Fixtures").

import assert from 'node:assert/strict'
import { after, before, beforeEach, describe, it } from 'node:test'

import { parseDelivery } from '../domain/payload.ts'
import type { Sql } from '../persistence/database.ts'
import { openTestDatabase, truncateAll } from '../persistence/testing.ts'
import { readFixture, sign, TEST_APP_SECRET, TEST_VERIFY_TOKEN, webhookPost } from './testing.ts'
import { createWebhookHandler, deliveryStore } from './webhook.ts'

const realInbound = readFixture('real-inbound.redacted.json')
const realStatus = readFixture('real-status.redacted.json')

describe('contrato: forma real de los payloads (sin base)', () => {
  it('entrante real: texto con wa_id, BSUID y nombre de perfil', () => {
    const p = parseDelivery(JSON.parse(realInbound))
    assert.deepEqual(p.texts, [{
      wamid: 'wamid.SYNTH-REDACTED-0001',
      phoneNumberId: '900000000000002',
      participant: { waId: '15550000002', bsuid: '900000000000003' },
      profileName: 'Persona Sintética 1',
      body: 'Texto sintético 1.',
      waTimestamp: new Date(1790976075 * 1000),
    }])
    assert.deepEqual([p.unsupported, p.statuses, p.discarded], [[], [], []])
  })

  it('estado real: delivered, sin error, con pricing y contacts que se ignoran', () => {
    const p = parseDelivery(JSON.parse(realStatus))
    assert.deepEqual(p.statuses, [{
      wamid: 'wamid.SYNTH-REDACTED-0001', status: 'delivered', statusAt: new Date(1790976904 * 1000), error: null,
    }])
    assert.deepEqual([p.texts, p.unsupported, p.discarded], [[], [], []])
  })
})

describe('contrato: payloads reales de punta a punta contra Postgres', () => {
  let sql: Sql
  let deliver: (body: string) => Promise<number>

  before(async () => {
    sql = await openTestDatabase()
    const handle = createWebhookHandler({
      verifyToken: TEST_VERIFY_TOKEN,
      appSecret: TEST_APP_SECRET,
      // El número de los fixtures reales redactados (T-0020).
      phoneNumberId: '900000000000002',
      store: deliveryStore(sql),
    })
    deliver = async (body) => {
      const { response, process } = await handle(webhookPost(body, sign(body)))
      await process?.()
      return response.status
    }
  })
  beforeEach(() => truncateAll(sql))
  after(() => sql.end())

  it('el entrante real se persiste con los dos identificadores y la entrega queda procesada', async () => {
    assert.equal(await deliver(realInbound), 200)
    const rows = await sql<Record<string, unknown>[]>`
      select wamid, direction, phone_number_id as "phoneNumberId", wa_id as "waId", bsuid,
             profile_name as "profileName", body, wa_timestamp as "waTimestamp"
      from communication.message`
    assert.deepEqual(rows.map((r) => ({ ...r })), [{
      wamid: 'wamid.SYNTH-REDACTED-0001', direction: 'inbound', phoneNumberId: '900000000000002',
      waId: '15550000002', bsuid: '900000000000003', profileName: 'Persona Sintética 1',
      body: 'Texto sintético 1.', waTimestamp: new Date(1790976075 * 1000),
    }])
    const [d] = await sql<{ processing: string }[]>`select processing from communication.webhook_delivery`
    assert.equal(d?.processing, 'processed')
  })

  it('el estado real de un wamid no enviado por el contexto se registra sin crear mensaje', async () => {
    assert.equal(await deliver(realStatus), 200)
    const [s] = await sql<{ status: string }[]>`
      select status from communication.outbound_status where wamid = 'wamid.SYNTH-REDACTED-0001'`
    assert.equal(s?.status, 'delivered')
    const [m] = await sql<{ n: number }[]>`select count(*)::int as n from communication.message`
    assert.equal(m?.n, 0)
  })
})
