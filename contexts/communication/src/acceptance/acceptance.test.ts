import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { parseManifest, type Manifest } from './manifest.ts'
import { measure, type Observation } from './report.ts'

const start = '2026-10-10T00:00:00Z', end = '2026-10-13T00:00:00Z'
const sample = (): { m: Manifest; rows: Observation[] } => {
  const m: Manifest = { start, end, phoneNumberId: '800000000000001', participants: { P1: 1, P2: 2 },
    deployedAndSubscribed: true, outage: { start: '2026-10-10T00:01:00Z', end: '2026-10-10T00:11:00Z', markers: ['CO01-P1-101', 'CO01-P2-101'] }, messages: [] }
  const rows: Observation[] = []
  for (const p of ['P1', 'P2'] as const) for (let i = 0; i < 30; i++) {
    const marker = `CO01-${p}-${String(101 + i)}`
    const direction = i < 18 ? 'inbound' : 'outbound'
    const at = new Date(Date.parse(start) + 60_000 + i * 60_000)
    m.messages.push({ marker, direction, sentAt: at.toISOString(), phoneOrder: i + 1, seenInUi: true,
      seenOnPhone: true, fromUi: direction === 'outbound', observedStatus: direction === 'outbound' ? 'read' : null })
    rows.push({ marker, participant: p, direction, at, receivedAt: new Date(at.getTime() + (i === 0 ? 601_000 : 1000)),
      status: direction === 'outbound' ? 'read' : null, acceptedFromUi: direction === 'outbound', windowOpen: true })
  }
  rows.sort((a, b) => a.at.getTime() - b.at.getTime())
  return { m, rows }
}
const present = <T>(v: T | undefined): T => { assert.ok(v !== undefined); return v }
const now = new Date(end)
describe('medición CO01 sin falsos positivos', () => {
  it('valida el registro y mide nueve criterios, incluyendo recuperación tardía', () => {
    const { m, rows } = sample()
    const r = measure(parseManifest(m), rows, 0, now)
    assert.equal(Object.keys(r.criteria).length, 9)
    assert.ok(Object.values(r.criteria).every(Boolean))
    assert.equal(r.measurements.medianInboundSeconds, 1)
  })
  it('rechaza entradas desconocidas, marcadores repetidos, orden duplicado y fechas sin zona', () => {
    const { m } = sample()
    for (const value of [{ ...m, token: 'PRIVATE' }, { ...m, start: '2026-10-10' },
      { ...m, messages: [...m.messages, m.messages[0]] }, { ...m, participants: { P1: 1, P2: 1 } },
      { ...m, messages: [{ ...m.messages[0], phoneOrder: 2 }, ...m.messages.slice(1)] }]) {
      assert.throws(() => parseManifest(value), /CO01_MANIFEST_INVALID/)
    }
  })
  it('no acepta vacío, duración prematura ni declaraciones humanas incompletas', () => {
    const { m, rows } = sample()
    assert.equal(measure(m, rows, 0, new Date(start)).criteria.duration, false)
    m.deployedAndSubscribed = false
    present(m.messages[0]).seenInUi = false
    const r = measure(m, rows, 0, now)
    assert.equal(r.criteria.duration, false)
    assert.equal(r.criteria.losses, false)
    assert.equal(r.criteria.recovery, false)
    assert.equal(measure({ ...m, messages: [] }, [], 0, now).criteria.volume, false)
  })
  it('detecta perdido, repetido con otro wamid, inesperado, participante errado y duplicado wamid', () => {
    const { m, rows } = sample()
    const r = measure(m, [...rows.slice(1), present(rows[2]), { ...present(rows[3]), marker: 'CO01-P2-999' }, { ...present(rows[0]), participant: 'P2' }], 1, now)
    assert.equal(r.criteria.losses, false)
    assert.equal(r.criteria.duplicates, false)
    assert.ok(r.findings.mismatched.length > 0)
    assert.deepEqual(r.findings.unexpected, ['CO01-P2-999'])
    assert.equal(measure(m, rows.slice(1), 0, now).findings.missing.length, 1)
  })
  it('detecta orden distinto, estado UI desactualizado, ventana cerrada y origen no acreditado', () => {
    const { m, rows } = sample()
    rows.reverse()
    const out = present(rows.find(r => r.direction === 'outbound'))
    out.windowOpen = false; out.acceptedFromUi = false; out.status = 'delivered'
    const r = measure(m, rows, 0, now)
    assert.equal(r.criteria.order, false)
    assert.equal(r.criteria.statuses, false)
    assert.equal(r.criteria.replies, false)
  })
  it('no oculta latencias negativas, mensajes fuera de periodo ni caída insuficiente', () => {
    const { m, rows } = sample()
    present(rows[0]).receivedAt = new Date(Date.parse(start) - 1000)
    assert.equal(measure(m, rows, 0, now).criteria.latency, false)
    present(rows[0]).at = new Date(Date.parse(start) - 1000)
    assert.equal(measure(m, rows, 0, now).criteria.losses, false)
    m.outage = null
    assert.equal(measure(m, rows, 0, now).criteria.recovery, false)
  })
  it('el informe no copia configuración, identificadores ni campos extra', () => {
    const { m, rows } = sample()
    const r = JSON.stringify(measure(m, rows.map(r => ({ ...r, body: 'PRIVATE', wamid: 'SENSITIVE' })), 0, now))
    for (const forbidden of ['PRIVATE', 'SENSITIVE', m.phoneNumberId, 'participants', 'phoneOrder']) assert.ok(!r.includes(forbidden))
  })
})
