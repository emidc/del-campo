// T-0037 (I1a, hallazgo H5) — qué es un lote de Zoho lo declara su manifiesto, no el código.
//
// Hasta T-0037 la carpeta del lote y el CSV de cada módulo estaban fijados acá como
// constantes del lote del 16/09: importar otro export exigía editar este archivo. Ahora
// cada lote trae en su raíz un `lote.json` que dice qué perfil de T-0004 lo verifica,
// qué CSV corresponde a cada módulo y en qué fecha se exportó cada módulo (T-0013
// registró que los módulos se exportan en días distintos). Formato y ejemplo en
// `docs/migration/zoho/lote-manifiesto.md`.
//
// Este módulo sólo lee y valida el manifiesto del lote: nunca abre los CSV ni imprime
// contenido de filas. La comprobación de hashes sigue en `verify-manifest.ts`.

import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { isAbsolute, normalize, resolve, sep } from 'node:path'

import type { ManifestArchive } from './verify-manifest.ts'

export const NOMBRE_MANIFIESTO_LOTE = 'lote.json'
export const FORMATO_LOTE = 'lote-zoho/1'

export const MODULOS = ['polizas', 'endosos', 'contactos', 'cuentas'] as const
export type Modulo = (typeof MODULOS)[number]

/** El nombre del módulo tal como lo usan las tablas de staging y `failure-classes.ts`. */
export const NOMBRE_ZOHO: Readonly<Record<Modulo, string>> = {
  polizas: 'Polizas',
  endosos: 'Endosos',
  contactos: 'Contactos',
  cuentas: 'Cuentas',
}

export interface ModuloDelLote {
  /** Ruta del CSV relativa a la raíz del lote, igual que `raw_relative_path` del perfil. */
  readonly csv: string
  /** Fecha del export de este módulo en Zoho, `AAAA-MM-DD`. La declara el owner (DAT-01). */
  readonly exportadoEl: string
}

export interface Lote {
  readonly raiz: string
  /** Ruta del perfil de T-0004 relativa a la raíz del lote. */
  readonly perfil: string
  readonly modulos: Readonly<Record<Modulo, ModuloDelLote>>
}

export class LoteInvalido extends Error {
  override readonly name = 'LoteInvalido'
}

const FECHA = /^\d{4}-\d{2}-\d{2}$/

const esFechaReal = (valor: string): boolean => {
  if (!FECHA.test(valor)) return false
  const fecha = new Date(`${valor}T00:00:00Z`)
  return !Number.isNaN(fecha.getTime()) && fecha.toISOString().slice(0, 10) === valor
}

/**
 * Una ruta del manifiesto tiene que quedar dentro de la raíz del lote: el manifiesto
 * lo escribe una persona a mano y un `../` lo haría leer un archivo de otro lote.
 */
const rutaInterna = (campo: string, valor: unknown): string => {
  if (typeof valor !== 'string' || valor.trim() === '') {
    throw new LoteInvalido(`${campo}: falta la ruta`)
  }
  const normalizada = normalize(valor).split(sep).join('/')
  if (isAbsolute(valor) || normalizada === '..' || normalizada.startsWith('../')) {
    throw new LoteInvalido(`${campo}: la ruta tiene que ser relativa a la raíz del lote, sin salir de ella`)
  }
  return normalizada
}

const esObjeto = (valor: unknown): valor is Record<string, unknown> =>
  typeof valor === 'object' && valor !== null && !Array.isArray(valor)

/**
 * Valida el contenido de un `lote.json`. Rechaza en vez de completar: un módulo que
 * falta, una fecha imposible o una clave desconocida son errores del manifiesto, y
 * adivinarlos produciría un lote distinto del que el owner declaró.
 */
