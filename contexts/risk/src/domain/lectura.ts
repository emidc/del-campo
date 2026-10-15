// Cómo lee Risk OS v1 una organización con las funciones de la metodología: la historia de cada
// riesgo, su evaluación vigente (decisión 8a), sus derivados, el ranking principal (§7.1, D10)
// con los padres en la posición de su hijo prioritario (§1.4), la lista de no evaluables (§9.4)
// y la cola de validación (§9.5). Portado de `SPIKES/T-0021/v0/fase-15/sinteticos/ciclo.ts` y
// `regresion-ejecutable/verificacion.ts` sin cambiar reglas.
//
// Toda salida lleva la versión de las funciones que la calculó (RO01 §3, regla 7). Todo ranking
// es de una sola organización: con riesgos de dos, falla (§7.1.4, RO01 §3, regla 4).

import {
  banda, colaValidacion, consecuenciaExtrema, evaluar, iEfectivo, posicionPadre, rankingD10, safetyCritical, techoPlausible,
  vPorDimension,
  type Banda, type Dimension, type Evaluabilidad, type Factores, type IEfectivo, type ItemRanking, type Nivel, type Posicion,
} from './metodologia.ts'
import { exigirVersion, type Evaluacion, type Riesgo, type VersionFunciones } from './modelo.ts'

// ── Historia y vigente ───────────────────────────────────────────────────────

/**
 * La historia de un riesgo: la inicial y cada reevaluación que apunta a la anterior. En v1 es
 * una cadena lineal (decisión 8, RV-EVA-03, RV-EVA-07): una historia ramificada, dos iniciales o
 * una evaluación fuera de la cadena son un error, no algo que se elige en silencio.
 */
export function historia(evaluaciones: readonly Evaluacion[], riskId: string): Evaluacion[] {
  const propias = evaluaciones.filter((e) => e.riskId === riskId)
  const iniciales = propias.filter((e) => e.tipo === 'inicial')
  if (propias.length === 0) return []
  if (iniciales.length !== 1) throw new Error(`${riskId}: ${String(iniciales.length)} evaluaciones iniciales; la historia tiene una sola`)
  const cadena: Evaluacion[] = []
  for (let e: Evaluacion | undefined = iniciales[0]; e !== undefined;) {
    cadena.push(e)
    const actual: Evaluacion = e
    const sucesoras = propias.filter((x) => x.anteriorId === actual.id)
    if (sucesoras.length > 1) throw new Error(`${riskId}: historia ramificada en ${actual.id}`)
    e = sucesoras[0]
  }
  if (cadena.length !== propias.length) throw new Error(`${riskId}: hay evaluaciones fuera de la cadena`)
  return cadena
}

/**
 * Decisión 8a: la última `accepted` de la historia; si no hay ninguna, la última no rechazada,
 * que se muestra "pendiente de revisión". Una posterior `pending` no reemplaza a una `accepted`.
 */
export function vigente(h: readonly Evaluacion[]): Evaluacion | undefined {
  return h.filter((e) => e.reviewStatus === 'accepted').at(-1) ?? h.filter((e) => e.reviewStatus !== 'rejected').at(-1)
}

// ── Derivados de una evaluación ──────────────────────────────────────────────

export interface Derivados {
  readonly version: VersionFunciones
  /** El vector de factores del que salió todo: `C_raw` nunca viaja sin él (RO01 §3, regla 1). */
  readonly factores: Factores
  readonly evaluabilidad: Evaluabilidad
  readonly cRaw: number | null
  readonly banda: Banda | null
  /** `V_d` con lo conocido; `null` si contención o recuperación es `unknown`. */
  readonly vPorDimension: Record<Dimension, Nivel> | null
  readonly iEfectivo: IEfectivo
  readonly consecuenciaExtrema: Dimension[]
  readonly safetyCritical: boolean
  /** §6.6. Nunca entra al ranking (RO01 §3, regla 3). */
  readonly techoPlausible: number
}

/** Los derivados de una evaluación: nunca se leen de un dato, se calculan (decisión 6a). */
export function derivados(version: VersionFunciones, factores: Factores): Derivados {
  exigirVersion(version)
  const e = evaluar(factores)
  const { vCont, vRec } = factores
  return {
    version,
    factores,
    evaluabilidad: e,
    cRaw: e.evaluable ? e.cRaw : null,
    banda: e.evaluable ? banda(e.cRaw) : null,
    vPorDimension: vCont.valor === 'unknown' || vRec.valor === 'unknown' ? null : vPorDimension(vCont.valor, vRec.valor),
    iEfectivo: iEfectivo(factores.i),
    consecuenciaExtrema: consecuenciaExtrema(factores.i),
    safetyCritical: safetyCritical(factores.i),
    techoPlausible: techoPlausible(factores),
  }
}

// ── Ranking de una organización ──────────────────────────────────────────────

function itemDe(riskId: string, e: Evaluacion): ItemRanking | null {
  const ev = evaluar(e.factores)
  return ev.evaluable ? { id: riskId, cRaw: ev.cRaw, iEfectivo: iEfectivo(e.factores.i), iPers: e.factores.i.pers.valor } : null
}

export interface NoEvaluable {
  readonly riskId: string
  readonly motivo: string
}

