import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { atributo, codigoSiguiente, esSubseccion } from './riesgos.ts'

describe('sección Riesgos de la ficha (T-0061)', () => {
  it('sugiere el código siguiente con el formato de la lista', () => {
    assert.equal(codigoSiguiente('R', ['R1', 'R29', 'R14']), 'R30')
    assert.equal(codigoSiguiente('A', ['A01', 'A26']), 'A27')
    assert.equal(codigoSiguiente('T', []), 'T1')
    assert.equal(codigoSiguiente('', ['Z3', 'I1']), '')
  })

  it('reconoce sus pestañas y nombra los atributos', () => {
    assert.equal(esSubseccion('acciones'), true)
    assert.equal(esSubseccion('polizas'), false)
    assert.equal(atributo('zona_inundable'), 'Zona inundable')
  })
})
