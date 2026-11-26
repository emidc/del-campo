// Plan de la importación de automotores de Zoho, sin base.

import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { planificar } from './automotores-zoho.ts'
import type { AutomotorZoho, PolizaDestino } from './automotores-zoho.ts'

const fila = (zohoId: string, patente: string, polizaId: string, marca = 'FORD', modelo = 'KA', anio = '2015'): AutomotorZoho => ({
  zohoId,
  patente,
  marca,
  modelo,
  anio,
  polizaId,
})

const polizas = new Map<string, PolizaDestino>([
  ['z-p1', { policyId: 'p1', tomador: 'ana', inicio: '2024-03-01' }],
  ['z-p2', { policyId: 'p2', tomador: 'beto', inicio: '2025-06-01' }],
  ['z-p3', { policyId: 'p3', tomador: 'ana', inicio: '2023-01-01' }],
])

describe('automotores de Zoho', () => {
  it('normaliza la patente y carga una vez el automotor que está en varias pólizas', () => {
    const plan = planificar([fila('1', 'ab 123-cd', 'z-p1'), fila('2', 'AB123CD', 'z-p3')], polizas, new Set())
    assert.deepEqual(plan.altas, [{ plate: 'AB123CD', partyId: 'ana', brand: 'FORD', model: 'KA', year: 2015 }])
    assert.deepEqual(plan.vinculos, [
      { plate: 'AB123CD', policyId: 'p1' },
      { plate: 'AB123CD', policyId: 'p3' },
    ])
    assert.equal(plan.enVariosClientes, 0)
  })

  it('si la patente está en pólizas de dos clientes, queda en el tomador de la más reciente', () => {
    const plan = planificar([fila('1', 'AB123CD', 'z-p2', 'FIAT', 'UNO', '2000'), fila('2', 'AB123CD', 'z-p1', 'FIAT', 'UNO WAY', '2001')], polizas, new Set())
    assert.deepEqual(plan.altas, [{ plate: 'AB123CD', partyId: 'beto', brand: 'FIAT', model: 'UNO', year: 2000 }])
    assert.equal(plan.vinculos.length, 2)
    assert.equal(plan.enVariosClientes, 1)
  })

  it('una patente que ya está en Broker OS no se vuelve a cargar, pero se vincula', () => {
    const plan = planificar([fila('1', 'AB123CD', 'z-p1')], polizas, new Set(['AB123CD']))
    assert.deepEqual(plan.altas, [])
    assert.deepEqual(plan.vinculos, [{ plate: 'AB123CD', policyId: 'p1' }])
    assert.equal(plan.yaCargadas, 1)
  })

  it('manda a revisión las patentes provisorias o inválidas y las filas sin póliza en Broker OS', () => {
    const plan = planificar(
      [fila('1', 'NOTIENE', 'z-p1'), fila('2', 'CHASIS577', 'z-p1'), fila('3', 'A/D', 'z-p1'), fila('4', '', 'z-p1'), fila('5', 'AB123CD', ''), fila('6', 'AC456DE', 'z-otra')],
      polizas,
      new Set(),
    )
    assert.deepEqual(
      plan.revisar.map((r) => `${r.zohoId} ${r.motivo}`),
      ['1 patente_provisoria', '2 patente_provisoria', '3 patente_invalida', '4 patente_invalida', '5 sin_poliza', '6 poliza_no_encontrada'],
    )
    assert.deepEqual(plan.altas, [])
  })

  it('un año que no se entiende queda vacío', () => {
    const plan = planificar([fila('1', 'AB123CD', 'z-p1', 'VW', 'GOL', '2014}'), fila('2', 'AC456DE', 'z-p1', 'VW', 'GOL', '1578')], polizas, new Set())
    assert.deepEqual(plan.altas.map((a) => a.year), [2014, null])
    assert.equal(plan.aniosDescartados, 1)
  })
})
