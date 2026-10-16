// Orden profesional (decisión 5): los reordenamientos en pie se aplican sobre el orden calculado,
// en el orden en que se registraron, y caducan cuando cambia la vigente de un riesgo que nombran.

import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import type { FilaOrdenCalculado, ReordenamientoRegistrado, RiesgoRegistrado } from './organizacion.ts'
import { exigirReordenamiento, ordenProfesional, sigueEnPie } from './reordenamiento.ts'
import { RechazoActualizacion } from './actualizacion.ts'

const calc: FilaOrdenCalculado[] = ['A', 'B', 'C', 'D'].map((riskId, i) => ({ riskId, posicion: i + 1, empate: false, provisional: false, banda: 'Media' }))
const r = (x: Partial<ReordenamientoRegistrado>): ReordenamientoRegistrado => ({
  id: 'ROR', organizacionId: 'O', autor: 'P', tipo: 'par', riskIdSube: null, riskIdBaja: null, riskId: null, posicionProfesional: null,
  bandaProfesional: null, ordenCalculado: calc, versionFunciones: 'metodologia v1', causa: 'sin_causa', fundamento: 'f', patron: 'otro',
  ordenPrevioId: null, registradoEn: '', vigentes: [], ...x,
})
const orden = (m: Map<string, { posicion: number }>): string[] => [...m].sort((a, b) => a[1].posicion - b[1].posicion).map(([id]) => id)

describe('orden profesional', () => {
  it('sin reordenamientos es el calculado', () => { assert.deepEqual(orden(ordenProfesional(calc, [])), ['A', 'B', 'C', 'D']) })
  it('par: el que sube queda justo arriba del que baja; si ya lo estaba, no se mueve', () => {
    assert.deepEqual(orden(ordenProfesional(calc, [r({ id: '1', riskIdSube: 'D', riskIdBaja: 'B' })])), ['A', 'D', 'B', 'C'])
    assert.deepEqual(orden(ordenProfesional(calc, [r({ id: '1', riskIdSube: 'A', riskIdBaja: 'C' })])), ['A', 'B', 'C', 'D'])
  })
  it('posición y banda, en el orden en que se registraron', () => {
    const m = ordenProfesional(calc, [
      r({ id: '1', tipo: 'posicion', riskId: 'C', posicionProfesional: 1 }),
      r({ id: '2', tipo: 'banda', riskId: 'B', bandaProfesional: 'Crítica' }),
      r({ id: '3', tipo: 'par', riskIdSube: 'D', riskIdBaja: 'C' }),
    ])
    assert.deepEqual(orden(m), ['D', 'C', 'A', 'B'])
    assert.deepEqual(m.get('B'), { posicion: 4, banda: 'Crítica', por: ['2'] })
    assert.deepEqual(m.get('C')?.por, ['1', '3'])
  })
  it('caduca si cambia la vigente de un riesgo que nombra, o la de un hijo del padre que nombra', () => {
    const riesgos = [{ id: 'P' }, { id: 'H', riesgoPadreId: 'P' }, { id: 'A' }].map((x) => ({ riesgoPadreId: null, ...x })) as unknown as RiesgoRegistrado[]
    const x = r({ riskIdSube: 'P', riskIdBaja: 'A', vigentes: [{ riskId: 'H', evaluacionId: 'E1' }, { riskId: 'A', evaluacionId: 'E2' }] })
    assert.equal(sigueEnPie(x, riesgos, new Map([['H', 'E1'], ['A', 'E2']])), true)
    assert.equal(sigueEnPie(x, riesgos, new Map([['H', 'E3'], ['A', 'E2']])), false)
    assert.equal(sigueEnPie(x, riesgos, new Map([['H', 'E1'], ['A', 'E4']])), false)
  })
  it('un pedido nombra riesgos del orden calculado, con causa, patrón y fundamento', () => {
    const ok = { tipo: 'par', riskIdSube: 'B', riskIdBaja: 'A', causa: 'regla_ambigua', fundamento: 'x', patron: 'otro' }
    exigirReordenamiento(ok, calc)
    for (const malo of [{ ...ok, riskIdSube: 'Z' }, { ...ok, riskIdSube: 'A' }, { ...ok, causa: 'otra' }, { ...ok, fundamento: ' ' },
      { ...ok, tipo: 'posicion', riskId: 'A', posicion: 9 }, { ...ok, tipo: 'banda', riskId: 'A', banda: 'Altísima' }]) {
      assert.throws(() => { exigirReordenamiento(malo, calc) }, RechazoActualizacion, JSON.stringify(malo))
    }
  })
})
