// Unit del receptor: firma, desafío y orden "guardar, responder, procesar", con un
// store en memoria. Lo mismo contra Postgres está en webhook.integration.test.ts.

import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import type { ParsedDelivery } from '../domain/payload.ts'
import {
  readFixture,
  sign,
  TEST_APP_SECRET,
  TEST_PHONE_NUMBER_ID,
  TEST_VERIFY_TOKEN,
  WEBHOOK_URL,
  webhookPost,
} from './testing.ts'
import { createWebhookHandler, MAX_BODY_BYTES, verifySignature, type DeliveryStore } from './webhook.ts'

interface MemoryStore extends DeliveryStore {
  readonly events: string[]
  readonly records: string[]
  readonly processed: ParsedDelivery[]
  readonly failures: string[]
}

const memoryStore = (): MemoryStore => {
  const events: string[] = []
  const records: string[] = []
  const processed: ParsedDelivery[] = []
  const failures: string[] = []
  return {
    events, records, processed, failures,
    record: (body) => {
      events.push('record')
      records.push(body)
      return Promise.resolve({ id: records.length, receivedAt: new Date() })
    },
    process: (_delivery, parsed) => {
      events.push('process')
      processed.push(parsed)
      return Promise.resolve()
    },
    fail: (_id, error) => {
      events.push('fail')
      failures.push(error instanceof Error ? error.message : String(error))
      return Promise.resolve()
    },
  }
}

const handlerWith = (store: DeliveryStore) =>
  createWebhookHandler({ verifyToken: TEST_VERIFY_TOKEN, appSecret: TEST_APP_SECRET, phoneNumberId: TEST_PHONE_NUMBER_ID, store })

const body = readFixture('inbound-text.json')

describe('verifySignature', () => {
  const raw = new TextEncoder().encode(body)
  it('acepta el HMAC-SHA256 del cuerpo crudo con el App Secret', () => {
    assert.equal(verifySignature(raw, sign(body), TEST_APP_SECRET), true)
    assert.equal(verifySignature(raw, sign(body).toUpperCase().replace('SHA256=', 'sha256='), TEST_APP_SECRET), true)
  })
  it('rechaza otra clave, otro cuerpo, otro algoritmo, largo inválido, hex inválido y ausencia', () => {
    assert.equal(verifySignature(raw, sign(body, 'otra-clave'), TEST_APP_SECRET), false)
    assert.equal(verifySignature(new TextEncoder().encode(body + ' '), sign(body), TEST_APP_SECRET), false)
    assert.equal(verifySignature(raw, sign(body).replace('sha256=', 'sha1='), TEST_APP_SECRET), false)
    assert.equal(verifySignature(raw, 'sha256=abcd', TEST_APP_SECRET), false)
    assert.equal(verifySignature(raw, `sha256=${'z'.repeat(64)}`, TEST_APP_SECRET), false)
    assert.equal(verifySignature(raw, '', TEST_APP_SECRET), false)
    assert.equal(verifySignature(raw, null, TEST_APP_SECRET), false)
  })
})

describe('configuración', () => {
  it('no hay modo sin firma: sin App Secret no se construye el receptor', () => {
    assert.throws(() => createWebhookHandler({ verifyToken: 't', appSecret: '', phoneNumberId: TEST_PHONE_NUMBER_ID, store: memoryStore() }), /App Secret/)
    assert.throws(() => createWebhookHandler({ verifyToken: '', appSecret: 's', phoneNumberId: TEST_PHONE_NUMBER_ID, store: memoryStore() }), /token/)
  })
})

