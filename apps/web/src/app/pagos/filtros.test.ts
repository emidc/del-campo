import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import type { Pago } from '@del-campo/api'

import { enlace, filtrar, leerFiltros } from './filtros.ts'

const pago = (id: string, paid: boolean, riesgo: string, productor: string): Pago =>
  ({
    poliza: { policyId: id, insurerId: 'ins', producer: productor, productReference: riesgo },
    cuota: { number: 1, dueDate: '2026-11-10', amount: '1', paid },
    total: 1,
    atrasada: false,
  }) as unknown as Pago

describe('filtros de Pagos', () => {
  it('lee y escribe los filtros en la dirección', () => {
    const f = leerFiltros({ estado: 'impagas', riesgo: ['Automotor', 'Flota automotor'], productor: 'Jimena', otro: 'x' })
    assert.deepEqual(f, { estado: 'impagas', compania: undefined, productor: 'Jimena', riesgos: ['Automotor', 'Flota automotor'] })
    assert.equal(enlace(f, { estado: undefined }), '/pagos?productor=Jimena&riesgo=Automotor&riesgo=Flota+automotor')
    assert.equal(leerFiltros({ estado: 'cualquiera' }).estado, undefined)
  })

  it('filtra por pagadas o impagas, riesgo (sin tildes) y productor', () => {
    const pagos = [pago('A', true, 'Automotor', 'Jimena'), pago('B', false, 'Motovehículo', 'Manuel'), pago('C', false, 'Automotor', 'Jimena')]
    const ids = (f: Parameters<typeof filtrar>[1]) => filtrar(pagos, f).map((p) => p.poliza.policyId)
    assert.deepEqual(ids({ estado: 'pagadas', riesgos: [] }), ['A'])
    assert.deepEqual(ids({ estado: 'impagas', riesgos: [] }), ['B', 'C'])
    assert.deepEqual(ids({ riesgos: ['motovehiculo'] }), ['B'])
    assert.deepEqual(ids({ productor: 'Jimena', riesgos: [] }), ['A', 'C'])
  })
})
