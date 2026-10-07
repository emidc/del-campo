// Cuándo la UI tiene que decir que las entregas de webhook no están al día (T-0026).
// Función pura, sin React, para que la condición tenga test: la hora de la última
// entrega recibida sola aparenta salud aunque nada se esté guardando.

export interface DeliveryCounts {
  /** Entregas `failed`, incluidas las que ya se reintentaron. */
  readonly failed: number
  /** `pending` que nadie está procesando: el procesamiento está detenido. */
  readonly stalled: number
  /** `ignored` de las últimas 24 h: todo su contenido era de otro número. */
  readonly ignored: number
}

export type DeliveryAlert = 'backlog' | 'ignored'

/** Las alertas que corresponden, en el orden en que se muestran. Vacío solo si todo está al día. */
export const deliveryAlerts = (d: DeliveryCounts): DeliveryAlert[] => [
  ...(d.failed + d.stalled > 0 ? (['backlog'] as const) : []),
  ...(d.ignored > 0 ? (['ignored'] as const) : []),
]
