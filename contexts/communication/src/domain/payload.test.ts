import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { describe, it } from 'node:test'

import { parseDelivery } from './payload.ts'

const fixture = (name: string): unknown =>
  JSON.parse(readFileSync(new URL(`../../fixtures/${name}`, import.meta.url), 'utf8'))

/** Un cambio de `messages` con el `value` dado y el número sintético de los fixtures. */
const change = (value: Record<string, unknown>): unknown => ({
  object: 'whatsapp_business_account',
  entry: [{ id: '900000000000001', changes: [{ field: 'messages', value: {
    messaging_product: 'whatsapp',
    metadata: { display_phone_number: '15550100001', phone_number_id: '800000000000001' },
    ...value,
  } }] }],
})

describe('parseo de entrantes', () => {
  it('texto sintético: wamid, número, participante, nombre de perfil, cuerpo y timestamp', () => {
    const p = parseDelivery(fixture('inbound-text.json'))
    assert.deepEqual(p.texts, [{
      wamid: 'wamid.SYNTH-INBOUND-0001',
      phoneNumberId: '800000000000001',
      participant: { waId: '15550199001', bsuid: null },
      profileName: 'Ana Prueba',
      body: 'Hola, este es un mensaje de prueba.',
      waTimestamp: new Date(1790000000 * 1000),
    }])
    assert.deepEqual([p.unsupported, p.statuses, p.discarded], [[], [], []])
  })

  it('un tipo fuera de alcance se registra como recibido, sin contenido', () => {
    const p = parseDelivery(fixture('inbound-image.json'))
    assert.deepEqual(p.texts, [])
    assert.deepEqual(p.unsupported, [{
      wamid: 'wamid.SYNTH-INBOUND-0002',
      type: 'image',
      phoneNumberId: '800000000000001',
      participant: { waId: '15550199001', bsuid: null },
      waTimestamp: new Date(1790000060 * 1000),
    }])
  })

  it('participante solo con BSUID: el teléfono puede faltar (D-0065)', () => {
    const p = parseDelivery(change({
      contacts: [{ profile: { name: 'Persona Sintética' }, user_id: 'AR.SYNTH-BSUID-1' }],
      messages: [{ from_user_id: 'AR.SYNTH-BSUID-1', id: 'wamid.SYNTH-B1', timestamp: '1790000100', type: 'text', text: { body: 'hola' } }],
    }))
    assert.deepEqual(p.texts[0]?.participant, { waId: null, bsuid: 'AR.SYNTH-BSUID-1' })
    assert.equal(p.texts[0].profileName, 'Persona Sintética')
  })

  it('el BSUID sale de contacts si el mensaje no trae from_user_id', () => {
    const p = parseDelivery(change({
      contacts: [{ profile: { name: 'X' }, wa_id: '15550199002', user_id: 'AR.SYNTH-BSUID-2' }],
      messages: [{ from: '15550199002', id: 'wamid.SYNTH-B2', timestamp: '1790000100', type: 'text', text: { body: 'hola' } }],
    }))
    assert.deepEqual(p.texts[0]?.participant, { waId: '15550199002', bsuid: 'AR.SYNTH-BSUID-2' })
  })

  it('el nombre de perfil es el del contacto que corresponde, no el primero', () => {
    const p = parseDelivery(change({
      contacts: [
        { profile: { name: 'Uno' }, wa_id: '15550199001' },
        { profile: { name: 'Dos' }, wa_id: '15550199002' },
      ],
      messages: [{ from: '15550199002', id: 'wamid.SYNTH-N2', timestamp: '1790000100', type: 'text', text: { body: 'b' } }],
    }))
    assert.equal(p.texts[0]?.profileName, 'Dos')
  })

  it('descarta y cuenta lo que no tiene la forma esperada, sin perder el resto', () => {
    const p = parseDelivery(change({
      messages: [
        { from: '15550199001', timestamp: '1790000100', type: 'text', text: { body: 'cuerpo-1' } },
        { from: '15550199001', id: 'wamid.SYNTH-T1', timestamp: 'ayer', type: 'text', text: { body: 'cuerpo-2' } },
        { id: 'wamid.SYNTH-T2', timestamp: '1790000100', type: 'text', text: { body: 'cuerpo-3' } },
        { from: '15550199001', id: 'wamid.SYNTH-T3', timestamp: '1790000100', type: 'text', text: {} },
        { from: '15550199001', id: 'wamid.SYNTH-T4', timestamp: '1790000100', type: 'text', text: { body: 'cuerpo-4' } },
      ],
    }))
    assert.deepEqual(p.texts.map((t) => t.wamid), ['wamid.SYNTH-T4'])
    assert.equal(p.discarded.length, 4)
    for (const reason of p.discarded) assert.doesNotMatch(reason, /SYNTH|1555|cuerpo-/, 'los motivos no llevan datos del mensaje')
  })

  it('un timestamp fuera del rango de Date o un U+0000 descartan solo ese elemento', () => {
    const p = parseDelivery(change({
      messages: [
        { from: '15550199001', id: 'wamid.SYNTH-R1', timestamp: '99999999999999999', type: 'text', text: { body: 'cuerpo-1' } },
        { from: '15550199001', id: 'wamid.SYNTH-R2', timestamp: '1790000100', type: 'text', text: { body: 'a\u0000b' } },
        { from: '1555\u00000199001', id: 'wamid.SYNTH-R3', timestamp: '1790000100', type: 'text', text: { body: 'cuerpo-3' } },
        { from: '15550199001', id: 'wamid.SYNTH-R4', timestamp: '1790000100', type: 'text', text: { body: 'cuerpo-4' } },
      ],
      statuses: [{ id: 'wamid.SYNTH-S1', status: 'read', timestamp: '99999999999999999' }],
    }))
    assert.deepEqual(p.texts.map((t) => t.wamid), ['wamid.SYNTH-R4'])
    assert.deepEqual(p.discarded, [
      'mensaje sin timestamp válido',
      'mensaje de texto con U+0000, que Postgres no admite',
      'mensaje sin wa_id ni BSUID',
      'estado sin id o sin timestamp válido',
    ])
  })

  it('un cambio sin phone_number_id descarta sus elementos', () => {
    const p = parseDelivery({ entry: [{ changes: [{ field: 'messages', value: {
      messages: [{ from: '1', id: 'wamid.X', timestamp: '1', type: 'text', text: { body: 'b' } }],
      statuses: [{ id: 'wamid.Y', status: 'read', timestamp: '1' }],
    } }] }] })
    assert.deepEqual([p.texts.length, p.statuses.length, p.discarded.length], [0, 0, 2])
  })

  it('ignora campos suscriptos que no son messages y payloads sin forma', () => {
    assert.deepEqual(parseDelivery({ entry: [{ changes: [{ field: 'account_update', value: { messages: [{}] } }] }] }),
      { texts: [], unsupported: [], statuses: [], discarded: [], ignored: 0 })
    for (const basura of [null, 42, 'x', [], { entry: 'no' }, { entry: [{ changes: [null] }] }]) {
      assert.deepEqual(parseDelivery(basura), { texts: [], unsupported: [], statuses: [], discarded: [], ignored: 0 })
    }
  })
})

