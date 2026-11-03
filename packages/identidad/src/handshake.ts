// Lo que viaja entre el inicio del login y el callback: `state`, `nonce` y el verifier
// de PKCE, en una cookie cifrada de diez minutos (como en VS01: en Vercel el callback
// puede caer en otra instancia). La clave se deriva con un propósito distinto al de la
// sesión, así que el mismo secreto no produce la misma clave para los dos usos.

import { EncryptJWT, jwtDecrypt } from 'jose'

import type { Handshake } from './oidc.ts'
import { derivarClave } from './sesion.ts'

export const DURACION_HANDSHAKE_SEGUNDOS = 10 * 60

const clave = (secreto: string, proposito: string): Uint8Array =>
  derivarClave(secreto, `handshake:${proposito}`)

export const sellarHandshake = (handshake: Handshake, secreto: string, proposito: string): Promise<string> =>
  new EncryptJWT({ ...handshake })
    .setProtectedHeader({ alg: 'dir', enc: 'A256GCM' })
    .setIssuedAt()
    .setExpirationTime(`${String(DURACION_HANDSHAKE_SEGUNDOS)}s`)
    .encrypt(clave(secreto, proposito))

/** `null` ante cualquier problema: un callback sin handshake válido no autentica a nadie. */
export const leerHandshake = (
  valor: string | undefined,
  secreto: string,
  proposito: string,
): Promise<Handshake | null> =>
  valor === undefined || valor === ''
    ? Promise.resolve(null)
    : jwtDecrypt(valor, clave(secreto, proposito)).then(
        ({ payload }): Handshake | null => {
          const { state, nonce, codeVerifier } = payload
          if (typeof state !== 'string' || typeof nonce !== 'string' || typeof codeVerifier !== 'string') {
            return null
          }
          return { state, nonce, codeVerifier }
        },
        () => null,
      )
