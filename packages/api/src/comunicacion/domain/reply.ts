// Reglas de una respuesta desde la UI, antes de tocar la base o la API. Puro.

/** El máximo que Cloud API documenta para `text.body`. */
export const MAX_REPLY_LENGTH = 4096

/**
 * Un pending más viejo que esto ya no está en curso: la llamada a la API tiene un
 * timeout menor. Se muestra como intento sin confirmar.
 */
export const STALE_PENDING_MS = 60 * 1000

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export const isIdempotencyKey = (value: string): boolean => UUID.test(value)

/** Motivo por el que el texto no se puede enviar, o `null` si se puede. Sin citar el texto. */
export const replyBodyProblem = (body: string): string | null => {
  if (body.trim() === '') return 'el mensaje está vacío'
  if (body.includes('\u0000')) return 'el mensaje contiene caracteres inválidos'
  // En code points, no en unidades UTF-16: un emoji cuenta uno.
  if (Array.from(body).length > MAX_REPLY_LENGTH) return `el mensaje supera los ${String(MAX_REPLY_LENGTH)} caracteres`
  return null
}

export type AttemptState = 'pending' | 'accepted' | 'rejected' | 'unconfirmed'

/** Cómo se ve un intento no aceptado: en curso mientras es reciente, sin confirmar después. */
export const visibleAttemptState = (
  state: 'pending' | 'unconfirmed',
  createdAt: Date,
  now: Date,
): 'sending' | 'unconfirmed' =>
  state === 'pending' && now.getTime() - createdAt.getTime() < STALE_PENDING_MS ? 'sending' : 'unconfirmed'
