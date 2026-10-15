// Soporte de tests: carga los CSV sintéticos aprobados de la 15b
// (`SPIKES/T-0021/v0/fase-15/sinteticos/`) y la regresión de EMI-41
// (`v0/fase-11/regresion-emi41.csv`) en la forma de `src/domain/modelo.ts`, para comparar los
// derivados con un oráculo externo. Se leen en su lugar y no se copian ni se tocan.
//
// No es el importador ni su lector de CSV: esos son de T-0029, que porta el lector del spike
// con su regresión (H7) y valida las 71 reglas. Acá alcanza un lector RFC 4180 mínimo para
// archivos que el validador de la 15b ya aceptó (0 rechazos, `verificacion-15b.md` §3).

import { readFileSync } from 'node:fs'

import type { Dimension, Factor, Factores, Nivel, Recuperacion, Uncertainty } from '../domain/metodologia.ts'
import type { Evaluacion, ReviewStatus, Riesgo, TipoObjeto } from '../domain/modelo.ts'

export const SPIKE = new URL('../../../../SPIKES/T-0021/v0/', import.meta.url)
export const SINTETICOS = new URL('fase-15/sinteticos/', SPIKE)
export const REGRESION_EMI41 = new URL('fase-11/regresion-emi41.csv', SPIKE)
export const LOTE_EMI41 = 'T-0021/EMI-41'

export type Fila = Readonly<Record<string, string>>

/** CSV de RFC 4180 (comillas dobles, `""` escapada, saltos de línea dentro de comillas). Falla ante algo malformado. */
export function leerCsv(texto: string): Fila[] {
  const filas: string[][] = []
  let fila: string[] = []
  let campo = ''
  let comillas = false
  for (let i = 0; i < texto.length; i++) {
    const c = texto.charAt(i)
    if (comillas) {
      if (c === '"' && texto[i + 1] === '"') { campo += '"'; i++ }
      else if (c === '"') comillas = false
      else campo += c
    } else if (c === '"') {
      if (campo !== '') throw new Error(`comilla dentro de un campo sin comillas (carácter ${String(i)})`)
      comillas = true
    } else if (c === ',') { fila.push(campo); campo = '' }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && texto[i + 1] === '\n') i++
      fila.push(campo); filas.push(fila); fila = []; campo = ''
    } else campo += c
  }
  if (comillas) throw new Error('comilla sin cerrar')
  if (campo !== '' || fila.length > 0) { fila.push(campo); filas.push(fila) }
  const [encabezado, ...datos] = filas
  if (encabezado === undefined) throw new Error('archivo vacío')
  return datos.map((valores, n) => {
    if (valores.length !== encabezado.length) throw new Error(`fila ${String(n + 2)}: ${String(valores.length)} campos, el encabezado tiene ${String(encabezado.length)}`)
    return Object.fromEntries(encabezado.map((c, j) => [c, valores[j] ?? '']))
  })
}

export const leerArchivo = (url: URL): Fila[] => leerCsv(readFileSync(url, 'utf8'))

const DIMS: readonly Dimension[] = ['econ', 'pers', 'cont', 'legal']

function nivel(v: string, columna: string): Nivel {
  const n = Number(v)
  if (!Number.isInteger(n) || n < 1 || n > 5) throw new Error(`${columna}: "${v}" no es un nivel 1–5`)
  return n as Nivel
}

/** Un factor de la fila, como lo describe `contrato/columnas-risks.csv`. */
function factor(f: Fila, x: string): Factor<Nivel> {
  const estado = f[`${x}_estado`] ?? ''
  const min = f[`${x}_min`] ?? ''
  const max = f[`${x}_max`] ?? ''
  if (estado !== 'known' && estado !== 'unknown') throw new Error(`${x}_estado: "${estado}"`)
  return {
    valor: estado === 'known' ? nivel(f[`${x}_valor`] ?? '', `${x}_valor`) : 'unknown',
    ...(min === '' ? {} : { min: nivel(min, `${x}_min`) }),
    ...(max === '' ? {} : { max: nivel(max, `${x}_max`) }),
  }
}

export function factoresDe(f: Fila): Factores {
  const vRec: Factor<Recuperacion> = f.v_rec_estado === 'no_aplica' ? { valor: 'no_aplica' } : factor(f, 'v_rec')
  return {
    p: factor(f, 'p'),
    i: Object.fromEntries(DIMS.map((d) => [d, factor(f, `i_${d}`)])) as Record<Dimension, Factor<Nivel>>,
    vCont: factor(f, 'v_cont'),
    vRec,
  }
}

const TIPOS: readonly TipoObjeto[] = ['riesgo', 'padre', 'sub_riesgo', 'escenario']
const REVIEW: readonly ReviewStatus[] = ['pending', 'accepted', 'needs_revision', 'rejected']
const UNCERTAINTY: readonly Uncertainty[] = ['low', 'medium', 'high']

function de<T extends string>(valores: readonly T[], v: string | undefined, columna: string): T {
  const x = valores.find((c) => c === v)
  if (x === undefined) throw new Error(`${columna}: "${String(v)}" fuera del enum`)
  return x
}

export interface Lote {
  readonly riesgos: Riesgo[]
  readonly evaluaciones: Evaluacion[]
  /** Por `risk_id`, el `id_origen` del riesgo (p. ej. S06-R01), para cruzar con la regresión. */
  readonly origenDeRiesgo: Map<string, string>
  /** Por `evaluacion_id`, su `evaluacion_id_origen` (p. ej. EV-0008). */
  readonly origenDeEvaluacion: Map<string, string>
}

/** Las filas de `risks.csv` como riesgos y evaluaciones. La identidad de un riesgo es la de su primera fila. */
export function loteDe(filas: readonly Fila[]): Lote {
  const riesgos = new Map<string, Riesgo>()
  const origenDeRiesgo = new Map<string, string>()
  const origenDeEvaluacion = new Map<string, string>()
  const evaluaciones: Evaluacion[] = []
  for (const f of filas) {
    const id = f.risk_id ?? ''
    if (!riesgos.has(id)) {
      riesgos.set(id, {
        id,
        organizacionId: f.organizacion_id ?? '',
        tipoObjeto: de(TIPOS, f.tipo_objeto, 'tipo_objeto'),
        riesgoPadreId: f.riesgo_padre_id === '' ? null : (f.riesgo_padre_id ?? null),
        miembros: (f.miembros ?? '') === '' ? [] : (f.miembros ?? '').split(';'),
      })
      origenDeRiesgo.set(id, f.id_origen ?? '')
    }
    if ((f.evaluacion_id ?? '') === '') continue
    origenDeEvaluacion.set(f.evaluacion_id ?? '', f.evaluacion_id_origen ?? '')
    evaluaciones.push({
      id: f.evaluacion_id ?? '',
      riskId: id,
      tipo: f.tipo_evaluacion === 'inicial' ? 'inicial' : 'reevaluacion',
      anteriorId: (f.evaluacion_anterior_id ?? '') === '' ? null : (f.evaluacion_anterior_id ?? null),
      factores: factoresDe(f),
      uncertainty: de(UNCERTAINTY, f.uncertainty, 'uncertainty'),
      reviewStatus: de(REVIEW, f.review_status, 'review_status'),
    })
  }
  return { riesgos: [...riesgos.values()], evaluaciones, origenDeRiesgo, origenDeEvaluacion }
}
