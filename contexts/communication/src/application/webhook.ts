// Receptor del webhook de WhatsApp Cloud API, escrito contra `Request`/`Response`
// estándar y no contra un framework, igual que `packages/api/src/http.ts`. El adaptador
// del despliegue (un route handler) es un envoltorio sobre esto.
//
// El orden lo fija D-0065: firma, entrega cruda guardada, 200, y recién después el
// procesamiento. Meta no reintenta después de un 200, así que lo que se responde como
// recibido tiene que estar escrito. Por eso el handler devuelve la respuesta y, aparte,
// la continuación `process`, que el adaptador corre después de responder (por ejemplo
// con `waitUntil`). Si el procesamiento falla, la entrega queda `failed` con el cuerpo
// crudo para reprocesar.

import { createHash, createHmac, timingSafeEqual } from 'node:crypto'

import { parseDelivery, type ParsedDelivery } from '../domain/payload.ts'
import type { Sql } from '../persistence/database.ts'
import { markDeliveryFailed, processDelivery, recordDelivery, type Delivery } from '../persistence/store.ts'

/** Meta documenta cuerpos de webhook muy por debajo de esto; más es un abuso o un error. */
export const MAX_BODY_BYTES = 1024 * 1024

export interface DeliveryStore {
  record(bodyRaw: string): Promise<Delivery>
  process(delivery: Delivery, parsed: ParsedDelivery): Promise<void>
  fail(deliveryId: number, error: unknown): Promise<void>
}

export const deliveryStore = (sql: Sql): DeliveryStore => ({
  record: (bodyRaw) => recordDelivery(sql, bodyRaw),
  process: (delivery, parsed) => processDelivery(sql, delivery, parsed),
  fail: (deliveryId, error) => markDeliveryFailed(sql, deliveryId, error),
})

export interface WebhookConfig {
  /** El token que se carga en Meta para verificar la URL (GET). */
  readonly verifyToken: string
  /** El App Secret de la app de Meta. Obligatorio: no hay modo sin firma. */
  readonly appSecret: string
  readonly store: DeliveryStore
  /**
   * El número de Del Campo que opera el contexto. Lo de otro número de la WABA se ignora
   * sin persistirlo (CO01 §3). El adaptador del despliegue lo exige.
   */
  readonly phoneNumberId?: string
  /** Solo conteos e ids técnicos: nada de contenido, teléfonos ni `wamid` (R-19). */
  readonly log?: (line: string) => void
}

export interface WebhookResult {
  readonly response: Response
  /** Lo que hay que correr después de responder; `null` si no hay nada. */
  readonly process: (() => Promise<void>) | null
}

const SIGNATURE = /^sha256=([0-9a-f]{64})$/i

/** Compara `X-Hub-Signature-256` con el HMAC-SHA256 del cuerpo crudo, en tiempo constante. */
export const verifySignature = (rawBody: Uint8Array, header: string | null, appSecret: string): boolean => {
  const match = header === null ? null : SIGNATURE.exec(header)
  if (match?.[1] === undefined) return false
  const given = Buffer.from(match[1], 'hex')
  const expected = createHmac('sha256', appSecret).update(rawBody).digest()
  return timingSafeEqual(given, expected)
}

/** Igualdad de strings en tiempo constante: se comparan sus hashes, que tienen el mismo largo. */
const sameSecret = (a: string, b: string): boolean =>
  timingSafeEqual(createHash('sha256').update(a).digest(), createHash('sha256').update(b).digest())

const empty = (status: number): WebhookResult => ({ response: new Response(null, { status }), process: null })

export const createWebhookHandler = (config: WebhookConfig): ((request: Request) => Promise<WebhookResult>) => {
  if (config.appSecret === '') throw new Error('falta el App Secret: el receptor no acepta entregas sin firma')
  if (config.verifyToken === '') throw new Error('falta el token de verificación del webhook')
  const log = config.log ?? (() => undefined)
  if (config.phoneNumberId === '') throw new Error('el phone_number_id del receptor no puede estar vacío')
  const parseOptions = config.phoneNumberId === undefined ? {} : { phoneNumberId: config.phoneNumberId }

  const verify = (url: URL): WebhookResult => {
    const q = url.searchParams
    const token = q.get('hub.verify_token')
    const challenge = q.get('hub.challenge')
    if (q.get('hub.mode') !== 'subscribe' || token === null || challenge === null || !sameSecret(token, config.verifyToken)) {
      return empty(403)
    }
    return {
      response: new Response(challenge, { status: 200, headers: { 'content-type': 'text/plain; charset=utf-8' } }),
      process: null,
    }
  }

  const receive = async (request: Request): Promise<WebhookResult> => {
    const declared = Number(request.headers.get('content-length') ?? '0')
    if (declared > MAX_BODY_BYTES) return empty(413)
    const rawBody = new Uint8Array(await request.arrayBuffer())
    if (rawBody.byteLength > MAX_BODY_BYTES) return empty(413)

    // Nada se escribe antes de verificar la firma: un 401 no deja rastro en la base.
    if (!verifySignature(rawBody, request.headers.get('x-hub-signature-256'), config.appSecret)) return empty(401)

    const bodyRaw = Buffer.from(rawBody).toString('utf8')
    // Si esto falla, la excepción sube y el adaptador responde 500: Meta reintenta.
    const delivery = await config.store.record(bodyRaw)

    const afterResponse = async (): Promise<void> => {
      let payload: unknown
      try {
        payload = JSON.parse(bodyRaw)
      } catch {
        // El mensaje de JSON.parse cita un fragmento del cuerpo: no se guarda ni se loguea.
        await config.store.fail(delivery.id, new Error('el cuerpo no es JSON válido'))
        log(`entrega ${String(delivery.id)}: cuerpo no JSON`)
        return
      }
      try {
        const parsed = parseDelivery(payload, parseOptions)
        await config.store.process(delivery, parsed)
        log(
          `entrega ${String(delivery.id)}: ${String(parsed.texts.length)} textos, ` +
            `${String(parsed.statuses.length)} estados, ${String(parsed.unsupported.length)} fuera de alcance, ` +
            `${String(parsed.discarded.length)} descartados, ${String(parsed.ignored)} de otro número`,
        )
      } catch (error) {
        await config.store.fail(delivery.id, error)
        log(`entrega ${String(delivery.id)}: error al procesar`)
      }
    }

    return { response: new Response(null, { status: 200 }), process: afterResponse }
  }

  return async (request) => {
    if (request.method === 'GET') return verify(new URL(request.url))
    if (request.method === 'POST') return receive(request)
    return { response: new Response(null, { status: 405, headers: { allow: 'GET, POST' } }), process: null }
  }
}
