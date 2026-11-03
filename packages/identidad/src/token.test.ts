import assert from 'node:assert/strict'
import { before, describe, it } from 'node:test'

import { SignJWT, importJWK } from 'jose'

import type { Emision, ParDeClaves, Verificacion } from './token.ts'
import {
  DURACION_MAXIMA_SEGUNDOS,
  clavePublica,
  emitirToken,
  generarParDeClaves,
  jwksDe,
  registroJtiEnMemoria,
  verificarToken,
} from './token.ts'

const AHORA = 1_793_000_000

const emision = (cambios: Partial<Emision> = {}): Emision => ({
  emisor: 'broker',
  audiencia: 'risk',
  proveedor: 'google',
  sujeto: 'sub-ana',
  ahora: AHORA,
  ...cambios,
})

let vieja: ParDeClaves
let nueva: ParDeClaves
let ajena: ParDeClaves

before(async () => {
  vieja = await generarParDeClaves()
  nueva = await generarParDeClaves()
  ajena = await generarParDeClaves()
})

const verificacion = (cambios: Partial<Verificacion> = {}): Verificacion => ({
  jwks: jwksDe([vieja.publica]),
  emisor: 'broker',
  audiencia: 'risk',
  registroJti: registroJtiEnMemoria(),
  ahora: AHORA,
  ...cambios,
})

const motivo = async (token: string, cambios: Partial<Verificacion> = {}): Promise<string> => {
  const resultado = await verificarToken(token, verificacion(cambios))
  return resultado.ok ? 'OK' : resultado.motivo
}

