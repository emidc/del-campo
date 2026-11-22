// OAuth 2.1 mínimo para el servidor MCP (Gemini lo exige; ChatGPT y Claude también lo
// aceptan). La persona inicia sesión en Broker OS como siempre y autoriza al agente; el
// agente recibe un token de acceso que vale una hora y uno de renovación que vale 30 días.
//
// Sin tablas nuevas: el cliente registrado, el código y los tokens son JWE cifrados con
// una clave derivada de VS01_SESSION_SECRET, cada uno con su propia audiencia para que no
// se puedan usar uno por otro. Una baja del equipo corta el acceso en el pedido siguiente,
// porque cada uso vuelve a verificar que la persona esté activa.

import { createHash, createHmac, timingSafeEqual } from 'node:crypto'

import { EncryptJWT, jwtDecrypt } from 'jose'

export const ACCESO_TTL = 60 * 60
export const RENOVACION_TTL = 30 * 24 * 60 * 60
const CODIGO_TTL = 5 * 60

type Tipo = 'cliente' | 'codigo' | 'acceso' | 'renovacion'

const clave = (secreto: string): Uint8Array =>
  new Uint8Array(createHash('sha256').update(`broker-os/mcp-oauth\n${secreto}`, 'utf8').digest())

const sellar = (tipo: Tipo, datos: Record<string, unknown>, secreto: string, ttl?: number): Promise<string> => {
  const jwt = new EncryptJWT(datos).setProtectedHeader({ alg: 'dir', enc: 'A256GCM' }).setAudience(tipo).setIssuedAt()
  if (ttl !== undefined) jwt.setExpirationTime(`${String(ttl)}s`)
  return jwt.encrypt(clave(secreto))
}

const abrir = async (tipo: Tipo, valor: string, secreto: string): Promise<Record<string, unknown> | null> => {
  if (valor === '' || valor.length > 4000) return null
  try {
    const { payload } = await jwtDecrypt(valor, clave(secreto), { audience: tipo })
    return payload
  } catch {
    return null
  }
}

const json = (cuerpo: unknown, status = 200, extra: Record<string, string> = {}): Response =>
  new Response(JSON.stringify(cuerpo), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...extra },
  })

const errorOauth = (error: string, descripcion: string, status = 400): Response =>
  json({ error, error_description: descripcion }, status)

/** El origen público con el que llegó el pedido (Vercel pone el host real en los headers). */
export const origenDe = (request: Request): string => {
  const url = new URL(request.url)
  const proto = request.headers.get('x-forwarded-proto') ?? url.protocol.replace(':', '')
  const host = request.headers.get('x-forwarded-host') ?? request.headers.get('host') ?? url.host
  return `${proto}://${host}`
}

export const RUTA_MCP = '/api/mcp'

/** RFC 9728: qué servidor de autorización protege al MCP. */
export const metadatosDelRecurso = (request: Request): Response => {
  const origen = origenDe(request)
  return json({
    resource: `${origen}${RUTA_MCP}`,
    authorization_servers: [origen],
    bearer_methods_supported: ['header'],
    resource_name: 'Broker OS',
  })
}

/** RFC 8414: dónde autorizar, canjear y registrarse. */
export const metadatosDelServidor = (request: Request): Response => {
  const origen = origenDe(request)
  return json({
    issuer: origen,
    authorization_endpoint: `${origen}/oauth/autorizar`,
    token_endpoint: `${origen}/api/oauth/token`,
    registration_endpoint: `${origen}/api/oauth/registro`,
    response_types_supported: ['code'],
    grant_types_supported: ['authorization_code', 'refresh_token'],
    code_challenge_methods_supported: ['S256'],
    token_endpoint_auth_methods_supported: ['none', 'client_secret_post', 'client_secret_basic'],
    scopes_supported: ['broker-os'],
  })
}

/** La respuesta del MCP cuando falta el token o no sirve: le dice al agente dónde autorizarse. */
export const noAutorizado = (request: Request): Response =>
  json({ error: 'invalid_token' }, 401, {
    'www-authenticate': `Bearer resource_metadata="${origenDe(request)}/.well-known/oauth-protected-resource${RUTA_MCP}"`,
  })

const redireccionValida = (uri: unknown): uri is string => {
  if (typeof uri !== 'string' || uri.length > 500) return false
  try {
    const url = new URL(uri)
    if (url.hash !== '') return false
    if (url.protocol === 'https:') return true
    return url.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)
  } catch {
    return false
  }
}

const secretoDeCliente = (clientId: string, secreto: string): string =>
  createHmac('sha256', clave(secreto)).update(clientId).digest('base64url')

/**
 * Client ID corto para un cliente con una sola dirección de retorno: no lleva datos, se
 * verifica recalculándolo a partir del redirect_uri. Gemini rechaza un Client ID con forma de JWT.
 */
