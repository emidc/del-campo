// Credencial compartida de D-0066: un usuario y una contraseña, validados en el
// servidor. Sin dependencias: `scrypt`, HMAC y `timingSafeEqual` de `node:crypto`.
//
// La contraseña se guarda solo como hash `scrypt:N:r:p:<sal b64>:<hash b64>` en una
// variable de entorno. El separador es `:` y no el `$` habitual: Next.js expande `$VAR`
// al leer los `.env`, y un hash con `$` llegaba roto (hallazgo del recorrido local). Al entrar se calcula el hash una vez y se emite una cookie
// firmada; después cada request verifica la firma, que es barata. Por eso formulario y
// no Basic Auth: con polling cada 3 s, Basic Auth calcularía scrypt en cada consulta.

import { createHash, createHmac, randomBytes, scrypt, timingSafeEqual } from 'node:crypto'

/** El owner la genera aleatoria; más corta se rechaza al generar el hash (ajuste de T-0025). */
export const MIN_PASSWORD_LENGTH = 20
export const MIN_SESSION_SECRET_LENGTH = 32
export const SESSION_COOKIE = 'co01_session'
/** Ocho horas: una jornada. */
export const SESSION_TTL_SECONDS = 8 * 60 * 60

const KEY_LENGTH = 32
const DEFAULT_PARAMS = { N: 2 ** 15, r: 8, p: 1 }

export interface PasswordHash {
  readonly N: number
  readonly r: number
  readonly p: number
  readonly salt: Buffer
  readonly hash: Buffer
}

const B64 = /^[A-Za-z0-9+/]+={0,2}$/

/** Lee el hash de la variable de entorno. Un formato inválido es `null`: la UI se niega. */
export const parsePasswordHash = (raw: string): PasswordHash | null => {
  const parts = raw.split(':')
  if (parts.length !== 6 || parts[0] !== 'scrypt') return null
  const [, n, r, p, salt, hash] = parts
  if (n === undefined || r === undefined || p === undefined || salt === undefined || hash === undefined) return null
  if (!/^\d+$/.test(n) || !/^\d+$/.test(r) || !/^\d+$/.test(p) || !B64.test(salt) || !B64.test(hash)) return null
  const N = Number(n)
  const params = { N, r: Number(r), p: Number(p) }
  // N potencia de 2 entre 2^14 y 2^20: ni un hash débil ni uno que agote la memoria.
  if (N < 2 ** 14 || N > 2 ** 20 || (N & (N - 1)) !== 0) return null
  if (params.r < 8 || params.r > 32 || params.p < 1 || params.p > 4) return null
  const saltBuf = Buffer.from(salt, 'base64')
  const hashBuf = Buffer.from(hash, 'base64')
  if (saltBuf.length < 16 || hashBuf.length !== KEY_LENGTH) return null
  return { ...params, salt: saltBuf, hash: hashBuf }
}

const derive = (password: string, salt: Buffer, params: { N: number; r: number; p: number }): Promise<Buffer> =>
  new Promise((resolve, reject) => {
    scrypt(
      password.normalize('NFC'),
      salt,
      KEY_LENGTH,
      { ...params, maxmem: 256 * params.N * params.r },
      (error, key) => {
        if (error === null) resolve(key)
        else reject(error)
      },
    )
  })

/** Lo que guarda la variable de entorno. Rechaza contraseñas cortas, contadas en code points. */
export const hashPassword = async (password: string): Promise<string> => {
  if (Array.from(password).length < MIN_PASSWORD_LENGTH) {
    throw new Error(`la contraseña tiene que tener al menos ${String(MIN_PASSWORD_LENGTH)} caracteres`)
  }
  const salt = randomBytes(16)
  const key = await derive(password, salt, DEFAULT_PARAMS)
  const { N, r, p } = DEFAULT_PARAMS
  return `scrypt:${String(N)}:${String(r)}:${String(p)}:${salt.toString('base64')}:${key.toString('base64')}`
}

