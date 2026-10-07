// Reproceso de entregas de webhook (T-0026). Meta no reintenta después de un 200
// (D-0065): lo que se respondió como recibido y no terminó de procesarse —`failed`, o
// `pending` porque el proceso cayó después de responder— solo se recupera desde su
// cuerpo crudo. El procesamiento es idempotente (un mensaje por `wamid`, un estado solo
// avanza), así que reprocesar algo que en parte ya se guardó no duplica nada.
//
// Cada entrega se reprocesa en su propia transacción, con la fila bloqueada: dos
// reprocesos simultáneos no toman la misma, y uno no espera al otro.

import { parseDelivery } from '../domain/payload.ts'
import { stalledBefore } from '../domain/reprocessing.ts'
import type { Sql } from '../persistence/database.ts'
import { applyDelivery, claimDeliveryForReprocess, listDeliveriesToReprocess, markDeliveryFailed } from '../persistence/store.ts'

/** Cuántas entregas toma una corrida, para que quepa en una función de Vercel. */
export const REPROCESS_BATCH = 100

export interface ReprocessOptions {
  /** El mismo filtro por número que el receptor (CO01 §3). */
  readonly phoneNumberId?: string
  readonly now?: Date
  readonly limit?: number
  /** Solo ids y resultados (R-19). */
  readonly log?: (line: string) => void
}

export type ReprocessOutcome = 'processed' | 'failed' | 'skipped'

export interface ReprocessResult {
  /** Qué se reprocesó y cómo terminó, por id de entrega. */
  readonly deliveries: { readonly id: number; readonly outcome: ReprocessOutcome }[]
  readonly processed: number
  readonly failed: number
  readonly skipped: number
}

const reprocessOne = async (
  sql: Sql,
  id: number,
  cutoff: Date,
  phoneNumberId: string | undefined,
): Promise<ReprocessOutcome> => {
  try {
    return await sql.begin(async (tx): Promise<ReprocessOutcome> => {
      const delivery = await claimDeliveryForReprocess(tx, id, cutoff)
      if (delivery === null) return 'skipped'
      let payload: unknown
      try {
        payload = JSON.parse(delivery.bodyRaw)
      } catch {
        await markDeliveryFailed(tx, id, new Error('el cuerpo no es JSON válido'))
        return 'failed'
      }
      const parsed = parseDelivery(payload, phoneNumberId === undefined ? {} : { phoneNumberId })
      try {
        // En un savepoint: si una escritura falla, se deshace solo el contenido y el
        // intento queda contado y marcado.
        await tx.savepoint((sp) => applyDelivery(sp, delivery, parsed))
      } catch (error) {
        await markDeliveryFailed(tx, id, error)
        return 'failed'
      }
      return parsed.discarded.length === 0 ? 'processed' : 'failed'
    })
  } catch (error) {
    // Ni siquiera se pudo marcar: la entrega sigue como estaba y la próxima corrida la retoma.
    await markDeliveryFailed(sql, id, error).catch(() => undefined)
    return 'failed'
  }
}

/**
 * Vuelve a procesar las entregas `failed` y las `pending` atascadas. Idempotente: se
 * puede correr programada y a pedido, y repetirla no duplica mensajes ni retrocede
 * estados. Devuelve qué reprocesó.
 */
export const reprocessDeliveries = async (sql: Sql, options: ReprocessOptions = {}): Promise<ReprocessResult> => {
  const cutoff = stalledBefore(options.now ?? new Date())
  const log = options.log ?? (() => undefined)
  const ids = await listDeliveriesToReprocess(sql, cutoff, options.limit ?? REPROCESS_BATCH)
  const deliveries: ReprocessResult['deliveries'] = []
  for (const id of ids) {
    const outcome = await reprocessOne(sql, id, cutoff, options.phoneNumberId)
    deliveries.push({ id, outcome })
    log(`reproceso de la entrega ${String(id)}: ${outcome}`)
  }
  const count = (o: ReprocessOutcome): number => deliveries.filter((d) => d.outcome === o).length
  return { deliveries, processed: count('processed'), failed: count('failed'), skipped: count('skipped') }
}
