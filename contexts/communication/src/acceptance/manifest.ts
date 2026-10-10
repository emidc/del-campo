// Entrada privada del owner. No se infieren mensajes esperados desde la base.
export interface ExpectedMessage {
  marker: string
  direction: 'inbound' | 'outbound'
  sentAt: string
  phoneOrder: number
  seenInUi: boolean
  seenOnPhone: boolean
  fromUi: boolean
  observedStatus: 'sent' | 'delivered' | 'read' | 'failed' | null
}
export interface Manifest {
  start: string
  end: string
  phoneNumberId: string
  participants: { P1: number; P2: number }
  deployedAndSubscribed: boolean
  outage: { start: string; end: string; markers: string[] } | null
  messages: ExpectedMessage[]
}
export const MARKER = /^CO01-P[12]-[0-9]{3,6}$/
const invalid = (): never => { throw new Error('CO01_MANIFEST_INVALID') }
const object = (v: unknown, keys: string[]): Record<string, unknown> => {
  if (typeof v !== 'object' || v === null || Array.isArray(v)) return invalid()
  const r = v as Record<string, unknown>
  if (Object.keys(r).length !== keys.length || keys.some(k => !Object.hasOwn(r, k))) return invalid()
  return r
}
const time = (v: unknown): string => {
  if (typeof v !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,3})?(Z|[+-]\d{2}:\d{2})$/.test(v)
    || !Number.isFinite(Date.parse(v))) return invalid()
  return v
}
const bool = (v: unknown): boolean => typeof v === 'boolean' ? v : invalid()
const positive = (v: unknown): number => typeof v === 'number' && Number.isSafeInteger(v) && v > 0 ? v : invalid()
const marker = (v: unknown): string => typeof v === 'string' && MARKER.test(v) ? v : invalid()
export const parseManifest = (input: unknown): Manifest => {
  const r = object(input, ['start', 'end', 'phoneNumberId', 'participants', 'deployedAndSubscribed', 'outage', 'messages'])
  const start = time(r.start), end = time(r.end)
  if (Date.parse(end) <= Date.parse(start)) return invalid()
  if (typeof r.phoneNumberId !== 'string' || !/^\d+$/.test(r.phoneNumberId)) return invalid()
  const p = object(r.participants, ['P1', 'P2'])
  const participants = { P1: positive(p.P1), P2: positive(p.P2) }
  if (participants.P1 === participants.P2 || !Array.isArray(r.messages) || r.messages.length > 10000) return invalid()
  const seen = new Set<string>(), orders = new Set<string>()
  const messages = r.messages.map((v: unknown): ExpectedMessage => {
    const m = object(v, ['marker', 'direction', 'sentAt', 'phoneOrder', 'seenInUi', 'seenOnPhone', 'fromUi', 'observedStatus'])
    const code = marker(m.marker), sentAt = time(m.sentAt), phoneOrder = positive(m.phoneOrder)
    const orderKey = `${code.slice(5, 7)}:${String(phoneOrder)}`
    if (seen.has(code) || orders.has(orderKey) || Date.parse(sentAt) < Date.parse(start) || Date.parse(sentAt) >= Date.parse(end)) return invalid()
    seen.add(code); orders.add(orderKey)
    if (m.direction !== 'inbound' && m.direction !== 'outbound') return invalid()
    const status = m.observedStatus
    if (status !== null && status !== 'sent' && status !== 'delivered' && status !== 'read' && status !== 'failed') return invalid()
    return { marker: code, direction: m.direction, sentAt, phoneOrder, seenInUi: bool(m.seenInUi),
      seenOnPhone: bool(m.seenOnPhone), fromUi: bool(m.fromUi), observedStatus: status }
  })
  let outage: Manifest['outage'] = null
  if (r.outage !== null) {
    const o = object(r.outage, ['start', 'end', 'markers'])
    const a = time(o.start), b = time(o.end)
    if (Date.parse(a) < Date.parse(start) || Date.parse(b) > Date.parse(end) || Date.parse(b) <= Date.parse(a) || !Array.isArray(o.markers)) return invalid()
    const markers = o.markers.map(marker)
    if (new Set(markers).size !== markers.length) return invalid()
    for (const code of markers) {
      const m = messages.find(m => m.marker === code)
      if (m?.direction !== 'inbound' || Date.parse(m.sentAt) < Date.parse(a) || Date.parse(m.sentAt) >= Date.parse(b)) return invalid()
    }
    outage = { start: a, end: b, markers }
  }
  return { start, end, phoneNumberId: r.phoneNumberId, participants, deployedAndSubscribed: bool(r.deployedAndSubscribed), outage, messages }
}
