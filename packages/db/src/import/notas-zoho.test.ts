import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { limpiezas, planificar, textoDeNota } from './notas-zoho.ts'
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

describe('texto de una nota de Zoho', () => {
  it('pasa el HTML a texto: saltos, viñetas, negritas y entidades', () => {
    assert.equal(textoDeNota('Enviar:<br>Ana <b>Sintética</b><br/>Luis &amp; Co&nbsp;SA'), 'Enviar:\nAna Sintética\nLuis & Co SA')
    assert.equal(textoDeNota('<p>Pendientes</p><ul><li>uno</li><li><span>dos</span></li></ul>'), 'Pendientes\n\n• uno\n• dos')
  })

  it('deja los mails y las direcciones legibles', () => {
    assert.equal(
      textoDeNota('Ana (<a target="_blank" href="http://ana@sintetico.test" style="">ana@sintetico.test</a>)'),
      'Ana (ana@sintetico.test)',
    )
    assert.equal(textoDeNota('<a href="https://sintetico.test/poliza">la póliza</a>'), 'la póliza (https://sintetico.test/poliza)')
    assert.equal(textoDeNota('<a href="https://sintetico.test">https://sintetico.test</a>'), 'https://sintetico.test')
  })

  it('no toca el texto sin HTML ni un mail entre < >', () => {
    assert.equal(textoDeNota('Tel 4961557 <2 pisos>'), 'Tel 4961557 <2 pisos>')
    assert.equal(textoDeNota('Escribir a <rrhh@sintetico.test><br>gracias'), 'Escribir a <rrhh@sintetico.test>\ngracias')
  })

  it('limpia las ya cargadas que tienen HTML y deja las demás', () => {
    assert.deepEqual(
      limpiezas([
        { id: '1', title: null, body: 'uno<br>dos' },
        { id: '2', title: 'Sin html', body: 'texto' },
      ]),
      [{ id: '1', title: null, body: 'uno\ndos' }],
    )
  })
})
