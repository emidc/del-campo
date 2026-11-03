// Google OIDC con `openid-client` (D-0060), extendido por D-0077 a cuentas externas:
// no se mira `hd`. Sólo identidad: scopes `openid email profile`, nada de Drive (D-0057).
// Este módulo establece quién es; si puede entrar lo decide `decidirLogin` con lo que el
// contexto encuentra en su base.

import * as client from 'openid-client'

import type { Identidad } from './identidad.ts'

export const EMISOR_GOOGLE = 'https://accounts.google.com'
export const SCOPES = 'openid email profile'

export interface ConfigOidc {
  readonly emisor: string
  readonly clienteId: string
  readonly clienteSecreto: string
  /** La URI de redirección completa de esta app, registrada en su cliente OAuth. */
  readonly redireccion: string
}

/** Lo que se guarda entre el inicio y el callback (ver `handshake.ts`). */
export interface Handshake {
  readonly state: string
  readonly nonce: string
  readonly codeVerifier: string
}

export interface PedidoDeAutorizacion {
  readonly url: string
  readonly handshake: Handshake
}

// Discovery por emisor y cliente: con un cliente OAuth por app (plan de migración,
// fase 1), dos apps en el mismo proceso de pruebas no comparten configuración. Sólo se
// recuerda el éxito: una promesa rechazada en caché dejaría los logins muertos hasta
// reciclar la instancia.
const descubiertos = new Map<string, Promise<client.Configuration>>()

const configuracion = (config: ConfigOidc): Promise<client.Configuration> => {
  const clave = `${config.emisor}\u0000${config.clienteId}`
  let descubierto = descubiertos.get(clave)
  if (descubierto === undefined) {
    descubierto = client
      .discovery(new URL(config.emisor), config.clienteId, config.clienteSecreto)
      .catch((error: unknown) => {
        descubiertos.delete(clave)
        throw error
      })
    descubiertos.set(clave, descubierto)
  }
  return descubierto
}

export const pedirAutorizacion = async (config: ConfigOidc): Promise<PedidoDeAutorizacion> => {
  const openid = await configuracion(config)
  const codeVerifier = client.randomPKCECodeVerifier()
  const codeChallenge = await client.calculatePKCECodeChallenge(codeVerifier)
  const state = client.randomState()
  const nonce = client.randomNonce()
  const url = client.buildAuthorizationUrl(openid, {
    redirect_uri: config.redireccion,
    scope: SCOPES,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
    state,
    nonce,
    prompt: 'select_account',
  })
  return { url: url.href, handshake: { state, nonce, codeVerifier } }
}

/**
 * Convierte los claims de un ID token ya validado en una identidad. Separado del canje
 * para poder probarlo sin red: lo que no venga como se espera, lanza.
 */
export const identidadDeClaims = (claims: Readonly<Record<string, unknown>>): Identidad => {
  const { sub, email, email_verified: verificado, name } = claims
  if (typeof sub !== 'string' || sub.trim() === '') throw new Error('el ID token no trajo un sub')
  if (typeof email !== 'string' || email.trim() === '') throw new Error('el ID token no trajo un email')
  return {
    proveedor: 'google',
    sujeto: sub,
    email,
    emailVerificado: verificado === true,
    nombre: typeof name === 'string' && name !== '' ? name : null,
  }
}

/**
 * Canjea el código. La biblioteca valida firma, `iss`, `aud`, `exp`, `nonce`, `state` y
 * PKCE; si algo falla, lanza y no hay identidad.
 */
export const identidadDelCallback = async (
  config: ConfigOidc,
  urlActual: URL,
  handshake: Handshake,
): Promise<Identidad> => {
  const openid = await configuracion(config)
  const tokens = await client.authorizationCodeGrant(openid, urlActual, {
    pkceCodeVerifier: handshake.codeVerifier,
    expectedState: handshake.state,
    expectedNonce: handshake.nonce,
    idTokenExpected: true,
  })
  const claims = tokens.claims()
  if (claims === undefined) throw new Error('la respuesta de Google no trajo un ID token')
  return identidadDeClaims(claims)
}