describe('GET: desafío de verificación', () => {
  const get = (query: string) => handlerWith(memoryStore())(new Request(`${WEBHOOK_URL}?${query}`))

  it('devuelve el challenge con el token correcto', async () => {
    const { response, process } = await get(`hub.mode=subscribe&hub.verify_token=${TEST_VERIFY_TOKEN}&hub.challenge=1158201444`)
    assert.equal(response.status, 200)
    assert.equal(await response.text(), '1158201444')
    assert.equal(process, null)
  })
  it('403 con token incorrecto, sin modo subscribe o sin challenge', async () => {
    for (const q of [
      'hub.mode=subscribe&hub.verify_token=otro&hub.challenge=1',
      `hub.mode=unsubscribe&hub.verify_token=${TEST_VERIFY_TOKEN}&hub.challenge=1`,
      `hub.mode=subscribe&hub.verify_token=${TEST_VERIFY_TOKEN}`,
      '',
    ]) assert.equal((await get(q)).response.status, 403, q)
  })
})

describe('POST: recepción', () => {
  it('401 sin firma o con firma inválida, y no guarda nada', async () => {
    const store = memoryStore()
    const handle = handlerWith(store)
    for (const signature of [null, sign(body, 'otra-clave'), 'sha256=00']) {
      const { response, process } = await handle(webhookPost(body, signature))
      assert.equal(response.status, 401)
      assert.equal(process, null)
    }
    assert.deepEqual(store.events, [])
  })

  it('guarda la entrega cruda antes de responder 200 y procesa después', async () => {
    const store = memoryStore()
    const { response, process } = await handlerWith(store)(webhookPost(body))
    assert.equal(response.status, 200)
    assert.deepEqual(store.events, ['record'], 'al responder, la entrega ya está guardada y nada se procesó')
    assert.deepEqual(store.records, [body], 'se guarda el cuerpo tal cual llegó')
    assert.ok(process)
    await process()
    assert.deepEqual(store.events, ['record', 'process'])
    assert.deepEqual(store.processed[0]?.texts.map((t) => t.wamid), ['wamid.SYNTH-INBOUND-0001'])
  })

  it('si guardar la entrega falla, no responde 200: el error sube y Meta reintenta', async () => {
    const store = { ...memoryStore(), record: () => Promise.reject(new Error('base caída')) }
    await assert.rejects(handlerWith(store)(webhookPost(body)), /base caída/)
  })

  it('un cuerpo firmado que no es JSON queda fallido, sin citar su contenido', async () => {
    const store = memoryStore()
    const raw = 'hola, esto no es json'
    const { response, process } = await handlerWith(store)(webhookPost(raw))
    assert.equal(response.status, 200)
    await process?.()
    assert.deepEqual(store.events, ['record', 'fail'])
    assert.deepEqual(store.failures, ['el cuerpo no es JSON válido'])
  })

  it('si el procesamiento falla, la entrega se marca fallida', async () => {
    const store = { ...memoryStore(), process: () => Promise.reject(new Error('constraint')) }
    const failures: string[] = []
    store.fail = (_id, error) => {
      failures.push(error instanceof Error ? error.message : '')
      return Promise.resolve()
    }
    const { process } = await handlerWith(store)(webhookPost(body))
    await process?.()
    assert.deepEqual(failures, ['constraint'])
  })

  it('413 si el cuerpo supera el máximo, sin guardar nada', async () => {
    const store = memoryStore()
    const big = 'x'.repeat(MAX_BODY_BYTES + 1)
    const { response } = await handlerWith(store)(webhookPost(big))
    assert.equal(response.status, 413)
    assert.deepEqual(store.events, [])
  })

  it('el log no lleva contenido, teléfonos ni wamid', async () => {
    const lines: string[] = []
    const handle = createWebhookHandler({
      verifyToken: TEST_VERIFY_TOKEN,
      appSecret: TEST_APP_SECRET,
      phoneNumberId: TEST_PHONE_NUMBER_ID,
      store: memoryStore(),
      log: (l) => lines.push(l),
    })
    const { process } = await handle(webhookPost(body))
    await process?.()
    assert.equal(lines.length, 1)
    assert.doesNotMatch(lines[0] ?? '', /wamid|1555|Hola|Ana/)
  })
})

describe('otros métodos', () => {
  it('405', async () => {
    const { response } = await handlerWith(memoryStore())(new Request(WEBHOOK_URL, { method: 'PUT', body: '{}' }))
    assert.equal(response.status, 405)
  })
})
