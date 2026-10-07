// Carga tipada de las fichas registradas. Los CSV son la evidencia: se leen tal cual, no se
// copian a los tests. Fuente principal: `v0/fase-5/regresion/fichas-regresion.csv` (corrida
// F5-REG-01, metodologia v0.2). De `v0/dry-run/fichas-dry-run.csv` (F4-DR-01, v0.1) sólo se
// usan identidad, historial y acción (`motivo`, `accion_*`), que no dependen de la versión:
// sus factores son de v0.1 y no se comparan contra nada.

import { readFileSync } from 'node:fs'

import { DIMENSIONES, type Dimension, type Factor, type Factores, type Nivel, type Recuperacion } from './metodologia.ts'

const V0 = new URL('../v0/', import.meta.url)
export const RUTA_FICHAS_F5 = new URL('fase-5/regresion/fichas-regresion.csv', V0)
export const RUTA_FICHAS_F4 = new URL('dry-run/fichas-dry-run.csv', V0)

/** CSV de RFC 4180: comillas dobles, comillas escapadas y saltos de línea dentro de un campo. */
export function parsearCsv(texto: string): Record<string, string>[] {
  const filas: string[][] = []
  let fila: string[] = []
  let campo = ''
  let entreComillas = false
  for (let i = 0; i < texto.length; i++) {
    const c = texto.charAt(i)
    if (entreComillas) {
      if (c === '"' && texto[i + 1] === '"') { campo += '"'; i++ }
      else if (c === '"') entreComillas = false
      else campo += c
    } else if (c === '"') entreComillas = true
    else if (c === ',') { fila.push(campo); campo = '' }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && texto[i + 1] === '\n') i++
      fila.push(campo); filas.push(fila); fila = []; campo = ''
    } else campo += c
  }
  if (campo !== '' || fila.length > 0) { fila.push(campo); filas.push(fila) }
  const [encabezado, ...datos] = filas
  if (encabezado === undefined) return []
  return datos.map((valores, n) => {
    if (valores.length !== encabezado.length) {
      throw new Error(`fila ${String(n + 2)}: ${String(valores.length)} campos, el encabezado tiene ${String(encabezado.length)}`)
    }
    return Object.fromEntries(encabezado.map((col, j) => [col, valores[j] ?? '']))
  })
}

export function leerCsv(ruta: URL): Record<string, string>[] {
  return parsearCsv(readFileSync(ruta, 'utf8'))
}

export type TipoObjeto = 'riesgo' | 'padre' | 'sub_riesgo' | 'escenario'
const PREFIJO_DIMENSION: Record<Dimension, string> = { econ: 'i_econ', pers: 'i_pers', cont: 'i_cont', legal: 'i_legal' }

/** Lo que la ficha registró como derivado: se compara contra lo que recalcula la capa de referencia. */
export interface DerivadosRegistrados {
  readonly evaluable: boolean
  readonly cRaw: number | null
  readonly cDimensionDeterminante: string
  readonly iEfectivo: string
  readonly iEfectivoDimensiones: string
  readonly vAspectosAplicables: string
  readonly consecuenciaExtrema: boolean
  readonly consecuenciaExtremaDimensiones: string
  readonly safetyCritical: boolean
  readonly techoPlausible: number
  readonly banda: string
}

export interface Ficha {
  readonly evaluacionId: string
  readonly riskId: string
  /** La organización: el ranking es siempre dentro de una (§7.1.4, CH-075). */
  readonly casoEmpresa: string
  readonly tipoObjeto: TipoObjeto
  readonly riesgoPadreId: string
  readonly miembros: string[]
  readonly evaluacionAnteriorId: string
  readonly motivo: string
  readonly versionMetodologia: string
  readonly factores: Factores
  readonly bases: Readonly<Record<'p' | Dimension | 'vCont' | 'vRec', string>>
  readonly uncertainty: 'low' | 'medium' | 'high'
  readonly registrado: DerivadosRegistrados
  readonly crudo: Readonly<Record<string, string>>
}

function nivel(texto: string, contexto: string): Nivel {
  const n = Number(texto)
  if (!Number.isInteger(n) || n < 1 || n > 5) throw new Error(`${contexto}: "${texto}" no es un nivel 1–5`)
  return n as Nivel
}

function nivelOpcional(texto: string, contexto: string): Nivel | undefined {
  return texto === '' ? undefined : nivel(texto, contexto)
}

function factor(fila: Record<string, string>, prefijo: string, id: string): Factor<Nivel> {
  const contexto = `${id} ${prefijo}`
  const valor = fila[`${prefijo}_valor`] ?? ''
  const min = nivelOpcional(fila[`${prefijo}_min`] ?? '', `${contexto}_min`)
  const max = nivelOpcional(fila[`${prefijo}_max`] ?? '', `${contexto}_max`)
  return {
    valor: valor === 'unknown' ? 'unknown' : nivel(valor, `${contexto}_valor`),
    ...(min === undefined ? {} : { min }),
    ...(max === undefined ? {} : { max }),
  }
}

