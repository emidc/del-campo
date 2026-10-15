// El contrato aprobado en la 15a: columnas de cada archivo y reglas de validación con su
// severidad y su texto de error. Portado de `SPIKES/T-0021/v0/fase-15/validador/contrato.ts`
// con una diferencia: acá no se lee ningún archivo. `contratoDe` recibe los bytes de
// `contrato/` (los lee `src/application`), así el dominio sigue puro y las reglas siguen
// saliendo del contrato y no de un texto copiado a mano.

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

export interface Contrato {
  readonly columnas: Readonly<Record<Archivo, readonly Columna[]>>
  readonly reglas: ReadonlyMap<string, Regla>
}

/** Los cuatro archivos de `contrato/`, por nombre. */
export const ARCHIVOS_CONTRATO = [
  'columnas-risks.csv', 'columnas-action-plan.csv', 'columnas-risk-transfer.csv', 'reglas-validacion.csv',
] as const
export type ArchivoContrato = (typeof ARCHIVOS_CONTRATO)[number]

function leer(nombre: string, bytes: Uint8Array): Record<string, string>[] {
  const l = leerCsv(bytes)
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

function columnas(nombre: string, bytes: Uint8Array): Columna[] {
  return leer(nombre, bytes).map((c) => ({
    nombre: c.columna ?? '',
    tipo: c.tipo ?? '',
    obligatoriedad: c.obligatoriedad ?? '',
    condicion: c.condicion ?? '',
    valores: (c.tipo ?? '') === 'enum' ? valoresEnum(c.valores ?? '') : [],
    reglas: (c.regla_id ?? '').split(';').map((r) => r.trim()).filter((r) => r !== ''),
  }))
}

function reglas(bytes: Uint8Array): Map<string, Regla> {
  return new Map(leer('reglas-validacion.csv', bytes).map((r) => [r.regla_id ?? '', {
    id: r.regla_id ?? '',
    archivo: r.archivo ?? '',
    clase: r.clase ?? '',
    severidad: r.severidad === 'aviso' ? 'aviso' : 'rechazo',
    descripcion: r.descripcion ?? '',
    errorEsperado: r.error_esperado ?? '',
  }]))
}

/** El contrato a partir de los bytes de sus cuatro archivos. */
export function contratoDe(archivos: Readonly<Record<ArchivoContrato, Uint8Array>>): Contrato {
  return {
    columnas: porArchivo((a) => {
      const nombre = `columnas-${a.replace('.csv', '')}.csv` as ArchivoContrato
      return columnas(nombre, archivos[nombre])
    }),
    reglas: reglas(archivos['reglas-validacion.csv']),
  }
}

/** Rellena el texto de error de una regla. Falla si queda un marcador sin valor. */
export function mensaje(r: Regla, valores: Readonly<Record<string, string | number>>): string {
  return r.errorEsperado.replace(/\{(\w+)\}/g, (_, k: string) => {
    const v = valores[k]
    if (v === undefined) throw new Error(`${r.id}: falta el valor de {${k}}`)
    return String(v)
  })
}
