import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { EncryptJWT } from 'jose'

import { leerHandshake, sellarHandshake } from './handshake.ts'
import type { Identidad } from './identidad.ts'
import type { ConfigSesion } from './sesion.ts'
import { cookieBorrada, cookieDeSesion, derivarClave, leerSesion, sellarSesion } from './sesion.ts'

const SECRETO = 'un-secreto-de-prueba-de-al-menos-32-caracteres'

const config = (cambios: Partial<ConfigSesion> = {}): ConfigSesion => ({
  cookie: 'risk_session',
  proposito: 'risk',
  secreto: SECRETO,
  segura: true,
  ...cambios,
})

const ANA: Identidad = {
  proveedor: 'google',
  sujeto: 'sub-ana',
  email: 'ana@ejemplo.test',
  emailVerificado: true,
  nombre: 'Ana',
}

describe('sesión', () => {
  it('lo que se sella se lee igual', async () => {
    const cookie = await sellarSesion(ANA, config())
    assert.deepEqual(await leerSesion(cookie, config()), { tipo: 'IDENTIDAD', identidad: ANA })
  })

  it('sin cookie no hay sesión', async () => {
    assert.deepEqual(await leerSesion(undefined, config()), { tipo: 'NINGUNA' })
    assert.deepEqual(await leerSesion('', config()), { tipo: 'NINGUNA' })
  })

  it('una cookie adulterada es inválida y no lanza', async () => {
    const cookie = await sellarSesion(ANA, config())
    const ultimo = cookie.at(-2) === 'A' ? 'B' : 'A'
    const adulterada = `${cookie.slice(0, -2)}${ultimo}${cookie.slice(-1)}`
    assert.deepEqual(await leerSesion(adulterada, config()), { tipo: 'INVALIDA' })
    assert.deepEqual(await leerSesion('no-es-un-jwe', config()), { tipo: 'INVALIDA' })
  })

  it('una cookie vencida se distingue de una inválida', async () => {
    const cookie = await sellarSesion(ANA, config({ duracionSegundos: -10 }))
    assert.deepEqual(await leerSesion(cookie, config()), { tipo: 'VENCIDA' })
  })

  it('la cookie de una app no se descifra en otra con el mismo secreto', async () => {
    const deRisk = await sellarSesion(ANA, config())
    assert.deepEqual(await leerSesion(deRisk, config({ proposito: 'communication' })), { tipo: 'INVALIDA' })
  })

  it('una cookie sin proveedor conocido es inválida', async () => {
    const forjada = await new EncryptJWT({ proveedor: 'otro', email: ANA.email })
      .setProtectedHeader({ alg: 'dir', enc: 'A256GCM' })
      .setSubject(ANA.sujeto)
      .setExpirationTime('1h')
      .encrypt(derivarClave(SECRETO, 'risk'))
    assert.deepEqual(await leerSesion(forjada, config()), { tipo: 'INVALIDA' })
  })

  it('un secreto corto o un propósito vacío se rechazan al configurar', () => {
    assert.throws(() => derivarClave('corto', 'risk'), /al menos 32/)
    assert.throws(() => derivarClave(SECRETO, ' '), /propósito/)
  })

  it('la cookie es httpOnly, lax y segura según la configuración; borrarla la vence', () => {
    const cookie = cookieDeSesion('v', config())
    assert.equal(cookie.name, 'risk_session')
    assert.equal(cookie.httpOnly, true)
    assert.equal(cookie.sameSite, 'lax')
    assert.equal(cookie.secure, true)
    assert.equal(cookieBorrada(config()).maxAge, 0)
  })
})

describe('handshake', () => {
  const HANDSHAKE = { state: 's', nonce: 'n', codeVerifier: 'v' }

  it('lo que se sella se lee igual', async () => {
    const cookie = await sellarHandshake(HANDSHAKE, SECRETO, 'risk')
    assert.deepEqual(await leerHandshake(cookie, SECRETO, 'risk'), HANDSHAKE)
  })

  it('una cookie de sesión no sirve como handshake, ni al revés', async () => {
    const sesion = await sellarSesion(ANA, config())
    assert.equal(await leerHandshake(sesion, SECRETO, 'risk'), null)
    const handshake = await sellarHandshake(HANDSHAKE, SECRETO, 'risk')
    assert.deepEqual(await leerSesion(handshake, config()), { tipo: 'INVALIDA' })
  })

  it('sin cookie o con basura, no hay handshake', async () => {
    assert.equal(await leerHandshake(undefined, SECRETO, 'risk'), null)
    assert.equal(await leerHandshake('basura', SECRETO, 'risk'), null)
  })
})
