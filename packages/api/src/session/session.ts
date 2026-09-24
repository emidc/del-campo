// Cookie de sesión como JWE (`dir` + A256GCM) con `jose`, según D-0060. Cifrada y no
// sólo firmada: el contenido es el `sub` y el email de una persona de la correduría, y
// una cookie firmada los lleva en claro.

import { createHash } from 'node:crypto'

import { EncryptJWT, errors, jwtDecrypt } from 'jose'

import type { IdentityClaims, Principal, SessionState } from './admission.ts'

export const SESSION_COOKIE = 'vs01_session'

/** Ocho horas: una jornada. Acota la ventana entre una baja de la lista y su efecto. */
export const SESSION_TTL_SECONDS = 8 * 60 * 60

const MIN_SECRET_LENGTH = 32

/**
 * A256GCM necesita exactamente 32 bytes. Derivarlos por SHA-256 permite que el secreto
 * de entorno sea una cadena legible generada con `openssl rand -base64 48` sin obligar a
 * quien la configura a acertar una longitud exacta en bytes.
 */
const deriveKey = (secret: string): Uint8Array => {
  if (secret.length < MIN_SECRET_LENGTH) {
    throw new Error(
      `VS01_SESSION_SECRET debe tener al menos ${String(MIN_SECRET_LENGTH)} caracteres`,
    )
  }
  return new Uint8Array(createHash('sha256').update(secret, 'utf8').digest())
}

interface SessionPayload {
  readonly email: string
  readonly emailVerified: boolean
  readonly hostedDomain: string | null
  readonly displayName: string | null
}

/**
 * El `sub` va en el claim `sub` del JWT, no en el payload: es la identidad (D-0059) y
 * corresponde al lugar que el estándar le reserva.
 */
export const sealSession = async (
  claims: IdentityClaims,
  secret: string,
  ttlSeconds: number = SESSION_TTL_SECONDS,
): Promise<string> => {
  const payload: SessionPayload = {
    email: claims.email,
    emailVerified: claims.emailVerified,
    hostedDomain: claims.hostedDomain,
    displayName: claims.displayName,
  }
  return new EncryptJWT({ ...payload })
    .setProtectedHeader({ alg: 'dir', enc: 'A256GCM' })
    .setSubject(claims.sub)
    .setIssuedAt()
    .setExpirationTime(`${String(ttlSeconds)}s`)
    .encrypt(deriveKey(secret))
}

const asBoolean = (value: unknown): boolean => value === true
const asNullableString = (value: unknown): string | null =>
  typeof value === 'string' && value !== '' ? value : null

/**
 * Nunca lanza por una cookie mala: devuelve el estado. Una cookie adulterada es una
 * situación esperable de un endpoint público, no un error del programa, y tratarla como
 * excepción tiende a producir un 500 —que ya dice algo— en vez de un 401 que no dice nada.
 */
export const readSession = (cookieValue: string | undefined, secret: string): Promise<SessionState> =>
  cookieValue === undefined || cookieValue === ''
    ? Promise.resolve({ kind: 'NONE' })
    : jwtDecrypt(cookieValue, deriveKey(secret)).then(
        ({ payload }): SessionState => {
          const sub = payload.sub
          const email = payload.email
          if (typeof sub !== 'string' || typeof email !== 'string') return { kind: 'INVALID' }
          return {
            kind: 'CLAIMS',
            claims: {
              sub,
              email,
              emailVerified: asBoolean(payload.emailVerified),
              hostedDomain: asNullableString(payload.hostedDomain),
              displayName: asNullableString(payload.displayName),
            },
          }
        },
        (error: unknown): SessionState =>
          error instanceof errors.JWTExpired ? { kind: 'EXPIRED' } : { kind: 'INVALID' },
      )

export interface CookieAttributes {
  readonly name: string
  readonly value: string
  readonly httpOnly: true
  readonly sameSite: 'lax'
  readonly secure: boolean
  readonly path: '/'
  readonly maxAge: number
}

/**
 * `secure` se apaga sólo fuera de producción: en local la app corre sobre http y una
 * cookie `Secure` no viajaría, dejando el login roto justo donde hay que practicarlo.
 */
export const sessionCookie = (value: string, secure: boolean): CookieAttributes => ({
  name: SESSION_COOKIE,
  value,
  httpOnly: true,
  sameSite: 'lax',
  secure,
  path: '/',
  maxAge: SESSION_TTL_SECONDS,
})

export const clearedSessionCookie = (secure: boolean): CookieAttributes => ({
  ...sessionCookie('', secure),
  maxAge: 0,
})

export const principalOf = (claims: IdentityClaims): Principal => ({
  sub: claims.sub,
  email: claims.email,
  displayName: claims.displayName,
})
