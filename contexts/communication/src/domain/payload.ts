// Parseo del webhook de WhatsApp Cloud API: `entry[].changes[].value`, con `messages[]`
// (entrantes) y `statuses[]` (estados de salientes). Puro: sin I/O y sin dependencias.
//
// Tolerante por elemento, no por entrega: un elemento sin la forma esperada se descarta
// y se cuenta, sin tirar abajo a los demás. Los descartes se informan con un motivo
// estructural —nunca con contenido, teléfonos ni `wamid`, que codifica el teléfono
// (hallazgo 4 de T-0020)— para que la entrega quede marcada y se pueda reprocesar.

import { isOutboundStatus, type OutboundStatus } from './status.ts'

/** El participante tiene dos identificadores (D-0065): puede faltar uno, no ambos. */
export interface Participant {
  readonly waId: string | null
  readonly bsuid: string | null
}

export interface InboundText {
  readonly wamid: string
  readonly phoneNumberId: string
  readonly participant: Participant
  readonly profileName: string | null
  readonly body: string
  readonly waTimestamp: Date
}

/** Un entrante de un tipo fuera de alcance: se registra que llegó, sin contenido. */
export interface UnsupportedMessage {
  readonly wamid: string
  readonly type: string
  readonly phoneNumberId: string
  readonly participant: Participant
  readonly waTimestamp: Date
}

export interface StatusError {
  readonly code: number | null
  readonly title: string | null
}

export interface StatusUpdate {
  readonly wamid: string
  readonly status: OutboundStatus
  readonly statusAt: Date
  readonly error: StatusError | null
}

export interface ParsedDelivery {
  readonly texts: InboundText[]
  readonly unsupported: UnsupportedMessage[]
  readonly statuses: StatusUpdate[]
  /** Motivos estructurales de cada elemento descartado. Sin datos del mensaje. */
  readonly discarded: string[]
  /**
   * Elementos de otro número de la WABA, que no se persisten: el contexto opera un solo
   * número (CO01 §3). No son un error, así que no marcan la entrega como `failed`.
   */
  readonly ignored: number
}

export interface ParseOptions {
  /** Si está, solo se aceptan los cambios cuyo `metadata.phone_number_id` es este. */
  readonly phoneNumberId?: string
}

type Obj = Record<string, unknown>
const obj = (x: unknown): Obj | undefined =>
  typeof x === 'object' && x !== null && !Array.isArray(x) ? (x as Obj) : undefined
const arr = (x: unknown): unknown[] => (Array.isArray(x) ? x : [])
/**
 * Postgres no admite U+0000 en `text`: un string que lo contiene haría fallar la
 * transacción de toda la entrega. Se trata como ausente, y el elemento se descarta con
 * motivo en vez de arrastrar a los válidos (hallazgo C1 de la revisión ciega).
 */
const NUL = '\u0000'
const str = (x: unknown): string | null => (typeof x === 'string' && x !== '' && !x.includes(NUL) ? x : null)

/** Los timestamps de Meta son segundos Unix, como string. Fuera del rango de `Date`, no hay timestamp. */
const unixSeconds = (x: unknown): Date | null => {
  const s = str(x)
  if (s === null || !/^\d+$/.test(s)) return null
  const date = new Date(Number(s) * 1000)
  return Number.isFinite(date.getTime()) ? date : null
}

interface Contact {
  readonly waId: string | null
  readonly bsuid: string | null
  readonly profileName: string | null
}

const contactsOf = (value: Obj): Contact[] =>
  arr(value.contacts).map((c) => {
    const contact = obj(c)
    return {
      waId: str(contact?.wa_id),
      bsuid: str(contact?.user_id),
      profileName: str(obj(contact?.profile)?.name),
    }
  })

/**
 * El contacto que corresponde a un entrante: por `wa_id` o por BSUID. Si el cambio trae
 * un solo contacto y no hay con qué compararlo, es ese.
 */