function recuperacion(fila: Record<string, string>, id: string): Factor<Recuperacion> {
  if (fila.v_rec_valor === 'no_aplica') return { valor: 'no_aplica' }
  return factor(fila, 'v_rec', id)
}

function booleano(texto: string | undefined, contexto: string): boolean {
  if (texto === 'true') return true
  if (texto === 'false') return false
  throw new Error(`${contexto}: "${String(texto)}" no es booleano`)
}

export function aFicha(fila: Record<string, string>): Ficha {
  const id = fila.evaluacion_id ?? '(sin id)'
  const campo = (c: string): string => {
    const v = fila[c]
    if (v === undefined) throw new Error(`${id}: falta la columna ${c}`)
    return v
  }
  const i = Object.fromEntries(DIMENSIONES.map((d) => [d, factor(fila, PREFIJO_DIMENSION[d], id)])) as Record<Dimension, Factor<Nivel>>
  const uncertainty = campo('uncertainty')
  if (uncertainty !== 'low' && uncertainty !== 'medium' && uncertainty !== 'high') throw new Error(`${id}: uncertainty "${uncertainty}"`)
  const tipo = campo('tipo_objeto')
  if (tipo !== 'riesgo' && tipo !== 'padre' && tipo !== 'sub_riesgo' && tipo !== 'escenario') throw new Error(`${id}: tipo_objeto "${tipo}"`)
  const cRaw = campo('c_raw')
  return {
    evaluacionId: id,
    riskId: campo('risk_id'),
    casoEmpresa: campo('caso_empresa'),
    tipoObjeto: tipo,
    riesgoPadreId: campo('riesgo_padre_id'),
    miembros: campo('miembros') === '' ? [] : campo('miembros').split(';'),
    evaluacionAnteriorId: campo('evaluacion_anterior_id'),
    motivo: campo('motivo'),
    versionMetodologia: campo('version_metodologia'),
    factores: { p: factor(fila, 'p', id), i, vCont: factor(fila, 'v_cont', id), vRec: recuperacion(fila, id) },
    bases: {
      p: campo('p_base'), econ: campo('i_econ_base'), pers: campo('i_pers_base'), cont: campo('i_cont_base'),
      legal: campo('i_legal_base'), vCont: campo('v_cont_base'), vRec: campo('v_rec_base'),
    },
    uncertainty,
    registrado: {
      evaluable: booleano(fila.evaluable, `${id} evaluable`),
      cRaw: cRaw === '' ? null : Number(cRaw),
      cDimensionDeterminante: campo('c_dimension_determinante'),
      iEfectivo: campo('i_efectivo'),
      iEfectivoDimensiones: campo('i_efectivo_dimensiones'),
      vAspectosAplicables: campo('v_aspectos_aplicables'),
      consecuenciaExtrema: booleano(fila.consecuencia_extrema, `${id} consecuencia_extrema`),
      consecuenciaExtremaDimensiones: campo('consecuencia_extrema_dimensiones'),
      safetyCritical: booleano(fila.safety_critical, `${id} safety_critical`),
      techoPlausible: Number(campo('techo_plausible')),
      banda: campo('banda'),
    },
    crudo: fila,
  }
}

/** Las 51 fichas de F5-REG-01, tipadas. */
export function fichasF5(): Ficha[] {
  return leerCsv(RUTA_FICHAS_F5).map(aFicha)
}

/** Identidad, historial y acción de las fichas de F4-DR-01 (sin factores). */
export interface FichaHistorial {
  readonly evaluacionId: string
  readonly riskId: string
  readonly evaluacionAnteriorId: string
  readonly motivo: string
  readonly accionId: string
  readonly accionCambioEsperado: string
  readonly accionEfecto: string
  readonly versionMetodologia: string
}

export function historialF4(): FichaHistorial[] {
  return leerCsv(RUTA_FICHAS_F4).map((f) => ({
    evaluacionId: f.evaluacion_id ?? '',
    riskId: f.risk_id ?? '',
    evaluacionAnteriorId: f.evaluacion_anterior_id ?? '',
    motivo: f.motivo ?? '',
    accionId: f.accion_id ?? '',
    accionCambioEsperado: f.accion_cambio_esperado ?? '',
    accionEfecto: f.accion_efecto ?? '',
    versionMetodologia: f.version_metodologia ?? '',
  }))
}

export function porId(fichas: readonly Ficha[]): Map<string, Ficha> {
  return new Map(fichas.map((f) => [f.evaluacionId, f]))
}
