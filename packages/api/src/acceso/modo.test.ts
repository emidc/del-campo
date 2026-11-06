import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { modoAcceso } from './modo.ts'

describe('modoAcceso', () => {
  it('sin variable, o vacía, es oidc: no queda otro modo', () => {
    assert.equal(modoAcceso(undefined), 'oidc')
    assert.equal(modoAcceso(''), 'oidc')
    assert.equal(modoAcceso('  '), 'oidc')
  })

  it('acepta oidc con espacios', () => {
    assert.equal(modoAcceso(' oidc '), 'oidc')
  })

  it('legacy lanza: se retiró y no puede volver por una variable', () => {
    assert.throws(() => modoAcceso('legacy'), /se retiró en la fase 5/)
  })

  it('un valor desconocido lanza en vez de elegir un modo en silencio', () => {
    for (const valor of ['OIDC', 'Legacy', 'google', 'none']) {
      assert.throws(() => modoAcceso(valor), /no es un modo válido/)
    }
  })
})
