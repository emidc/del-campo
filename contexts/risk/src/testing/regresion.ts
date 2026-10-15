// Soporte de tests: compara lo que calcula `src/domain` sobre las filas de EMI-41 de los CSV
// sintéticos con `resultado_nuevo` de `regresion-emi41.csv`, la regresión que corrió una
// implementación independiente (Python, Fase 11b). El valor esperado sale de ese CSV y nunca de
// las funciones que se prueban.
//
// Como en `sinteticos.test.ts` de la 15b (`verificacion-15b.md` §4): se toman las filas
// importadas sin las de la 15b, se sigue la historia de cada riesgo, se toma la vigente (8a) y
// se compara C, posición, banda, banderas e I efectivo; en los padres, C y posición. La posición
// no se compara en una organización cuyos riesgos siguen historias de evaluadores distintos
// (S15: S15-R04 sigue la de Emiliano), porque la regresión ordena a cada evaluador por separado.

import { iEfectivoTexto } from '../domain/metodologia.ts'
import { derivados, historia, numeroDePosicion, rankingOrganizacion, type RankingOrganizacion } from '../domain/lectura.ts'
import { VERSION_METODOLOGIA, type Riesgo } from '../domain/modelo.ts'
import { LOTE_EMI41, loteDe, type Fila } from './sinteticos.ts'

/** El `resultado_nuevo` de `regresion-emi41.csv` para un objeto, calculado con `src/domain`. */
export function resultado(r: RankingOrganizacion, riesgo: Riesgo): string {
  const pos = numeroDePosicion(r, riesgo.id)
  if (riesgo.tipoObjeto === 'padre') {
    const item = r.items.get(riesgo.id)
    return item === undefined ? 'sin posición' : `C ${String(item.cRaw)} · pos ${String(pos)}`
  }
  const v = r.vigentes.get(riesgo.id)
  if (v === undefined) return 'sin evaluación'
  const d = derivados(VERSION_METODOLOGIA, v.factores)
  const banderas = `ext=${String(d.consecuenciaExtrema.length > 0)} · sc=${String(d.safetyCritical)} · I ${iEfectivoTexto(d.iEfectivo)}`
  if (d.cRaw === null) return `no evaluable · ${banderas}`
  return `C ${String(d.cRaw)} · pos ${riesgo.tipoObjeto === 'riesgo' ? String(pos) : '—'} · ${String(d.banda)} · ${banderas}`
}

export interface Comparacion {
  /** Objetos comparados (riesgos, sub-riesgos, escenarios y padres). */
  readonly objetos: number
  readonly empresas: string[]
  /** Organizaciones (por prefijo de origen) comparadas sin la posición. */
  readonly sinPosicion: string[]
  /** Una línea por objeto que no coincide: `origen: calculado ≠ esperado`. */
  readonly diferencias: string[]
}

const sinPos = (s: string): string => s.replace(/ · pos [^·]+/, '')

export function compararConRegresion(risks: readonly Fila[], regresion: readonly Fila[]): Comparacion {
  // Sin las filas de la 15b: la regresión de EMI-41 es la foto anterior a ellas.
  const lote = loteDe(risks.filter((f) => f.lote_origen === LOTE_EMI41))
  const diferencias: string[] = []
  const origen = (id: string): string => lote.origenDeRiesgo.get(id) ?? id
  const filasDe = (o: string): Fila[] => regresion.filter((x) => x.risk_id === o)

  // El evaluador de cada riesgo sale de los datos: la fila de la regresión cuya evaluación
  // (la nueva, o la anterior si no cambió) es la última de la cadena importada.
  const evaluador = new Map<string, string>()
  for (const r of lote.riesgos) {
    if (r.tipoObjeto === 'padre') continue
    const ultima = historia(lote.evaluaciones, r.id).at(-1)
    const ultimaOrigen = ultima === undefined ? '' : (lote.origenDeEvaluacion.get(ultima.id) ?? '')
    const coinciden = filasDe(origen(r.id)).filter((x) => (x.evaluacion_nueva !== '' ? x.evaluacion_nueva : x.evaluacion_anterior) === ultimaOrigen)
    const [fila, otra] = coinciden
    if (fila === undefined || otra !== undefined) {
      diferencias.push(`${origen(r.id)}: la cadena termina en ${ultimaOrigen} y la regresión tiene ${String(coinciden.length)} filas con esa evaluación`)
      continue
    }
    evaluador.set(r.id, fila.evaluador ?? '')
  }
  // Un padre no tiene evaluación (§1.4): lo ordena el evaluador de sus hijos.
  for (const p of lote.riesgos.filter((r) => r.tipoObjeto === 'padre')) {
    const deHijos = new Set(lote.riesgos.filter((h) => h.riesgoPadreId === p.id).map((h) => evaluador.get(h.id)))
    const [unico] = deHijos
    if (deHijos.size === 1 && unico !== undefined) evaluador.set(p.id, unico)
    else diferencias.push(`${origen(p.id)}: sus hijos siguen historias de ${String(deHijos.size)} evaluadores`)
  }

  const organizaciones = [...new Set(lote.riesgos.map((r) => r.organizacionId))]
  const empresas: string[] = []
  const sinPosicion: string[] = []
  let objetos = 0
  for (const org of organizaciones) {
    const riesgos = lote.riesgos.filter((r) => r.organizacionId === org)
    const ids = new Set(riesgos.map((r) => r.id))
    const ranking = rankingOrganizacion(VERSION_METODOLOGIA, riesgos, lote.evaluaciones.filter((e) => ids.has(e.riskId)))
    const empresa = origen(riesgos[0]?.id ?? '').slice(0, 3)
    empresas.push(empresa)
    const conPos = new Set(riesgos.map((r) => evaluador.get(r.id))).size === 1
    if (!conPos) sinPosicion.push(empresa)
    for (const r of riesgos) {
      objetos++
      const esperado = filasDe(origen(r.id)).find((x) => x.evaluador === evaluador.get(r.id))?.resultado_nuevo
      if (esperado === undefined) { diferencias.push(`${origen(r.id)}: sin fila de regresión`); continue }
      const calculado = resultado(ranking, r)
      // Para un padre, la regresión agrega banda y banderas de su hijo: se compara C y posición.
      const [a, b] = conPos ? [calculado, esperado] : [sinPos(calculado), sinPos(esperado)]
      const igual = r.tipoObjeto === 'padre' ? b === a || b.startsWith(`${a} · `) : a === b
      if (!igual) diferencias.push(`${origen(r.id)}: ${calculado} ≠ ${esperado}`)
    }
  }
  return { objetos, empresas: empresas.sort(), sinPosicion, diferencias }
}
