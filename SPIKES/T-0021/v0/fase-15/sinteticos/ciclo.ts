// Lectura de un lote importado como lo leería Risk OS v1, sólo con las funciones del arnés: la
// historia de cada riesgo, su evaluación vigente (decisión 8a), sus derivados, el ranking de una
// organización y el ciclo de actualización (decisión 9a). No es código de producto; es lo que los
// tests usan para mostrar que los CSV alcanzan para lo que el contrato promete.

import {
  banda, consecuenciaExtrema, evaluar, iEfectivo, posicionPadre, rankingD10, safetyCritical,
  type ItemRanking, type Posicion, type PosicionPadre,
} from '../../../regresion-ejecutable/metodologia.ts'
import { factoresDe } from '../validador/validador.ts'

export type Fila = Readonly<Record<string, string>>

const conEvaluacion = (f: Fila): boolean => (f.evaluacion_id ?? '') !== ''

/** La historia de un riesgo: la inicial y cada reevaluación que apunta a la anterior (una sola cadena, RV-EVA-07). */
export function historia(risks: readonly Fila[], riskId: string): Fila[] {
  const evas = risks.filter((f) => f.risk_id === riskId && conEvaluacion(f))
  const cadena: Fila[] = []
  for (let r = evas.find((f) => f.tipo_evaluacion === 'inicial'); r !== undefined;) {
    cadena.push(r)
    const actual: Fila = r
    r = evas.find((f) => f.evaluacion_anterior_id === actual.evaluacion_id)
  }
  return cadena
}

/** Decisión 8a: la última `accepted` de la historia; si no hay, la última no rechazada. */
export function vigente(risks: readonly Fila[], riskId: string): Fila | undefined {
  const h = historia(risks, riskId)
  return h.filter((f) => f.review_status === 'accepted').at(-1) ?? h.filter((f) => f.review_status !== 'rejected').at(-1)
}

export interface Derivados {
  readonly evaluable: boolean
  readonly cRaw: number | null
  readonly banda: string
  readonly ext: boolean
  readonly sc: boolean
  readonly iEfectivo: string
}

/** Derivados de una evaluación (metodología v1): nunca se leen del archivo, se calculan (decisión 6a). */
export function derivados(f: Fila): Derivados {
  const fac = factoresDe(f)
  const e = evaluar(fac)
  const ie = iEfectivo(fac.i)
  return {
    evaluable: e.evaluable,
    cRaw: e.evaluable ? e.cRaw : null,
    banda: e.evaluable ? banda(e.cRaw) : '',
    ext: consecuenciaExtrema(fac.i).length > 0,
    sc: safetyCritical(fac.i),
    iEfectivo: ie.completo ? String(ie.n) : `≥ ${String(ie.n)}`,
  }
}

function itemDe(riskId: string, f: Fila): ItemRanking | null {
  const fac = factoresDe(f)
  const e = evaluar(fac)
  return e.evaluable ? { id: riskId, cRaw: e.cRaw, iEfectivo: iEfectivo(fac.i), iPers: fac.i.pers.valor } : null
}

export interface Ranking {
  readonly posiciones: Posicion[]
  readonly padres: Map<string, PosicionPadre>
  readonly items: Map<string, ItemRanking>
}

/** Ranking principal de una organización (§7.1): riesgos y padres, cada padre con su hijo prioritario (§1.4). */
export function ranking(risks: readonly Fila[], organizacionId: string): Ranking {
  const ids = [...new Set(risks.filter((f) => f.organizacion_id === organizacionId).map((f) => f.risk_id ?? ''))]
  const tipo = (id: string): string => risks.find((f) => f.risk_id === id)?.tipo_objeto ?? ''
  const items = new Map<string, ItemRanking>()
  const padres = new Map<string, PosicionPadre>()
  for (const id of ids) {
    if (tipo(id) === 'riesgo') {
      const v = vigente(risks, id)
      const item = v === undefined ? null : itemDe(id, v)
      if (item !== null) items.set(id, item)
    }
    if (tipo(id) === 'padre') {
      const hijos = ids.filter((h) => tipo(h) === 'sub_riesgo' && risks.find((f) => f.risk_id === h)?.riesgo_padre_id === id)
      const conItem = hijos.map((h) => { const v = vigente(risks, h); return { id: h, item: v === undefined ? null : itemDe(h, v) } })
      const pos = posicionPadre(conItem)
      padres.set(id, pos)
      if (pos.conPosicion) {
        const prioritario = conItem.find((h) => h.id === pos.hijosPrioritarios[0])?.item
        if (prioritario != null) items.set(id, { ...prioritario, id })
      }
    }
  }
  return { posiciones: rankingD10([...items.values()]), padres, items }
}

/** Posición contando los riesgos por delante, como `regresion-emi41.csv`. */
export function posicion(r: Ranking, riskId: string): number | null {
  const i = r.posiciones.findIndex((p) => p.ids.includes(riskId))
  return i < 0 ? null : 1 + r.posiciones.slice(0, i).reduce((n, p) => n + p.ids.length, 0)
}

/** El `resultado_nuevo` de `regresion-emi41.csv` para un riesgo del lote. */
export function resultado(risks: readonly Fila[], riskId: string): string {
  const fila = risks.find((f) => f.risk_id === riskId)
  if (fila === undefined) throw new Error(`${riskId} no está en el lote`)
  const r = ranking(risks, fila.organizacion_id ?? '')
  if (fila.tipo_objeto === 'padre') {
    const item = r.items.get(riskId)
    return item === undefined ? 'sin posición' : `C ${String(item.cRaw)} · pos ${String(posicion(r, riskId))}`
  }
  const v = vigente(risks, riskId)
  if (v === undefined) return 'sin evaluación'
  const d = derivados(v)
  if (!d.evaluable) return `no evaluable · ext=${String(d.ext)} · sc=${String(d.sc)} · I ${d.iEfectivo}`
  const p = fila.tipo_objeto === 'riesgo' ? String(posicion(r, riskId)) : '—'
  return `C ${String(d.cRaw)} · pos ${p} · ${d.banda} · ext=${String(d.ext)} · sc=${String(d.sc)} · I ${d.iEfectivo}`
}

export interface Revision {
  readonly accion_id: string
  readonly risk_id: string
  /** Decisión 9a: una acción cumplida abre una revisión del riesgo; la cierra una reevaluación con motivo accion_ejecutada que la nombra. */
  readonly abierta: boolean
  readonly evaluacion_id: string
}

export function revisiones(risks: readonly Fila[], acciones: readonly Fila[]): Revision[] {
  return acciones.filter((a) => a.tipo_registro === 'accion' && a.estado === 'cumplida').map((a) => {
    const e = risks.find((f) => f.risk_id === a.risk_id && f.motivo === 'accion_ejecutada' && f.accion_id === a.accion_id)
    return { accion_id: a.accion_id ?? '', risk_id: a.risk_id ?? '', abierta: e === undefined, evaluacion_id: e?.evaluacion_id ?? '' }
  })
}
