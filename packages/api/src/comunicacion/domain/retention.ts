// D-0065: el payload crudo se conserva 30 días. Cubre los 7 de reintentos de Meta y
// deja margen para reprocesar; después se borra. Los mensajes no se tocan.

export const RAW_DELIVERY_RETENTION_DAYS = 30

const DAY_MS = 24 * 60 * 60 * 1000

/** Se borran las entregas recibidas estrictamente antes de este instante. */
export const retentionCutoff = (now: Date): Date =>
  new Date(now.getTime() - RAW_DELIVERY_RETENTION_DAYS * DAY_MS)
