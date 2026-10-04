// Integración de lo que usa la UI (T-0025) contra delcampo_communication_test: lista,
// hilo, envío con su idempotencia (R-20), rechazo con la ventana cerrada y retención de
// los intentos. La API de Meta es un `TextSender` en memoria: ninguna llamada real.

import assert from 'node:assert/strict'
import { after, before, beforeEach, describe, it } from 'node:test'

import type { SendOutcome, TextSender } from '../integration/cloud-api.ts'
import type { Sql } from '../persistence/database.ts'
import { openTestDatabase, truncateAll } from '../persistence/testing.ts'
import { conversationList, conversationThread } from './conversations.ts'
import { applyRetention } from './operations.ts'
import { sendReply, type ReplyDeps } from './reply.ts'
import { readFixture, sign, statusPayload, TEST_APP_SECRET, TEST_VERIFY_TOKEN, textPayload, webhookPost } from './testing.ts'
import { createWebhookHandler, deliveryStore } from './webhook.ts'

let sql: Sql
let deliver: (body: string) => Promise<void>

before(async () => {
  sql = await openTestDatabase()
  const handle = createWebhookHandler({ verifyToken: TEST_VERIFY_TOKEN, appSecret: TEST_APP_SECRET, store: deliveryStore(sql) })
  deliver = async (body) => {
    const { process } = await handle(webhookPost(body, sign(body)))
    await process?.()
  }
})
beforeEach(() => truncateAll(sql))
after(() => sql.end())

const NUMBER = '800000000000001'
const ANA = '15550199001'
const BETO = '15550199002'
const HOUR = 3600
const nowSeconds = (): number => Math.floor(Date.now() / 1000)

const count = async (table: string): Promise<number> => {
  const [row] = await sql.unsafe<{ n: number }[]>(`select count(*)::int as n from communication.${table}`)
  return row?.n ?? -1
}

/** Un `TextSender` en memoria que cuenta las llamadas. */
const fakeSender = (outcome: (n: number) => SendOutcome | Promise<SendOutcome>): { send: TextSender; calls: () => number } => {
  let n = 0
  return {
    send: async () => outcome(++n),
    calls: () => n,
  }
}

const deps = (send: TextSender, extra: Partial<ReplyDeps> = {}): ReplyDeps => ({ sql, send, phoneNumberId: NUMBER, ...extra })
const KEY = '3f1c2a9e-5b7d-4c1e-9a2b-0d4e6f8a1b2c'
const KEY2 = '7a0e5c1d-2b3f-4e5a-8c9d-1e2f3a4b5c6d'

const firstConversationId = async (): Promise<number> => {
  const { conversations } = await conversationList(sql)
  const id = conversations[0]?.id
  if (id === undefined) throw new Error('no hay conversaciones')
  return id
}

