// T-0013, paso 4 — catálogo de aseguradoras. No se re-deriva matching: D-0021 ya está
// resuelto por T-0004, con aprobación humana explícita, en
// catalog-curation-approved-20260919.local.json. Este módulo sólo lo aplica.
//
// `product_reference` en PolicyVersion es texto opaco (DOMAIN.md §26/§28; separación
// InsuranceProduct vs EnterpriseRisk diferida, REVIEWS/T-0004 §9): no hay catálogo de
// producto que importar como entidad, así que este módulo no toca Productos/Riesgo.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import type { Ejecutor } from './db.ts'

interface ProveedorExistente {
  source_id: string
  nombre: string
  tipo_propuesto: string
}

interface MappingRow {
  module: string
  source_id: string
  observed_label_exact: string
  planned_target_reference: string
  disposition: 'NEW_ENTITY' | 'SAME_ENTITY' | 'ALIAS_OF' | 'REVIEW'
  human_approved: boolean
}

interface CatalogoAprobado {
  status: string
  existing_suppliers_retained: ProveedorExistente[]
  exact_import_mapping: MappingRow[]
}

export const RUTA_CATALOGO_APROBADO = (raiz: string): string =>
  join(raiz, 'data', 'zoho-export-2026-09-16', 'profile', 'catalog-curation-approved-20260919.local.json')

/** `sourceId` de Proveedores/Compañía (= el valor de Polizas.Compañía.id) → insurerId de Broker OS. */
export type MapaAseguradoras = ReadonlyMap<string, string>

/**
 * Crea/reutiliza un `Insurer` por cada aseguradora curada (`tipo_propuesto ===
 * 'ASEGURADORA'` entre las 37 existentes, más las NEW_ENTITY aprobadas entre las 13
 * huérfanas de Proveedores). SAME_ENTITY resuelve contra el destino existente. Ninguna
 * fila de este catálogo crea Insurer desde un string no aprobado (D-0021): éste es
 * exactamente el conjunto que el owner aprobó, ni más ni menos.
 */
export const importarCatalogoAseguradoras = async (
  sql: Ejecutor,
  rutaCatalogo: string,
): Promise<MapaAseguradoras> => {
  const catalogo = JSON.parse(readFileSync(rutaCatalogo, 'utf8')) as CatalogoAprobado
  const mapa = new Map<string, string>()

  // Un Party ORGANIZATION por Insurer (INV requerido por 0001_vs01_core_schema.sql).
  const crearInsurer = async (nombre: string): Promise<string> => {
    const [party] = await sql<{ id: string }[]>`
      insert into party (kind, display_name_cache) values ('ORGANIZATION', ${nombre}) returning id
    `
    if (party === undefined) throw new Error('no se pudo crear party para insurer')
    const [insurer] = await sql<{ id: string }[]>`
      insert into insurer (organization_party_id, canonical_name) values (${party.id}, ${nombre}) returning id
    `
    if (insurer === undefined) throw new Error('no se pudo crear insurer')
    return insurer.id
  }

  const obtenerOCrearPorAlias = async (nombre: string, sourceId: string): Promise<string> => {
    const [existente] = await sql<{ insurer_id: string }[]>`
      select insurer_id from insurer_alias
      where alias = ${sourceId} and source_system = 'Zoho:Proveedores.id'
    `
    if (existente !== undefined) return existente.insurer_id

    const insurerId = await crearInsurer(nombre)
    await sql`
      insert into insurer_alias (insurer_id, alias, source_system)
      values (${insurerId}, ${sourceId}, 'Zoho:Proveedores.id')
      on conflict (alias, source_system) do nothing
    `
    return insurerId
  }

  for (const proveedor of catalogo.existing_suppliers_retained) {
    if (proveedor.tipo_propuesto !== 'ASEGURADORA') continue
    const insurerId = await obtenerOCrearPorAlias(proveedor.nombre, proveedor.source_id)
    mapa.set(proveedor.source_id, insurerId)
  }

  const nuevos = catalogo.exact_import_mapping.filter(
    (fila) => fila.module === 'Proveedores' && fila.disposition === 'NEW_ENTITY' && fila.human_approved,
  )
  for (const fila of nuevos) {
    const insurerId = await obtenerOCrearPorAlias(fila.observed_label_exact, fila.source_id)
    mapa.set(fila.source_id, insurerId)
  }

  const mismos = catalogo.exact_import_mapping.filter(
    (fila) => fila.module === 'Proveedores' && fila.disposition === 'SAME_ENTITY' && fila.human_approved,
  )
  for (const fila of mismos) {
    const destino = fila.planned_target_reference.replace('EXISTING_SOURCE:', '')
    const insurerId = mapa.get(destino)
    if (insurerId === undefined) {
      throw new Error(
        `catálogo: SAME_ENTITY ${fila.source_id} apunta a destino ${destino} no encontrado entre los existentes`,
      )
    }
    mapa.set(fila.source_id, insurerId)
  }

  return mapa
}