const ID_CORTO = 'bos_'
const idCorto = (redirectUri: string, secreto: string): string =>
  ID_CORTO + createHmac('sha256', clave(secreto)).update(`cliente\n${redirectUri}`).digest('base64url').slice(0, 32)

const iguales = (a: string, b: string): boolean => {
  const x = Buffer.from(a)
  const y = Buffer.from(b)
  return x.length === y.length && timingSafeEqual(x, y)
}

/**
 * Para los agentes que no se registran solos (Gemini pide Client ID y Client secret a mano):
 * el mismo cliente que daría el registro dinámico, con secreto, para una sola dirección de retorno.
 */
export const credencialesManuales = (
  redirectUri: string,
  secreto: string,
): { readonly clientId: string; readonly clientSecret: string } | null => {
  if (!redireccionValida(redirectUri)) return null
  const clientId = idCorto(redirectUri, secreto)
  return { clientId, clientSecret: secretoDeCliente(clientId, secreto) }
}

/** RFC 7591: registro dinámico. El cliente queda dentro de su propio client_id. */
export const registrarCliente = async (request: Request, secreto: string): Promise<Response> => {
  let cuerpo: Record<string, unknown>
  try {
    cuerpo = (await request.json()) as Record<string, unknown>
  } catch {
    return errorOauth('invalid_client_metadata', 'JSON inválido')
  }
  const uris = cuerpo.redirect_uris
  if (!Array.isArray(uris) || uris.length === 0 || uris.length > 10 || !uris.every(redireccionValida)) {
    return errorOauth('invalid_redirect_uri', 'redirect_uris tiene que listar direcciones https')
  }
  const nombre = typeof cuerpo.client_name === 'string' ? cuerpo.client_name.slice(0, 100) : 'Agente'
  const metodo = cuerpo.token_endpoint_auth_method
  const conSecreto = metodo === 'client_secret_post' || metodo === 'client_secret_basic'
  const clientId = uris.length === 1 && typeof uris[0] === 'string' ? idCorto(uris[0], secreto) : await sellar('cliente', { uris, nombre }, secreto)
  return json(
    {
      client_id: clientId,
      ...(conSecreto ? { client_secret: secretoDeCliente(clientId, secreto), client_secret_expires_at: 0 } : {}),
      client_id_issued_at: Math.floor(Date.now() / 1000),
      client_name: nombre,
      redirect_uris: uris,
      token_endpoint_auth_method: conSecreto ? metodo : 'none',
      grant_types: ['authorization_code', 'refresh_token'],
      response_types: ['code'],
    },
    201,
  )
}

export interface PedidoDeAutorizacion {
  readonly clientId: string
  readonly nombreCliente: string
  readonly redirectUri: string
  readonly state: string | null
  /** null si el agente no usa PKCE: entonces el canje exige el secreto del cliente. */
  readonly codeChallenge: string | null
}

export type Autorizacion =
  | { readonly ok: true; readonly pedido: PedidoDeAutorizacion }
  /** `volverA` es null cuando no se puede confiar en redirect_uri: el error se muestra en pantalla. */
  | { readonly ok: false; readonly mensaje: string; readonly volverA: string | null }

const conError = (redirectUri: string, error: string, state: string | null): string => {
  const url = new URL(redirectUri)
  url.searchParams.set('error', error)
  if (state !== null) url.searchParams.set('state', state)
  return url.toString()
}

/** Valida los parámetros de /oauth/autorizar antes de mostrarle la pantalla a la persona. */
export const validarAutorizacion = async (
  parametros: Readonly<Record<string, string | undefined>>,
  secreto: string,
): Promise<Autorizacion> => {
  const clientId = parametros.client_id ?? ''
  const redirectUri = parametros.redirect_uri ?? ''
  // Un id corto sólo vale con el redirect_uri del que salió: si no coincide, es esa dirección la que falla.
  const cliente = clientId.startsWith(ID_CORTO)
    ? { uris: iguales(clientId, idCorto(redirectUri, secreto)) ? [redirectUri] : [], nombre: 'tu asistente' }
    : await abrir('cliente', clientId, secreto)
  const uris = cliente?.uris
  if (cliente === null || !Array.isArray(uris)) return { ok: false, mensaje: 'El agente no está registrado.', volverA: null }
  if (!uris.includes(redirectUri)) return { ok: false, mensaje: 'La dirección de retorno no coincide.', volverA: null }
  const state = parametros.state ?? null
  if (parametros.response_type !== 'code') {
    return { ok: false, mensaje: 'Pedido inválido.', volverA: conError(redirectUri, 'unsupported_response_type', state) }
  }
  const challenge = parametros.code_challenge ?? null
  if (challenge !== null && (parametros.code_challenge_method !== 'S256' || !/^[A-Za-z0-9_-]{43,128}$/.test(challenge))) {
    return { ok: false, mensaje: 'Pedido inválido.', volverA: conError(redirectUri, 'invalid_request', state) }
  }
  return {
    ok: true,
    pedido: {
      clientId: parametros.client_id ?? '',
      nombreCliente: typeof cliente.nombre === 'string' ? cliente.nombre : 'Agente',
      redirectUri,
      state,
      codeChallenge: challenge,
    },
  }
}

