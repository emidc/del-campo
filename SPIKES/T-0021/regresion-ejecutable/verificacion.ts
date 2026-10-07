// Puente entre las fichas registradas y la capa de referencia: recalcula los derivados de
// cada ficha, arma el ranking principal de una organización y clasifica un caso con las
// categorías de protocolo §8. No decide nada que la metodología no decida.

import type { Ficha } from './fichas.ts'
import {
  aspectosAplicables, consecuenciaExtrema, DIMENSIONES, evaluar, iEfectivo, posicionPadre, rankingD10,
  safetyCritical, techoPlausible, type Evaluacion, type ItemRanking, type Posicion,
} from './metodologia.ts'

// ── Derivados de una ficha ───────────────────────────────────────────────────

export interface Discrepancia {
  readonly evaluacionId: string
  readonly campo: keyof Ficha['registrado']
  readonly registrado: string
  readonly calculado: string
}

/** Los derivados de protocolo §2.3 en el formato del CSV, recalculados desde los factores. */
export function derivadosCalculados(f: Ficha): Record<keyof Ficha['registrado'], string> {
  const e = evaluar(f.factores)
  const ie = iEfectivo(f.factores.i)
  const extremas = consecuenciaExtrema(f.factores.i)
  return {
    evaluable: String(e.evaluable),
    cRaw: e.evaluable ? String(e.cRaw) : '',
    cDimensionDeterminante: e.evaluable ? e.determinantes.join(';') : '',
    iEfectivo: ie.completo ? String(ie.n) : `≥ ${String(ie.n)}`,
    iEfectivoDimensiones: ie.dimensiones.join(';'),
    vAspectosAplicables: aspectosAplicables(f.factores.vRec.valor),
    consecuenciaExtrema: String(extremas.length > 0),
    consecuenciaExtremaDimensiones: extremas.join(';'),
    safetyCritical: String(safetyCritical(f.factores.i)),
    techoPlausible: String(techoPlausible(f.factores)),
    // §6.5: los umbrales se fijan en la Fase 9; hasta entonces `banda` queda vacía.
    banda: '',
  }
}

function comoTexto(v: string | number | boolean | null): string {
  return v === null ? '' : String(v)
}

export function discrepancias(f: Ficha): Discrepancia[] {
  const calculado = derivadosCalculados(f)
  return (Object.keys(calculado) as (keyof Ficha['registrado'])[]).flatMap((campo) => {
    const registrado = comoTexto(f.registrado[campo])
    return registrado === calculado[campo] ? [] : [{ evaluacionId: f.evaluacionId, campo, registrado, calculado: calculado[campo] }]
  })
}

/** Dos fichas tienen los mismos factores (valor y rango) en P, I y V. */
export function mismosFactores(a: Ficha, b: Ficha): boolean {
  return JSON.stringify(a.factores) === JSON.stringify(b.factores)
}

// ── Ranking principal de una organización ────────────────────────────────────

export function itemDe(f: Ficha, e: Evaluacion = evaluar(f.factores)): ItemRanking | null {
  if (!e.evaluable) return null
  return { id: f.riskId, cRaw: e.cRaw, iEfectivo: iEfectivo(f.factores.i), iPers: f.factores.i.pers.valor }
}

export interface RankingPrincipal {
  readonly posiciones: Posicion[]
  /** Los no evaluables van a una lista aparte (§9.4), con su motivo. */
  readonly noEvaluables: { riskId: string; motivo: string }[]
  /** Por cada padre, los hijos con cuyos factores se muestra (§1.4). */
  readonly padres: Map<string, { hijosPrioritarios: string[]; prioridadProvisional: boolean }>
  readonly items: Map<string, ItemRanking>
}

/**
 * Ranking principal (§7.1) de un conjunto de fichas de **una** organización. Entran riesgos
 * simples y padres; los padres con el ítem de su hijo prioritario. Los sub-riesgos y los
 * escenarios por causa común no entran nunca (§7.1.2, §14 propiedad 5): si se pasan, falla.
 */