describe('token entre contextos', () => {
  it('un token válido entrega la identidad de la persona, no la del contexto que llama', async () => {
    const token = await emitirToken(vieja.privada, emision())
    const resultado = await verificarToken(token, verificacion())
    assert.ok(resultado.ok)
    assert.equal(resultado.proveedor, 'google')
    assert.equal(resultado.sujeto, 'sub-ana')
    assert.match(resultado.jti, /^[0-9a-f-]{36}$/)
  })

  it('firma: una clave que no está en el JWKS se rechaza, aunque reuse un kid publicado', async () => {
    assert.equal(await motivo(await emitirToken(ajena.privada, emision())), 'KID_DESCONOCIDO')
    const conKidAjeno = { ...ajena.privada, kid: vieja.publica.kid ?? '' }
    assert.equal(await motivo(await emitirToken(conKidAjeno, emision())), 'FIRMA')
  })

  it('firma: un payload alterado se rechaza', async () => {
    const [cabecera, cuerpo, firma] = (await emitirToken(vieja.privada, emision())).split('.')
    const alterado = JSON.parse(Buffer.from(cuerpo ?? '', 'base64url').toString()) as Record<string, unknown>
    alterado.sub = 'sub-otra'
    const token = [cabecera, Buffer.from(JSON.stringify(alterado)).toString('base64url'), firma].join('.')
    assert.equal(await motivo(token), 'FIRMA')
  })

  it('algoritmo: sólo ES256; un token sin firma o HS256 se rechaza', async () => {
    const hs = await new SignJWT({ prv: 'google' })
      .setProtectedHeader({ alg: 'HS256', kid: vieja.publica.kid ?? '' })
      .setIssuer('broker').setAudience('risk').setSubject('sub-ana').setIssuedAt(AHORA).setExpirationTime(AHORA + 60).setJti('j')
      .sign(new Uint8Array(32))
    assert.equal(await motivo(hs), 'ALGORITMO')
    const none = `${Buffer.from(JSON.stringify({ alg: 'none' })).toString('base64url')}.${Buffer.from('{}').toString('base64url')}.`
    assert.equal(await motivo(none), 'ALGORITMO')
    assert.equal(await motivo('no.es.un-token'), 'FORMATO')
  })

  it('emisor: un token de otro contexto se rechaza', async () => {
    assert.equal(await motivo(await emitirToken(vieja.privada, emision({ emisor: 'communication' }))), 'EMISOR')
  })

  it('audiencia: un token para Communication OS no sirve en Risk OS', async () => {
    assert.equal(await motivo(await emitirToken(vieja.privada, emision({ audiencia: 'communication' }))), 'AUDIENCIA')
  })

  it('vencimiento: vale 60 s, con 5 s de tolerancia de reloj, y después no', async () => {
    const token = await emitirToken(vieja.privada, emision())
    assert.equal(await motivo(token, { ahora: AHORA + 64 }), 'OK')
    assert.equal(await motivo(token, { ahora: AHORA + 66 }), 'VENCIDO')
  })

  it('duración: un token emitido en el futuro o que dice durar demasiado se rechaza', async () => {
    const futuro = await emitirToken(vieja.privada, emision({ ahora: AHORA + 600 }))
    assert.equal(await motivo(futuro), 'DURACION')
    const largo = await emitirToken(vieja.privada, emision({ duracionSegundos: DURACION_MAXIMA_SEGUNDOS + 1 }))
    assert.equal(await motivo(largo), 'DURACION')
  })

  it('claims: sin jti, sin sub o con un proveedor desconocido se rechaza', async () => {
    const clave = await importJWK(vieja.privada, 'ES256')
    const base = (): SignJWT =>
      new SignJWT({ prv: 'google' })
        .setProtectedHeader({ alg: 'ES256', kid: vieja.publica.kid ?? '' })
        .setIssuer('broker').setAudience('risk').setIssuedAt(AHORA).setExpirationTime(AHORA + 60)
    assert.equal(await motivo(await base().setSubject('sub-ana').sign(clave)), 'CLAIMS')
    assert.equal(await motivo(await base().setJti('j').sign(clave)), 'CLAIMS')
    const otroProveedor = await new SignJWT({ prv: 'otro' })
      .setProtectedHeader({ alg: 'ES256', kid: vieja.publica.kid ?? '' })
      .setIssuer('broker').setAudience('risk').setSubject('sub-ana').setIssuedAt(AHORA).setExpirationTime(AHORA + 60).setJti('j')
      .sign(clave)
    assert.equal(await motivo(otroProveedor), 'CLAIMS')
  })

  it('reutilización: el mismo token se acepta una sola vez', async () => {
    const token = await emitirToken(vieja.privada, emision())
    const registro = registroJtiEnMemoria()
    assert.equal(await motivo(token, { registroJti: registro }), 'OK')
    assert.equal(await motivo(token, { registroJti: registro }), 'REUTILIZADO')
  })

  it('reutilización: un token rechazado no quema el jti', async () => {
    const token = await emitirToken(vieja.privada, emision())
    const registro = registroJtiEnMemoria()
    assert.equal(await motivo(token, { registroJti: registro, audiencia: 'communication' }), 'AUDIENCIA')
    assert.equal(await motivo(token, { registroJti: registro }), 'OK')
  })

  it('rotación: con las dos claves publicadas, valen los tokens de la vieja y de la nueva', async () => {
    const jwks = jwksDe([vieja.publica, nueva.publica])
    assert.equal(await motivo(await emitirToken(vieja.privada, emision()), { jwks }), 'OK')
    assert.equal(await motivo(await emitirToken(nueva.privada, emision()), { jwks }), 'OK')
  })

  it('rotación: al retirar la vieja, sus tokens se rechazan y los de la nueva siguen valiendo', async () => {
    const jwks = jwksDe([nueva.publica])
    assert.equal(await motivo(await emitirToken(vieja.privada, emision()), { jwks }), 'KID_DESCONOCIDO')
    assert.equal(await motivo(await emitirToken(nueva.privada, emision()), { jwks }), 'OK')
  })

  it('el JWKS publica sólo partes públicas y exige kid únicos', () => {
    const jwks = jwksDe([vieja.privada])
    assert.equal(jwks.keys[0]?.d, undefined)
    assert.deepEqual(jwks.keys[0], clavePublica(vieja.publica))
    assert.throws(() => jwksDe([vieja.publica, vieja.publica]), /repetidos/)
    assert.throws(() => jwksDe([{ ...vieja.publica, kid: '' }]), /kid/)
  })

  it('no se firma sin clave privada ni sin kid', async () => {
    await assert.rejects(emitirToken(vieja.publica, emision()), /privada/)
    await assert.rejects(emitirToken({ ...vieja.privada, kid: '' }, emision()), /kid/)
  })
})
