// Ventana de servicio de WhatsApp: se puede responder con texto libre durante las 24 h
// que siguen al último entrante del participante (CO01 §2). Se mide con el timestamp
// de WhatsApp del entrante, no con la hora en que llegó el webhook. Meta mide la
// ventana de su lado; cerca del borde puede rechazar un envío que esto deja pasar, y
// en ese caso se muestra su error (## Risks de T-0025).

export const SERVICE_WINDOW_MS = 24 * 60 * 60 * 1000

export interface ServiceWindow {
  readonly open: boolean
  /** Cuándo se cierra o se cerró; `null` si el participante nunca escribió. */
  readonly closesAt: Date | null
}

export const serviceWindow = (lastInboundAt: Date | null, now: Date): ServiceWindow => {
  if (lastInboundAt === null) return { open: false, closesAt: null }
  const closesAt = new Date(lastInboundAt.getTime() + SERVICE_WINDOW_MS)
  return { open: now.getTime() < closesAt.getTime(), closesAt }
}
