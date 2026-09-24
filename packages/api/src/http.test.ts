// T-0018 — el borde HTTP de las consultas de datos, atacado con `Request` reales.
//
// Estas pruebas son la mitad de "páginas y consultas de datos" que exige D-0059: la otra
// mitad, la de páginas, comparte exactamente esta función a través de `admitCookie`, y
// está en `guard-paginas.test.ts`. Lo que se verifica acá no es sólo el código de estado:
// es que **ninguna respuesta negativa tenga cuerpo**, porque un cuerpo que distinguiera
// "no existe" de "no podés" filtraría la existencia de la póliza.

import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { guarded, jsonResponse } from './http.ts'
import type { IdentityClaims } from './session/admission.ts'
import type { GuardConfig } from './session/guard.ts'
import { SESSION_COOKIE, sealSession } from './session/session.ts'

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

const requestWith = (cookie?: string): Request =>
  new Request('https://vs01.test/api/vs01/policy/11111111-1111-1111-1111-111111111111', {
    headers: cookie === undefined ? {} : { cookie: `${SESSION_COOKIE}=${cookie}` },
  })

/** Si el handler llegara a correr, el test lo nota: esto sólo debe pasar si hay admisión. */
let handlerRuns = 0
const handler = async (): Promise<Response> => {
  handlerRuns += 1
  return Promise.resolve(jsonResponse({ secreto: 'datos de pólizas' }))
}

const expectDenied = async (request: Request, status: number, reason: string): Promise<void> => {
  const before = handlerRuns
  const response = await guarded(request, config, handler)
  assert.equal(response.status, status)
  assert.equal(await response.text(), '', 'una respuesta negativa no lleva cuerpo')
  assert.equal(response.headers.get('x-vs01-denial'), reason)
  assert.equal(handlerRuns, before, 'la consulta de datos no debe haberse ejecutado')
}

describe('consultas directas de datos — deny by default', () => {
  it('sin cookie: 401 y cuerpo vacío', async () => {
    await expectDenied(requestWith(), 401, 'NO_SESSION')
  })

  it('cookie inválida: 401 y cuerpo vacío', async () => {
    await expectDenied(requestWith('no-es-un-token'), 401, 'INVALID_TOKEN')
  })

  it('cookie expirada: 401 y cuerpo vacío', async () => {
    await expectDenied(requestWith(await sealSession(claims(), SECRET, -1)), 401, 'EXPIRED')
  })

  it('email no verificado: 403 y cuerpo vacío', async () => {
    const cookie = await sealSession(claims({ emailVerified: false }), SECRET)
    await expectDenied(requestWith(cookie), 403, 'EMAIL_UNVERIFIED')
  })

  it('cuenta fuera del Workspace: 403 y cuerpo vacío', async () => {
    const cookie = await sealSession(claims({ hostedDomain: 'otro.test' }), SECRET)
    await expectDenied(requestWith(cookie), 403, 'OUTSIDE_WORKSPACE')
  })

  it('cuenta del Workspace fuera de la lista: 403 y cuerpo vacío', async () => {
    const cookie = await sealSession(claims({ email: `ajena@${WORKSPACE}` }), SECRET)
    await expectDenied(requestWith(cookie), 403, 'NOT_ADMITTED')
  })

  it('una cookie emitida con otro secreto no sirve', async () => {
    const cookie = await sealSession(claims(), 'un-secreto-distinto-igual-de-largo-aca')
    await expectDenied(requestWith(cookie), 401, 'INVALID_TOKEN')
  })

  it('la respuesta negativa no depende del recurso pedido, porque no lo mira', async () => {
    // Esta es una propiedad **estructural**, y hay que decir qué prueba y qué no: que dos
    // URLs distintas den la misma respuesta es cierto por construcción, porque
    // `deniedResponse` recibe el motivo y nunca la request. Lo que este test fija es esa
    // construcción: si alguien le pasara la URL o el recurso al armar la negativa, el
    // `handler` de abajo dejaría de ser inalcanzable y el conteo lo delataría.
    //
    // Que el 404 con sesión sea indistinguible del 401 sin ella para quien no está
    // admitido se comprueba contra la app servida, en `ops/evidence/T-0018.md`.
    const before = handlerRuns
    const uno = await guarded(requestWith(), config, handler)
    const otro = await guarded(new Request('https://vs01.test/api/vs01/policy/no-existe'), config, handler)
    assert.equal(uno.status, otro.status)
    assert.equal(await uno.text(), await otro.text())
    assert.equal(uno.headers.get('x-vs01-denial'), otro.headers.get('x-vs01-denial'))
    assert.equal(handlerRuns, before, 'la negativa se arma sin consultar nada del recurso')
  })

  it('con sesión admitida sí corre la consulta', async () => {
    const before = handlerRuns
    const response = await guarded(requestWith(await sealSession(claims(), SECRET)), config, handler)
    assert.equal(response.status, 200)
    assert.equal(handlerRuns, before + 1)
    assert.equal(response.headers.get('cache-control'), 'no-store')
  })
})
