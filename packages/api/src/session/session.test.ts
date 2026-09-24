// T-0018 — la cookie de sesión. Una cookie adulterada o vencida tiene que producir un
// estado, no una excepción: es la diferencia entre un 401 que no dice nada y un 500 que
// dice que algo del lado del servidor se rompió con esa entrada.

import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import type { IdentityClaims } from './admission.ts'
import {
  SESSION_COOKIE,
  clearedSessionCookie,
  readSession,
  sealSession,
  sessionCookie,
} from './session.ts'

const SECRET = 'secreto-sintetico-de-prueba-suficientemente-largo'
const OTHER_SECRET = 'otro-secreto-sintetico-igual-de-largo-para-probar'

const claims: IdentityClaims = {
  sub: 'sub-sintetico-001',
  email: 'operadora@ejemplo-sintetico.test',
  emailVerified: true,
  hostedDomain: 'ejemplo-sintetico.test',
  displayName: 'Operadora Sintética',
}

describe('sealSession / readSession', () => {
  it('ida y vuelta preserva los claims que la admisión mira', async () => {
    const state = await readSession(await sealSession(claims, SECRET), SECRET)
    assert.ok(state.kind === 'CLAIMS')
    assert.deepEqual(state.claims, claims)
  })

  it('sin cookie devuelve NONE', async () => {
    assert.equal((await readSession(undefined, SECRET)).kind, 'NONE')
    assert.equal((await readSession('', SECRET)).kind, 'NONE')
  })

  it('una cookie que no es un JWE devuelve INVALID', async () => {
    assert.equal((await readSession('no-es-un-token', SECRET)).kind, 'INVALID')
  })

  it('una cookie adulterada devuelve INVALID', async () => {
    const sealed = await sealSession(claims, SECRET)
    const parts = sealed.split('.')
    // Se altera el ciphertext: A256GCM es autenticado, así que el tag no valida.
    const ciphertext = parts[3] ?? ''
    parts[3] = `${ciphertext.slice(0, -2)}${ciphertext.endsWith('aa') ? 'bb' : 'aa'}`
    assert.equal((await readSession(parts.join('.'), SECRET)).kind, 'INVALID')
  })

  it('una cookie emitida con otro secreto devuelve INVALID', async () => {
    const sealed = await sealSession(claims, SECRET)
    assert.equal((await readSession(sealed, OTHER_SECRET)).kind, 'INVALID')
  })

  it('una cookie vencida devuelve EXPIRED, distinguible de INVALID', async () => {
    const sealed = await sealSession(claims, SECRET, -1)
    assert.equal((await readSession(sealed, SECRET)).kind, 'EXPIRED')
  })

  it('el cifrado no deja el email legible en la cookie', async () => {
    const sealed = await sealSession(claims, SECRET)
    assert.ok(!sealed.includes(claims.email))
    assert.ok(!sealed.includes(claims.sub))
  })

  it('un secreto corto se rechaza en vez de producir una clave débil', async () => {
    await assert.rejects(() => sealSession(claims, 'corto'), /al menos 32 caracteres/)
  })
})

describe('atributos de la cookie', () => {
  it('es HttpOnly, SameSite=Lax y de path raíz', () => {
    const cookie = sessionCookie('valor', true)
    assert.equal(cookie.name, SESSION_COOKIE)
    assert.equal(cookie.httpOnly, true)
    assert.equal(cookie.sameSite, 'lax')
    assert.equal(cookie.secure, true)
    assert.equal(cookie.path, '/')
  })

  it('la cookie de cierre de sesión vence de inmediato', () => {
    assert.equal(clearedSessionCookie(true).maxAge, 0)
  })
})
