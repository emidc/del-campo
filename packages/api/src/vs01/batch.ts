// La fecha del lote que la app consulta. `SLICES/VS01.md` §2 la exige para que los
// resultados no aparenten ser datos en vivo de Zoho.
//
// Sale de `staging_import_batch` (T-0013) y no de una variable de entorno: una fecha
// configurada a mano puede quedar desactualizada respecto de la base sin que nada falle,
// que es exactamente el modo de falla que este requisito existe para evitar.
//
// Las notas del lote no se leen: son texto libre de quien importa, y en `AUTH_MODE=oidc`
// `broker_app` no tiene permiso sobre esa columna (migración 0011). El lote sintético de
// `scripts/vs01/seed-sintetico.mjs` se reconoce por su huella fija, no por sus notas.

import { conDatos, type Ejecutor } from '../acceso/datos.ts'
import { sql } from '../db.ts'
import type { Principal } from '../session/admission.ts'

export interface BatchStamp {
  readonly known: boolean
  /** ISO 8601, o null si la base no tiene ningún lote cargado. */
  readonly importedAt: string | null
  /** Primeros caracteres del SHA-256 del manifiesto: identifica el lote sin exponerlo entero. */
  readonly manifestPrefix: string | null
  /** El lote de `scripts/vs01/seed-sintetico.mjs`: la cabecera lo dice, para que nadie lo confunda con datos reales. */
  readonly synthetic: boolean
}

/** La huella con la que `scripts/vs01/seed-sintetico.mjs` registra su lote. Ningún SHA-256 real es este. */
export const MANIFIESTO_SINTETICO = '0'.repeat(64)

export const MARCA_SINTETICA = 'LOTE SINTÉTICO — sin datos de clientes'

interface BatchRow {
  readonly started_at: Date | string
  readonly source_manifest_sha256: string
}

const UNKNOWN: BatchStamp = {
  known: false,
  importedAt: null,
  manifestPrefix: null,
  synthetic: false,
}

/** La consulta del lote, con el ejecutor de una transacción ya admitida. Sólo fecha y huella. */
export const leerLote = async (executor: Ejecutor): Promise<BatchStamp> => {
  const rows = await executor<BatchRow[]>`
    select started_at, source_manifest_sha256
    from staging_import_batch
    order by started_at desc
    limit 1
  `
  const row = rows[0]
  if (row === undefined) return UNKNOWN
  return {
    known: true,
    importedAt: row.started_at instanceof Date ? row.started_at.toISOString() : row.started_at,
    manifestPrefix: row.source_manifest_sha256.slice(0, 12),
    synthetic: row.source_manifest_sha256 === MANIFIESTO_SINTETICO,
  }
}

/**
 * Exige `Principal` como todos los casos de uso de este directorio. La fecha del lote no
 * es un dato de cliente, pero la propiedad que ADR-0059 declara es estructural —"una
 * consulta de datos sin sesión no tipa"— y una excepción la vuelve una convención.
 */
export const latestBatch = (principal: Principal): Promise<BatchStamp> => conDatos(sql(), principal, leerLote)

/** Texto que la app muestra siempre, incluida la constancia de que no sabe cuál es el lote. */
export const batchLabel = (stamp: BatchStamp): string => {
  if (!stamp.known || stamp.importedAt === null) {
    return 'Lote desconocido — esta base no declara ninguna importación'
  }
  const fecha = `Datos del lote importado el ${stamp.importedAt.slice(0, 10)}`
  return stamp.synthetic ? `${fecha} · ${MARCA_SINTETICA}` : fecha
}