describe('lista de conversaciones', () => {
  it('una entrada por participante, ordenada por el último mensaje, sin teléfono completo', async () => {
    const t = nowSeconds()
    await deliver(textPayload({ wamid: 'wamid.SYNTH-L-1', timestamp: t - 3 * HOUR, waId: ANA, name: 'Ana Prueba' }))
    await deliver(textPayload({ wamid: 'wamid.SYNTH-L-2', timestamp: t - 2 * HOUR, waId: BETO, name: 'Beto Prueba' }))
    await deliver(textPayload({ wamid: 'wamid.SYNTH-L-3', timestamp: t - HOUR, waId: ANA, name: 'Ana P.' }))
    await deliver(textPayload({ wamid: 'wamid.SYNTH-L-4', timestamp: t - 30 * HOUR, waId: null, bsuid: 'AR.SYNTHBSUID1', name: 'Sin Teléfono' }))

    const list = await conversationList(sql)
    assert.deepEqual(
      list.conversations.map((c) => [c.profileName, c.waIdLast4, c.bsuid, c.window.open]),
      [['Ana P.', '9001', null, true], ['Beto Prueba', '9002', null, true], ['Sin Teléfono', null, 'AR.SYNTHBSUID1', false]],
    )
    assert.ok(list.lastDeliveryAt instanceof Date)
    const serialized = JSON.stringify(list)
    for (const forbidden of [ANA, BETO, 'wamid.']) assert.ok(!serialized.includes(forbidden), forbidden)
  })

  it('sin entregas, la última entrega es null', async () => {
    assert.deepEqual(await conversationList(sql), { conversations: [], lastDeliveryAt: null })
  })

  it('un participante que solo mandó tipos fuera de alcance también tiene conversación (A1)', async () => {
    const image = JSON.parse(readFixture('inbound-image.json')) as { entry: { changes: { value: { messages: { timestamp: string }[] } }[] }[] }
    const m = image.entry[0]?.changes[0]?.value.messages[0]
    if (m === undefined) throw new Error('fixture sin mensaje')
    m.timestamp = String(nowSeconds() - HOUR)
    await deliver(JSON.stringify(image))
    assert.equal(await count('message'), 0)

    const list = await conversationList(sql)
    assert.equal(list.conversations.length, 1)
    const c = list.conversations[0]
    assert.deepEqual(c && [c.profileName, c.waIdLast4, c.window.open], [null, '9001', true])
    const id = await firstConversationId()
    const thread = await conversationThread(sql, id)
    assert.deepEqual(thread?.items.map((i) => i.kind), ['unsupported'])
    assert.equal(thread.canReply, true)

    const { send, calls } = fakeSender(() => ({ kind: 'accepted', wamid: 'wamid.SYNTH-A1-OUT' }))
    assert.equal((await sendReply(deps(send), { idempotencyKey: KEY, conversationId: id, body: 'recibí la imagen' })).kind, 'sent')
    assert.equal(calls(), 1)
    assert.equal((await conversationList(sql)).conversations.length, 1, 'el saliente no parte la conversación')
    assert.equal((await firstConversationId()), id, 'el id de la conversación no cambia')
  })
})

describe('hilo', () => {
  it('orden de listThread, estado de cada saliente con su error, y marcador sin contenido', async () => {
    const t = nowSeconds() - HOUR
    await deliver(textPayload({ wamid: 'wamid.SYNTH-H-1', timestamp: t, waId: ANA, body: 'primero' }))
    await deliver(readFixture('inbound-image.json'))
    const id = await firstConversationId()
    const { send } = fakeSender(() => ({ kind: 'accepted', wamid: 'wamid.SYNTH-H-OUT' }))
    assert.equal((await sendReply(deps(send), { idempotencyKey: KEY, conversationId: id, body: 'respuesta' })).kind, 'sent')
    await deliver(statusPayload({ wamid: 'wamid.SYNTH-H-OUT', status: 'failed', timestamp: t + 10, error: { code: 131026, title: 'Message undeliverable' } }))

    const thread = await conversationThread(sql, id)
    assert.ok(thread !== null)
    const kinds = thread.items.map((i) => (i.kind === 'message' ? `${i.direction}:${i.body}:${String(i.status)}` : i.kind))
    assert.ok(kinds.includes('inbound:primero:null'))
    assert.ok(kinds.includes('outbound:respuesta:failed'))
    assert.ok(kinds.includes('unsupported'))
    const out = thread.items.find((i) => i.kind === 'message' && i.direction === 'outbound')
    // (N7) el título del estado pasa por la redacción; acá no tiene nada que redactar.
    assert.ok(out?.kind === 'message' && out.errorCode === 131026 && out.errorTitle === 'Message undeliverable')
    const serialized = JSON.stringify(thread)
    for (const forbidden of [ANA, 'wamid.']) assert.ok(!serialized.includes(forbidden), forbidden)
  })

  it('solo el id de la primera fila del participante es una conversación', async () => {
    const t = nowSeconds()
    await deliver(textPayload({ wamid: 'wamid.SYNTH-I-1', timestamp: t - 20, waId: ANA }))
    await deliver(textPayload({ wamid: 'wamid.SYNTH-I-2', timestamp: t - 10, waId: ANA }))
    const id = await firstConversationId()
    assert.notEqual(await conversationThread(sql, id), null)
    assert.equal(await conversationThread(sql, id + 1), null)
    assert.equal(await conversationThread(sql, 999999), null)
  })
})

