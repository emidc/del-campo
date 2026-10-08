// Payloads de prueba. Parten de los fixtures de `contexts/communication/fixtures/`, que
// tienen la forma documentada por Meta (los sintéticos) o capturada y redactada en
// T-0020 (los `real-*`), y solo cambian los valores: ninguno es un dato real (R-19).

import { createHmac } from 'node:crypto'
import { readFileSync } from 'node:fs'

export const TEST_APP_SECRET = 'secreto-de-prueba-no-es-de-meta'
export const TEST_VERIFY_TOKEN = 'token-de-prueba'
export const WEBHOOK_URL = 'https://receptor.example.test/webhook'
/** El `phone_number_id` de los fixtures sintéticos. Los `real-*` traen otro. */
export const TEST_PHONE_NUMBER_ID = '800000000000001'

export const readFixture = (name: string): string =>
  readFileSync(new URL(`../../fixtures/${name}`, import.meta.url), 'utf8')

export const sign = (body: string, secret = TEST_APP_SECRET): string =>
  'sha256=' + createHmac('sha256', secret).update(body).digest('hex')

/** Un POST como lo manda Meta. `signature: null` lo manda sin el header. */
export const webhookPost = (body: string, signature: string | null = sign(body)): Request =>
  new Request(WEBHOOK_URL, {
    method: 'POST',
    body,
    headers: signature === null ? { 'content-type': 'application/json' }
      : { 'content-type': 'application/json', 'x-hub-signature-256': signature },
  })

type Json = Record<string, unknown>

interface Envelope {
  entry: { changes: { value: Json }[] }[]
}

const envelope = (value: Json): string => {
  const base = JSON.parse(readFixture('inbound-text.json')) as Envelope
  const change = base.entry[0]?.changes[0]
  if (change === undefined) throw new Error('fixture inbound-text.json sin entry[0].changes[0]')
  const metadata = change.value.metadata
  change.value = { messaging_product: 'whatsapp', metadata, ...value }
  return JSON.stringify(base)
}

export interface TextInput {
  readonly wamid: string
  readonly timestamp: number
  readonly body?: string
  readonly waId?: string | null
  readonly bsuid?: string | null
  readonly name?: string
}

/** Un entrante de texto, con el participante en `from` y en `contacts`, como en los reales. */
export const textPayload = (...messages: TextInput[]): string =>
  envelope({
    contacts: messages.map((m) => ({
      profile: { name: m.name ?? 'Persona Sintética' },
      ...(m.waId === null ? {} : { wa_id: m.waId ?? '15550199001' }),
      ...(m.bsuid === undefined || m.bsuid === null ? {} : { user_id: m.bsuid }),
    })),
    messages: messages.map((m) => ({
      ...(m.waId === null ? {} : { from: m.waId ?? '15550199001' }),
      ...(m.bsuid === undefined || m.bsuid === null ? {} : { from_user_id: m.bsuid }),
      id: m.wamid,
      timestamp: String(m.timestamp),
      type: 'text',
      text: { body: m.body ?? `Texto sintético de ${m.wamid}.` },
    })),
  })

export interface StatusInput {
  readonly wamid: string
  readonly status: string
  readonly timestamp: number
  readonly error?: { readonly code: number; readonly title: string }
}

/** Webhooks de estado. Meta documenta `errors[]` en los `failed`. */
export const statusPayload = (...statuses: StatusInput[]): string =>
  envelope({
    statuses: statuses.map((s) => ({
      id: s.wamid,
      status: s.status,
      timestamp: String(s.timestamp),
      recipient_id: '15550199001',
      ...(s.error === undefined ? {} : { errors: [{ code: s.error.code, title: s.error.title }] }),
    })),
  })
