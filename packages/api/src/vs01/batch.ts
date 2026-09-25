// La fecha del lote que la app consulta. `SLICES/VS01.md` §2 la exige para que los
// resultados no aparenten ser datos en vivo de Zoho.
//
// Sale de `staging_import_batch` (T-0013) y no de una variable de entorno: una fecha
// configurada a mano puede quedar desactualizada respecto de la base sin que nada falle,
// que es exactamente el modo de falla que este requisito existe para evitar.

import { sql } from '../db.ts'
import type { Principal } from '../session/admission.ts'

export interface BatchStamp {
  readonly known: boolean
  /** ISO 8601, o null si la base no tiene ningún lote cargado. */
  readonly importedAt: string | null
  /** Primeros caracteres del SHA-256 del manifiesto: identifica el lote sin exponerlo entero. */
  readonly manifestPrefix: string | null
  readonly notes: string | null
}

interface BatchRow {
  readonly started_at: Date | string
  readonly source_manifest_sha256: string
  readonly notes: string | null
}

const UNKNOWN: BatchStamp = {
  known: false,
  importedAt: null,
  manifestPrefix: null,
  notes: null,
}

/**
 * Exige `Principal` como todos los casos de uso de este directorio. La fecha del lote no
 * es un dato de cliente, pero la propiedad que ADR-0059 declara es estructural —"una
 * consulta de datos sin sesión no tipa"— y una excepción la vuelve una convención.
 */
export const latestBatch = async (_principal: Principal): Promise<BatchStamp> => {
  const rows = await sql()<BatchRow[]>`
    select started_at, source_manifest_sha256, notes
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
    notes: row.notes,
  }
}

/** Texto que la app muestra siempre, incluida la constancia de que no sabe cuál es el lote. */
export const batchLabel = (stamp: BatchStamp): string => {
  if (!stamp.known || stamp.importedAt === null) {
    return 'Lote desconocido — esta base no declara ninguna importación'
  }
  const date = stamp.importedAt.slice(0, 10)
  const suffix = stamp.notes === null || stamp.notes.trim() === '' ? '' : ` · ${stamp.notes.trim()}`
  return `Datos del lote importado el ${date}${suffix}`
}
