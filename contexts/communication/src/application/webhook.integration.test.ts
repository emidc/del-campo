// Integración contra el Postgres local (R-26), en delcampo_communication_test. Sin skip:
// si no hay Postgres, esta suite falla, que es lo que R-26 pide que se declare.

import assert from 'node:assert/strict'
import { after, before, beforeEach, describe, it } from 'node:test'

import type { Sql } from '../persistence/database.ts'
import { openTestDatabase, truncateAll } from '../persistence/testing.ts'
import { listThread } from '../persistence/store.ts'
import { recordOutboundMessage } from './operations.ts'
import {
  readFixture,
  sign,
  statusPayload,
  TEST_APP_SECRET,
  TEST_VERIFY_TOKEN,
  textPayload,
  webhookPost,
} from './testing.ts'
import { createWebhookHandler, deliveryStore } from './webhook.ts'

let sql: Sql
let deliver: (body: string, signature?: string | null) => Promise<number>

before(async () => {
  sql = await openTestDatabase()
  const handle = createWebhookHandler({ verifyToken: TEST_VERIFY_TOKEN, appSecret: TEST_APP_SECRET, store: deliveryStore(sql) })
  deliver = async (body, signature = sign(body)) => {
    const { response, process } = await handle(webhookPost(body, signature))
    await process?.()
    return response.status
  }
})
beforeEach(() => truncateAll(sql))
after(() => sql.end())

const count = async (table: string): Promise<number> => {
  const [row] = await sql.unsafe<{ n: number }[]>(`select count(*)::int as n from communication.${table}`)
  return row?.n ?? -1
}

const statusOf = async (wamid: string) => {
  const [row] = await sql<{ status: string; errorCode: number | null; errorTitle: string | null }[]>`
    select status, error_code as "errorCode", error_title as "errorTitle"
    from communication.outbound_status where wamid = ${wamid}`
  return row
}

const PARTICIPANT = { waId: '15550199001', bsuid: null }
const NUMBER = '800000000000001'

describe('idempotencia', () => {
  it('el mismo payload dos veces deja una sola fila de mensaje y dos entregas', async () => {
    const body = readFixture('inbound-text.json')
    assert.equal(await deliver(body), 200)
    assert.equal(await deliver(body), 200)
    assert.equal(await count('message'), 1)
    assert.equal(await count('webhook_delivery'), 2)
    const rows = await sql<{ processing: string }[]>`select processing from communication.webhook_delivery order by id`
    assert.deepEqual(rows.map((r) => r.processing), ['processed', 'processed'])
  })

  it('el mensaje guarda el received_at de la primera entrega, no el del reintento', async () => {
    const body = textPayload({ wamid: 'wamid.SYNTH-IDEM-1', timestamp: 1790000000 })
    await deliver(body)
    await deliver(body)
    const deliveries = await sql<{ t: Date }[]>`select received_at as t from communication.webhook_delivery order by id`
    const [message] = await sql<{ t: Date }[]>`select received_at as t from communication.message`
    assert.equal(deliveries.length, 2)
    assert.notDeepEqual(deliveries[0]?.t, deliveries[1]?.t)
    assert.deepEqual(message?.t, deliveries[0]?.t)
  })

  it('un tipo fuera de alcance repetido se registra una sola vez y no crea mensaje', async () => {
    const body = readFixture('inbound-image.json')
    await deliver(body)
    await deliver(body)
    assert.equal(await count('unsupported_message'), 1)
    assert.equal(await count('message'), 0)
  })
})

describe('firma', () => {
  it('un POST sin firma o con firma inválida devuelve 401 y no persiste nada', async () => {
    const body = readFixture('inbound-text.json')
    assert.equal(await deliver(body, null), 401)
    assert.equal(await deliver(body, sign(body, 'otra-clave')), 401)
    assert.equal(await deliver(body, sign(body + ' ')), 401)
    for (const table of ['webhook_delivery', 'message', 'outbound_status', 'unsupported_message']) {
      assert.equal(await count(table), 0, table)
    }
  })
})