/** Después de que la persona autoriza: la dirección a la que vuelve el agente, con el código. */
export const emitirCodigo = async (pedido: PedidoDeAutorizacion, usuarioId: string, secreto: string): Promise<string> => {
  const codigo = await sellar(
    'codigo',
    { usuarioId, clientId: pedido.clientId, redirectUri: pedido.redirectUri, challenge: pedido.codeChallenge },
    secreto,
    CODIGO_TTL,
  )
  const url = new URL(pedido.redirectUri)
  url.searchParams.set('code', codigo)
  if (pedido.state !== null) url.searchParams.set('state', pedido.state)
  return url.toString()
}

export const rechazar = (pedido: PedidoDeAutorizacion): string => conError(pedido.redirectUri, 'access_denied', pedido.state)

const tokens = async (usuarioId: string, clientId: string, secreto: string): Promise<Response> =>
  json({
    access_token: await sellar('acceso', { usuarioId }, secreto, ACCESO_TTL),
    token_type: 'Bearer',
    expires_in: ACCESO_TTL,
    refresh_token: await sellar('renovacion', { usuarioId, clientId }, secreto, RENOVACION_TTL),
    scope: 'broker-os',
  })

const leerFormulario = async (request: Request): Promise<URLSearchParams> => {
  const tipo = request.headers.get('content-type') ?? ''
  if (tipo.includes('application/json')) {
    const cuerpo = (await request.json()) as Record<string, unknown>
    return new URLSearchParams(Object.entries(cuerpo).filter((e): e is [string, string] => typeof e[1] === 'string'))
  }
  return new URLSearchParams(await request.text())
}

/** El client_id y, si vino, el secreto: del cuerpo o de Authorization: Basic. */
const credencialesDe = (request: Request, form: URLSearchParams): { id: string; secreto: string | null } => {
  const basic = /^Basic\s+(.+)$/i.exec(request.headers.get('authorization') ?? '')
  if (basic?.[1] !== undefined) {
    const [id = '', sec = ''] = Buffer.from(basic[1], 'base64').toString('utf8').split(':')
    return { id: decodeURIComponent(id), secreto: decodeURIComponent(sec) }
  }
  return { id: form.get('client_id') ?? '', secreto: form.get('client_secret') }
}

/** /api/oauth/token: canje del código (con PKCE) y renovación. */
export const canjear = async (request: Request, secreto: string): Promise<Response> => {
  let form: URLSearchParams
  try {
    form = await leerFormulario(request)
  } catch {
    return errorOauth('invalid_request', 'Cuerpo inválido')
  }
  const cred = credencialesDe(request, form)
  if (cred.secreto !== null && cred.secreto !== '' && !iguales(cred.secreto, secretoDeCliente(cred.id, secreto))) {
    return errorOauth('invalid_client', 'Credenciales del cliente inválidas', 401)
  }

  switch (form.get('grant_type')) {
    case 'authorization_code': {
      const codigo = await abrir('codigo', form.get('code') ?? '', secreto)
      const verificador = form.get('code_verifier') ?? ''
      // Sin PKCE, sólo un cliente que presentó su secreto (ya verificado arriba) puede canjear.
      const pruebaValida =
        typeof codigo?.challenge === 'string'
          ? createHash('sha256').update(verificador).digest('base64url') === codigo.challenge
          : cred.secreto !== null && cred.secreto !== ''
      if (
        codigo === null ||
        typeof codigo.usuarioId !== 'string' ||
        codigo.clientId !== cred.id ||
        codigo.redirectUri !== form.get('redirect_uri') ||
        !pruebaValida
      ) {
        return errorOauth('invalid_grant', 'Código inválido o vencido')
      }
      return tokens(codigo.usuarioId, cred.id, secreto)
    }
    case 'refresh_token': {
      const renovacion = await abrir('renovacion', form.get('refresh_token') ?? '', secreto)
      if (renovacion === null || typeof renovacion.usuarioId !== 'string' || renovacion.clientId !== cred.id) {
        return errorOauth('invalid_grant', 'Token de renovación inválido o vencido')
      }
      return tokens(renovacion.usuarioId, cred.id, secreto)
    }
    default:
      return errorOauth('unsupported_grant_type', 'Sólo authorization_code y refresh_token')
  }
}

/** El usuario de un `Authorization: Bearer` válido, o null. Falta verificar que siga activo. */
export const usuarioDelAcceso = async (request: Request, secreto: string): Promise<string | null> => {
  const bearer = /^Bearer\s+(\S+)$/i.exec(request.headers.get('authorization') ?? '')
  if (bearer?.[1] === undefined) return null
  const acceso = await abrir('acceso', bearer[1], secreto)
  return typeof acceso?.usuarioId === 'string' ? acceso.usuarioId : null
}
