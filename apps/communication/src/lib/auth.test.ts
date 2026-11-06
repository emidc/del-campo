// Unit de la lectura de cookies. La credencial compartida de D-0066 se retiró en la fase 5
// de T-0035; lo que queda acá es el parser del header `Cookie`.

import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { readCookie } from './auth.ts'

describe('readCookie', () => {
  it('lee la cookie pedida por nombre exacto', () => {
    assert.equal(readCookie('a=1; co01_identidad=xyz; b=2', 'co01_identidad'), 'xyz')
    assert.equal(readCookie('xco01_identidad=1', 'co01_identidad'), undefined)
    assert.equal(readCookie(null, 'co01_identidad'), undefined)
  })
})
