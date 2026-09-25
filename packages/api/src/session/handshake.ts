// Lo que viaja entre `/start` y `/callback`: `state`, `nonce` y el verifier de PKCE.
//
// Va en una cookie cifrada y de diez minutos, no en memoria del servidor: en Vercel la
// instancia que atiende el callback puede no ser la que atendió el start, y un estado en
// memoria produciría fallos de login intermitentes e imposibles de reproducir en local.

import { EncryptJWT, jwtDecrypt } from 'jose'
import { createHash } from 'node:crypto'

import type { AuthorizationHandshake } from './oidc.ts'

export const HANDSHAKE_COOKIE = 'vs01_oidc'
export const HANDSHAKE_TTL_SECONDS = 10 * 60

const key = (secret: string): Uint8Array =>
  // Se deriva de un contexto distinto al de la cookie de sesión: la misma frase secreta
  // no produce la misma clave para los dos usos.
  new Uint8Array(createHash('sha256').update(`handshake:${secret}`, 'utf8').digest())

export const sealHandshake = (
  handshake: AuthorizationHandshake,
  secret: string,
): Promise<string> =>
  new EncryptJWT({ ...handshake })
    .setProtectedHeader({ alg: 'dir', enc: 'A256GCM' })
    .setIssuedAt()
    .setExpirationTime(`${String(HANDSHAKE_TTL_SECONDS)}s`)
    .encrypt(key(secret))

/** `null` ante cualquier problema: un callback sin handshake válido no autentica a nadie. */
export const readHandshake = (
  cookieValue: string | undefined,
  secret: string,
): Promise<AuthorizationHandshake | null> =>
  cookieValue === undefined || cookieValue === ''
    ? Promise.resolve(null)
    : jwtDecrypt(cookieValue, key(secret)).then(
        ({ payload }): AuthorizationHandshake | null => {
          const state = payload.state
          const nonce = payload.nonce
          const codeVerifier = payload.codeVerifier
          if (
            typeof state !== 'string' ||
            typeof nonce !== 'string' ||
            typeof codeVerifier !== 'string'
          ) {
            return null
          }
          return { state, nonce, codeVerifier }
        },
        () => null,
      )