export const parsearLote = (raiz: string, contenido: string): Lote => {
  let crudo: unknown
  try {
    crudo = JSON.parse(contenido)
  } catch {
    throw new LoteInvalido(`${NOMBRE_MANIFIESTO_LOTE} no es JSON válido`)
  }
  if (!esObjeto(crudo)) throw new LoteInvalido(`${NOMBRE_MANIFIESTO_LOTE} tiene que ser un objeto`)

  const desconocidas = Object.keys(crudo).filter((clave) => !['formato', 'perfil', 'modulos'].includes(clave))
  if (desconocidas.length > 0) throw new LoteInvalido(`claves desconocidas: ${desconocidas.join(', ')}`)
  if (crudo.formato !== FORMATO_LOTE) {
    throw new LoteInvalido(`formato: se espera "${FORMATO_LOTE}"`)
  }

  const perfil = rutaInterna('perfil', crudo.perfil)
  if (!esObjeto(crudo.modulos)) throw new LoteInvalido('modulos: tiene que ser un objeto')

  const sobrantes = Object.keys(crudo.modulos).filter((clave) => !(MODULOS as readonly string[]).includes(clave))
  if (sobrantes.length > 0) throw new LoteInvalido(`modulos: módulos desconocidos: ${sobrantes.join(', ')}`)

  const modulos = {} as Record<Modulo, ModuloDelLote>
  const csvVistos = new Set<string>()
  for (const modulo of MODULOS) {
    const declarado = crudo.modulos[modulo]
    if (!esObjeto(declarado)) throw new LoteInvalido(`modulos.${modulo}: falta`)
    const extra = Object.keys(declarado).filter((clave) => !['csv', 'exportadoEl'].includes(clave))
    if (extra.length > 0) throw new LoteInvalido(`modulos.${modulo}: claves desconocidas: ${extra.join(', ')}`)

    const csv = rutaInterna(`modulos.${modulo}.csv`, declarado.csv)
    if (csvVistos.has(csv)) throw new LoteInvalido(`modulos.${modulo}.csv: el mismo CSV ya está declarado para otro módulo`)
    csvVistos.add(csv)

    const exportadoEl = declarado.exportadoEl
    if (typeof exportadoEl !== 'string' || !esFechaReal(exportadoEl)) {
      throw new LoteInvalido(`modulos.${modulo}.exportadoEl: se espera una fecha AAAA-MM-DD`)
    }
    modulos[modulo] = { csv, exportadoEl }
  }

  return { raiz: resolve(raiz), perfil, modulos }
}

/** Lee y valida `<raiz>/lote.json`. */
export const leerLote = (raiz: string): Lote => {
  const ruta = resolve(raiz, NOMBRE_MANIFIESTO_LOTE)
  let contenido: string
  try {
    contenido = readFileSync(ruta, 'utf8')
  } catch {
    throw new LoteInvalido(`no se encontró ${NOMBRE_MANIFIESTO_LOTE} en la raíz del lote`)
  }
  return parsearLote(raiz, contenido)
}

/** Ruta absoluta del CSV de un módulo. */
export const rutaDeModulo = (lote: Lote, modulo: Modulo): string => resolve(lote.raiz, lote.modulos[modulo].csv)

/** Ruta absoluta del perfil de T-0004 que verifica el lote. */
export const rutaDelPerfil = (lote: Lote): string => resolve(lote.raiz, lote.perfil)

/**
 * La identidad del lote es la huella del perfil de T-0004: el perfil fija el SHA-256 de
 * cada ZIP y de cada CSV, así que dos lotes con el mismo perfil son el mismo export.
 */
export const huellaDelPerfil = (lote: Lote): string =>
  createHash('sha256').update(readFileSync(rutaDelPerfil(lote))).digest('hex')

export interface ModuloVerificable extends ModuloDelLote {
  readonly modulo: Modulo
  /** SHA-256 del CSV según el perfil. */
  readonly sha256: string
}

/**
 * Cruza el `lote.json` con el perfil: cada CSV declarado tiene que ser uno de los que el
 * perfil verifica. Sin esto, el manifiesto del lote podría apuntar a un archivo que
 * `verify-manifest` nunca comparó.
 */
export const modulosVerificados = (
  lote: Lote,
  perfil: readonly ManifestArchive[],
): readonly ModuloVerificable[] => {
  const porRuta = new Map<string, string>()
  for (const archivo of perfil) {
    for (const csv of archivo.files) porRuta.set(normalize(csv.rawRelativePath).split(sep).join('/'), csv.sha256)
  }
  return MODULOS.map((modulo) => {
    const declarado = lote.modulos[modulo]
    const sha256 = porRuta.get(declarado.csv)
    if (sha256 === undefined) {
      throw new LoteInvalido(`modulos.${modulo}.csv: el perfil del lote no verifica ese archivo`)
    }
    return { modulo, ...declarado, sha256 }
  })
}
