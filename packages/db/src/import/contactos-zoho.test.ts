import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { normalizarMail, normalizarTelefono, planificar } from './contactos-zoho.ts'
import type { Existente, ValorZoho } from './contactos-zoho.ts'

const ok = (raw: string, movil = false): string | null => {
  const t = normalizarTelefono(raw, movil)
  return t.kind === 'ok' ? t.value : null
}

describe('normalizarTelefono', () => {
  it('pasa a +54 un número con característica, como lo escribe alguien', () => {
    assert.equal(ok('(0261) 425-0101'), '+542614250101')
    assert.equal(ok('261 4250101'), '+542614250101')
    assert.equal(ok('+54 261 4250101'), '+542614250101')
    assert.equal(ok('0054 11 4321 0000'), '+541143210000')
  })

  it('reconoce el celular por el 15, el 9 o la columna Móvil', () => {
    assert.equal(ok('0261 15 555 0101'), '+5492615550101')
    assert.equal(ok('011 15 5555 0101'), '+5491155550101')
    assert.equal(ok('02954 15 550101'), '+5492954550101')
    assert.equal(ok('+54 9 261 555-0101'), '+5492615550101')
    assert.equal(ok('261 555 0101', true), '+5492615550101')
  })

  it('no inventa la característica', () => {
    assert.deepEqual(normalizarTelefono('425-0101'), { kind: 'sin_caracteristica' })
    assert.deepEqual(normalizarTelefono('15 555 0101'), { kind: 'sin_caracteristica' })
  })

  it('rechaza lo que no es un número argentino completo', () => {
    assert.deepEqual(normalizarTelefono('sin teléfono'), { kind: 'invalido' })
    assert.deepEqual(normalizarTelefono('0261 4250101 / 0261 4250102'), { kind: 'invalido' })
  })
})

describe('normalizarMail', () => {
  it('acepta un mail y lo pasa a minúsculas', () => {
    assert.equal(normalizarMail(' Ana@Sintetico.Test '), 'ana@sintetico.test')
    assert.equal(normalizarMail('ana@sintetico'), null)
    assert.equal(normalizarMail('ana sintetico.test'), null)
  })
})

const valor = (entidad: ValorZoho['entidad'], zohoId: string, columna: string, v: string): ValorZoho => ({
  entidad,
  zohoId,
  canal: columna.startsWith('Correo') ? 'EMAIL' : 'PHONE',
  columna,
  valor: v,
})
const existente = (id: string, partyId: string, value: string, source: string | null): Existente => ({
  id,
  partyId,
  channel: value.includes('@') ? 'EMAIL' : 'PHONE',
  value,
  normalizedValue: value.startsWith('+54') ? value.slice(1) : value.trim().toLowerCase(),
  source,
})

describe('planificar', () => {
  const clientes = new Map([
    ['Contactos:c1', 'p1'],
    ['Contactos:c2', 'p2'],
    ['Cuentas:a1', 'e1'],
  ])

  it('corrige el formato de lo cargado y agrega lo que falta', () => {
    const plan = planificar(
      [valor('Contactos', 'c1', 'Teléfono', '0261 4250101'), valor('Contactos', 'c1', 'Otro teléfono', '261 4250102')],
      clientes,
      [existente('x1', 'p1', '0261 4250101', 'zoho:Contactos:c1')],
    )
    assert.deepEqual(plan.actualizar, [{ id: 'x1', value: '+542614250101', normalized: '542614250101' }])
    assert.deepEqual(plan.altas, [{ partyId: 'p1', channel: 'PHONE', value: '+542614250102', normalized: '542614250102', source: 'zoho:Contactos:c1' }])
    assert.deepEqual(plan.bajas, [])
  })

  it('deja el número sólo en la persona cuando la empresa lo repite', () => {
    const plan = planificar(
      [valor('Contactos', 'c1', 'Teléfono', '0261 4250101'), valor('Cuentas', 'a1', 'Teléfono', '(261) 425-0101')],
      clientes,
      [existente('x1', 'p1', '+542614250101', 'zoho:Contactos:c1'), existente('x2', 'e1', '(261) 425-0101', 'zoho:Cuentas:a1')],
    )
    assert.deepEqual(plan.bajas, ['x2'])
    assert.equal(plan.sinCambios, 1)
    assert.deepEqual(plan.revisar, [])
  })

  it('no carga un número que tienen dos personas y lo manda a revisión', () => {
    const plan = planificar(
      [valor('Contactos', 'c1', 'Correo electrónico', 'casa@sintetico.test'), valor('Contactos', 'c2', 'Correo electrónico', 'Casa@sintetico.test')],
      clientes,
      [],
    )
    assert.deepEqual(plan.altas, [])
    assert.deepEqual(plan.revisar.map((r) => [r.zohoId, r.motivo]), [['c1', 'compartido'], ['c2', 'compartido']])
  })

  it('no repite en la ficha un número que está en dos columnas, y lo guarda como celular', () => {
    const plan = planificar(
      [valor('Contactos', 'c1', 'Teléfono', '261 5550101'), valor('Contactos', 'c1', 'Móvil', '0261 15 5550101')],
      clientes,
      [existente('x1', 'p1', '261 5550101', 'zoho:Contactos:c1'), existente('x2', 'p1', '0261 15 5550101', 'zoho:Contactos:c1')],
    )
    assert.deepEqual(plan.actualizar, [{ id: 'x1', value: '+5492615550101', normalized: '5492615550101' }])
    assert.deepEqual(plan.bajas, ['x2'])
  })

  it('respeta lo que cargó el equipo y da de baja la copia de Zoho', () => {
    const plan = planificar(
      [valor('Contactos', 'c1', 'Teléfono', '0261 4250101')],
      clientes,
      [existente('x1', 'p1', '0261 4250101', 'zoho:Contactos:c1'), existente('b1', 'p1', '+54 261 425 0101', 'Broker OS')],
    )
    assert.deepEqual(plan.actualizar, [])
    assert.deepEqual(plan.bajas, ['x1'])
  })

  it('manda a revisión lo incompleto y lo que no tiene cliente', () => {
    const plan = planificar([valor('Contactos', 'c1', 'Teléfono', '4250101'), valor('Contactos', 'zz', 'Teléfono', '261 4250101')], clientes, [])
    assert.deepEqual(plan.revisar.map((r) => r.motivo), ['telefono_sin_caracteristica', 'sin_cliente'])
    assert.deepEqual(plan.altas, [])
  })
})
