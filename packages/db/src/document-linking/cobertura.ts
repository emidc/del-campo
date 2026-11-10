// T-0037 (I1c) — U8: cobertura documental de las pólizas.
//
// Cuenta cada Policy una sola vez en el mejor nivel documental que la pantalla le ofrece
// (`docs/migration/zoho/T-0037-refresco.md` §4). La clasificación sale de
// `getDocumentAccessForPolicies`, la misma consulta que usa VS01, para que U8 mida lo que
// el equipo ve y no una lectura paralela de las tablas que podría desviarse de ella.
//
// Salida sólo agregada: conteos y proporciones, nunca un id, una URL ni un número de
// póliza (R-19, D-0053).

import type { Ejecutor } from '../import/db.ts'
import { getDocumentAccessForPolicies } from './query.ts'
import type { PolicyDocumentAccess } from './query.ts'

/**
 * Los cuatro niveles, del mejor al peor. Sólo cuenta el documento de la póliza: la
 * carpeta del cliente no es el documento (D-0057, D-0064) y no sube a nadie de nivel.
 */
export const NIVELES_U8 = ['comprobado', 'sinComprobar', 'pendiente', 'sinDocumento'] as const
export type NivelU8 = (typeof NIVELES_U8)[number]

export const ROTULO_NIVEL_U8: Readonly<Record<NivelU8, string>> = {
  comprobado: 'Comprobado',
  sinComprobar: 'Sin comprobar',
  pendiente: 'Pendiente',
  sinDocumento: 'Sin documento',
}

export interface CoberturaDocumental {
  /** Pólizas medidas. Es la suma exacta de los cuatro niveles. */
  readonly polizas: number
  readonly niveles: Readonly<Record<NivelU8, number>>
}

/**
 * - Comprobado: «Abrir documento» con un vínculo que comprobó una persona (`HUMAN`, D-0057).
 * - Sin comprobar: «Abrir documento (según Zoho)», el enlace del lote (D-0064).
 * - Pendiente: sin documento, con un pendiente registrado. Incluye el ambiguo que la
 *   consulta deriva de dos vínculos humanos, porque la pantalla lo muestra igual.
 * - Sin documento: ninguno de los anteriores, tenga o no carpeta del cliente.
 */
export const nivelU8 = (acceso: PolicyDocumentAccess): NivelU8 => {
  if (acceso.document !== null) return acceso.document.level === 'HUMAN' ? 'comprobado' : 'sinComprobar'
  if (acceso.pending !== null) return 'pendiente'
  return 'sinDocumento'
}

/** U8 sobre un conjunto explícito de Policies. Cada id cuenta una vez, aunque se repita. */
export const coberturaDePolicies = async (
  sql: Ejecutor,
  policyIds: readonly string[],
): Promise<CoberturaDocumental> => {
  const unicos = [...new Set(policyIds)]
  const accesos = await getDocumentAccessForPolicies(sql, unicos)
  // La consulta devuelve una fila por Policy pedida. Si alguna vez devolviera dos, o
  // ninguna, los niveles dejarían de sumar el total y U8 mentiría sin avisar.
  const vistos = new Set(accesos.map((acceso) => acceso.policyId))
  if (accesos.length !== unicos.length || vistos.size !== unicos.length) {
    throw new Error(
      `U8: la consulta documental devolvió ${String(accesos.length)} fila(s) para ${String(unicos.length)} póliza(s)`,
    )
  }

  const niveles: Record<NivelU8, number> = { comprobado: 0, sinComprobar: 0, pendiente: 0, sinDocumento: 0 }
  for (const acceso of accesos) niveles[nivelU8(acceso)] += 1
  return { polizas: unicos.length, niveles }
}

/**
 * U8 sobre todas las Policies del dominio. El refresco nunca borra una póliza ausente de
 * un lote nuevo (`T-0037-refresco.md` §2) y la app la sigue mostrando, así que entra en
 * la medición: U8 mide lo que el equipo puede abrir hoy.
 */
export const medirCoberturaDocumental = async (sql: Ejecutor): Promise<CoberturaDocumental> => {
  const filas = await sql<{ id: string }[]>`select id from policy`
  return coberturaDePolicies(
    sql,
    filas.map((fila) => fila.id),
  )
}

/** «12,3 %», con coma decimal. Sin pólizas no hay proporción. */
export const proporcion = (parte: number, total: number): string =>
  total === 0 ? '—' : `${((parte * 100) / total).toFixed(1).replace('.', ',')} %`

/** La tabla que va a `ops/evidence/T-0037.md`: cuatro conteos, su proporción y el total. */
export const tablaU8 = (cobertura: CoberturaDocumental): string => {
  const filas = NIVELES_U8.map(
    (nivel) =>
      `| ${ROTULO_NIVEL_U8[nivel]} | ${String(cobertura.niveles[nivel])} | ${proporcion(cobertura.niveles[nivel], cobertura.polizas)} |`,
  )
  return [
    '| Nivel | Pólizas | Proporción |',
    '|---|---:|---:|',
    ...filas,
    `| Total | ${String(cobertura.polizas)} | ${cobertura.polizas === 0 ? '—' : '100 %'} |`,
  ].join('\n')
}
