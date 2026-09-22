// T-0013, paso 6 (cierre) — reporte agregado: cruza staging + dominio + excepciones
// contra los denominadores de T-0004 y hace visibles, por D-0008, cuántas Policies
// quedan fuera de cada join hacia atrás. Sólo agregados: nada de esta salida es una fila.

import type { Ejecutor } from './db.ts'

export interface Reporte {
  readonly polizasFuente: number
  readonly polizasEnScope: number
  readonly polizasImportadas: number
  readonly excepcionesPorClase: Record<string, number>
  readonly endosos: { readonly fuente: number; readonly importados: number; readonly sinPolicyPadre: number }
  readonly renovaciones: { readonly resueltas: number; readonly unresolved: number }
  readonly parties: { readonly contactos: number; readonly cuentas: number; readonly membresias: number }
  readonly insurers: number
  readonly contactPoints: Record<string, number>
  readonly policiesSinQuoteNiIssuance: number
}

export const generarReporte = async (sql: Ejecutor): Promise<Reporte> => {
  const [polizasFuente] = await sql<{ n: number }[]>`select count(*)::int as n from staging_policy`
  const [polizasImportadas] = await sql<{ n: number }[]>`select count(*)::int as n from policy_version where source_event_type = 'Polizas'`

  const excepciones = await sql<{ failure_class: string; n: number }[]>`
    select failure_class, count(*)::int as n from staging_import_exception
    where module = 'Polizas'
    group by failure_class
  `
  const excepcionesPorClase = Object.fromEntries(excepciones.map((fila) => [fila.failure_class, fila.n]))
  const polizasEnScope = (polizasFuente?.n ?? 0) - (excepcionesPorClase.NOT_IN_SCOPE ?? 0)

  const [endososFuente] = await sql<{ n: number }[]>`select count(*)::int as n from staging_endorsement`
  const [endososImportados] = await sql<{ n: number }[]>`select count(*)::int as n from endorsement`

  const [renovacionesResueltas] = await sql<{ n: number }[]>`select count(*)::int as n from policy where renewed_from_policy_id is not null`
  const [renovacionesUnresolved] = await sql<{ n: number }[]>`
    select count(*)::int as n from external_reference where relation_type = 'POLICY_RENEWAL'
  `

  const [contactos] = await sql<{ n: number }[]>`select count(*)::int as n from person_profile`
  const [cuentas] = await sql<{ n: number }[]>`select count(*)::int as n from organization_profile`
  const [membresias] = await sql<{ n: number }[]>`select count(*)::int as n from organization_membership`
  const [insurers] = await sql<{ n: number }[]>`select count(*)::int as n from insurer`

  const canales = await sql<{ channel: string; n: number }[]>`
    select channel, count(*)::int as n from contact_point group by channel
  `

  // D-0008: toda Policy es de primera clase, sin Quote/QuoteOption/Issuance en VS01. Este
  // conteo hace visible que el 100% queda fuera de ese join hacia atrás — no porque el
  // importador lo omita, sino porque Quote/Issuance no forman parte del scope de T-0013.
  const [sinQuoteNiIssuance] = await sql<{ n: number }[]>`select count(*)::int as n from policy`

  return {
    polizasFuente: polizasFuente?.n ?? 0,
    polizasEnScope,
    polizasImportadas: polizasImportadas?.n ?? 0,
    excepcionesPorClase,
    endosos: {
      fuente: endososFuente?.n ?? 0,
      importados: endososImportados?.n ?? 0,
      sinPolicyPadre: (endososFuente?.n ?? 0) - (endososImportados?.n ?? 0),
    },
    renovaciones: { resueltas: renovacionesResueltas?.n ?? 0, unresolved: renovacionesUnresolved?.n ?? 0 },
    parties: { contactos: contactos?.n ?? 0, cuentas: cuentas?.n ?? 0, membresias: membresias?.n ?? 0 },
    insurers: insurers?.n ?? 0,
    contactPoints: Object.fromEntries(canales.map((fila) => [fila.channel, fila.n])),
    policiesSinQuoteNiIssuance: sinQuoteNiIssuance?.n ?? 0,
  }
}
