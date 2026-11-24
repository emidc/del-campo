import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import type { RenewalItem } from '@del-campo/api'

import {
  conjuntos,
  enlace,
  esConjuntoActivo,
  filtrar,
  leerFiltros,
  mesPorDefecto,
  mesesDelSelector,
  paginar,
  rangoDelMes,
} from './filtros.ts'

const HOY = '2026-11-24'

const item = (n: number, cambios: Partial<RenewalItem> = {}): RenewalItem => ({
  policyId: `p${String(n)}`,
  policyNumber: String(n),
  insurerId: 'seg',
  insurerName: 'La Segunda',
  producer: null,
  holderPartyId: 'h',
  holderName: null,
  productReference: 'Automotor',
  termStartDate: '2025-12-10',
  termEndDate: '2026-12-10',
  renewalMode: 'AUTOMATIC',
  premium: null,
  totalPremium: null,
  sumInsured: null,
  currency: null,
  paymentMethod: null,
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

describe('mes de Renovaciones', () => {
  it('por defecto muestra el mes siguiente; en diciembre, enero del año próximo', () => {
    assert.equal(mesPorDefecto('2026-11-24'), '2026-12')
    assert.equal(mesPorDefecto('2026-12-01'), '2027-01')
    assert.equal(leerFiltros({}, HOY).mes, '2026-12')
  })

  it('el selector va de dos meses atrás a seis adelante', () => {
    const meses = mesesDelSelector(HOY)
    assert.equal(meses[0], '2026-09')
    assert.equal(meses.at(-1), '2027-05')
    assert.equal(meses.length, 9)
  })

  it('un mes cubre del primero al último día; «todos» cubre todo el selector', () => {
    assert.deepEqual(rangoDelMes('2027-02', HOY), { desde: '2027-02-01', hasta: '2027-02-28' })
    assert.deepEqual(rangoDelMes('todos', HOY), { desde: '2026-09-01', hasta: '2027-05-31' })
  })

  it('un mes fuera del selector vuelve al de por defecto', () => {
    assert.equal(leerFiltros({ mes: '2030-01' }, HOY).mes, '2026-12')
    assert.equal(leerFiltros({ mes: 'todos' }, HOY).mes, 'todos')
  })
})

describe('filtros y páginas', () => {
  it('filtra por riesgo (varios, sin importar tildes), forma de pago y estado, y ordena por fin de vigencia', () => {
    const items = [
      item(1, { termEndDate: '2026-12-20', productReference: 'Motovehiculo', paymentMethod: 'Efectivo' }),
      item(2, { termEndDate: '2026-12-05', productReference: 'Automotor', paymentMethod: 'Efectivo' }),
      item(3, { productReference: 'Caución', paymentMethod: 'Efectivo' }),
      item(4, { paymentMethod: 'Debito' }),
      item(5, { paymentMethod: 'Efectivo', state: 'RENOVADA' }),
      item(6, { paymentMethod: 'Efectivo', renewalMode: 'MANUAL' }),
    ]
    const f = leerFiltros({ riesgo: ['Automotor', 'Motovehículo'], pago: 'efectivo', estado: 'PENDIENTE', modo: 'AUTOMATIC' }, HOY)
    assert.deepEqual(filtrar(items, f).map((r) => r.policyNumber), ['2', '1'])
  })

  it('pagina de a 100', () => {
    const items = Array.from({ length: 250 }, (_, i) => i)
    const segunda = paginar(items, 2)
    assert.deepEqual([segunda.paginas, segunda.desde, segunda.hasta, segunda.filas.length], [3, 101, 200, 100])
    assert.equal(paginar(items, 9).pagina, 3)
    assert.equal(paginar([], 1).paginas, 1)
  })

  it('cambiar un filtro vuelve a la página 1 y no escribe lo que va por defecto', () => {
    const f = leerFiltros({ pagina: '3', riesgo: 'Automotor' }, HOY)
    assert.equal(enlace(f, { pago: 'Efectivo' }, HOY), '/renovaciones?riesgo=Automotor&pago=Efectivo')
    assert.equal(enlace(f, { pagina: 2 }, HOY), '/renovaciones?riesgo=Automotor&pagina=2')
  })
})

describe('conjuntos de filtros', () => {
  const companias = [
    { id: 'otra', name: 'Sancor' },
    { id: 'seg', name: 'La Segunda' },
  ]

  it('La Segunda Autos: mes siguiente, La Segunda y los cuatro riesgos de autos', () => {
    const autos = conjuntos(HOY, companias).find((c) => c.nombre === 'La Segunda Autos')
    assert.ok(autos)
    assert.equal(
      enlace(autos.filtros, {}, HOY),
      '/renovaciones?compania=seg&riesgo=Automotor&riesgo=Motovehiculo&riesgo=TRAILER&riesgo=Flota+automotor',
    )
  })

  it('Pago en efectivo: todos los meses y forma de pago Efectivo', () => {
    const efectivo = conjuntos(HOY, companias).find((c) => c.nombre === 'Pago en efectivo')
    assert.equal(enlace(efectivo?.filtros ?? leerFiltros({}, HOY), {}, HOY), '/renovaciones?mes=todos&pago=Efectivo')
  })

  it('se marca activo sólo si los filtros coinciden', () => {
    const efectivo = conjuntos(HOY, companias).find((c) => c.nombre === 'Pago en efectivo')
    if (efectivo === undefined) throw new Error('falta el conjunto')
    assert.equal(esConjuntoActivo(leerFiltros({ mes: 'todos', pago: 'Efectivo', pagina: '2' }, HOY), efectivo), true)
    assert.equal(esConjuntoActivo(leerFiltros({ mes: 'todos', pago: 'Efectivo', estado: 'PENDIENTE' }, HOY), efectivo), false)
  })

  it('sin La Segunda entre las compañías, ese conjunto no se ofrece', () => {
    assert.deepEqual(conjuntos(HOY, [{ id: 'otra', name: 'Sancor' }]).map((c) => c.nombre), ['Pago en efectivo'])
  })
})
