// Operaciones que usan la UI y la tarea programada de CO01. El envío por la API está en
// reply.ts; acá, la persistencia del saliente y la retención.

import { retentionCutoff } from '../domain/retention.ts'
import { clearSettledAttemptBodies, settleStalePendingAttempts } from '../persistence/attempts.ts'
import type { Sql } from '../persistence/database.ts'
import {
  countUnprocessedDeliveriesReceivedBefore,
  deleteSettledDeliveriesReceivedBefore,
  insertOutboundMessage,
  type OutboundMessage,
} from '../persistence/store.ts'

/** Por qué un saliente no se puede persistir, o `null`. Lo usan este archivo y el envío de la UI. */
export const outboundMessageProblem = (message: OutboundMessage): string | null => {
  if (message.wamid === '') return 'un saliente se persiste con el wamid que devolvió la API'
  if (message.body === '') return 'un saliente de texto no puede tener cuerpo vacío'
  if (message.recipient.waId === null && message.recipient.bsuid === null) return 'el destinatario necesita wa_id o BSUID'
  return null
}

/**
 * Persiste un saliente después de que la API lo aceptó, con el `wamid` que devolvió.
 * Si la API rechazó el envío, no se llama: un saliente no se guarda como enviado sin
 * `wamid` (CO01 §2).
 */
export const recordOutboundMessage = async (sql: Sql, message: OutboundMessage): Promise<number> => {
  const problem = outboundMessageProblem(message)
  if (problem !== null) throw new Error(problem)
  return insertOutboundMessage(sql, message)
}

/**
 * Borra las entregas crudas `processed` e `ignored` de más de 30 días (D-0065) y devuelve
 * cuántas. Los mensajes quedan. Las `pending` y `failed` no se borran aunque estén
 * vencidas: el crudo es para reprocesar, y borrar lo que todavía no se recuperó lo
 * perdería en silencio. Se cuentan en `applyRetention` y la UI las muestra como atraso.
 */
export const purgeExpiredDeliveries = async (sql: Sql, now: Date = new Date()): Promise<number> => {
  const deleted = await deleteSettledDeliveriesReceivedBefore(sql, retentionCutoff(now))
  return deleted.processed + deleted.ignored
}

/** Un `pending` de más de una hora no está en curso: el envío tiene un timeout de 15 s. */
const STALE_PENDING_FOR_RETENTION_MS = 60 * 60 * 1000

export interface RetentionResult {
  readonly deliveries: number
  /**
   * De `deliveries`, las `ignored`: todo su contenido era de otro número. Si el número
   * configurado estuvo mal hasta su vencimiento, esto es lo que se perdió; queda contado.
   */
  readonly ignoredDeleted: number
  /** Entregas vencidas que no se borraron por no estar procesadas. Distinto de 0 pide revisión. */
  readonly unprocessedKept: number
  readonly staleAttempts: number
  readonly attemptBodies: number
}

/**
 * La retención completa de D-0065, para la tarea programada de CO01: las entregas
 * crudas procesadas de más de 30 días y el texto de los intentos de envío no aceptados
 * cerrados hace más de 30 días. Antes cierra como `unconfirmed` los `pending` abandonados, para
 * que su texto también entre en la retención. Los mensajes no se tocan.
 */
export const applyRetention = async (sql: Sql, now: Date = new Date()): Promise<RetentionResult> => {
  const deleted = await deleteSettledDeliveriesReceivedBefore(sql, retentionCutoff(now))
  const staleAttempts = await settleStalePendingAttempts(sql, new Date(now.getTime() - STALE_PENDING_FOR_RETENTION_MS), now)
  const attemptBodies = await clearSettledAttemptBodies(sql, retentionCutoff(now))
  const unprocessedKept = await countUnprocessedDeliveriesReceivedBefore(sql, retentionCutoff(now))
  return {
    deliveries: deleted.processed + deleted.ignored,
    ignoredDeleted: deleted.ignored,
    unprocessedKept,
    staleAttempts,
    attemptBodies,
  }
}
