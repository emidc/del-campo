// Configuración de la entrada con Google (AUTH_MODE=oidc, T-0035, D-0077). La sesión y el
// canje son los de `@del-campo/identidad`; acá sólo se leen del entorno los valores de
// esta app. Ninguno está en el repositorio (R-18).

import {
  EMISOR_GOOGLE,
  MIN_LARGO_SECRETO,
  type ConfigOidc,
  type ConfigSesion,
} from '@del-campo/identidad'

import type { Env } from './guard.ts'

/** La cookie de la sesión con Google. Distinta de la de la credencial compartida. */
export const COOKIE_IDENTIDAD = 'co01_identidad'
export const COOKIE_HANDSHAKE = 'co01_handshake'
/** Propósito de las claves derivadas del secreto: no sirven para otra app. */
export const PROPOSITO = 'communication-os'
export const RUTA_CALLBACK = '/api/auth/google/callback'

export interface ConfigEntrada {
  readonly oidc: ConfigOidc
  readonly sesion: ConfigSesion
  readonly baseUrl: string
}

/**
 * Lo que el modo `oidc` necesita, o `null` si falta algo: entonces la UI se niega, como
 * hoy sin la credencial compartida. No hay modo abierto.
 */
export const configEntrada = (env: Env): ConfigEntrada | null => {
  const baseUrl = env.COMMUNICATION_BASE_URL ?? ''
  const clienteId = env.COMMUNICATION_GOOGLE_CLIENT_ID ?? ''
  const clienteSecreto = env.COMMUNICATION_GOOGLE_CLIENT_SECRET ?? ''
  const secreto = env.COMMUNICATION_UI_SESSION_SECRET ?? ''
  if (baseUrl === '' || clienteId === '' || clienteSecreto === '' || secreto.length < MIN_LARGO_SECRETO) return null
  let base: URL
  try {
    base = new URL(baseUrl)
  } catch {
    return null
  }
  const local = base.hostname === 'localhost' || base.hostname === '127.0.0.1'
  if (base.protocol !== 'https:' && !local) return null
  return {
    baseUrl: base.origin,
    oidc: { emisor: EMISOR_GOOGLE, clienteId, clienteSecreto, redireccion: `${base.origin}${RUTA_CALLBACK}` },
    sesion: { cookie: COOKIE_IDENTIDAD, proposito: PROPOSITO, secreto, segura: !local },
  }
}