describe('orden del hilo', () => {
  it('ordena por timestamp de WhatsApp aunque lleguen desordenados, y desempata por llegada', async () => {
    await deliver(textPayload({ wamid: 'wamid.SYNTH-O-3', timestamp: 1790000300 }))
    await deliver(textPayload({ wamid: 'wamid.SYNTH-O-1', timestamp: 1790000100 }))
    await recordOutboundMessage(sql, {
      wamid: 'wamid.SYNTH-O-OUT', phoneNumberId: NUMBER, recipient: PARTICIPANT,
      body: 'respuesta', sentAt: new Date(1790000150 * 1000),
    })
    // Dos en el mismo segundo: el wamid "Z" llega antes que el "A" y tiene que quedar antes.
    await deliver(textPayload({ wamid: 'wamid.SYNTH-O-2Z', timestamp: 1790000200 }))
    await deliver(textPayload({ wamid: 'wamid.SYNTH-O-2A', timestamp: 1790000200 }))

    const thread = await listThread(sql, PARTICIPANT)
    assert.deepEqual(thread.map((m) => m.wamid),
      ['wamid.SYNTH-O-1', 'wamid.SYNTH-O-OUT', 'wamid.SYNTH-O-2Z', 'wamid.SYNTH-O-2A', 'wamid.SYNTH-O-3'])
    assert.deepEqual(thread.map((m) => m.direction), ['inbound', 'outbound', 'inbound', 'inbound', 'inbound'])
  })

  it('dos mensajes del mismo segundo en una sola entrega quedan en el orden en que vinieron', async () => {
    await deliver(textPayload(
      { wamid: 'wamid.SYNTH-MISMA-Z', timestamp: 1790000200 },
      { wamid: 'wamid.SYNTH-MISMA-A', timestamp: 1790000200 },
    ))
    assert.deepEqual((await listThread(sql, PARTICIPANT)).map((m) => m.wamid), ['wamid.SYNTH-MISMA-Z', 'wamid.SYNTH-MISMA-A'])
  })

  it('un participante solo con BSUID se persiste y se lista por BSUID', async () => {
    await deliver(textPayload({ wamid: 'wamid.SYNTH-BSUID', timestamp: 1790000000, waId: null, bsuid: 'AR.SYNTH-BSUID-1' }))
    const thread = await listThread(sql, { waId: null, bsuid: 'AR.SYNTH-BSUID-1' })
    assert.deepEqual(thread.map((m) => m.wamid), ['wamid.SYNTH-BSUID'])
    const [row] = await sql<{ waId: string | null }[]>`select wa_id as "waId" from communication.message`
    assert.equal(row?.waId, null)
  })

  it('el hilo de un participante no trae los de otro', async () => {
    await deliver(textPayload({ wamid: 'wamid.SYNTH-P1', timestamp: 1790000000, waId: '15550199001' }))
    await deliver(textPayload({ wamid: 'wamid.SYNTH-P2', timestamp: 1790000000, waId: '15550199002' }))
    assert.deepEqual((await listThread(sql, PARTICIPANT)).map((m) => m.wamid), ['wamid.SYNTH-P1'])
  })
})

describe('estados de salientes', () => {
  const OUT = 'wamid.SYNTH-OUT-1'
  const outbound = () => recordOutboundMessage(sql, {
    wamid: OUT, phoneNumberId: NUMBER, recipient: PARTICIPANT, body: 'saliente', sentAt: new Date(1790000000 * 1000),
  })

  it('un read seguido de un delivered tardío deja el saliente en read', async () => {
    await outbound()
    await deliver(statusPayload({ wamid: OUT, status: 'read', timestamp: 1790000020 }))
    await deliver(statusPayload({ wamid: OUT, status: 'delivered', timestamp: 1790000010 }))
    await deliver(statusPayload({ wamid: OUT, status: 'sent', timestamp: 1790000005 }))
    assert.equal((await statusOf(OUT))?.status, 'read')
    assert.equal((await listThread(sql, PARTICIPANT))[0]?.status, 'read')
  })

  it('read sin delivered previo se acepta', async () => {
    await outbound()
    await deliver(statusPayload({ wamid: OUT, status: 'sent', timestamp: 1790000005 }))
    await deliver(statusPayload({ wamid: OUT, status: 'read', timestamp: 1790000020 }))
    assert.equal((await statusOf(OUT))?.status, 'read')
  })

  it('varios estados del mismo wamid en una sola entrega, desordenados', async () => {
    await outbound()
    await deliver(statusPayload(
      { wamid: OUT, status: 'delivered', timestamp: 1790000010 },
      { wamid: OUT, status: 'sent', timestamp: 1790000005 },
    ))
    assert.equal((await statusOf(OUT))?.status, 'delivered')
  })

  it('failed queda registrado con su error y no lo pisa un estado tardío', async () => {
    await outbound()
    await deliver(statusPayload({ wamid: OUT, status: 'sent', timestamp: 1790000005 }))
    await deliver(statusPayload({ wamid: OUT, status: 'failed', timestamp: 1790000010, error: { code: 131026, title: 'Message undeliverable' } }))
    await deliver(statusPayload({ wamid: OUT, status: 'delivered', timestamp: 1790000008 }))
    assert.deepEqual(await statusOf(OUT), { status: 'failed', errorCode: 131026, errorTitle: 'Message undeliverable' })
    const [m] = await listThread(sql, PARTICIPANT)
    assert.deepEqual([m?.status, m?.errorCode], ['failed', 131026])
  })

  it('el estado de un wamid que el contexto no envió se registra sin crear un mensaje', async () => {
    await deliver(statusPayload({ wamid: 'wamid.SYNTH-PLANTILLA', status: 'delivered', timestamp: 1790000010 }))
    assert.equal((await statusOf('wamid.SYNTH-PLANTILLA'))?.status, 'delivered')
    assert.equal(await count('message'), 0)
  })

  it('un sent que llega antes de persistir el saliente se ve al persistirlo', async () => {
    await deliver(statusPayload({ wamid: OUT, status: 'sent', timestamp: 1790000001 }))
    await outbound()
    assert.equal((await listThread(sql, PARTICIPANT))[0]?.status, 'sent')
  })

  it('el mismo estado repetido no cambia nada', async () => {
    await outbound()
    const body = statusPayload({ wamid: OUT, status: 'delivered', timestamp: 1790000010 })
    await deliver(body)
    await deliver(body)
    assert.equal(await count('outbound_status'), 1)
    assert.equal(await count('webhook_delivery'), 2)
  })
})

