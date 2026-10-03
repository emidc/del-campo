// Redacta un payload real de webhook para poder versionarlo como fixture (R-19).
//
//   node redact.ts captures/real.json fixtures/redactado.json
//
// Criterio de allowlist: solo se conservan tal cual las claves estructurales conocidas
// (tipos, estados, timestamps, categorías). Todo otro string se reemplaza por un valor
// sintético consistente: el mismo valor de entrada da siempre el mismo de salida, así
// que las relaciones entre mensajes, estados y participantes se preservan.
// No reemplaza la revisión a mano: un campo nuevo con PII bajo una clave de la allowlist
// pasaría sin redactar.
import { readFileSync, writeFileSync } from 'node:fs'

const KEEP = new Set([
  'object', 'field', 'messaging_product', 'type', 'status', 'timestamp',
  'expiration_timestamp', 'mime_type', 'category', 'pricing_model', 'billable',
  'code', 'animated', 'voice',
])

type Kind = 'phone' | 'name' | 'text' | 'wamid' | 'id' | 'other'

function kindOf(key: string, value: string): Kind {
  if (['wa_id', 'from', 'recipient_id', 'display_phone_number', 'phone_number'].includes(key)) return 'phone'
  if (key === 'name' || key === 'formatted_name' || key === 'first_name' || key === 'last_name') return 'name'
  if (value.startsWith('wamid.')) return 'wamid'
  if (key === 'body' || key === 'caption' || key === 'emoji' || key === 'message' || key === 'details') return 'text'
  if (key === 'id' || key.endsWith('_id') || /^\d{6,}$/.test(value)) return 'id'
  return 'other'
}

const maps = new Map<Kind, Map<string, string>>()
function synth(kind: Kind, value: string): string {
  let m = maps.get(kind)
  if (m === undefined) maps.set(kind, (m = new Map()))
  const known = m.get(value)
  if (known !== undefined) return known
  const n = m.size + 1
  const fake = {
    phone: `1555${String(n).padStart(7, '0')}`,
    name: `Persona Sintética ${String(n)}`,
    text: `Texto sintético ${String(n)}.`,
    wamid: `wamid.SYNTH-REDACTED-${String(n).padStart(4, '0')}`,
    id: `9${String(n).padStart(14, '0')}`,
    other: `REDACTED-${String(n)}`,
  }[kind]
  m.set(value, fake)
  return fake
}

export function redact(value: unknown, key = ''): unknown {
  if (Array.isArray(value)) return value.map((v) => redact(v, key))
  if (typeof value === 'object' && value !== null) {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, redact(v, k)]))
  }
  if (typeof value === 'string' && !KEEP.has(key)) return synth(kindOf(key, value), value)
  return value
}

if (import.meta.main) {
  const [input, output] = process.argv.slice(2)
  if (input === undefined || output === undefined) {
    console.error('Uso: node redact.ts <entrada.json> <salida.json>')
    process.exit(2)
  }
  const result = redact(JSON.parse(readFileSync(input, 'utf8')))
  writeFileSync(output, JSON.stringify(result, null, 2) + '\n')
  console.log(`Escrito ${output}. Revisalo a mano antes de versionarlo.`)
}