export interface RankingOrganizacion {
  readonly version: VersionFunciones
  readonly organizacionId: string
  /** Posiciones en orden; un empate legítimo comparte posición (§7.2). */
  readonly posiciones: Posicion[]
  /** Por cada padre con posición, los hijos con cuyos factores se muestra (§1.4). */
  readonly padres: Map<string, { hijosPrioritarios: string[]; prioridadProvisional: boolean }>
  /** El ítem con el que compite cada riesgo y cada padre del ranking. */
  readonly items: Map<string, ItemRanking>
  /** Riesgos y padres fuera del ranking, con su motivo (§9.4, §1.4.5). */
  readonly noEvaluables: NoEvaluable[]
  /** La evaluación vigente de cada riesgo, sub-riesgo y escenario: toda vista dice cuál usa (RO01 §3, regla 6). */
  readonly vigentes: Map<string, Evaluacion>
}

/**
 * Ranking principal (§7.1) de **una** organización. Entran los riesgos simples y los padres,
 * cada padre con el ítem de su hijo prioritario; los sub-riesgos y los escenarios por causa
 * común no entran nunca (§7.1.2, §14 propiedad 5). El padre no tiene evaluación propia (§1.4):
 * si la trae, falla. Los factores salen de la evaluación vigente de cada riesgo.
 */
export function rankingOrganizacion(
  version: VersionFunciones,
  riesgos: readonly Riesgo[],
  evaluaciones: readonly Evaluacion[],
): RankingOrganizacion {
  exigirVersion(version)
  const organizaciones = new Set(riesgos.map((r) => r.organizacionId))
  if (organizaciones.size !== 1) {
    throw new Error(`un ranking es de una sola organización (§7.1.4); vinieron ${String(organizaciones.size)}`)
  }
  const organizacionId = [...organizaciones][0] ?? ''
  const ids = new Set(riesgos.map((r) => r.id))
  const ajena = evaluaciones.find((e) => !ids.has(e.riskId))
  if (ajena !== undefined) throw new Error(`${ajena.id} es de un riesgo que no está en la organización`)

  const vigentes = new Map<string, Evaluacion>()
  for (const r of riesgos) {
    const h = historia(evaluaciones, r.id)
    if (r.tipoObjeto === 'padre' && h.length > 0) throw new Error(`${r.id}: un padre no tiene evaluación propia (§1.4)`)
    const v = vigente(h)
    if (v !== undefined) vigentes.set(r.id, v)
  }

  const items = new Map<string, ItemRanking>()
  const noEvaluables: NoEvaluable[] = []
  const padres = new Map<string, { hijosPrioritarios: string[]; prioridadProvisional: boolean }>()
  const motivoDe = (riskId: string): string => {
    const v = vigentes.get(riskId)
    if (v === undefined) return 'sin evaluación vigente'
    const e = evaluar(v.factores)
    return e.evaluable ? '' : e.motivo
  }
  for (const r of riesgos) {
    if (r.tipoObjeto === 'riesgo') {
      const v = vigentes.get(r.id)
      const item = v === undefined ? null : itemDe(r.id, v)
      if (item === null) noEvaluables.push({ riskId: r.id, motivo: motivoDe(r.id) })
      else items.set(r.id, item)
    }
    if (r.tipoObjeto === 'padre') {
      const hijos = riesgos.filter((h) => h.tipoObjeto === 'sub_riesgo' && h.riesgoPadreId === r.id)
      const conItem = hijos.map((h) => {
        const v = vigentes.get(h.id)
        return { id: h.id, item: v === undefined ? null : itemDe(h.id, v) }
      })
      // §1.4.5: el hijo no evaluable entra además en la lista "no evaluable", con su motivo.
      for (const h of conItem) if (h.item === null) noEvaluables.push({ riskId: h.id, motivo: motivoDe(h.id) })
      const pos = posicionPadre(conItem)
      if (!pos.conPosicion) {
        noEvaluables.push({ riskId: r.id, motivo: hijos.length === 0 ? 'padre sin hijos' : 'todos los hijos no evaluables' })
        continue
      }
      padres.set(r.id, { hijosPrioritarios: pos.hijosPrioritarios, prioridadProvisional: pos.prioridadProvisional })
      const prioritario = conItem.find((h) => h.id === pos.hijosPrioritarios[0])?.item
      if (prioritario != null) items.set(r.id, { ...prioritario, id: r.id })
    }
  }
  return { version, organizacionId, posiciones: rankingD10([...items.values()]), padres, items, noEvaluables, vigentes }
}

/** Número de posición contando los riesgos por delante, como `regresion-emi41.csv`; `null` si no está en el ranking. */
export function numeroDePosicion(r: RankingOrganizacion, riskId: string): number | null {
  const i = r.posiciones.findIndex((p) => p.ids.includes(riskId))
  return i < 0 ? null : 1 + r.posiciones.slice(0, i).reduce((n, p) => n + p.ids.length, 0)
}

/**
 * Cola de validación (§9.5) de una organización, sobre la evaluación vigente de cada riesgo,
 * sub-riesgo y escenario. Es una lista ordenada de ids, no un ranking: no mezcla organizaciones.
 */
export function colaDeValidacion(version: VersionFunciones, ranking: RankingOrganizacion): string[] {
  exigirVersion(version)
  // Con una sola versión el tipo ya lo garantiza; el control queda para cuando haya otra.
  const calculado: string = ranking.version
  if (calculado !== version) throw new Error(`el ranking se calculó con ${calculado}, no con ${version as string}`)
  return colaValidacion([...ranking.vigentes].map(([id, e]) => ({ id, factores: e.factores, uncertainty: e.uncertainty })))
}
