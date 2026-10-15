// Cookie de sesión de D-0069: dice quién es la persona y con qué credencial entró, firmada con
// HMAC-SHA256. No lleva datos de Risk OS. La firma prueba que la emitió esta app; que la
// credencial siga vigente lo comprueba el guard contra la base en cada request.
//
// Sin dependencias: `createHmac` y `timingSafeEqual` de `node:crypto`.

import { createHmac, timingSafeEqual } from 'node:crypto'

export const SESSION_COOKIE = 'risk_session'
/** Ocho horas: una jornada. */
export const SESSION_TTL_SECONDS = 8 * 60 * 60
export const MIN_SESSION_SECRET_LENGTH = 32

export type Env = Readonly<Record<string, string | undefined>>

export interface Config {
  readonly sessionSecret: string
  readonly databaseUrl: string
}

/**
 * La configuración desde el entorno. Si falta el secreto de sesión o la base, es `null` y la
 * app niega todo: no hay modo abierto. El motivo no cita valores.
 */
export const configFromEnv = (env: Env): { readonly ok: true; readonly config: Config } | { readonly ok: false; readonly reason: string } => {
  const sessionSecret = env.RISK_UI_SESSION_SECRET ?? ''
  const databaseUrl = env.RISK_DATABASE_URL ?? ''
  if (sessionSecret.length < MIN_SESSION_SECRET_LENGTH) {
    return { ok: false, reason: `RISK_UI_SESSION_SECRET falta o tiene menos de ${String(MIN_SESSION_SECRET_LENGTH)} caracteres` }
  }
  if (databaseUrl === '') return { ok: false, reason: 'falta RISK_DATABASE_URL' }
  return { ok: true, config: { sessionSecret, databaseUrl } }
}

export interface Token {
  readonly personaId: string
  readonly credencialId: string
}

const PERSONA = /^PER-[0-9A-HJKMNP-TV-Z]{26}$/
const CREDENCIAL = /^[1-9]\d{0,17}$/
const COOKIE = /^v1\.(PER-[0-9A-HJKMNP-TV-Z]{26})\.([1-9]\d{0,17})\.(\d{1,12})\.([A-Za-z0-9_-]{43})$/

const mac = (secret: string, personaId: string, credencialId: string, expires: number): Buffer =>
  createHmac('sha256', secret).update(`v1.${personaId}.${credencialId}.${String(expires)}`).digest()

export const issueSession = (secret: string, t: Token, now: Date = new Date()): string => {
  if (!PERSONA.test(t.personaId) || !CREDENCIAL.test(t.credencialId)) throw new Error('sesión con una persona o credencial inválida')
  const expires = Math.floor(now.getTime() / 1000) + SESSION_TTL_SECONDS
  return `v1.${t.personaId}.${t.credencialId}.${String(expires)}.${mac(secret, t.personaId, t.credencialId, expires).toString('base64url')}`
}

/** La persona y la credencial de una cookie bien firmada y no vencida, o `null`. */
export const verifySession = (secret: string, value: string | undefined, now: Date = new Date()): Token | null => {
  if (value === undefined) return null
  const m = COOKIE.exec(value)
  if (m?.[1] === undefined || m[2] === undefined || m[3] === undefined || m[4] === undefined) return null
  const expires = Number(m[3])
  const given = Buffer.from(m[4], 'base64url')
  const expected = mac(secret, m[1], m[2], expires)
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null
  if (expires <= Math.floor(now.getTime() / 1000)) return null
  return { personaId: m[1], credencialId: m[2] }
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
