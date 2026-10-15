// Soporte de tests de la importación (T-0029): los lotes de la 15b en disco
// (`SPIKES/T-0021/v0/fase-15/sinteticos/` y `invalidos/`), leídos en su lugar y sin tocarlos, y
// lotes armados a partir del lote base de los inválidos para los casos que la 15b no tiene en
// disco (avisos, lotes posteriores, celdas sin destino). Todo sintético (R-19).

import { existsSync, readFileSync } from 'node:fs'

import { ARCHIVOS, porArchivo, type Archivo, type Contrato } from '../domain/contrato.ts'
import { comoFilas, escribirCsv, leerCsv } from '../domain/csv.ts'
import { SINTETICOS, SPIKE } from './sinteticos.ts'

export { SINTETICOS }
export const INVALIDOS = new URL('fase-15/invalidos/', SPIKE)
export const CONTRATO_SPIKE = new URL('fase-15/contrato/', SPIKE)
/** La fecha de corte de los tests de la 15b (`dossier-fase-15b.md` §3). */
export const FECHA_CORTE = '2026-10-14'

export type Lote = Record<Archivo, Uint8Array>
export type Fila = Record<string, string>
export type Filas = Record<Archivo, Fila[]>

export const leerCarpeta = (url: URL): Lote => porArchivo((a) => readFileSync(new URL(a, url)))

/** Un caso inválido de la 15b: `base/` más los archivos que su carpeta reemplaza. */
export const casoInvalido = (regla: string): Lote =>
  porArchivo((a) => {
    const propio = new URL(`${regla}/${a}`, INVALIDOS)
    return readFileSync(existsSync(propio) ? propio : new URL(`base/${a}`, INVALIDOS))
  })

export interface ErrorEsperado {
  readonly caso: string
  readonly regla_id: string
  readonly archivo: string
  readonly fila: string
  readonly error_esperado: string
}

export function erroresEsperados(): ErrorEsperado[] {
  const l = leerCsv(readFileSync(new URL('errores-esperados.csv', INVALIDOS)))
  if (!l.ok) throw new Error(l.motivo)
  return comoFilas(l) as unknown as ErrorEsperado[]
}

/** Las filas de un lote, para cambiarlas en un test. */
export function filasDe(lote: Lote): Filas {
  return porArchivo((a) => {
    const l = leerCsv(lote[a])
    if (!l.ok) throw new Error(`${a}: ${l.motivo}`)
    return comoFilas(l)
  })
}

/** Vuelve a escribir las filas con las columnas del contrato, en su orden. */
export function aLote(contrato: Contrato, filas: Filas): Lote {
  const enc = new TextEncoder()
  return porArchivo((a) => enc.encode(escribirCsv(contrato.columnas[a].map((c) => c.nombre), filas[a])))
}

/** El lote base de los inválidos (válido), como filas. */
export const filasBase = (): Filas => filasDe(leerCarpeta(new URL('base/', INVALIDOS)))

/**
 * Los ids del lote base, por su `id_origen` (P, S1, S2, R1, R2, ESC, A1…). Las evaluaciones van
 * por `evaluacion_id_origen` (E-S1, E-R1, E-R1b…).
 */
export function idsBase(f: Filas = filasBase()): Map<string, string> {
  const ids = new Map<string, string>()
  for (const r of f['risks.csv']) {
    ids.set(r.id_origen ?? '', r.risk_id ?? '')
    if ((r.evaluacion_id ?? '') !== '') ids.set(r.evaluacion_id_origen ?? '', r.evaluacion_id ?? '')
  }
  for (const r of f['action-plan.csv']) ids.set(r.id_origen ?? '', r.accion_id ?? '')
  for (const r of f['risk-transfer.csv']) ids.set(r.id_origen ?? '', (r.transferencia_id ?? '') !== '' ? (r.transferencia_id ?? '') : (r.evento_id ?? ''))
  return ids
}

/** Un id con el prefijo de la entidad y 26 caracteres Crockford distinto en cada llamada (RV-ID-01). */
let siguiente = 1
export const idNuevo = (prefijo: string): string => `${prefijo}-7Z${String(siguiente++).padStart(24, '0')}`

export const vacias = (): Filas => porArchivo(() => [] as Fila[])
export { ARCHIVOS }
