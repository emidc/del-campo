// Lectura del contrato aprobado en la 15a (`../contrato/`): columnas de cada archivo y reglas de
// validación con su severidad y su texto de error. El validador sale de acá, no de los CSV
// sintéticos: si el contrato cambia, el validador lo lee.

import { readFileSync } from 'node:fs'

import { comoFilas, leerCsv } from './csv.ts'

export type Archivo = 'risks.csv' | 'action-plan.csv' | 'risk-transfer.csv'
export const ARCHIVOS: readonly Archivo[] = ['risks.csv', 'action-plan.csv', 'risk-transfer.csv']

/** Un valor por archivo del lote. */
export function porArchivo<T>(f: (a: Archivo) => T): Record<Archivo, T> {
  return { 'risks.csv': f('risks.csv'), 'action-plan.csv': f('action-plan.csv'), 'risk-transfer.csv': f('risk-transfer.csv') }
}

export interface Columna {
  readonly nombre: string
  readonly tipo: string
  readonly obligatoriedad: string
  readonly condicion: string
  /** Valores de un enum; vacío si la columna no es enum. */
  readonly valores: string[]
  readonly reglas: string[]
}

export interface Regla {
  readonly id: string
  readonly archivo: string
  readonly clase: string
  readonly severidad: 'rechazo' | 'aviso'
  readonly descripcion: string
  readonly errorEsperado: string
}

const CONTRATO = new URL('../contrato/', import.meta.url)

function leer(nombre: string): Record<string, string>[] {
  const l = leerCsv(readFileSync(new URL(nombre, CONTRATO)))
  if (!l.ok) throw new Error(`contrato/${nombre}: ${l.motivo}`)
  return comoFilas(l)
}

/**
 * Valores de un enum tal como los escribe el contrato: «a | b | c». Si el primero tiene un prefijo
 * que los demás no repiten («metodologia v0.1 | v0.2 | … | v1»), el prefijo vale para todos.
 */
export function valoresEnum(texto: string): string[] {
  const vs = texto.split(' | ').map((v) => v.trim()).filter((v) => v !== '')
  const primero = vs[0] ?? ''
  const m = /^(\S+) (.+)$/.exec(primero)
  if (m !== null && vs.slice(1).every((v) => !v.includes(' ') || /^v\d/.test(v))) {
    const prefijo = m[1] ?? ''
    if (vs.slice(1).every((v) => /^v\d/.test(v))) return vs.map((v, i) => (i === 0 ? v : `${prefijo} ${v}`))
  }
  return vs
}

export function columnas(archivo: Archivo): Columna[] {
  return leer(`columnas-${archivo.replace('.csv', '')}.csv`).map((c) => ({
    nombre: c.columna ?? '',
    tipo: c.tipo ?? '',
    obligatoriedad: c.obligatoriedad ?? '',
    condicion: c.condicion ?? '',
    valores: (c.tipo ?? '') === 'enum' ? valoresEnum(c.valores ?? '') : [],
    reglas: (c.regla_id ?? '').split(';').map((r) => r.trim()).filter((r) => r !== ''),
  }))
}

export function reglas(): Map<string, Regla> {
  return new Map(leer('reglas-validacion.csv').map((r) => [r.regla_id ?? '', {
    id: r.regla_id ?? '',
    archivo: r.archivo ?? '',
    clase: r.clase ?? '',
    severidad: r.severidad === 'aviso' ? 'aviso' : 'rechazo',
    descripcion: r.descripcion ?? '',
    errorEsperado: r.error_esperado ?? '',
  }]))
}

/** Rellena el texto de error de una regla. Falla si queda un marcador sin valor. */
export function mensaje(r: Regla, valores: Readonly<Record<string, string | number>>): string {
  return r.errorEsperado.replace(/\{(\w+)\}/g, (_, k: string) => {
    const v = valores[k]
    if (v === undefined) throw new Error(`${r.id}: falta el valor de {${k}}`)
    return String(v)
  })
}
