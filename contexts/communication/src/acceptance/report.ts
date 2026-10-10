import type { Manifest } from './manifest.ts'

// La consulta solo devuelve marcadores/códigos/tiempos, nunca cuerpo ni identificadores personales.
export interface Observation {
  marker: string
  participant: 'P1' | 'P2' | null
  direction: 'inbound' | 'outbound'
  at: Date
  receivedAt: Date
  status: string | null
  acceptedFromUi: boolean
  windowOpen: boolean
}
export const measure = (m: Manifest, rows: Observation[], duplicateWamids: number, measuredAt = new Date()) => {
  const codes = m.messages.map(x => x.marker)
  const matches = (code: string) => rows.filter(r => r.marker === code)
  const missing = codes.filter(code => matches(code).length === 0)
  const repeated = codes.filter(code => matches(code).length > 1)
  const unexpected = [...new Set(rows.filter(r => !codes.includes(r.marker)).map(r => r.marker))]
  const mismatched = m.messages.filter(x => matches(x.marker).some(r => r.participant !== x.marker.split('-')[1] || r.direction !== x.direction)).map(x => x.marker)
  const inScope = rows.filter(r => codes.includes(r.marker))
  const inbound = inScope.filter(r => r.direction === 'inbound')
  const latency = inbound.map(r => (r.receivedAt.getTime() - r.at.getTime()) / 1000).sort((a, b) => a - b)
  const middle = Math.floor(latency.length / 2)
  const median = latency.length === 0 ? null : latency.length % 2 ? latency[middle] ?? null : ((latency[middle - 1] ?? 0) + (latency[middle] ?? 0)) / 2
  const ordered = (['P1', 'P2'] as const).every(p => {
    const expected = m.messages.filter(x => x.marker.split('-')[1] === p).sort((a, b) => a.phoneOrder - b.phoneOrder).map(x => x.marker)
    const actual = inScope.filter(r => r.participant === p).map(r => r.marker) // SQL: wa_timestamp, id, como UI
    return JSON.stringify(expected) === JSON.stringify(actual)
  })
  const outgoing = m.messages.filter(x => x.direction === 'outbound')
  const closedWindow = inScope.filter(r => r.direction === 'outbound' && !r.windowOpen).map(r => r.marker)
  const missingUiEvidence = m.messages.filter(x => !x.seenInUi || !x.seenOnPhone).map(x => x.marker)
  const wrongStatuses = outgoing.filter(x => {
    const [r] = matches(x.marker)
    return r?.status == null || x.observedStatus !== r.status
  }).map(x => x.marker)
  const incomingByParticipant = Object.fromEntries(['P1', 'P2'].map(p => [p, m.messages.filter(x => x.direction === 'inbound' && x.marker.split('-')[1] === p).length]))
  const outsidePeriod = inScope.filter(r => r.at.getTime() < Date.parse(m.start) || r.at.getTime() >= Date.parse(m.end)).map(r => r.marker)
  const complete = outsidePeriod.length === 0 && missing.length === 0 && repeated.length === 0 && unexpected.length === 0 && mismatched.length === 0
  const outageSeconds = m.outage ? (Date.parse(m.outage.end) - Date.parse(m.outage.start)) / 1000 : 0
  const recovered = m.outage !== null && outageSeconds >= 600 && m.outage.markers.length > 0 &&
    ['P1', 'P2'].every(p => m.outage?.markers.some(code => code.split('-')[1] === p)) &&
    m.outage.markers.every(code => matches(code).length === 1 && !missingUiEvidence.includes(code) &&
      (matches(code)[0]?.receivedAt.getTime() ?? 0) >= Date.parse(m.outage?.end ?? ''))
  const criteria = {
    duration: measuredAt.getTime() >= Date.parse(m.end) && Date.parse(m.end) - Date.parse(m.start) >= 72 * 3600_000 && m.deployedAndSubscribed,
    volume: complete && codes.length >= 50 && outgoing.length >= 10 && (incomingByParticipant.P1 ?? 0) >= 10 && (incomingByParticipant.P2 ?? 0) >= 10,
    losses: complete && missingUiEvidence.length === 0,
    duplicates: duplicateWamids === 0 && repeated.length === 0,
    order: complete && ordered && missingUiEvidence.length === 0,
    latency: complete && median !== null && median < 10 && latency.every(n => n >= 0),
    recovery: complete && recovered && duplicateWamids === 0,
    statuses: complete && outgoing.length > 0 && wrongStatuses.length === 0,
    replies: complete && outgoing.length > 0 && closedWindow.length === 0 && outgoing.every(x => x.fromUi && matches(x.marker)[0]?.acceptedFromUi),
  }
  return { measuredAt: measuredAt.toISOString(), start: m.start, end: m.end,
    // No es aceptación de T-0026: faltan evidencia operacional, fixtures y decisiones.
    criteria, measurements: { expected: codes.length, persisted: inScope.length, outgoing: outgoing.length,
      incomingByParticipant, medianInboundSeconds: median, duplicateWamids, outageSeconds },
    findings: { missing, repeated, unexpected, mismatched, missingUiEvidence, closedWindow, wrongStatuses, outsidePeriod },
    messages: inScope.map(r => ({ marker: r.marker, participant: r.participant, direction: r.direction,
      at: r.at.toISOString(), receivedAt: r.receivedAt.toISOString(), status: r.status })) }
}