export function rankingPrincipal(fichas: readonly Ficha[], todas: readonly Ficha[]): RankingPrincipal {
  const empresas = new Set(fichas.map((f) => f.casoEmpresa))
  if (empresas.size > 1) throw new Error(`CH-075: no hay ranking entre organizaciones (${[...empresas].join(', ')})`)
  const items = new Map<string, ItemRanking>()
  const noEvaluables: { riskId: string; motivo: string }[] = []
  const padres = new Map<string, { hijosPrioritarios: string[]; prioridadProvisional: boolean }>()
  for (const f of fichas) {
    if (f.tipoObjeto === 'sub_riesgo' || f.tipoObjeto === 'escenario') {
      throw new Error(`${f.evaluacionId}: un ${f.tipoObjeto} no compite en el ranking principal (§7.1.2)`)
    }
    if (f.tipoObjeto === 'padre') {
      const hijos = todas.filter((h) => h.tipoObjeto === 'sub_riesgo' && h.riesgoPadreId === f.riskId)
      if (hijos.length === 0) throw new Error(`${f.riskId}: padre sin hijos`)
      const pos = posicionPadre(hijos.map((h) => ({ id: h.riskId, item: itemDe(h) })))
      if (!pos.conPosicion) { noEvaluables.push({ riskId: f.riskId, motivo: 'todos los hijos no evaluables' }); continue }
      padres.set(f.riskId, { hijosPrioritarios: pos.hijosPrioritarios, prioridadProvisional: pos.prioridadProvisional })
      const prioritario = hijos.find((h) => h.riskId === pos.hijosPrioritarios[0])
      const item = prioritario === undefined ? null : itemDe(prioritario)
      if (item !== null) items.set(f.riskId, { ...item, id: f.riskId })
      continue
    }
    const e = evaluar(f.factores)
    const item = itemDe(f, e)
    if (item === null) noEvaluables.push({ riskId: f.riskId, motivo: e.evaluable ? '' : e.motivo })
    else items.set(f.riskId, item)
  }
  return { posiciones: rankingD10([...items.values()]), noEvaluables, padres, items }
}

export function indicePosicion(r: RankingPrincipal, riskId: string): number {
  const i = r.posiciones.findIndex((p) => p.ids.includes(riskId))
  if (i < 0) throw new Error(`${riskId} no está en el ranking principal`)
  return i
}

// ── Expectativas adjudicadas y veredicto (protocolo §8) ──────────────────────

/** Qué dice la adjudicación sobre el empate de un par. `no_especificado`: la columna no lo resuelve. */
export type Empate = 'permitido' | 'no_permitido' | 'no_especificado'

/** Expectativas juzgables con las fichas. Cada `momento` es un conjunto de fichas de una organización. */
export type Expectativa =
  | { readonly tipo: 'orden'; readonly momento: string; readonly alto: string; readonly bajo: string; readonly empate: Empate }
  | { readonly tipo: 'sin_orden'; readonly momento: string; readonly a: string; readonly b: string }
  | { readonly tipo: 'no_en_mitad_inferior'; readonly momento: string; readonly riesgo: string }
  | { readonly tipo: 'visible'; readonly momento: string; readonly riesgo: string }
  | { readonly tipo: 'safety_critical'; readonly momento: string; readonly riesgo: string }
  | {
      readonly tipo: 'movimiento'
      readonly desde: string
      readonly hasta: string
      /** `c_raw` o el `C_d` de una dimensión. */
      readonly medida: 'c_raw' | (typeof DIMENSIONES)[number]
      readonly sentido: 'baja' | 'sube' | 'igual'
    }

export type Categoria = 'PASS' | 'FAIL — combinación' | 'FAIL — ranking' | 'INDETERMINADO'

export interface Resultado {
  readonly expectativa: Expectativa
  readonly estado: 'cumple' | 'falla' | 'indeterminado'
  /** Para una falla: `combinación` si los `c_raw` difieren, `ranking` si son iguales (protocolo §8). */
  readonly categoria?: 'combinación' | 'ranking'
  readonly detalle: string
}

export interface Veredicto {
  readonly categoria: Categoria
  readonly secundarias: Categoria[]
  readonly resultados: Resultado[]
}

function cRawDe(r: RankingPrincipal, riskId: string): number {
  const item = r.items.get(riskId)
  if (item === undefined) throw new Error(`${riskId} no está en el ranking`)
  return item.cRaw
}

function visible(f: Ficha): boolean {
  // Protocolo §8: bandera visible o lista "no evaluable" con motivo.
  const e = evaluar(f.factores)
  return consecuenciaExtrema(f.factores.i).length > 0 || safetyCritical(f.factores.i) || (!e.evaluable && f.crudo.motivo_no_evaluable !== '')
}