const contactFor = (contacts: readonly Contact[], waId: string | null, bsuid: string | null): Contact | undefined =>
  contacts.find((c) => (waId !== null && c.waId === waId) || (bsuid !== null && c.bsuid === bsuid)) ??
  (contacts.length === 1 && waId === null && bsuid === null ? contacts[0] : undefined)

const statusErrorOf = (status: Obj): StatusError | null => {
  const first = obj(arr(status.errors)[0])
  if (first === undefined) return null
  const code = typeof first.code === 'number' && Number.isInteger(first.code) ? first.code : null
  const title = str(first.title) ?? str(first.message)
  return code === null && title === null ? null : { code, title }
}

export const parseDelivery = (payload: unknown, options: ParseOptions = {}): ParsedDelivery => {
  const out: Omit<ParsedDelivery, 'ignored'> = { texts: [], unsupported: [], statuses: [], discarded: [] }
  let ignored = 0

  for (const entry of arr(obj(payload)?.entry)) {
    for (const rawChange of arr(obj(entry)?.changes)) {
      const change = obj(rawChange)
      // Otros campos suscriptos (cambios de cuenta, de plantillas…) no son mensajes.
      if (change?.field !== undefined && change.field !== 'messages') continue
      const value = obj(change?.value)
      if (value === undefined) continue

      const messages = arr(value.messages)
      const statuses = arr(value.statuses)
      const phoneNumberId = str(obj(value.metadata)?.phone_number_id)
      if (phoneNumberId === null) {
        for (let i = 0; i < messages.length + statuses.length; i++) out.discarded.push('cambio sin metadata.phone_number_id')
        continue
      }
      if (options.phoneNumberId !== undefined && phoneNumberId !== options.phoneNumberId) {
        ignored += messages.length + statuses.length
        continue
      }
      const contacts = contactsOf(value)

      for (const m of messages) {
        const message = obj(m)
        const wamid = str(message?.id)
        const waTimestamp = unixSeconds(message?.timestamp)
        if (message === undefined || wamid === null) {
          out.discarded.push('mensaje sin id')
          continue
        }
        if (waTimestamp === null) {
          out.discarded.push('mensaje sin timestamp válido')
          continue
        }
        const fromWaId = str(message.from)
        const fromBsuid = str(message.from_user_id)
        const contact = contactFor(contacts, fromWaId, fromBsuid)
        const participant: Participant = {
          waId: fromWaId ?? contact?.waId ?? null,
          bsuid: fromBsuid ?? contact?.bsuid ?? null,
        }
        if (participant.waId === null && participant.bsuid === null) {
          out.discarded.push('mensaje sin wa_id ni BSUID')
          continue
        }

        const type = str(message.type) ?? 'unknown'
        if (type !== 'text') {
          out.unsupported.push({ wamid, type, phoneNumberId, participant, waTimestamp })
          continue
        }
        const rawBody = obj(message.text)?.body
        if (typeof rawBody === 'string' && rawBody.includes(NUL)) {
          out.discarded.push('mensaje de texto con U+0000, que Postgres no admite')
          continue
        }
        const body = str(rawBody)
        if (body === null) {
          out.discarded.push('mensaje de texto sin text.body')
          continue
        }
        out.texts.push({
          wamid,
          phoneNumberId,
          participant,
          profileName: contact?.profileName ?? null,
          body,
          waTimestamp,
        })
      }

      for (const s of statuses) {
        const status = obj(s)
        const wamid = str(status?.id)
        const name = str(status?.status)
        const statusAt = unixSeconds(status?.timestamp)
        if (status === undefined || wamid === null || statusAt === null) {
          out.discarded.push('estado sin id o sin timestamp válido')
          continue
        }
        if (name === null || !isOutboundStatus(name)) {
          out.discarded.push(`estado desconocido: ${name ?? '(vacío)'}`)
          continue
        }
        out.statuses.push({
          wamid,
          status: name,
          statusAt,
          error: name === 'failed' ? statusErrorOf(status) : null,
        })
      }
    }
  }
  return { ...out, ignored }
}