describe('parseo de estados', () => {
  it('sent y delivered del fixture sintético, sin error', () => {
    const p = parseDelivery(fixture('statuses.json'))
    assert.deepEqual(p.statuses, [
      { wamid: 'wamid.SYNTH-OUTBOUND-0001', status: 'sent', statusAt: new Date(1790000030 * 1000), error: null },
      { wamid: 'wamid.SYNTH-OUTBOUND-0001', status: 'delivered', statusAt: new Date(1790000031 * 1000), error: null },
    ])
  })

  it('failed lleva su error; los demás estados no', () => {
    const p = parseDelivery(change({ statuses: [
      { id: 'wamid.F', status: 'failed', timestamp: '1790000200', errors: [{ code: 131047, title: 'Re-engagement message' }] },
      { id: 'wamid.G', status: 'failed', timestamp: '1790000200', errors: [{ code: 131026, message: 'Message undeliverable' }] },
      { id: 'wamid.R', status: 'read', timestamp: '1790000200', errors: [{ code: 1, title: 'no aplica' }] },
    ] }))
    assert.deepEqual(p.statuses.map((s) => s.error), [
      { code: 131047, title: 'Re-engagement message' },
      { code: 131026, title: 'Message undeliverable' },
      null,
    ])
  })

  it('un estado desconocido se descarta con su nombre, que no es dato personal', () => {
    const p = parseDelivery(change({ statuses: [{ id: 'wamid.D', status: 'deleted', timestamp: '1790000200' }] }))
    assert.deepEqual([p.statuses, p.discarded], [[], ['estado desconocido: deleted']])
  })
})

describe('filtro por número (CO01 §3)', () => {
  const otherNumber = {
    object: 'whatsapp_business_account',
    entry: [{ id: '900000000000001', changes: [{ field: 'messages', value: {
      messaging_product: 'whatsapp',
      metadata: { display_phone_number: '15550100009', phone_number_id: '800000000000009' },
      contacts: [{ profile: { name: 'Otra' }, wa_id: '15550199009' }],
      messages: [{ from: '15550199009', id: 'wamid.SYNTH-OTRO', timestamp: '1790000100', type: 'text', text: { body: 'hola' } }],
      statuses: [{ id: 'wamid.SYNTH-OTRO-OUT', status: 'read', timestamp: '1790000100' }],
    } }] }],
  }

  it('sin número configurado se acepta cualquier phone_number_id', () => {
    const p = parseDelivery(otherNumber)
    assert.deepEqual([p.texts.length, p.statuses.length, p.ignored], [1, 1, 0])
  })

  it('con número configurado, lo de otro número se ignora sin descartar ni persistir', () => {
    const p = parseDelivery(otherNumber, { phoneNumberId: '800000000000001' })
    assert.deepEqual(p, { texts: [], unsupported: [], statuses: [], discarded: [], ignored: 2 })
  })

  it('con número configurado, lo del número propio pasa igual', () => {
    const p = parseDelivery(fixture('inbound-text.json'), { phoneNumberId: '800000000000001' })
    assert.deepEqual([p.texts.length, p.ignored], [1, 0])
  })
})
