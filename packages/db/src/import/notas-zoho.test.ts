import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { planificar } from './notas-zoho.ts'
import type { NotaZoho } from './notas-zoho.ts'

const nota = (cambios: Partial<NotaZoho>): NotaZoho => ({
  entidad: 'Cuentas',
  zohoId: 'zcrm_1',
  principalId: 'zcrm_100',
  titulo: '',
  contenido: 'Exporta a Chile.',
  autor: 'Ana Sintética',
  creada: '2019-08-23 12:30:49',
  ...cambios,
})

const clientes = new Map([
  ['Cuentas:zcrm_100', 'empresa-1'],
  ['Contactos:zcrm_200', 'persona-1'],
])

describe('notas de Zoho', () => {
  it('carga cada nota en su contacto o cuenta, con autor y hora de Argentina', () => {
    const plan = planificar(
      [nota({}), nota({ entidad: 'Contactos', zohoId: 'zcrm_2', principalId: 'zcrm_200', titulo: '  Visita  ', contenido: ' \r\nLínea 1\r\nLínea 2 ' })],
      clientes,
      new Set(),
    )
    assert.deepEqual(plan.altas, [
      { zohoId: 'zcrm_1', partyId: 'empresa-1', title: null, body: 'Exporta a Chile.', author: 'Ana Sintética', createdAt: '2019-08-23T12:30:49-03:00' },
      { zohoId: 'zcrm_2', partyId: 'persona-1', title: 'Visita', body: 'Línea 1\nLínea 2', author: 'Ana Sintética', createdAt: '2019-08-23T12:30:49-03:00' },
    ])
    assert.deepEqual(plan.revisar, [])
  })

  it('no duplica: salta las ya cargadas y las repetidas en el export', () => {
    const plan = planificar([nota({}), nota({ zohoId: 'zcrm_2' }), nota({ zohoId: 'zcrm_2' })], clientes, new Set(['zcrm_1']))
    assert.deepEqual(plan.altas.map((a) => a.zohoId), ['zcrm_2'])
    assert.equal(plan.yaCargadas, 1)
    assert.equal(plan.repetidas, 1)
  })

  it('manda a revisión las de un cliente que no está, las vacías y las sin fecha', () => {
    const plan = planificar(
      [
        nota({ zohoId: 'a', principalId: 'zcrm_999' }),
        nota({ zohoId: 'b', entidad: 'Contactos' }), // zcrm_100 es una cuenta, no un contacto
        nota({ zohoId: 'c', titulo: ' ', contenido: '  ' }),
        nota({ zohoId: 'd', creada: '23/08/2019' }),
      ],
      clientes,
      new Set(),
    )
    assert.deepEqual(plan.altas, [])
    assert.deepEqual(plan.revisar.map((r) => `${r.zohoId} ${r.motivo}`), ['a sin_cliente', 'b sin_cliente', 'c vacia', 'd fecha_invalida'])
  })
})
