// Reordenamiento profesional (decisión 5 del owner; dossier 15a §6; dossier de la Fase 13 §5).
// Un profesional discrepa del orden calculado de una organización y lo registra con causa y
// fundamento. El registro guarda la foto del orden calculado y las evaluaciones vigentes con que
// se calculó. La lista muestra el orden profesional **al lado** del calculado: ningún factor,
// `C_raw` ni banda cambia, y nada de este archivo lee ni escribe un factor.

import { numeroDePosicion, type RankingOrganizacion } from './lectura.ts'
import { banda as bandaDe, BANDAS } from './metodologia.ts'
import type { FilaOrdenCalculado, ReordenamientoRegistrado, RiesgoRegistrado } from './organizacion.ts'
import { rechazar } from './actualizacion.ts'

export const TIPOS_REORDENAMIENTO = ['par', 'posicion', 'banda'] as const
export type TipoReordenamiento = (typeof TIPOS_REORDENAMIENTO)[number]

/** Las causas y los patrones del dossier 15a §6 (los mismos que `risk.reordenamiento`). */
export const CAUSAS_REORDENAMIENTO = [
  'desacuerdo_de_criterio_profesional', 'regla_ambigua', 'ficha_insuficiente', 'lectura_distinta_del_mismo_hecho',
  'limite_de_la_combinacion', 'error_de_aplicacion', 'sin_causa',
] as const
export const PATRONES_REORDENAMIENTO = ['familia_s06', 'safety_bajo_economico', 'otro'] as const

/** La foto del orden calculado de una organización, como la guarda el reordenamiento (decisión 6a). */
export function fotoOrdenCalculado(r: RankingOrganizacion): FilaOrdenCalculado[] {
  return r.posiciones.flatMap((p) => [...p.ids].sort().map((id): FilaOrdenCalculado => {
    const item = r.items.get(id)
    return {
      riskId: id,
      posicion: numeroDePosicion(r, id) ?? 0,
      empate: p.ids.length > 1,
      provisional: p.provisional,
      banda: item === undefined ? null : bandaDe(item.cRaw),
    }
  }))
}

/** Lo que pide una persona al reordenar. */
export interface PedidoReordenamiento {
  readonly tipo: string
  readonly riskIdSube?: string | null
  readonly riskIdBaja?: string | null
  readonly riskId?: string | null
  readonly posicion?: number | null
  readonly banda?: string | null
  readonly causa: string
  readonly fundamento: string
  readonly patron: string
}

/** Comprueba un pedido contra el orden calculado: cada riesgo que nombra tiene que estar en él. */
export function exigirReordenamiento(p: PedidoReordenamiento, calculado: readonly FilaOrdenCalculado[]): void {
  const enOrden = (id: string | null | undefined, que: string): void => {
    if (id === null || id === undefined || id === '') rechazar(`falta ${que}`)
    if (!calculado.some((f) => f.riskId === id)) rechazar(`${id} no está en el orden calculado de la organización`)
  }
  if (!(TIPOS_REORDENAMIENTO as readonly string[]).includes(p.tipo)) rechazar(`tipo de reordenamiento desconocido: ${p.tipo}`)
  if (!(CAUSAS_REORDENAMIENTO as readonly string[]).includes(p.causa)) rechazar(`causa desconocida: ${p.causa}`)
  if (!(PATRONES_REORDENAMIENTO as readonly string[]).includes(p.patron)) rechazar(`patrón desconocido: ${p.patron}`)
  if (p.fundamento.trim() === '') rechazar('un reordenamiento necesita su fundamento')
  if (p.tipo === 'par') {
    enOrden(p.riskIdSube, 'el riesgo que sube')
    enOrden(p.riskIdBaja, 'el riesgo que baja')
    if (p.riskIdSube === p.riskIdBaja) rechazar('el que sube y el que baja son el mismo riesgo')
  } else {
    enOrden(p.riskId, 'el riesgo')
  }
  if (p.tipo === 'posicion') {
    const n = p.posicion ?? 0
    if (!Number.isInteger(n) || n < 1 || n > calculado.length) rechazar(`la posición va de 1 a ${String(calculado.length)}`)
  }
  if (p.tipo === 'banda' && !(BANDAS as readonly string[]).includes(p.banda ?? '')) rechazar('la banda profesional es Baja, Media, Alta o Crítica')
}

/** Los riesgos que nombra un reordenamiento. */
export const involucrados = (r: ReordenamientoRegistrado): string[] =>
  [r.riskIdSube, r.riskIdBaja, r.riskId].filter((x): x is string => x !== null)

/**
 * Si un reordenamiento sigue en pie: las evaluaciones vigentes de los riesgos que nombra (y, de
 * un padre, las de sus hijos) son las mismas con que se reordenó. Si una cambió, el orden
 * calculado del que discrepaba ya no es ese, y el reordenamiento queda en el historial sin
 * aplicarse (dossier de la Fase 13 §5: reapertura).
 */
export function sigueEnPie(
  r: ReordenamientoRegistrado, riesgos: readonly RiesgoRegistrado[], vigentes: ReadonlyMap<string, string>,
): boolean {
  const ids = involucrados(r).flatMap((id) => [id, ...riesgos.filter((h) => h.riesgoPadreId === id).map((h) => h.id)])
  const entonces = new Map(r.vigentes.map((v) => [v.riskId, v.evaluacionId]))
  return ids.every((id) => entonces.get(id) === vigentes.get(id))
}

export interface PosicionProfesional {
  readonly posicion: number
  readonly banda: string | null
  /** Los reordenamientos en pie que lo movieron o le dieron banda. */
  readonly por: readonly string[]
}

/**
 * El orden profesional: el calculado con los reordenamientos en pie aplicados en el orden en que
 * se registraron. `par` deja al que sube justo arriba del que baja (si no lo estaba), `posicion`
 * lo lleva a esa posición y `banda` sólo anota la banda profesional. Devuelve, por riesgo, su
 * posición profesional (1, 2, 3…, sin empates: es un orden de una persona) y su banda.
 */
export function ordenProfesional(
  calculado: readonly FilaOrdenCalculado[], enPie: readonly ReordenamientoRegistrado[],
): Map<string, PosicionProfesional> {
  const orden = calculado.map((f) => f.riskId)
  const banda = new Map<string, string>()
  const por = new Map<string, string[]>()
  const anotar = (id: string, r: string): void => { por.set(id, [...(por.get(id) ?? []), r]) }
  const mover = (id: string, a: number): void => {
    const i = orden.indexOf(id)
    if (i < 0) return
    orden.splice(i, 1)
    orden.splice(Math.max(0, Math.min(a, orden.length)), 0, id)
  }
  for (const r of enPie) {
    if (r.tipo === 'par' && r.riskIdSube !== null && r.riskIdBaja !== null) {
      if (orden.indexOf(r.riskIdSube) > orden.indexOf(r.riskIdBaja)) mover(r.riskIdSube, orden.indexOf(r.riskIdBaja))
      anotar(r.riskIdSube, r.id)
      anotar(r.riskIdBaja, r.id)
    }
    if (r.tipo === 'posicion' && r.riskId !== null && r.posicionProfesional !== null) {
      mover(r.riskId, r.posicionProfesional - 1)
      anotar(r.riskId, r.id)
    }
    if (r.tipo === 'banda' && r.riskId !== null && r.bandaProfesional !== null) {
      banda.set(r.riskId, r.bandaProfesional)
      anotar(r.riskId, r.id)
    }
  }
  return new Map(orden.map((id, i) => [id, { posicion: i + 1, banda: banda.get(id) ?? null, por: por.get(id) ?? [] }]))
}
