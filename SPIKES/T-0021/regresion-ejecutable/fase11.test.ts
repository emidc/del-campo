// Corrida F11-REG-01 (Fase 11b): la regresión de `v0/fase-11/regresion.py` contra esta capa de
// referencia. Las dos implementaciones son independientes (Python y TypeScript); si coinciden
// en las 285 filas de EMI-41, la regresión no depende de un error de una de ellas.

import assert from 'node:assert/strict'
import { readdirSync } from 'node:fs'
import { describe, it } from 'node:test'

import { aFicha, leerCsv, type Ficha } from './fichas.ts'
import { derivadosCalculados, discrepancias, indicePosicion, rankingPrincipal } from './verificacion.ts'

const V0 = new URL('../v0/', import.meta.url)

/** Las fichas de padre de la Fase 8 no tienen factores propios (§1.4): se cargan como `unknown`. */
function cargar(fila: Record<string, string>): Ficha {
  if (fila.tipo_objeto !== 'padre') return aFicha(fila)
  const x = { ...fila }
  for (const k of Object.keys(x)) if (k.endsWith('_valor') && x[k] === '') x[k] = 'unknown'
  for (const k of ['evaluable', 'consecuencia_extrema', 'safety_critical']) if (x[k] === '') x[k] = 'false'
  if (x.uncertainty === '') x.uncertainty = 'low'
  if (x.techo_plausible === '') x.techo_plausible = '0'
  return aFicha(x)
}

const clave = (f: Ficha): string => `${f.evaluacionId}/${f.riskId}`
const agente = readdirSync(new URL('fase-8/agente/', V0)).flatMap((d) => leerCsv(new URL(`fase-8/agente/${d}/fichas.csv`, V0)).map(cargar))
const emiliano = leerCsv(new URL('fase-8/emiliano/fichas-emiliano.csv', V0)).map(cargar)
const nuevas = leerCsv(new URL('fase-11/reevaluacion/fichas-reevaluadas.csv', V0)).map(cargar)
const reemplazo = new Map(nuevas.map((f) => [`${f.evaluacionAnteriorId}/${f.riskId}`, f]))
const agenteV1 = agente.map((f) => reemplazo.get(clave(f)) ?? f)
const regresion = leerCsv(new URL('fase-11/regresion-emi41.csv', V0))

/** El `resultado_nuevo` de `regresion-emi41.csv`, recalculado acá. La posición cuenta los riesgos por delante. */
function resultado(f: Ficha, fichas: readonly Ficha[]): string {
  const org = fichas.filter((x) => x.casoEmpresa === f.casoEmpresa && (x.tipoObjeto === 'riesgo' || x.tipoObjeto === 'padre'))
  const r = rankingPrincipal(org, fichas)
  const pos = (): string => {
    const i = indicePosicion(r, f.riskId)
    return String(1 + r.posiciones.slice(0, i).reduce((n, p) => n + p.ids.length, 0))
  }
  const d = derivadosCalculados(f)
  if (f.tipoObjeto === 'padre') {
    const item = r.items.get(f.riskId)
    return item === undefined ? 'sin posición' : `C ${String(item.cRaw)} · pos ${pos()}`
  }
  if (d.evaluable !== 'true') return `no evaluable · ext=${d.consecuenciaExtrema} · sc=${d.safetyCritical} · I ${d.iEfectivo}`
  const p = f.tipoObjeto === 'riesgo' ? pos() : '—'
  return `C ${d.cRaw} · pos ${p} · ${d.banda} · ext=${d.consecuenciaExtrema} · sc=${d.safetyCritical} · I ${d.iEfectivo}`
}

describe('F11-REG-01: fichas reevaluadas y regresión de EMI-41 contra la capa de referencia', () => {
  it('45 fichas nuevas, una por ficha anterior del agente, sin sobrescribir ninguna', () => {
    assert.equal(nuevas.length, 45)
    assert.equal(agente.filter((f) => reemplazo.has(clave(f))).length, 45)
    for (const f of nuevas) {
      assert.equal(f.motivo, 'cambio_version_metodologia', f.evaluacionId)
      assert.equal(f.versionMetodologia, 'metodologia v1 candidate', f.evaluacionId)
      assert.equal(f.crudo.review_status, 'pending', f.evaluacionId)
      assert.ok(!agente.some((a) => a.evaluacionId === f.evaluacionId), `${f.evaluacionId} pisa un id anterior`)
    }
  })

  it('los derivados registrados de las 45 coinciden con las reglas v1 candidate', () => {
    // Única diferencia: el texto de `v_aspectos_aplicables` que las fichas de tecnología y pagos
    // traen de la Fase 8 ("rec(min)"); es el mismo `V_d`, escrito distinto, y no lo cambió la 11b.
    const halladas = nuevas.flatMap((f) => discrepancias(f))
    assert.ok(halladas.every((d) => d.campo === 'vAspectosAplicables' && d.registrado.includes('rec(min)')), JSON.stringify(halladas))
    assert.deepEqual(halladas.map((d) => d.evaluacionId), ['EV-11-0007', 'EV-11-0008', 'EV-11-0029'])
  })

  it('las 285 filas de regresion-emi41.csv: el resultado nuevo de Python es el de esta capa', () => {
    assert.equal(regresion.length, 285)
    const distintas: string[] = []
    for (const fila of regresion) {
      const fichas = fila.evaluador === 'agente' ? agenteV1 : emiliano
      const id = fila.evaluacion_nueva !== '' ? fila.evaluacion_nueva : fila.evaluacion_anterior
      const f = fichas.find((x) => x.evaluacionId === id && x.riskId === fila.risk_id)
      if (f === undefined) { distintas.push(`${String(fila.risk_id)}: no está la ficha ${String(id)}`); continue }
      const ts = resultado(f, fichas)
      const py = fila.resultado_nuevo ?? ''
      // Para un padre, Python agrega banda y banderas de su hijo; acá se compara C y posición.
      if (f.tipoObjeto === 'padre' ? !py.startsWith(ts) : ts !== py) distintas.push(`${String(fila.risk_id)}: ${ts} ≠ ${py}`)
    }
    assert.deepEqual(distintas, [])
  })
})
