// Integración OIDC con Google mediante `openid-client` (D-0060). Sólo identidad: ningún
// scope de Drive, ninguna cuenta de servicio, ninguna delegación (D-0057, D-0059).

import * as client from 'openid-client'

import type { IdentityClaims } from './admission.ts'
import type { OidcConfig } from './config.ts'
import { GOOGLE_SCOPES, redirectUri } from './config.ts'

/** Lo que hay que guardar entre `start` y `callback`, en una cookie efímera y cifrada. */
export interface AuthorizationHandshake {
  readonly state: string
  readonly nonce: string
  readonly codeVerifier: string
}

export interface AuthorizationRequest {
  readonly url: string
  readonly handshake: AuthorizationHandshake
}

let discovered: Promise<client.Configuration> | undefined

const configuration = (config: OidcConfig): Promise<client.Configuration> => {
  // El discovery de Google es estable; recordarlo evita un round-trip por login sin
  // introducir estado compartido entre despliegues.
  discovered ??= client.discovery(new URL(config.issuer), config.clientId, config.clientSecret)
  return discovered
}

export const buildAuthorizationRequest = async (
  config: OidcConfig,
): Promise<AuthorizationRequest> => {
  const openid = await configuration(config)
  const codeVerifier = client.randomPKCECodeVerifier()
  const codeChallenge = await client.calculatePKCECodeChallenge(codeVerifier)
  const state = client.randomState()
  const nonce = client.randomNonce()

  const url = client.buildAuthorizationUrl(openid, {
    redirect_uri: redirectUri(config),
    scope: GOOGLE_SCOPES,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
    state,
    nonce,
    // No se envía el parámetro `hd`: sería una pista para el selector de cuentas de
    // Google, no un control, y tenerlo acá invitaría a confundirlo con la verificación
    // de pertenencia al Workspace, que ocurre sobre el claim `hd` del ID token.
    prompt: 'select_account',
  })

  return { url: url.href, handshake: { state, nonce, codeVerifier } }
}

/**
 * Canjea el código y devuelve los claims del ID token ya validados por la biblioteca
 * (firma, `iss`, `aud`, `exp`, `nonce`). La admisión se decide después, aparte y con
 * código propio: acá sólo se establece *quién* es, no *si puede*.
 */
export const claimsFromCallback = async (
  config: OidcConfig,
  currentUrl: URL,
  handshake: AuthorizationHandshake,
): Promise<IdentityClaims> => {
  const openid = await configuration(config)
  const tokens = await client.authorizationCodeGrant(openid, currentUrl, {
    pkceCodeVerifier: handshake.codeVerifier,
    expectedState: handshake.state,
    expectedNonce: handshake.nonce,
    idTokenExpected: true,
  })

  const claims = tokens.claims()
  if (claims === undefined) throw new Error('la respuesta de Google no trajo un ID token')

  const email = claims.email
  if (typeof email !== 'string') throw new Error('el ID token no trajo un email')
  const hostedDomain = claims.hd
  const displayName = claims.name

  return {
    sub: claims.sub,
    email,
    emailVerified: claims.email_verified === true,
    hostedDomain: typeof hostedDomain === 'string' ? hostedDomain : null,
    displayName: typeof displayName === 'string' ? displayName : null,
  }
}
