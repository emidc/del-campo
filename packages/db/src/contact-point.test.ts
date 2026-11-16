import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { cleanContact } from './contact-point.ts'

describe('cleanContact', () => {
  it('acepta un teléfono con característica, como lo escribe alguien', () => {
    assert.deepEqual(cleanContact('PHONE', '  +54 9 261 555-0101 '), { value: '+54 9 261 555-0101', normalized: '5492615550101' })
    assert.deepEqual(cleanContact('PHONE', '(261) 555 0101'), { value: '(261) 555 0101', normalized: '2615550101' })
  })

  it('rechaza un teléfono sin característica, con letras o demasiado largo', () => {
    assert.equal(cleanContact('PHONE', '4250101'), null)
    assert.equal(cleanContact('PHONE', '261 555 0101 int 4'), null)
    assert.equal(cleanContact('PHONE', '1234567890123456'), null)
    assert.equal(cleanContact('PHONE', ''), null)
  })

  it('acepta un mail y lo guarda en minúsculas', () => {
    assert.deepEqual(cleanContact('EMAIL', ' Ana@Sintetico.Test '), { value: 'ana@sintetico.test', normalized: 'ana@sintetico.test' })
  })

  it('rechaza lo que no tiene forma de mail', () => {
    assert.equal(cleanContact('EMAIL', 'ana'), null)
    assert.equal(cleanContact('EMAIL', 'ana@sintetico'), null)
    assert.equal(cleanContact('EMAIL', 'ana @sintetico.test'), null)
  })
})
