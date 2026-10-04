// Operaciones que usan la UI y la tarea programada de CO01. Esta tarea no llama a la
// API de Meta ni programa nada: deja las operaciones listas y probadas.

import { retentionCutoff } from '../domain/retention.ts'
import type { Sql } from '../persistence/database.ts'
import { deleteDeliveriesReceivedBefore, insertOutboundMessage, type OutboundMessage } from '../persistence/store.ts'

/**
 * Persiste un saliente después de que la API lo aceptó, con el `wamid` que devolvió.
 * Si la API rechazó el envío, no se llama: un saliente no se guarda como enviado sin
 * `wamid` (CO01 §2).
 */
export const recordOutboundMessage = async (sql: Sql, message: OutboundMessage): Promise<number> => {
  if (message.wamid === '') throw new Error('un saliente se persiste con el wamid que devolvió la API')
  if (message.body === '') throw new Error('un saliente de texto no puede tener cuerpo vacío')
  if (message.recipient.waId === null && message.recipient.bsuid === null) {
    throw new Error('el destinatario necesita wa_id o BSUID')
  }
  return insertOutboundMessage(sql, message)
}

/** Borra las entregas crudas de más de 30 días (D-0065) y devuelve cuántas. Los mensajes quedan. */
export const purgeExpiredDeliveries = (sql: Sql, now: Date = new Date()): Promise<number> =>
  deleteDeliveriesReceivedBefore(sql, retentionCutoff(now))
