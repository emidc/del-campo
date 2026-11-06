// La regla de admisión del guard de sesión (T-0018, y desde la fase 5 de T-0035 sólo
// `oidc`). Sin red, sin base y sin navegador (R-26, capa unit). Todas las identidades de
// estos tests son sintéticas (R-19). Lo que decide quién entra (invitación, credencial,
// estado y rol) está en la base y se prueba en `acceso/login.integration.test.ts`.

import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import type { AdmissionConfig, IdentityClaims } from './admission.ts'
import { denialStatus, evaluateAdmission } from './admission.ts'
import { admissionConfig } from './config.ts'

const config: AdmissionConfig = { modo: 'oidc' }

const claims = (overrides: Partial<IdentityClaims> = {}): IdentityClaims => ({
  sub: 'sub-sintetico-001',
  email: 'Persona@Gmail-Sintetico.test',
  emailVerified: true,
  hostedDomain: null,
  displayName: 'Persona Sintética',
  ...overrides,
})

const denyReason = (state: Parameters<typeof evaluateAdmission>[0]): string => {
  const outcome = evaluateAdmission(state, config)
  // `assert.fail` devuelve `never`: el tipo se estrecha solo y no queda una rama muerta.
  if (outcome.admitted) assert.fail('se esperaba que la admisión fuese negada')
  return outcome.reason
}

describe('evaluateAdmission — negativas del guard', () => {
  it('niega sin sesión, con una sesión que no se pudo descifrar y con una vencida', () => {
    assert.equal(denyReason({ kind: 'NONE' }), 'NO_SESSION')
    assert.equal(denyReason({ kind: 'INVALID' }), 'INVALID_TOKEN')
    assert.equal(denyReason({ kind: 'EXPIRED' }), 'EXPIRED')
  })

  it('niega un email sin verificar', () => {
    assert.equal(denyReason({ kind: 'CLAIMS', claims: claims({ emailVerified: false }) }), 'EMAIL_UNVERIFIED')
  })

  it('niega claims sin sub o sin email', () => {
    assert.equal(denyReason({ kind: 'CLAIMS', claims: claims({ sub: '   ' }) }), 'INVALID_TOKEN')
    assert.equal(denyReason({ kind: 'CLAIMS', claims: claims({ email: '' }) }), 'INVALID_TOKEN')
  })
})

describe('evaluateAdmission — admisión', () => {
  it('una cuenta sin Workspace pasa el guard: quien decide es la base', () => {
    assert.deepEqual(evaluateAdmission({ kind: 'CLAIMS', claims: claims({ displayName: null }) }, config), {
      admitted: true,
      principal: { sub: 'sub-sintetico-001', email: 'persona@gmail-sintetico.test', displayName: null },
    })
  })

  it('el claim hd no cambia nada: ni admite ni niega', () => {
    const conHd = evaluateAdmission({ kind: 'CLAIMS', claims: claims({ hostedDomain: 'otro.test' }) }, config)
    const sinHd = evaluateAdmission({ kind: 'CLAIMS', claims: claims() }, config)
    assert.deepEqual(conHd, sinHd)
  })

  it('devuelve el sub como identidad y el email normalizado', () => {
    const outcome = evaluateAdmission({ kind: 'CLAIMS', claims: claims({ email: '  Persona@GMAIL-sintetico.test ' }) }, config)
    assert.ok(outcome.admitted)
    assert.equal(outcome.principal.sub, 'sub-sintetico-001')
    assert.equal(outcome.principal.email, 'persona@gmail-sintetico.test')
  })
})

describe('denialStatus', () => {
  it('401 cuando no hay sesión utilizable, 403 cuando la hay pero no está admitida', () => {
    assert.equal(denialStatus('NO_SESSION'), 401)
    assert.equal(denialStatus('INVALID_TOKEN'), 401)
    assert.equal(denialStatus('EXPIRED'), 401)
    assert.equal(denialStatus('EMAIL_UNVERIFIED'), 403)
    assert.equal(denialStatus('NOT_ADMITTED'), 403)
  })
})

describe('admissionConfig (fase 5 de T-0035)', () => {
  it('no lee el Workspace ni la lista, y AUTH_MODE=legacy no arranca', () => {
    const previo = { ...process.env }
    try {
      delete process.env.VS01_GOOGLE_WORKSPACE_DOMAIN
      delete process.env.VS01_ADMITTED_ACCOUNTS
      delete process.env.AUTH_MODE
      assert.deepEqual(admissionConfig(), { modo: 'oidc' })
      process.env.AUTH_MODE = 'legacy'
      assert.throws(() => admissionConfig(), /se retiró en la fase 5/)
    } finally {
      process.env = previo
    }
  })
})
