// T-0018 — la regla de admisión de D-0059. Sin red, sin base y sin navegador (R-26,
// capa unit). Todas las identidades de estos tests son sintéticas (R-19).

import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import type { AdmissionConfig, IdentityClaims } from './admission.ts'
import { denialStatus, evaluateAdmission, parseAdmittedAccounts } from './admission.ts'
import { admissionConfig } from './config.ts'

const WORKSPACE = 'ejemplo-sintetico.test'

const config: AdmissionConfig = {
  workspaceDomain: WORKSPACE,
  admitted: [
    { email: `operadora@${WORKSPACE}`, sub: null },
    { email: `fijada@${WORKSPACE}`, sub: 'sub-fijado-001' },
  ],
}

const claims = (overrides: Partial<IdentityClaims> = {}): IdentityClaims => ({
  sub: 'sub-sintetico-001',
  email: `operadora@${WORKSPACE}`,
  emailVerified: true,
  hostedDomain: WORKSPACE,
  displayName: 'Operadora Sintética',
  ...overrides,
})

const denyReason = (state: Parameters<typeof evaluateAdmission>[0]): string => {
  const outcome = evaluateAdmission(state, config)
  // `assert.fail` devuelve `never`: el tipo se estrecha solo y no queda una rama muerta.
  if (outcome.admitted) assert.fail('se esperaba que la admisión fuese negada')
  return outcome.reason
}

describe('evaluateAdmission — los casos negativos que exige D-0059', () => {
  it('niega cuando no hay sesión', () => {
    assert.equal(denyReason({ kind: 'NONE' }), 'NO_SESSION')
  })

  it('niega una sesión que no se pudo descifrar', () => {
    assert.equal(denyReason({ kind: 'INVALID' }), 'INVALID_TOKEN')
  })

  it('niega una sesión expirada', () => {
    assert.equal(denyReason({ kind: 'EXPIRED' }), 'EXPIRED')
  })

  it('niega un email sin verificar, aunque esté en la lista', () => {
    assert.equal(
      denyReason({ kind: 'CLAIMS', claims: claims({ emailVerified: false }) }),
      'EMAIL_UNVERIFIED',
    )
  })

  it('niega una cuenta fuera del Workspace', () => {
    assert.equal(
      denyReason({ kind: 'CLAIMS', claims: claims({ hostedDomain: 'otro-dominio.test' }) }),
      'OUTSIDE_WORKSPACE',
    )
  })

  it('niega una cuenta personal, que no trae el claim hd', () => {
    assert.equal(
      denyReason({ kind: 'CLAIMS', claims: claims({ hostedDomain: null }) }),
      'OUTSIDE_WORKSPACE',
    )
  })

  it('niega una cuenta del Workspace que no está en la lista', () => {
    assert.equal(
      denyReason({ kind: 'CLAIMS', claims: claims({ email: `ajena@${WORKSPACE}` }) }),
      'NOT_ADMITTED',
    )
  })

  it('no admite por sufijo de email cuando el claim hd no acompaña', () => {
    // SLICES/VS01.md §5: un sufijo de email por sí solo no es prueba de identidad.
    const outcome = evaluateAdmission(
      { kind: 'CLAIMS', claims: claims({ email: `operadora@${WORKSPACE}`, hostedDomain: null }) },
      config,
    )
    assert.equal(outcome.admitted, false)
  })

  it('niega claims sin sub o sin email', () => {
    assert.equal(denyReason({ kind: 'CLAIMS', claims: claims({ sub: '   ' }) }), 'INVALID_TOKEN')
    assert.equal(denyReason({ kind: 'CLAIMS', claims: claims({ email: '' }) }), 'INVALID_TOKEN')
  })

  it('niega cuando la entrada fija un sub y el token trae otro', () => {
    assert.equal(
      denyReason({
        kind: 'CLAIMS',
        claims: claims({ email: `fijada@${WORKSPACE}`, sub: 'sub-reasignado-999' }),
      }),
      'NOT_ADMITTED',
    )
  })

  it('una lista vacía niega todo', () => {
    const outcome = evaluateAdmission(
      { kind: 'CLAIMS', claims: claims() },
      { workspaceDomain: WORKSPACE, admitted: [] },
    )
    assert.equal(outcome.admitted, false)
  })
})