export function juzgar(
  expectativas: readonly Expectativa[],
  momentos: Readonly<Record<string, readonly string[]>>,
  todas: readonly Ficha[],
): Veredicto {
  const fichaPorId = new Map(todas.map((f) => [f.evaluacionId, f]))
  const fichasDe = (momento: string): Ficha[] => {
    const ids = momentos[momento]
    if (ids === undefined) throw new Error(`momento desconocido: ${momento}`)
    return ids.map((id) => {
      const f = fichaPorId.get(id)
      if (f === undefined) throw new Error(`ficha desconocida: ${id}`)
      return f
    })
  }
  const rankings = new Map<string, RankingPrincipal>()
  const rankingDe = (momento: string): RankingPrincipal => {
    let r = rankings.get(momento)
    if (r === undefined) { r = rankingPrincipal(fichasDe(momento), todas); rankings.set(momento, r) }
    return r
  }
  const fichaDe = (momento: string, riskId: string): Ficha => {
    const f = fichasDe(momento).find((x) => x.riskId === riskId)
    if (f === undefined) throw new Error(`${riskId} no está en el momento ${momento}`)
    return f
  }

  const resultados = expectativas.map((x): Resultado => {
    switch (x.tipo) {
      case 'orden': {
        const r = rankingDe(x.momento)
        const [pa, pb] = [indicePosicion(r, x.alto), indicePosicion(r, x.bajo)]
        const categoria = cRawDe(r, x.alto) === cRawDe(r, x.bajo) ? 'ranking' : 'combinación'
        const detalle = `${x.alto} (${String(cRawDe(r, x.alto))}) en posición ${String(pa + 1)}, ${x.bajo} (${String(cRawDe(r, x.bajo))}) en ${String(pb + 1)}`
        if (pa < pb) return { expectativa: x, estado: 'cumple', detalle }
        if (pa > pb) return { expectativa: x, estado: 'falla', categoria, detalle }
        if (x.empate === 'permitido') return { expectativa: x, estado: 'cumple', detalle: `${detalle}: empate permitido` }
        if (x.empate === 'no_permitido') return { expectativa: x, estado: 'falla', categoria: 'ranking', detalle: `${detalle}: empate no permitido` }
        return { expectativa: x, estado: 'indeterminado', detalle: `${detalle}: la adjudicación no dice si el empate vale` }
      }
      case 'sin_orden':
        rankingDe(x.momento)
        return { expectativa: x, estado: 'cumple', detalle: `${x.a} y ${x.b}: la adjudicación no exige orden entre ellos` }
      case 'no_en_mitad_inferior': {
        const r = rankingDe(x.momento)
        const n = r.posiciones.reduce((s, p) => s + p.ids.length, 0)
        // Riesgos por delante de su posición (los empatados con él no cuentan).
        const delante = r.posiciones.slice(0, indicePosicion(r, x.riesgo)).reduce((s, p) => s + p.ids.length, 0)
        const ok = delante < Math.ceil(n / 2)
        return ok
          ? { expectativa: x, estado: 'cumple', detalle: `${x.riesgo}: ${String(delante)} de ${String(n)} por delante` }
          : { expectativa: x, estado: 'falla', categoria: 'combinación', detalle: `${x.riesgo}: ${String(delante)} de ${String(n)} por delante` }
      }
      case 'visible': {
        const f = fichaDe(x.momento, x.riesgo)
        return visible(f)
          ? { expectativa: x, estado: 'cumple', detalle: `${x.riesgo} visible` }
          : { expectativa: x, estado: 'falla', categoria: 'ranking', detalle: `${x.riesgo} no queda visible (protocolo §8)` }
      }
      case 'safety_critical': {
        const f = fichaDe(x.momento, x.riesgo)
        return safetyCritical(f.factores.i)
          ? { expectativa: x, estado: 'cumple', detalle: `${x.riesgo} safety_critical` }
          : { expectativa: x, estado: 'falla', categoria: 'ranking', detalle: `${x.riesgo} sin safety_critical` }
      }
      case 'movimiento': {
        const [a, b] = [fichaPorId.get(x.desde), fichaPorId.get(x.hasta)]
        if (a === undefined || b === undefined) throw new Error(`movimiento ${x.desde} → ${x.hasta}: ficha desconocida`)
        const [ea, eb] = [evaluar(a.factores), evaluar(b.factores)]
        if (!ea.evaluable || !eb.evaluable) return { expectativa: x, estado: 'indeterminado', detalle: 'alguna ficha no es evaluable' }
        const [va, vb] = x.medida === 'c_raw' ? [ea.cRaw, eb.cRaw] : [ea.cPorDimension[x.medida], eb.cPorDimension[x.medida]]
        const real = vb < va ? 'baja' : vb > va ? 'sube' : 'igual'
        const detalle = `${x.medida} ${String(va)} → ${String(vb)}`
        return real === x.sentido
          ? { expectativa: x, estado: 'cumple', detalle }
          : { expectativa: x, estado: 'falla', categoria: va === vb ? 'ranking' : 'combinación', detalle }
      }
    }
  })

  const presentes = new Set<Categoria>()
  for (const r of resultados) {
    if (r.estado === 'falla') presentes.add(r.categoria === 'combinación' ? 'FAIL — combinación' : 'FAIL — ranking')
    if (r.estado === 'indeterminado') presentes.add('INDETERMINADO')
  }
  // Orden de protocolo §8 (las categorías contradicción y definición dependen de anomalías, no de las fichas).
  const orden: Categoria[] = ['FAIL — combinación', 'FAIL — ranking', 'INDETERMINADO']
  const encontradas = orden.filter((c) => presentes.has(c))
  return { categoria: encontradas[0] ?? 'PASS', secundarias: encontradas.slice(1), resultados }
}
