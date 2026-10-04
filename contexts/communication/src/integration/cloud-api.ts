// Cliente de envío de texto de WhatsApp Cloud API. D-0063 ubica en el contexto el
// código que habla con WhatsApp, sin una capa abstracta encima.
//
// Forma del request y de las respuestas: la documentada por Meta en "Send messages"
// (POST /{version}/{phone_number_id}/messages). No hay una respuesta real capturada
// (## Risks de T-0025, R-27): los fixtures `send-*.documented.json` están marcados
// como documentados y la captura redactada queda para la tarea de despliegue.
//
// Clasificación del resultado, pensada para no perder un envío que pudo haber salido:
//   - 2xx con `messages[0].id`            → accepted, con el `wamid`;
//   - 4xx con `error`                     → rejected: Meta dice que no lo envió;
//   - timeout, red, 5xx o 2xx sin `id`    → unconfirmed: no se sabe.

const DEFAULT_BASE_URL = 'https://graph.facebook.com'
const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '::1', '[::1]'])
const VERSION = /^v\d+\.\d+$/
const DIGITS = /^\d+$/
export const SEND_TIMEOUT_MS = 15_000

export interface CloudApiConfig {
  /** Token de usuario del sistema. Nunca se loguea ni se devuelve. */
  readonly accessToken: string
  readonly phoneNumberId: string
  /** Versión de la Graph API, por ejemplo `v23.0`. */
  readonly apiVersion: string
  /** Solo para el Meta simulado del recorrido local: tiene que ser `localhost`. */
  readonly baseUrl?: string
  readonly timeoutMs?: number
  readonly fetch?: typeof fetch
}

export type SendOutcome =
  | { readonly kind: 'accepted'; readonly wamid: string }
  | { readonly kind: 'rejected'; readonly code: number | null; readonly title: string }
  | { readonly kind: 'unconfirmed'; readonly reason: string }

export type TextSender = (to: string, body: string) => Promise<SendOutcome>

/** Motivo por el que la configuración no sirve, o `null`. No cita el token. */
export const cloudApiConfigProblem = (config: CloudApiConfig): string | null => {
  if (config.accessToken === '') return 'falta el token de acceso de WhatsApp'
  if (!DIGITS.test(config.phoneNumberId)) return 'el phone_number_id no es numérico'
  if (!VERSION.test(config.apiVersion)) return 'la versión de la Graph API no tiene la forma vNN.N'
  if (config.baseUrl !== undefined) {
    let url: URL
    try {
      url = new URL(config.baseUrl)
    } catch {
      return 'la URL base de la Graph API no es válida'
    }
    if (!LOCAL_HOSTS.has(url.hostname)) return 'la URL base de la Graph API solo se puede cambiar hacia localhost'
  }
  return null
}

type Obj = Record<string, unknown>
const obj = (x: unknown): Obj | undefined =>
  typeof x === 'object' && x !== null && !Array.isArray(x) ? (x as Obj) : undefined

/**
 * El mensaje de error de Meta, sin lo que podría ser un teléfono o un `wamid`. Se guarda
 * y se muestra en la UI, así que no puede llevar datos del participante (R-19).
 */
export const redactErrorTitle = (message: string): string =>
  message
    .replace(/wamid\.[A-Za-z0-9+/=_-]+/g, 'wamid.[…]')
    .replace(/\+?\d[\d\s-]{6,}\d/g, '[número]')
    .slice(0, 200)

const rejected = (status: number, payload: unknown): SendOutcome => {
  const error = obj(obj(payload)?.error)
  const code = typeof error?.code === 'number' && Number.isInteger(error.code) ? error.code : null
  const message = typeof error?.message === 'string' && error.message !== '' ? error.message : `HTTP ${String(status)}`
  return { kind: 'rejected', code, title: redactErrorTitle(message) }
}

export const cloudApiSender = (config: CloudApiConfig): TextSender => {
  const problem = cloudApiConfigProblem(config)
  if (problem !== null) throw new Error(problem)
  const base = (config.baseUrl ?? DEFAULT_BASE_URL).replace(/\/+$/, '')
  const endpoint = `${base}/${config.apiVersion}/${config.phoneNumberId}/messages`
  const doFetch = config.fetch ?? fetch

  return async (to, body) => {
    let response: Response
    try {
      response = await doFetch(endpoint, {
        method: 'POST',
        headers: { authorization: `Bearer ${config.accessToken}`, 'content-type': 'application/json' },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to,
          type: 'text',
          text: { preview_url: false, body },
        }),
        signal: AbortSignal.timeout(config.timeoutMs ?? SEND_TIMEOUT_MS),
      })
    } catch (error) {
      const timedOut = error instanceof Error && (error.name === 'TimeoutError' || error.name === 'AbortError')
      return { kind: 'unconfirmed', reason: timedOut ? 'la API no respondió a tiempo' : 'falló la conexión con la API' }
    }

    let payload: unknown = null
    try {
      payload = await response.json()
    } catch {
      payload = null
    }

    if (response.ok) {
      const messages = obj(payload)?.messages
      const id = Array.isArray(messages) ? obj(messages[0])?.id : undefined
      if (typeof id === 'string' && id !== '') return { kind: 'accepted', wamid: id }
      return { kind: 'unconfirmed', reason: 'la API respondió sin el id del mensaje' }
    }
    if (response.status >= 400 && response.status < 500) return rejected(response.status, payload)
    return { kind: 'unconfirmed', reason: `la API respondió HTTP ${String(response.status)}` }
  }
}
