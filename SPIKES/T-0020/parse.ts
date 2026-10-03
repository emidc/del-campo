// Parseo del payload de webhook de WhatsApp Cloud API. Tolerante: lo que no tiene la
// forma esperada se descarta, no rompe la entrega entera.

export interface InboundText {
  wamid: string
  phoneNumberId: string
  waId: string
  body: string
  waTimestamp: Date
  raw: unknown
}

export interface Status {
  wamid: string
  status: string
  phoneNumberId: string
  recipientId: string
  waTimestamp: Date
  raw: unknown
}

export interface Ignored {
  wamid: string
  type: string
  raw: unknown
}

export interface Parsed {
  messages: InboundText[]
  statuses: Status[]
  ignored: Ignored[]
}

type Obj = Record<string, unknown>
const obj = (x: unknown): Obj | undefined =>
  typeof x === 'object' && x !== null && !Array.isArray(x) ? (x as Obj) : undefined
const arr = (x: unknown): unknown[] => (Array.isArray(x) ? x : [])
const str = (x: unknown): string | undefined => (typeof x === 'string' && x !== '' ? x : undefined)

/** Los timestamps de Meta son segundos Unix como string. */
const unixSeconds = (x: unknown): Date | undefined => {
  const s = str(x)
  if (s === undefined || !/^\d+$/.test(s)) return undefined
  return new Date(Number(s) * 1000)
}

export function parsePayload(payload: unknown): Parsed {
  const out: Parsed = { messages: [], statuses: [], ignored: [] }
  for (const entry of arr(obj(payload)?.entry)) {
    for (const change of arr(obj(entry)?.changes)) {
      const value = obj(obj(change)?.value)
      const phoneNumberId = str(obj(value?.metadata)?.phone_number_id)
      if (value === undefined || phoneNumberId === undefined) continue

      for (const m of arr(value.messages)) {
        const msg = obj(m)
        const wamid = str(msg?.id)
        const type = str(msg?.type) ?? 'unknown'
        if (msg === undefined || wamid === undefined) continue
        const waId = str(msg.from)
        const waTimestamp = unixSeconds(msg.timestamp)
        const body = str(obj(msg.text)?.body)
        if (type === 'text' && waId !== undefined && waTimestamp !== undefined && body !== undefined) {
          out.messages.push({ wamid, phoneNumberId, waId, body, waTimestamp, raw: msg })
        } else {
          out.ignored.push({ wamid, type, raw: msg })
        }
      }

      for (const s of arr(value.statuses)) {
        const st = obj(s)
        const wamid = str(st?.id)
        const status = str(st?.status)
        const recipientId = str(st?.recipient_id)
        const waTimestamp = unixSeconds(st?.timestamp)
        if (st === undefined || wamid === undefined || status === undefined || recipientId === undefined || waTimestamp === undefined) continue
        out.statuses.push({ wamid, status, phoneNumberId, recipientId, waTimestamp, raw: st })
      }
    }
  }
  return out
}
