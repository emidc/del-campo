// Estados de un saliente según los webhooks `statuses` de Cloud API. Meta no garantiza
// orden ni secuencia completa: `read` puede llegar sin `delivered` (hallazgo 8 de
// T-0020) y un reintento puede traer un estado viejo después de uno nuevo. Por eso el
// último estado no es el último que llegó, sino el más avanzado.

export const OUTBOUND_STATUSES = ['sent', 'delivered', 'read', 'failed'] as const
export type OutboundStatus = (typeof OUTBOUND_STATUSES)[number]

export const isOutboundStatus = (value: string): value is OutboundStatus =>
  (OUTBOUND_STATUSES as readonly string[]).includes(value)

/**
 * `failed` es terminal: ningún estado posterior lo reemplaza. Un mensaje no pasa de
 * `failed` a `read`; si ese par llegara, el error es el dato que no se puede perder.
 */
const RANK: Record<OutboundStatus, number> = { sent: 1, delivered: 2, read: 3, failed: 4 }

/** `next` reemplaza a `current` solo si es más avanzado. Un empate no reemplaza. */
export const outranks = (next: OutboundStatus, current: OutboundStatus): boolean =>
  RANK[next] > RANK[current]