describe('evaluateAdmission — admisión', () => {
  it('admite y devuelve el sub como identidad, no el email', () => {
    const outcome = evaluateAdmission({ kind: 'CLAIMS', claims: claims() }, config)
    assert.ok(outcome.admitted)
    assert.equal(outcome.principal.sub, 'sub-sintetico-001')
    assert.equal(outcome.principal.email, `operadora@${WORKSPACE}`)
  })

  it('admite con el sub fijado cuando coincide', () => {
    const outcome = evaluateAdmission(
      {
        kind: 'CLAIMS',
        claims: claims({ email: `fijada@${WORKSPACE}`, sub: 'sub-fijado-001' }),
      },
      config,
    )
    assert.equal(outcome.admitted, true)
  })

  it('normaliza mayúsculas y espacios del email y del dominio', () => {
    const outcome = evaluateAdmission(
      {
        kind: 'CLAIMS',
        claims: claims({
          email: `  Operadora@${WORKSPACE.toUpperCase()}  `,
          hostedDomain: WORKSPACE.toUpperCase(),
        }),
      },
      config,
    )
    assert.equal(outcome.admitted, true)
  })
})

describe('parseAdmittedAccounts', () => {
  it('acepta separación por coma y por salto de línea, y normaliza', () => {
    const parsed = parseAdmittedAccounts(` UNA@${WORKSPACE} ,\n dos@${WORKSPACE}\n`)
    assert.deepEqual(parsed, [
      { email: `una@${WORKSPACE}`, sub: null },
      { email: `dos@${WORKSPACE}`, sub: null },
    ])
  })

  it('lee el sub fijado después del signo igual', () => {
    const parsed = parseAdmittedAccounts(`tres@${WORKSPACE}=sub-123`)
    assert.deepEqual(parsed, [{ email: `tres@${WORKSPACE}`, sub: 'sub-123' }])
  })

  it('lanza ante una entrada que no es una dirección, en vez de descartarla en silencio', () => {
    assert.throws(() => parseAdmittedAccounts('no-es-un-email'), /no es una dirección/)
  })

  it('sin variable configurada la lista queda vacía, y una lista vacía niega todo', () => {
    assert.deepEqual(parseAdmittedAccounts(undefined), [])
  })
})

describe('denialStatus', () => {
  it('401 cuando no hay sesión utilizable, 403 cuando la hay pero no está admitida', () => {
    assert.equal(denialStatus('NO_SESSION'), 401)
    assert.equal(denialStatus('INVALID_TOKEN'), 401)
    assert.equal(denialStatus('EXPIRED'), 401)
    assert.equal(denialStatus('EMAIL_UNVERIFIED'), 403)
    assert.equal(denialStatus('OUTSIDE_WORKSPACE'), 403)
    assert.equal(denialStatus('NOT_ADMITTED'), 403)
  })
})

describe('T-0035: admisión en oidc', () => {
  const OIDC = { modo: 'oidc' } as const
  const externa: IdentityClaims = {
    sub: 'sub-externa',
    email: 'Persona@Gmail-Sintetico.test',
    emailVerified: true,
    hostedDomain: null,
    displayName: null,
  }

  it('sin sesión, inválida o vencida se niega igual que en legacy', () => {
    assert.deepEqual(evaluateAdmission({ kind: 'NONE' }, OIDC), { admitted: false, reason: 'NO_SESSION' })
    assert.deepEqual(evaluateAdmission({ kind: 'INVALID' }, OIDC), { admitted: false, reason: 'INVALID_TOKEN' })
    assert.deepEqual(evaluateAdmission({ kind: 'EXPIRED' }, OIDC), { admitted: false, reason: 'EXPIRED' })
  })

  it('exige email verificado e identidad completa', () => {
    assert.deepEqual(evaluateAdmission({ kind: 'CLAIMS', claims: { ...externa, emailVerified: false } }, OIDC), {
      admitted: false,
      reason: 'EMAIL_UNVERIFIED',
    })
    assert.deepEqual(evaluateAdmission({ kind: 'CLAIMS', claims: { ...externa, sub: ' ' } }, OIDC), {
      admitted: false,
      reason: 'INVALID_TOKEN',
    })
  })

  it('una cuenta sin Workspace pasa el guard: quien decide es la base', () => {
    assert.deepEqual(evaluateAdmission({ kind: 'CLAIMS', claims: externa }, OIDC), {
      admitted: true,
      principal: { sub: 'sub-externa', email: 'persona@gmail-sintetico.test', displayName: null },
    })
  })

  it('en oidc no se leen ni el Workspace ni la lista; en legacy siguen siendo obligatorios', () => {
    const previo = { ...process.env }
    try {
      delete process.env.VS01_GOOGLE_WORKSPACE_DOMAIN
      delete process.env.VS01_ADMITTED_ACCOUNTS
      assert.deepEqual(admissionConfig('oidc'), { modo: 'oidc' })
      assert.throws(() => admissionConfig('legacy'), /VS01_GOOGLE_WORKSPACE_DOMAIN/)
    } finally {
      process.env = previo
    }
  })
})