describe('responder', () => {
  it('con la ventana abierta, persiste el saliente con el wamid devuelto', async () => {
    await deliver(textPayload({ wamid: 'wamid.SYNTH-S-1', timestamp: nowSeconds() - HOUR, waId: ANA }))
    const id = await firstConversationId()
    const { send, calls } = fakeSender(() => ({ kind: 'accepted', wamid: 'wamid.SYNTH-S-OUT' }))
    const result = await sendReply(deps(send), { idempotencyKey: KEY, conversationId: id, body: 'Hola Ana' })
    assert.equal(result.kind, 'sent')
    assert.equal(calls(), 1)
    const [row] = await sql<{ wamid: string; direction: string; body: string; waId: string }[]>`
      select wamid, direction, body, wa_id as "waId" from communication.message where direction = 'outbound'`
    assert.deepEqual(row, { wamid: 'wamid.SYNTH-S-OUT', direction: 'outbound', body: 'Hola Ana', waId: ANA })
    const [attempt] = await sql<{ state: string; body: string | null }[]>`select state, body from communication.outbound_attempt`
    assert.deepEqual(attempt, { state: 'accepted', body: null })
  })

  it('con la ventana cerrada, el servidor rechaza sin llamar a la API ni escribir', async () => {
    await deliver(textPayload({ wamid: 'wamid.SYNTH-W-1', timestamp: nowSeconds() - 25 * HOUR, waId: ANA }))
    const id = await firstConversationId()
    const { send, calls } = fakeSender(() => ({ kind: 'accepted', wamid: 'wamid.SYNTH-W-OUT' }))
    const result = await sendReply(deps(send), { idempotencyKey: KEY, conversationId: id, body: 'tarde' })
    assert.deepEqual(result, { kind: 'window-closed' })
    assert.equal(calls(), 0)
    assert.equal(await count('outbound_attempt'), 0)
    assert.equal(await count('message'), 1)
  })

  it('un entrante fuera de alcance también abre la ventana', async () => {
    await deliver(textPayload({ wamid: 'wamid.SYNTH-W-2', timestamp: nowSeconds() - 25 * HOUR, waId: '15550199001' }))
    const image = JSON.parse(readFixture('inbound-image.json')) as { entry: { changes: { value: { messages: { timestamp: string }[] } }[] }[] }
    const m = image.entry[0]?.changes[0]?.value.messages[0]
    if (m === undefined) throw new Error('fixture sin mensaje')
    m.timestamp = String(nowSeconds() - HOUR)
    await deliver(JSON.stringify(image))
    const list = await conversationList(sql)
    assert.equal(list.conversations[0]?.window.open, true)
  })

  it('el mismo intento repetido produce una sola llamada a la API y un solo mensaje (R-20)', async () => {
    await deliver(textPayload({ wamid: 'wamid.SYNTH-D-1', timestamp: nowSeconds() - HOUR, waId: ANA }))
    const id = await firstConversationId()
    const { send, calls } = fakeSender(() => ({ kind: 'accepted', wamid: 'wamid.SYNTH-D-OUT' }))
    const request = { idempotencyKey: KEY, conversationId: id, body: 'una sola vez' }
    const first = await sendReply(deps(send), request)
    const second = await sendReply(deps(send), request)
    assert.equal(first.kind, 'sent')
    assert.deepEqual(second, first)
    assert.equal(calls(), 1)
    assert.equal(await count('outbound_attempt'), 1)
    const [row] = await sql<{ n: number }[]>`select count(*)::int as n from communication.message where direction = 'outbound'`
    assert.equal(row?.n, 1)
  })

  it('dos requests concurrentes con la misma clave: una sola llamada', async () => {
    await deliver(textPayload({ wamid: 'wamid.SYNTH-C-1', timestamp: nowSeconds() - HOUR, waId: ANA }))
    const id = await firstConversationId()
    let release = (): void => undefined
    const gate = new Promise<void>((resolve) => { release = resolve })
    const { send, calls } = fakeSender(async () => {
      await gate
      return { kind: 'accepted', wamid: 'wamid.SYNTH-C-OUT' }
    })
    const request = { idempotencyKey: KEY, conversationId: id, body: 'doble clic' }
    const a = sendReply(deps(send), request)
    const b = sendReply(deps(send), request)
    const settledFirst = await Promise.race([a, b])
    assert.equal(settledFirst.kind, 'in-progress')
    release()
    const results = await Promise.all([a, b])
    assert.deepEqual(results.map((r) => r.kind).sort(), ['in-progress', 'sent'])
    assert.equal(calls(), 1)
  })

  it('la misma clave con otro texto se rechaza sin enviar', async () => {
    await deliver(textPayload({ wamid: 'wamid.SYNTH-K-1', timestamp: nowSeconds() - HOUR, waId: ANA }))
    const id = await firstConversationId()
    const { send, calls } = fakeSender(() => ({ kind: 'accepted', wamid: 'wamid.SYNTH-K-OUT' }))
    await sendReply(deps(send), { idempotencyKey: KEY, conversationId: id, body: 'uno' })
    const result = await sendReply(deps(send), { idempotencyKey: KEY, conversationId: id, body: 'otro' })
    assert.deepEqual(result, { kind: 'key-reused' })
    assert.equal(calls(), 1)
  })

  it('un rechazo de la API se muestra y no crea el mensaje; repetirlo no vuelve a llamar', async () => {
    await deliver(textPayload({ wamid: 'wamid.SYNTH-R-1', timestamp: nowSeconds() - HOUR, waId: ANA }))
    const id = await firstConversationId()
    const { send, calls } = fakeSender(() => ({ kind: 'rejected', code: 131047, title: '(#131047) Re-engagement message' }))
    const request = { idempotencyKey: KEY, conversationId: id, body: 'rechazado' }
    const result = await sendReply(deps(send), request)
    assert.deepEqual(result, { kind: 'rejected', code: 131047, title: '(#131047) Re-engagement message' })
    assert.deepEqual(await sendReply(deps(send), request), result)
    assert.equal(calls(), 1)
    const [row] = await sql<{ n: number }[]>`select count(*)::int as n from communication.message where direction = 'outbound'`
    assert.equal(row?.n, 0)
    const thread = await conversationThread(sql, id)
    assert.ok(thread?.items.every((i) => i.kind !== 'attempt'))
  })

  it('red caída: no crea el mensaje y el intento queda visible como sin confirmar', async () => {
    await deliver(textPayload({ wamid: 'wamid.SYNTH-U-1', timestamp: nowSeconds() - HOUR, waId: ANA }))
    const id = await firstConversationId()
    const { send, calls } = fakeSender(() => ({ kind: 'unconfirmed', reason: 'falló la conexión con la API' }))
    const result = await sendReply(deps(send), { idempotencyKey: KEY, conversationId: id, body: 'quizás salió' })
    assert.equal(result.kind, 'unconfirmed')
    await sendReply(deps(send), { idempotencyKey: KEY, conversationId: id, body: 'quizás salió' })
    assert.equal(calls(), 1)
    const thread = await conversationThread(sql, id)
    const attempt = thread?.items.find((i) => i.kind === 'attempt')
    assert.deepEqual(attempt?.kind === 'attempt' && [attempt.state, attempt.body], ['unconfirmed', 'quizás salió'])
  })

  it('el título de error de un estado por webhook se redacta antes de la UI (N7)', async () => {
    await deliver(textPayload({ wamid: 'wamid.SYNTH-N7-1', timestamp: nowSeconds() - HOUR, waId: ANA }))
    const id = await firstConversationId()
    const { send } = fakeSender(() => ({ kind: 'accepted', wamid: 'wamid.SYNTH-N7-OUT' }))
    await sendReply(deps(send), { idempotencyKey: KEY, conversationId: id, body: 'hola' })
    await deliver(statusPayload({ wamid: 'wamid.SYNTH-N7-OUT', status: 'failed', timestamp: nowSeconds(), error: { code: 131026, title: `Undeliverable to ${ANA}` } }))
    const thread = await conversationThread(sql, id)
    const out = thread?.items.find((i) => i.kind === 'message' && i.direction === 'outbound')
    assert.ok(out?.kind === 'message')
    assert.equal(out.errorTitle, 'Undeliverable to [número]')
  })

  it('aceptado por la API y no persistido: queda sin confirmar, no se pierde', async () => {
    await deliver(textPayload({ wamid: 'wamid.SYNTH-P-1', timestamp: nowSeconds() - HOUR, waId: ANA, body: 'hola' }))
    const id = await firstConversationId()
    // El wamid devuelto ya existe en `message`: el insert del saliente falla.
    const { send } = fakeSender(() => ({ kind: 'accepted', wamid: 'wamid.SYNTH-P-1' }))
    const result = await sendReply(deps(send), { idempotencyKey: KEY, conversationId: id, body: 'salió' })
    assert.deepEqual(result, { kind: 'unconfirmed', reason: 'la API aceptó el envío pero no se pudo registrar' })
    const thread = await conversationThread(sql, id)
    assert.ok(thread?.items.some((i) => i.kind === 'attempt' && i.state === 'unconfirmed'))
    // (C2) el wamid devuelto queda en el intento, para reconciliar; la UI no lo recibe.
    const [attempt] = await sql<{ state: string; wamid: string | null }[]>`select state, wamid from communication.outbound_attempt`
    assert.deepEqual(attempt && { ...attempt }, { state: 'unconfirmed', wamid: 'wamid.SYNTH-P-1' })
    assert.ok(!JSON.stringify(thread).includes('wamid.'))
  })

  it('un proceso caído deja el intento pending, que pasado un minuto se ve sin confirmar', async () => {
    await deliver(textPayload({ wamid: 'wamid.SYNTH-X-1', timestamp: nowSeconds() - HOUR, waId: ANA }))
    const id = await firstConversationId()
    await sql`
      insert into communication.outbound_attempt
        (idempotency_key, phone_number_id, wa_id, body, body_sha256, created_at)
      values (${KEY2}, ${NUMBER}, ${ANA}, 'colgado', sha256('colgado'::bytea), now() - interval '2 minutes')`
    const thread = await conversationThread(sql, id)
    assert.ok(thread?.items.some((i) => i.kind === 'attempt' && i.state === 'unconfirmed' && i.body === 'colgado'))

    // (C1) repetir ese intento no queda "en curso" para siempre, ni vuelve a enviar.
    const { send, calls } = fakeSender(() => ({ kind: 'accepted', wamid: 'wamid.SYNTH-X-OUT' }))
    const result = await sendReply(deps(send), { idempotencyKey: KEY2, conversationId: id, body: 'colgado' })
    assert.deepEqual(result, { kind: 'unconfirmed', reason: 'el proceso no registró el resultado del envío' })
    assert.equal(calls(), 0)
  })

  it('valida el texto, la clave, la conversación y el teléfono antes de enviar', async () => {
    await deliver(textPayload({ wamid: 'wamid.SYNTH-V-1', timestamp: nowSeconds() - HOUR, waId: null, bsuid: 'AR.SYNTHBSUID2' }))
    const id = await firstConversationId()
    const { send, calls } = fakeSender(() => ({ kind: 'accepted', wamid: 'wamid.SYNTH-V-OUT' }))
    assert.equal((await sendReply(deps(send), { idempotencyKey: 'x', conversationId: id, body: 'a' })).kind, 'invalid')
    assert.equal((await sendReply(deps(send), { idempotencyKey: KEY, conversationId: id, body: '  ' })).kind, 'invalid')
    assert.equal((await sendReply(deps(send), { idempotencyKey: KEY, conversationId: id + 50, body: 'a' })).kind, 'not-found')
    assert.equal((await sendReply(deps(send), { idempotencyKey: KEY, conversationId: id, body: 'a' })).kind, 'no-phone')
    assert.equal(calls(), 0)
  })
})

