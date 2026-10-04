import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { isIdempotencyKey, MAX_REPLY_LENGTH, replyBodyProblem, visibleAttemptState } from './reply.ts'
import { serviceWindow } from './window.ts'

const T0 = new Date('2026-10-04T12:00:00Z')
const plus = (ms: number): Date => new Date(T0.getTime() + ms)
const HOUR = 60 * 60 * 1000

describe('ventana de servicio', () => {
  it('está abierta dentro de las 24 h del último entrante', () => {
    assert.deepEqual(serviceWindow(T0, plus(23 * HOUR)), { open: true, closesAt: plus(24 * HOUR) })
  })

  it('se cierra exactamente a las 24 h', () => {
    assert.equal(serviceWindow(T0, plus(24 * HOUR - 1)).open, true)
    assert.equal(serviceWindow(T0, plus(24 * HOUR)).open, false)
  })

  it('está cerrada si el participante nunca escribió', () => {
    assert.deepEqual(serviceWindow(null, T0), { open: false, closesAt: null })
  })

  it('un entrante con timestamp adelantado respecto del reloj del servidor la deja abierta', () => {
    assert.equal(serviceWindow(plus(5000), T0).open, true)
  })
})

describe('respuesta', () => {
  it('acepta texto normal y rechaza vacío, solo espacios, NUL y demasiado largo', () => {
    assert.equal(replyBodyProblem('Hola'), null)
    assert.notEqual(replyBodyProblem(''), null)
    assert.notEqual(replyBodyProblem('  \n '), null)
    assert.notEqual(replyBodyProblem('a\u0000b'), null)
    assert.equal(replyBodyProblem('x'.repeat(MAX_REPLY_LENGTH)), null)
    assert.notEqual(replyBodyProblem('x'.repeat(MAX_REPLY_LENGTH + 1)), null)
  })

  it('cuenta caracteres, no unidades UTF-16', () => {
    assert.equal(replyBodyProblem('😀'.repeat(MAX_REPLY_LENGTH)), null)
  })

  it('la clave de idempotencia es un UUID', () => {
    assert.equal(isIdempotencyKey('3f1c2a9e-5b7d-4c1e-9a2b-0d4e6f8a1b2c'), true)
    assert.equal(isIdempotencyKey('1'), false)
    assert.equal(isIdempotencyKey("3f1c2a9e-5b7d-4c1e-9a2b-0d4e6f8a1b2c' or 1=1"), false)
  })

  it('un pending reciente está enviando; uno viejo o un unconfirmed, sin confirmar', () => {
    assert.equal(visibleAttemptState('pending', T0, plus(59_999)), 'sending')
    assert.equal(visibleAttemptState('pending', T0, plus(60_000)), 'unconfirmed')
    assert.equal(visibleAttemptState('unconfirmed', T0, plus(1)), 'unconfirmed')
  })
})