const digest = (s: string): Buffer => createHash('sha256').update(s, 'utf8').digest()

export interface AuthConfig {
  readonly user: string
  readonly password: PasswordHash
  readonly sessionSecret: string
  /** Huella del hash: rotar la contraseña invalida las sesiones abiertas. */
  readonly passwordFingerprint: string
}

/**
 * Usuario y contraseña en tiempo constante. El scrypt se calcula siempre, aunque el
 * usuario no coincida, para que la demora no diga cuál de los dos estaba mal.
 */
export const verifyCredentials = async (config: AuthConfig, user: string, password: string): Promise<boolean> => {
  const userOk = timingSafeEqual(digest(user), digest(config.user))
  const key = await derive(password, config.password.salt, config.password)
  const passwordOk = timingSafeEqual(key, config.password.hash)
  return userOk && passwordOk
}

const sessionMac = (config: AuthConfig, expires: number): Buffer =>
  createHmac('sha256', config.sessionSecret).update(`v1.${String(expires)}.${config.passwordFingerprint}`).digest()

export const issueSession = (config: AuthConfig, now: Date = new Date()): string => {
  const expires = Math.floor(now.getTime() / 1000) + SESSION_TTL_SECONDS
  return `v1.${String(expires)}.${sessionMac(config, expires).toString('base64url')}`
}

const SESSION = /^v1\.(\d{1,12})\.([A-Za-z0-9_-]{43})$/

export const verifySession = (config: AuthConfig, value: string | undefined, now: Date = new Date()): boolean => {
  if (value === undefined) return false
  const match = SESSION.exec(value)
  if (match?.[1] === undefined || match[2] === undefined) return false
  const expires = Number(match[1])
  const given = Buffer.from(match[2], 'base64url')
  const expected = sessionMac(config, expires)
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return false
  return expires > Math.floor(now.getTime() / 1000)
}

export type AuthConfigResult = { readonly ok: true; readonly config: AuthConfig } | { readonly ok: false; readonly reason: string }

/**
 * La credencial desde el entorno. Si falta o es inválida cualquiera de las tres
 * variables, el resultado es una negativa: no hay modo abierto. El motivo no cita valores.
 */
export const authConfigFromEnv = (env: Readonly<Record<string, string | undefined>>): AuthConfigResult => {
  const user = env.COMMUNICATION_UI_USER ?? ''
  const rawHash = env.COMMUNICATION_UI_PASSWORD_HASH ?? ''
  const sessionSecret = env.COMMUNICATION_UI_SESSION_SECRET ?? ''
  if (user === '') return { ok: false, reason: 'falta COMMUNICATION_UI_USER' }
  const password = parsePasswordHash(rawHash)
  if (password === null) return { ok: false, reason: 'COMMUNICATION_UI_PASSWORD_HASH falta o no es un hash scrypt válido' }
  if (sessionSecret.length < MIN_SESSION_SECRET_LENGTH) {
    return { ok: false, reason: `COMMUNICATION_UI_SESSION_SECRET falta o tiene menos de ${String(MIN_SESSION_SECRET_LENGTH)} caracteres` }
  }
  return {
    ok: true,
    config: { user, password, sessionSecret, passwordFingerprint: digest(rawHash).toString('hex').slice(0, 32) },
  }
}

/** `Secure` salvo en localhost, donde el recorrido local corre sobre HTTP. */
export const sessionCookieHeader = (value: string, requestUrl: string, maxAge = SESSION_TTL_SECONDS): string => {
  const host = new URL(requestUrl).hostname
  const secure = host === 'localhost' || host === '127.0.0.1' ? '' : '; Secure'
  return `${SESSION_COOKIE}=${value}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${String(maxAge)}${secure}`
}

export const readCookie = (header: string | null, name: string): string | undefined => {
  if (header === null) return undefined
  for (const part of header.split(';')) {
    const cut = part.indexOf('=')
    if (cut !== -1 && part.slice(0, cut).trim() === name) return part.slice(cut + 1).trim()
  }
  return undefined
}
