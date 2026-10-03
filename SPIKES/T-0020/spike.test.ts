import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import type { AddressInfo } from 'node:net'
import { after, before, describe, it } from 'node:test'
import { connect, processDelivery, recordDelivery } from './db.ts'
import { parsePayload, type Parsed } from './parse.ts'
import { redact } from './redact.ts'
import { createWebhookServer, sign, verifySignature, type Store } from './server.ts'

const fixture = (name: string): string => readFileSync(new URL(`fixtures/${name}`, import.meta.url), 'utf8')

const nullStore = (): Store & { deliveries: string[] } => {
  const deliveries: string[] = []
  return {
    deliveries,
    record: (b) => Promise.resolve(deliveries.push(b)),
    process: () => Promise.resolve(),
    fail: () => Promise.resolve(),
  }
}

async function withServer(opts: { verifyToken?: string; appSecret?: string }, fn: (base: string, store: ReturnType<typeof nullStore>) => Promise<void>): Promise<void> {
  const store = nullStore()
  const server = createWebhookServer({ verifyToken: opts.verifyToken, appSecret: opts.appSecret, store, log: () => undefined })
  await new Promise<void>((r) => server.listen(0, r))
  try {
    await fn(`http://localhost:${String((server.address() as AddressInfo).port)}/webhook`, store)
  } finally {
    await new Promise((r) => server.close(r))
  }
}

describe('GET /webhook (desafío de Meta)', () => {
  it('devuelve el challenge con el token correcto', () => withServer({ verifyToken: 'tok' }, async (base) => {
    const res = await fetch(`${base}?hub.mode=subscribe&hub.verify_token=tok&hub.challenge=12345`)
    assert.equal(res.status, 200)
    assert.equal(await res.text(), '12345')
  }))
  it('403 con token incorrecto', () => withServer({ verifyToken: 'tok' }, async (base) => {
    const res = await fetch(`${base}?hub.mode=subscribe&hub.verify_token=otro&hub.challenge=1`)
    assert.equal(res.status, 403)
  }))
  it('403 si no hay token configurado', () => withServer({}, async (base) => {
    const res = await fetch(`${base}?hub.mode=subscribe&hub.verify_token=&hub.challenge=1`)
    assert.equal(res.status, 403)
  }))
})

describe('firma X-Hub-Signature-256', () => {
  const body = Buffer.from(fixture('inbound-text.json'))
  it('acepta la firma correcta', () => { assert.equal(verifySignature(body, sign(body, 's3cret'), 's3cret'), true) })
  it('rechaza otra clave, otro body, prefijo o largo inválidos', () => {
    assert.equal(verifySignature(body, sign(body, 'otra'), 's3cret'), false)
    assert.equal(verifySignature(Buffer.from(body.toString() + ' '), sign(body, 's3cret'), 's3cret'), false)
    assert.equal(verifySignature(body, sign(body, 's3cret').replace('sha256=', 'sha1='), 's3cret'), false)
    assert.equal(verifySignature(body, 'sha256=abcd', 's3cret'), false)
    assert.equal(verifySignature(body, undefined, 's3cret'), false)
  })
  it('POST: 401 con firma inválida, 200 con firma válida', () => withServer({ appSecret: 's3cret' }, async (base, store) => {
    const bad = await fetch(base, { method: 'POST', body, headers: { 'x-hub-signature-256': sign(body, 'otra') } })
    assert.equal(bad.status, 401)
    const ok = await fetch(base, { method: 'POST', body, headers: { 'x-hub-signature-256': sign(body, 's3cret') } })
    assert.equal(ok.status, 200)
    assert.equal(store.deliveries.length, 1)
  }))
  it('POST sin secret configurado: acepta (modo dev)', () => withServer({}, async (base) => {
    const res = await fetch(base, { method: 'POST', body })
    assert.equal(res.status, 200)
  }))
})

describe('parseo de fixtures', () => {
  it('texto entrante', () => {
    const p = parsePayload(JSON.parse(fixture('inbound-text.json')))
    assert.equal(p.messages.length, 1)
    const [m] = p.messages
    assert.equal(m?.wamid, 'wamid.SYNTH-INBOUND-0001')
    assert.equal(m?.phoneNumberId, '800000000000001')
    assert.equal(m?.waId, '15550199001')
    assert.equal(m?.waTimestamp.toISOString(), new Date(1790000000 * 1000).toISOString())
  })
  it('tipo no texto se registra como ignorado', () => {
    const p = parsePayload(JSON.parse(fixture('inbound-image.json')))
    assert.deepEqual([p.messages.length, p.ignored.map((i) => i.type)], [0, ['image']])
  })
  it('estados de saliente', () => {
    const p = parsePayload(JSON.parse(fixture('statuses.json')))
    assert.deepEqual(p.statuses.map((s) => s.status), ['sent', 'delivered'])
  })
  it('payload sin forma no rompe', () => {
    assert.deepEqual(parsePayload({ foo: 1 }), { messages: [], statuses: [], ignored: [] })
  })
})

describe('redacción', () => {
  it('reemplaza de forma consistente y conserva la estructura', () => {
    const r = redact(JSON.parse(fixture('statuses.json'))) as { entry: { changes: { value: { statuses: { id: string; status: string; recipient_id: string }[] } }[] }[] }
    const [a, b] = r.entry[0]?.changes[0]?.value.statuses ?? []
    assert.equal(a?.id, b?.id)
    assert.notEqual(a?.id, 'wamid.SYNTH-OUTBOUND-0001')
    assert.equal(a?.status, 'sent')
    assert.notEqual(a?.recipient_id, '15550199001')
  })
})

const dbUrl = process.env.DATABASE_URL
describe('idempotencia contra la base del spike', { skip: dbUrl === undefined && 'DATABASE_URL sin definir' }, () => {
  const sql = dbUrl === undefined ? undefined : connect(dbUrl)
  const wamid = `wamid.SYNTH-TEST-${String(Date.now())}`
  const outWamid = `${wamid}-OUT`
  let parsed: Parsed

  before(() => {
    parsed = parsePayload(JSON.parse(fixture('inbound-text.json').replace('wamid.SYNTH-INBOUND-0001', wamid)))
    const st = parsePayload(JSON.parse(fixture('statuses.json').replaceAll('wamid.SYNTH-OUTBOUND-0001', outWamid)))
    parsed.statuses = st.statuses
  })
  after(async () => {
    if (sql === undefined) return
    await sql`delete from message_status where wa_message_id = ${outWamid}`
    await sql`delete from message where wa_message_id in (${wamid}, ${outWamid})`
    await sql`delete from webhook_delivery where body_raw like ${`%${wamid}%`}`
    await sql.end()
  })

  it('la misma entrega dos veces deja una sola fila por wamid', async () => {
    if (sql === undefined) return
    for (let i = 0; i < 2; i++) {
      const id = await recordDelivery(sql, JSON.stringify({ marker: wamid }), 'unchecked')
      await processDelivery(sql, id, parsed)
    }
    const rows = await sql<{ direction: string }[]>`
      select direction from message where wa_message_id in (${wamid}, ${outWamid}) order by wa_timestamp, wa_message_id`
    assert.deepEqual(rows.map((r) => r.direction), ['inbound', 'outbound'])
    const [st] = await sql<{ n: number }[]>`select count(*)::int as n from message_status where wa_message_id = ${outWamid}`
    assert.equal(st?.n, 2)
    const [d] = await sql<{ n: number }[]>`select count(*)::int as n from webhook_delivery where body_raw like ${`%${wamid}%`}`
    assert.equal(d?.n, 2)
  })
})
