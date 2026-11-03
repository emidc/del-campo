import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { identidadDeClaims } from './oidc.ts'

describe('identidadDeClaims', () => {
  it('una cuenta externa, sin hd, es una identidad de Google', () => {
    assert.deepEqual(
      identidadDeClaims({ sub: '123', email: 'ana@gmail.test', email_verified: true, name: 'Ana' }),
      { proveedor: 'google', sujeto: '123', email: 'ana@gmail.test', emailVerificado: true, nombre: 'Ana' },
    )
  })

  it('email_verified sólo cuenta si es true', () => {
    assert.equal(identidadDeClaims({ sub: '1', email: 'a@b.test', email_verified: 'true' }).emailVerificado, false)
    assert.equal(identidadDeClaims({ sub: '1', email: 'a@b.test' }).emailVerificado, false)
  })

  it('sin sub o sin email no hay identidad', () => {
    assert.throws(() => identidadDeClaims({ email: 'a@b.test' }), /sub/)
    assert.throws(() => identidadDeClaims({ sub: ' ', email: 'a@b.test' }), /sub/)
    assert.throws(() => identidadDeClaims({ sub: '1' }), /email/)
  })

  it('un nombre vacío queda como null', () => {
    assert.equal(identidadDeClaims({ sub: '1', email: 'a@b.test', name: '' }).nombre, null)
  })
})
