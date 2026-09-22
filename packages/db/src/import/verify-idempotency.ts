// T-0013, paso 7 — prueba real de idempotencia: no "no falla la segunda vez", el mismo
// estado. Por cada tabla de dominio que este importador escribe, calcula un fingerprint
// agregado (conteo de filas + hash del conjunto ordenado de columnas estructurales, no
// PII) y lo compara antes/después de una segunda corrida completa. Ninguna columna con
// nombre/email/teléfono entra al fingerprint: no hace falta, la igualdad de PKs y de las
// columnas estructurales certifica "mismo estado" sin necesidad de tocar PII.

import { createHash } from 'node:crypto'

import type { Ejecutor } from './db.ts'

const TABLAS: Record<string, string> = {
  party: 'id, kind, status, merged_into_party_id',
  person_profile: 'party_id, dni, cuil',
  organization_profile: 'party_id, cuit',
  contact_point: 'id, party_id, channel, normalized_value, source',
  organization_membership: 'organization_party_id, person_party_id',
  insurer: 'id, organization_party_id, canonical_name',
  insurer_alias: 'insurer_id, alias, source_system',
  policy: 'id, insurer_id, policy_number, renewed_from_policy_id',
  policy_version: 'policy_id, version_number, effective_from, effective_to, holder_party_id, term_start_date, term_end_date, renewal_mode',
  endorsement: 'policy_id, number, kind, effective_from, effective_to, source_reference',
  external_reference: 'source_system, source_entity_type, source_external_id, relation_type, resolution_status',
}

export interface Fingerprint {
  readonly filas: number
  readonly hash: string
}

export type FingerprintPorTabla = Readonly<Record<string, Fingerprint>>

export const calcularFingerprint = async (sql: Ejecutor): Promise<FingerprintPorTabla> => {
  const resultado: Record<string, Fingerprint> = {}
  for (const [tabla, columnas] of Object.entries(TABLAS)) {
    const filas = await sql.unsafe<{ v: string }[]>(
      `select (${columnas})::text as v from ${tabla} order by ${columnas}`,
    )
    const hash = createHash('sha256')
    for (const fila of filas) hash.update(fila.v)
    resultado[tabla] = { filas: filas.length, hash: hash.digest('hex') }
  }
  return resultado
}

export interface Diferencia {
  readonly tabla: string
  readonly antes: Fingerprint
  readonly despues: Fingerprint
}

export const compararFingerprints = (
  antes: FingerprintPorTabla,
  despues: FingerprintPorTabla,
): readonly Diferencia[] => {
  const diferencias: Diferencia[] = []
  for (const tabla of Object.keys(TABLAS)) {
    const a = antes[tabla]
    const d = despues[tabla]
    if (a === undefined || d === undefined) continue
    if (a.filas !== d.filas || a.hash !== d.hash) {
      diferencias.push({ tabla, antes: a, despues: d })
    }
  }
  return diferencias
}
