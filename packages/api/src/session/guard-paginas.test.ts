// T-0018 — la otra mitad de D-0059: las **páginas**. Los Server Components no reciben un
// `Request`, así que llaman a `admitCookie`. Este archivo existe para dejar probado que
// esa entrada aplica exactamente la misma regla que la de las consultas de datos: si las
// dos superficies pudieran divergir, la app tendría una puerta trasera de lectura.

import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import type { IdentityClaims } from './admission.ts'
import { admitCookie, admitRequest, readCookie } from './guard.ts'
import type { GuardConfig } from './guard.ts'
import { SESSION_COOKIE, sealSession } from './session.ts'

const WORKSPACE = 'ejemplo-sintetico.test'
const SECRET = 'secreto-sintetico-de-prueba-suficientemente-largo'

const config: GuardConfig = {
  admission: {
    workspaceDomain: WORKSPACE,
    admitted: [{ email: `operadora@${WORKSPACE}`, sub: null }],
  },
  session: { secret: SECRET, secureCookies: false },
}

const claims = (overrides: Partial<IdentityClaims> = {}): IdentityClaims => ({
  sub: 'sub-sintetico-001',
  email: `operadora@${WORKSPACE}`,
  emailVerified: true,
  hostedDomain: WORKSPACE,
  displayName: 'Operadora Sintética',
  ...overrides,
})

const reasonOfCookie = async (cookie: string | undefined): Promise<string> => {
  const outcome = await admitCookie(cookie, config)
  return outcome.admitted ? 'ADMITTED' : outcome.reason
}

describe('admitCookie — la regla en las páginas', () => {
  it('niega los mismos seis casos que en las consultas de datos', async () => {
    assert.equal(await reasonOfCookie(undefined), 'NO_SESSION')
    assert.equal(await reasonOfCookie('no-es-un-token'), 'INVALID_TOKEN')
    assert.equal(await reasonOfCookie(await sealSession(claims(), SECRET, -1)), 'EXPIRED')
    assert.equal(
      await reasonOfCookie(await sealSession(claims({ emailVerified: false }), SECRET)),
      'EMAIL_UNVERIFIED',
    )
    assert.equal(
      await reasonOfCookie(await sealSession(claims({ hostedDomain: 'otro.test' }), SECRET)),
      'OUTSIDE_WORKSPACE',
    )
    assert.equal(
      await reasonOfCookie(await sealSession(claims({ email: `ajena@${WORKSPACE}` }), SECRET)),
      'NOT_ADMITTED',
    )
  })

  it('admite el mismo caso que admite la superficie de datos', async () => {
    assert.equal(await reasonOfCookie(await sealSession(claims(), SECRET)), 'ADMITTED')
  })

  it('páginas y consultas de datos no pueden divergir ante la misma cookie', async () => {
    const casos = [
      undefined,
      'roto',
      await sealSession(claims(), SECRET),
      await sealSession(claims({ emailVerified: false }), SECRET),
      await sealSession(claims({ email: `ajena@${WORKSPACE}` }), SECRET),
    ]
    for (const cookie of casos) {
      const porPagina = await admitCookie(cookie, config)
      const porRequest = await admitRequest(
        new Request('https://vs01.test/poliza/x', {
          headers: cookie === undefined ? {} : { cookie: `${SESSION_COOKIE}=${cookie}` },
        }),
        config,
      )
      assert.deepEqual(porPagina, porRequest)
    }
  })
})

describe('readCookie', () => {
  it('encuentra la cookie entre otras y no confunde prefijos', () => {
    const header = `otra=1; ${SESSION_COOKIE}=valor; ${SESSION_COOKIE}_extra=no`
    assert.equal(readCookie(header, SESSION_COOKIE), 'valor')
  })

  it('devuelve undefined sin header y sin la cookie buscada', () => {
    assert.equal(readCookie(null, SESSION_COOKIE), undefined)
    assert.equal(readCookie('otra=1', SESSION_COOKIE), undefined)
  })
})
