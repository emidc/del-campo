import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { modoAcceso } from './modo.ts'

describe('AUTH_MODE (plan de migración de T-0035, §3)', () => {
  it('sin valor es legacy: desplegar la fase 0 no cambia nada', () => {
    assert.equal(modoAcceso(undefined), 'legacy')
    assert.equal(modoAcceso(''), 'legacy')
    assert.equal(modoAcceso('  '), 'legacy')
  })

  it('acepta legacy y oidc', () => {
    assert.equal(modoAcceso('legacy'), 'legacy')
    assert.equal(modoAcceso(' oidc '), 'oidc')
  })

  it('un valor desconocido lanza en vez de elegir un modo en silencio', () => {
    for (const valor of ['OIDC', 'odic', 'mixto', 'true']) {
      assert.throws(() => modoAcceso(valor), /no es un modo válido/)
    }
  })
})
