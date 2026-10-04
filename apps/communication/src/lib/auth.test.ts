// Unit de la credencial compartida (D-0066): hash, comparación, cookie y negativa sin
// configuración. Valores de prueba: ninguno es la credencial real (R-16, R-18).

import assert from 'node:assert/strict'
import { before, describe, it } from 'node:test'

import {
  authConfigFromEnv,
  hashPassword,
  issueSession,
  MIN_PASSWORD_LENGTH,
  parsePasswordHash,
  readCookie,
  SESSION_TTL_SECONDS,
  sessionCookieHeader,
  verifyCredentials,
  verifySession,
  type AuthConfig,
} from './auth.ts'

const TEST_USER = 'operador-de-prueba'
const TEST_PASSWORD = 'contraseña-de-prueba-larga-0001'
const TEST_SECRET = 'secreto-de-sesion-de-prueba-0123456789abcdef'

let hash: string
let config: AuthConfig

before(async () => {
  hash = await hashPassword(TEST_PASSWORD)
  const result = authConfigFromEnv({
    COMMUNICATION_UI_USER: TEST_USER,
    COMMUNICATION_UI_PASSWORD_HASH: hash,
    COMMUNICATION_UI_SESSION_SECRET: TEST_SECRET,
  })
  if (!result.ok) throw new Error(result.reason)
  config = result.config
})

describe('hash de la contraseña', () => {
  it('tiene la forma scrypt:N:r:p:sal:hash, sin `$`, y no contiene la contraseña', () => {
    assert.match(hash, /^scrypt:32768:8:1:[A-Za-z0-9+/]+=*:[A-Za-z0-9+/]+=*$/)
    assert.ok(!hash.includes('$'), 'Next.js expande $VAR en los .env')
    assert.ok(!hash.includes(TEST_PASSWORD))
    assert.notEqual(parsePasswordHash(hash), null)
  })

  it(`rechaza contraseñas de menos de ${String(MIN_PASSWORD_LENGTH)} caracteres`, async () => {
    await assert.rejects(hashPassword('x'.repeat(MIN_PASSWORD_LENGTH - 1)))
    await assert.doesNotReject(hashPassword('x'.repeat(MIN_PASSWORD_LENGTH)))
  })

  it('rechaza hashes mal formados o con parámetros débiles', () => {
    for (const bad of ['', 'scrypt:1:8:1:AAAA:BBBB', hash.replace('scrypt', 'bcrypt'), hash.replace(':32768:', ':1024:'), `${hash}:extra`, hash.replaceAll(':', '$')]) {
      assert.equal(parsePasswordHash(bad), null, bad)
    }
  })
})

describe('credenciales', () => {
  it('acepta solo el usuario y la contraseña configurados', async () => {
    assert.equal(await verifyCredentials(config, TEST_USER, TEST_PASSWORD), true)
    assert.equal(await verifyCredentials(config, TEST_USER, `${TEST_PASSWORD}x`), false)
    assert.equal(await verifyCredentials(config, 'otro', TEST_PASSWORD), false)
    assert.equal(await verifyCredentials(config, '', ''), false)
  })
})

describe('cookie de sesión', () => {
  const now = new Date('2026-10-04T12:00:00Z')

  it('vale hasta su vencimiento', () => {
    const cookie = issueSession(config, now)
    assert.equal(verifySession(config, cookie, now), true)
    assert.equal(verifySession(config, cookie, new Date(now.getTime() + (SESSION_TTL_SECONDS - 1) * 1000)), true)
    assert.equal(verifySession(config, cookie, new Date(now.getTime() + SESSION_TTL_SECONDS * 1000)), false)
  })

  it('no vale alterada, sin firma, con otro secreto ni después de rotar la contraseña', async () => {
    const cookie = issueSession(config, now)
    const [v, exp, mac] = cookie.split('.')
    assert.equal(verifySession(config, `${String(v)}.${String(Number(exp) + 3600)}.${String(mac)}`, now), false)
    assert.equal(verifySession(config, `${String(v)}.${String(exp)}.`, now), false)
    assert.equal(verifySession(config, undefined, now), false)
    assert.equal(verifySession(config, 'basura', now), false)
    assert.equal(verifySession({ ...config, sessionSecret: `${TEST_SECRET}-otro` }, cookie, now), false)
    const rotated = authConfigFromEnv({
      COMMUNICATION_UI_USER: TEST_USER,
      COMMUNICATION_UI_PASSWORD_HASH: await hashPassword(`${TEST_PASSWORD}-nueva`),
      COMMUNICATION_UI_SESSION_SECRET: TEST_SECRET,
    })
    assert.ok(rotated.ok)
    assert.equal(verifySession(rotated.config, cookie, now), false)
  })

  it('el header es HttpOnly y SameSite=Strict, y Secure fuera de localhost', () => {
    const local = sessionCookieHeader('v', 'http://localhost:3100/api/login')
    const remote = sessionCookieHeader('v', 'https://co01.example.test/api/login')
    for (const h of [local, remote]) {
      assert.match(h, /HttpOnly/)
      assert.match(h, /SameSite=Strict/)
    }
    assert.doesNotMatch(local, /Secure/)
    assert.match(remote, /; Secure$/)
  })

  it('lee la cookie por nombre exacto', () => {
    assert.equal(readCookie('a=1; co01_session=xyz; b=2', 'co01_session'), 'xyz')
    assert.equal(readCookie('xco01_session=1', 'co01_session'), undefined)
    assert.equal(readCookie(null, 'co01_session'), undefined)
  })
})

describe('sin configuración no hay modo abierto', () => {
  it('cualquier variable faltante o inválida es una negativa, sin citar valores', () => {
    const full = {
      COMMUNICATION_UI_USER: TEST_USER,
      COMMUNICATION_UI_PASSWORD_HASH: hash,
      COMMUNICATION_UI_SESSION_SECRET: TEST_SECRET,
    }
    const variants = [
      {},
      { ...full, COMMUNICATION_UI_USER: '' },
      { ...full, COMMUNICATION_UI_PASSWORD_HASH: undefined },
      { ...full, COMMUNICATION_UI_PASSWORD_HASH: TEST_PASSWORD },
      { ...full, COMMUNICATION_UI_SESSION_SECRET: 'corto' },
    ]
    for (const env of variants) {
      const result = authConfigFromEnv(env)
      assert.equal(result.ok, false)
      assert.ok(!result.reason.includes(TEST_PASSWORD))
      assert.ok(!result.reason.includes(TEST_SECRET))
    }
  })
})