describe('retención de intentos (D-0065)', () => {
  it('borra el texto de los rejected y unconfirmed cerrados hace más de 30 días, y nada más', async () => {
    await sql`
      insert into communication.outbound_attempt
        (idempotency_key, phone_number_id, wa_id, body, body_sha256, state, error_code, error_title, created_at, settled_at)
      values
        (gen_random_uuid(), ${NUMBER}, ${ANA}, 'rechazado viejo', sha256('a'::bytea), 'rejected', 131047, 'x', now() - interval '40 days', now() - interval '31 days'),
        (gen_random_uuid(), ${NUMBER}, ${ANA}, 'sin confirmar viejo', sha256('b'::bytea), 'unconfirmed', null, 'x', now() - interval '40 days', now() - interval '31 days'),
        (gen_random_uuid(), ${NUMBER}, ${ANA}, 'rechazado nuevo', sha256('c'::bytea), 'rejected', 131047, 'x', now() - interval '29 days', now() - interval '29 days'),
        (gen_random_uuid(), ${NUMBER}, ${ANA}, 'sin confirmar nuevo', sha256('d'::bytea), 'unconfirmed', null, 'x', now() - interval '1 day', now() - interval '1 day')`

    const result = await applyRetention(sql)
    assert.deepEqual(result, { deliveries: 0, staleAttempts: 0, attemptBodies: 2 })
    const rows = await sql<{ body: string | null }[]>`select body from communication.outbound_attempt order by id`
    assert.deepEqual(rows.map((r) => r.body), [null, null, 'rechazado nuevo', 'sin confirmar nuevo'])
    assert.equal(await count('outbound_attempt'), 4, 'las filas quedan, sin texto')
  })

  it('cierra como unconfirmed los pending abandonados, y su texto entra en la retención', async () => {
    await sql`
      insert into communication.outbound_attempt
        (idempotency_key, phone_number_id, wa_id, body, body_sha256, created_at)
      values
        (gen_random_uuid(), ${NUMBER}, ${ANA}, 'colgado', sha256('e'::bytea), now() - interval '2 hours'),
        (gen_random_uuid(), ${NUMBER}, ${ANA}, 'en curso', sha256('f'::bytea), now() - interval '5 seconds')`
    assert.deepEqual(await applyRetention(sql), { deliveries: 0, staleAttempts: 1, attemptBodies: 0 })
    const rows = await sql<{ state: string; body: string }[]>`select state, body from communication.outbound_attempt order by id`
    assert.deepEqual(rows.map((r) => ({ ...r })), [{ state: 'unconfirmed', body: 'colgado' }, { state: 'pending', body: 'en curso' }])

    const later = new Date(Date.now() + 31 * 24 * HOUR * 1000)
    assert.equal((await applyRetention(sql, later)).attemptBodies, 1)
  })

  it('no toca los aceptados ni los mensajes', async () => {
    await deliver(textPayload({ wamid: 'wamid.SYNTH-RT-1', timestamp: nowSeconds() - HOUR, waId: ANA }))
    const id = await firstConversationId()
    const { send } = fakeSender(() => ({ kind: 'accepted', wamid: 'wamid.SYNTH-RT-OUT' }))
    await sendReply(deps(send), { idempotencyKey: KEY, conversationId: id, body: 'queda' })
    await sql`update communication.outbound_attempt set settled_at = now() - interval '40 days'`
    const later = new Date(Date.now() + 60 * 24 * HOUR * 1000)
    const result = await applyRetention(sql, later)
    assert.equal(result.attemptBodies, 0)
    assert.equal(await count('message'), 2)
  })
})
