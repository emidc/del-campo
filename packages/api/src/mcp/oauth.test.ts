import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { describe, it } from 'node:test'

import {
  canjear,
  credencialesManuales,
  emitirCodigo,
  metadatosDelRecurso,
  metadatosDelServidor,
  noAutorizado,
  rechazar,
  registrarCliente,
  usuarioDelAcceso,
  validarAutorizacion,
} from './oauth.ts'

const SECRETO = 'x'.repeat(48)
const ORIGEN = 'https://broker.example'
const RETORNO = 'https://agente.example/callback'
const USUARIO = '11111111-2222-3333-4444-555555555555'
const VERIFICADOR = 'v'.repeat(50)
const DESAFIO = createHash('sha256').update(VERIFICADOR).digest('base64url')

const pedido = (ruta: string, init?: RequestInit): Request => new Request(`${ORIGEN}${ruta}`, init)
const formulario = (campos: Record<string, string>): RequestInit => ({
  method: 'POST',
  headers: { 'content-type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams(campos).toString(),
})

interface Tokens {
  readonly access_token: string
  readonly refresh_token: string
  readonly error?: string
}

const registrar = async (metodo?: string): Promise<{ client_id: string; client_secret?: string }> => {
  const r = await registrarCliente(
    pedido('/api/oauth/registro', {
      method: 'POST',
      body: JSON.stringify({ redirect_uris: [RETORNO], client_name: 'Gemini', token_endpoint_auth_method: metodo }),
    }),
    SECRETO,
  )
  assert.equal(r.status, 201)
  return (await r.json()) as { client_id: string; client_secret?: string }
}

const parametros = (clientId: string): Record<string, string> => ({
  client_id: clientId,
  redirect_uri: RETORNO,
  response_type: 'code',
  code_challenge: DESAFIO,
  code_challenge_method: 'S256',
  state: 'abc',
})

const codigoPara = async (clientId: string): Promise<string> => {
  const v = await validarAutorizacion(parametros(clientId), SECRETO)
  assert.ok(v.ok)
  const url = new URL(await emitirCodigo(v.pedido, USUARIO, SECRETO))
  assert.equal(url.searchParams.get('state'), 'abc')
  return url.searchParams.get('code') ?? ''
}

const bearer = (token: string): Request => pedido('/api/mcp', { headers: { authorization: `Bearer ${token}` } })

describe('OAuth del MCP', () => {
  it('publica los metadatos con el origen del pedido', async () => {
    const recurso = (await metadatosDelRecurso(pedido('/x')).json()) as { resource: string; authorization_servers: string[] }
    assert.equal(recurso.resource, `${ORIGEN}/api/mcp`)
    assert.deepEqual(recurso.authorization_servers, [ORIGEN])
    const servidor = (await metadatosDelServidor(pedido('/x')).json()) as { token_endpoint: string }
    assert.equal(servidor.token_endpoint, `${ORIGEN}/api/oauth/token`)
  })

  it('sin token, el MCP responde 401 y dice dónde están los metadatos', () => {
    const r = noAutorizado(pedido('/api/mcp'))
    assert.equal(r.status, 401)
    assert.match(r.headers.get('www-authenticate') ?? '', /oauth-protected-resource\/api\/mcp/)
  })

  it('registro, código con PKCE, token de acceso y renovación', async () => {
    const { client_id } = await registrar()
    const code = await codigoPara(client_id)
    const r = await canjear(
      pedido('/api/oauth/token', formulario({ grant_type: 'authorization_code', code, client_id, redirect_uri: RETORNO, code_verifier: VERIFICADOR })),
      SECRETO,
    )
    assert.equal(r.status, 200)
    const t = (await r.json()) as Tokens
    assert.equal(await usuarioDelAcceso(bearer(t.access_token), SECRETO), USUARIO)

    const renovado = await canjear(
      pedido('/api/oauth/token', formulario({ grant_type: 'refresh_token', refresh_token: t.refresh_token, client_id })),
      SECRETO,
    )
    assert.equal(renovado.status, 200)
    const t2 = (await renovado.json()) as Tokens
    assert.equal(await usuarioDelAcceso(bearer(t2.access_token), SECRETO), USUARIO)
  })

  it('acepta el secreto del cliente por Basic y rechaza uno falso', async () => {
    const { client_id, client_secret } = await registrar('client_secret_basic')
    assert.ok(client_secret !== undefined)
    const code = await codigoPara(client_id)
    const campos = { grant_type: 'authorization_code', code, redirect_uri: RETORNO, code_verifier: VERIFICADOR }
    const con = (secreto: string): RequestInit => ({
      method: 'POST',
      headers: {
        'content-type': 'application/x-www-form-urlencoded',
        authorization: `Basic ${Buffer.from(`${client_id}:${secreto}`).toString('base64')}`,
      },
      body: new URLSearchParams(campos).toString(),
    })
    assert.equal((await canjear(pedido('/api/oauth/token', con('falso')), SECRETO)).status, 401)
    assert.equal((await canjear(pedido('/api/oauth/token', con(client_secret)), SECRETO)).status, 200)
  })

  it('rechaza un verificador PKCE equivocado y otra dirección de retorno', async () => {
    const { client_id } = await registrar()
    const code = await codigoPara(client_id)
    const base = { grant_type: 'authorization_code', code, client_id, redirect_uri: RETORNO, code_verifier: VERIFICADOR }
    for (const cambio of [{ code_verifier: 'w'.repeat(50) }, { redirect_uri: 'https://otro.example/cb' }]) {
      const r = await canjear(pedido('/api/oauth/token', formulario({ ...base, ...cambio })), SECRETO)
      assert.equal(r.status, 400)
      assert.equal(((await r.json()) as Tokens).error, 'invalid_grant')
    }
  })

  it('no deja usar un token en lugar de otro ni un cliente inventado', async () => {
    const { client_id } = await registrar()
    const code = await codigoPara(client_id)
    assert.equal(await usuarioDelAcceso(bearer(code), SECRETO), null)
    assert.equal(await usuarioDelAcceso(bearer(client_id), SECRETO), null)
    assert.equal(await usuarioDelAcceso(bearer('basura'), SECRETO), null)
    const otro = await validarAutorizacion(parametros('inventado'), SECRETO)
    assert.equal(otro.ok, false)
  })

  it('no acepta una dirección de retorno que no registró el cliente', async () => {
    const { client_id } = await registrar()
    const v = await validarAutorizacion({ ...parametros(client_id), redirect_uri: 'https://malo.example/cb' }, SECRETO)
    assert.deepEqual(v, { ok: false, mensaje: 'La dirección de retorno no coincide.', volverA: null })
  })

  it('si la persona cancela, vuelve con access_denied', async () => {
    const { client_id } = await registrar()
    const v = await validarAutorizacion(parametros(client_id), SECRETO)
    assert.ok(v.ok)
    const url = new URL(rechazar(v.pedido))
    assert.equal(url.searchParams.get('error'), 'access_denied')
  })

  it('las credenciales manuales (Gemini) sirven para el canje con secreto', async () => {
    const cred = await credencialesManuales(RETORNO, 'Gemini', SECRETO)
    assert.ok(cred !== null)
    const code = await codigoPara(cred.clientId)
    const campos = {
      grant_type: 'authorization_code',
      code,
      redirect_uri: RETORNO,
      code_verifier: VERIFICADOR,
      client_id: cred.clientId,
      client_secret: cred.clientSecret,
    }
    assert.equal((await canjear(pedido('/api/oauth/token', formulario(campos)), SECRETO)).status, 200)
    assert.equal(await credencialesManuales('http://malo.example/cb', 'x', SECRETO), null)
  })

  it('sin PKCE, el canje exige el secreto del cliente', async () => {
    const cred = await credencialesManuales(RETORNO, 'Gemini', SECRETO)
    assert.ok(cred !== null)
    const sinPkce = { ...parametros(cred.clientId), code_challenge: undefined, code_challenge_method: undefined }
    const v = await validarAutorizacion(sinPkce, SECRETO)
    assert.ok(v.ok)
    const code = new URL(await emitirCodigo(v.pedido, USUARIO, SECRETO)).searchParams.get('code') ?? ''
    const campos = { grant_type: 'authorization_code', code, redirect_uri: RETORNO, client_id: cred.clientId }
    assert.equal((await canjear(pedido('/api/oauth/token', formulario(campos)), SECRETO)).status, 400)
    const conSecreto = { ...campos, client_secret: cred.clientSecret }
    assert.equal((await canjear(pedido('/api/oauth/token', formulario(conSecreto)), SECRETO)).status, 200)
  })

  it('rechaza registrar direcciones que no son https', async () => {
    const r = await registrarCliente(
      pedido('/api/oauth/registro', { method: 'POST', body: JSON.stringify({ redirect_uris: ['http://malo.example/cb'] }) }),
      SECRETO,
    )
    assert.equal(r.status, 400)
  })
})
