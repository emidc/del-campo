// Cuotas propuestas y la selección de Pagos: funciones puras, sin base.

import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import type { Installment, RenewalItem } from '@del-campo/db'
import { buildPlan, defaultPlan, monthsCovered, roundedAmounts, splitAmount } from '@del-campo/db'

import { cuotasDelMes, pagaEnEfectivo, tieneCuotas } from './cuotas.ts'

describe('plan de cuotas propuesto', () => {
  it('cuenta los meses de vigencia redondeando al más cercano', () => {
    assert.equal(monthsCovered('2026-09-01', '2026-11-30'), 3)
    assert.equal(monthsCovered('2026-09-09', '2026-12-09'), 3)
    assert.equal(monthsCovered('2026-01-01', '2027-01-01'), 12)
    assert.equal(monthsCovered('2026-01-01', '2026-01-05'), 1)
  })

  it('reparte el premio en partes iguales y la última se lleva el redondeo', () => {
    assert.deepEqual(splitAmount('890166.16', 3), ['296722.05', '296722.05', '296722.06'])
    assert.deepEqual(splitAmount(null, 2), [null, null])
  })

  it('redondeo de la compañía: pesos enteros y la primera se lleva la diferencia', () => {
    assert.deepEqual(roundedAmounts('89259.22', 6), ['14879.22', '14876.00', '14876.00', '14876.00', '14876.00', '14876.00'])
    assert.deepEqual(roundedAmounts('900', 3), ['300.00', '300.00', '300.00'])
    assert.deepEqual(roundedAmounts(null, 2), [null, null])
  })

  it('una cuota por mes, a mes vencido, los días 10, con el redondeo', () => {
    const plan = defaultPlan('2026-07-01', '2027-01-01', '89259.22')
    assert.deepEqual(plan.map((c) => c.dueDate), ['2026-08-10', '2026-09-10', '2026-10-10', '2026-11-10', '2026-12-10', '2027-01-10'])
    assert.deepEqual(plan.map((c) => c.amount?.slice(0, 5)), ['14879', '14876', '14876', '14876', '14876', '14876'])
    assert.deepEqual(plan.map((c) => c.number), [1, 2, 3, 4, 5, 6])
    assert.ok(plan.every((c) => !c.paid))
  })
})

const poliza = (id: string, cambios: Partial<RenewalItem> = {}): RenewalItem => ({
  policyId: id,
  policyNumber: id,
  insurerId: 'ins',
  insurerName: 'Aseguradora',
  producer: null,
  holderPartyId: 'p',
  holderName: null,
  productReference: 'Automotor',
  termStartDate: '2026-09-09',
  termEndDate: '2026-12-09',
  renewalMode: 'MANUAL',
  premium: null,
  totalPremium: '300',
  sumInsured: null,
  currency: 'ARS',
  paymentMethod: 'Efectivo',
  nextEndorsementNumber: 1,
  state: 'PENDIENTE',
  successorPolicyId: null,
  successorPolicyNumber: null,
  caseId: null,
  caseStatus: null,
  caseAssignedEmail: null,
  comment: null,
  ...cambios,
})

describe('plan editado', () => {
  it('mismo valor y mismo día para todas; el día se recorta en meses cortos', () => {
    assert.deepEqual(
      buildPlan('2026-12-01', 3, ['100', '100', '100'], 29, 'CURRENT').map((c) => [c.dueDate, c.amount]),
      [
        ['2026-12-29', '100'],
        ['2027-01-29', '100'],
        ['2027-02-28', '100'],
      ],
    )
    assert.equal(buildPlan('2026-07-01', 1, [null], 1, 'ARREARS')[0]?.dueDate, '2026-08-01')
    assert.equal(buildPlan('2026-07-01', 1, [null], 1, 'CURRENT')[0]?.dueDate, '2026-07-01')
  })
})

describe('Pagos del mes', () => {
  it('sólo efectivo, sin tildes ni mayúsculas', () => {
    assert.equal(pagaEnEfectivo('EFECTIVO'), true)
    assert.equal(pagaEnEfectivo('Tarjeta'), false)
    assert.equal(pagaEnEfectivo(null), false)
  })

  it('Caución, Vida colectivo, Vida obligatorio y Retiro no llevan cuotas', () => {
    assert.equal(tieneCuotas('Efectivo', 'Automotor'), true)
    assert.equal(tieneCuotas('Efectivo', null), true)
    for (const r of ['Caución', 'CAUCION', 'Vida Colectivo', 'Vida obligatorio', 'RETIRO']) assert.equal(tieneCuotas('Efectivo', r), false)
    assert.equal(tieneCuotas('Tarjeta', 'Automotor'), false)
  })

  it('las del mes (pagadas o no) y las atrasadas de meses anteriores, por fecha', () => {
    const guardadas = new Map<string, Installment[]>([
      [
        'B',
        [
          { number: 1, dueDate: '2026-09-10', amount: '100', paid: true },
          { number: 2, dueDate: '2026-10-10', amount: '100', paid: false },
          { number: 3, dueDate: '2026-11-05', amount: '100', paid: true },
        ],
      ],
    ])
    const pagos = cuotasDelMes([poliza('A'), poliza('B')], guardadas, '2026-11-20')
    assert.deepEqual(
      pagos.map((p) => [p.poliza.policyId, p.cuota.number, p.total, p.atrasada, p.cuota.paid]),
      [
        ['A', 1, 3, true, false],
        ['B', 2, 3, true, false],
        ['B', 3, 3, false, true],
        ['A', 2, 3, true, false],
      ],
    )
  })

  it('la del mes no está atrasada hasta que pasa su día', () => {
    const pagos = cuotasDelMes([poliza('A', { termStartDate: '2026-10-01', termEndDate: '2026-11-01' })], new Map(), '2026-11-09')
    assert.deepEqual(pagos.map((p) => [p.cuota.dueDate, p.atrasada]), [['2026-11-10', false]])
  })
})