describe('saliente', () => {
  it('guarda texto, destinatario y wamid; un wamid repetido falla', async () => {
    const message = {
      wamid: 'wamid.SYNTH-OUT-2', phoneNumberId: NUMBER, recipient: PARTICIPANT, body: 'hola', sentAt: new Date(1790000000 * 1000),
    }
    await recordOutboundMessage(sql, message)
    const [row] = await sql<{ direction: string; waId: string; body: string; profileName: string | null }[]>`
      select direction, wa_id as "waId", body, profile_name as "profileName" from communication.message`
    assert.deepEqual(row, { direction: 'outbound', waId: '15550199001', body: 'hola', profileName: null })
    await assert.rejects(recordOutboundMessage(sql, message), /duplicate key|unique/)
  })

  it('rechaza un saliente sin wamid, sin cuerpo o sin destinatario', async () => {
    const base = { wamid: 'w', phoneNumberId: NUMBER, recipient: PARTICIPANT, body: 'b', sentAt: new Date() }
    await assert.rejects(recordOutboundMessage(sql, { ...base, wamid: '' }), /wamid/)
    await assert.rejects(recordOutboundMessage(sql, { ...base, body: '' }), /vacío/)
    await assert.rejects(recordOutboundMessage(sql, { ...base, recipient: { waId: null, bsuid: null } }), /destinatario/)
    assert.equal(await count('message'), 0)
  })
})

describe('procesamiento parcial', () => {
  it('guarda lo válido y deja la entrega fallida con los motivos de lo descartado', async () => {
    const body = statusPayload(
      { wamid: 'wamid.SYNTH-OK', status: 'delivered', timestamp: 1790000010 },
      { wamid: 'wamid.SYNTH-RARO', status: 'deleted', timestamp: 1790000010 },
    )
    assert.equal(await deliver(body), 200)
    assert.equal((await statusOf('wamid.SYNTH-OK'))?.status, 'delivered')
    const [d] = await sql<{ processing: string; error: string }[]>`
      select processing, processing_error as error from communication.webhook_delivery`
    assert.equal(d?.processing, 'failed')
    assert.match(d.error, /1 elemento\(s\) descartado\(s\): estado desconocido: deleted/)
  })

  it('un elemento que la base no admitiría no arrastra a los válidos de la misma entrega', async () => {
    const valid = JSON.parse(textPayload({ wamid: 'wamid.SYNTH-C1-OK', timestamp: 1790000000 })) as {
      entry: { changes: { value: { messages: Record<string, unknown>[] } }[] }[]
    }
    const messages = valid.entry[0]?.changes[0]?.value.messages ?? []
    messages.push(
      { from: '15550199001', id: 'wamid.SYNTH-C1-TS', timestamp: '99999999999999999', type: 'text', text: { body: 'x' } },
      { from: '15550199001', id: 'wamid.SYNTH-C1-NUL', timestamp: '1790000000', type: 'text', text: { body: 'a\u0000b' } },
    )
    assert.equal(await deliver(JSON.stringify(valid)), 200)
    assert.deepEqual((await listThread(sql, PARTICIPANT)).map((m) => m.wamid), ['wamid.SYNTH-C1-OK'])
    const [d] = await sql<{ processing: string; error: string }[]>`
      select processing, processing_error as error from communication.webhook_delivery`
    assert.equal(d?.processing, 'failed')
    assert.match(d.error, /^2 elemento\(s\) descartado\(s\)/)
  })

  it('un cuerpo firmado que no es JSON queda guardado y fallido, para reprocesar', async () => {
    assert.equal(await deliver('{"entry": [truncado'), 200)
    const [d] = await sql<{ processing: string; error: string; bodyRaw: string }[]>`
      select processing, processing_error as error, body_raw as "bodyRaw" from communication.webhook_delivery`
    assert.deepEqual(d, { processing: 'failed', error: 'el cuerpo no es JSON válido', bodyRaw: '{"entry": [truncado' })
  })
})
