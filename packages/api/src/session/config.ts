// Configuración de sesión y admisión leída del entorno. Los secretos no se versionan
// (R-18). Este módulo es el único lugar que nombra las variables; la ficha de despliegue
// (`docs/despliegue/vercel-vs01.md`) las documenta una por una.

import { modoAcceso } from '../acceso/modo.ts'
import type { AdmissionConfig } from './admission.ts'

export interface OidcConfig {
  readonly issuer: string
  readonly clientId: string
  readonly clientSecret: string
  /** URL pública de la app. El `redirect_uri` se deriva de acá y nunca del header Host. */
  readonly baseUrl: string
  readonly redirectPath: string
}

export interface SessionConfig {
  readonly secret: string
  readonly secureCookies: boolean
}

/** La ruta exacta que hay que registrar en el cliente OAuth. Un solo lugar la define. */
export const GOOGLE_REDIRECT_PATH = '/api/auth/google/callback'

export const GOOGLE_ISSUER = 'https://accounts.google.com'

/** Sólo identidad: D-0059 y D-0057 excluyen cualquier scope de Drive. */
export const GOOGLE_SCOPES = 'openid email profile'

const required = (name: string): string => {
  const value = process.env[name]
  if (value === undefined || value.trim() === '') {
    throw new Error(`falta la variable de entorno ${name}; ver docs/despliegue/vercel-vs01.md`)
  }
  return value.trim()
}

/**
 * La admisión es la de la base (T-0035). `modoAcceso()` se llama igual: con
 * `AUTH_MODE=legacy` u otro valor desconocido lanza y la app no arranca. El dominio del
 * Workspace y la lista del owner (D-0059) ya no se leen.
 */
export const admissionConfig = (): AdmissionConfig => ({ modo: modoAcceso() })

export const sessionConfig = (): SessionConfig => ({
  secret: required('VS01_SESSION_SECRET'),
  secureCookies: process.env.NODE_ENV === 'production',
})

export const oidcConfig = (): OidcConfig => ({
  issuer: GOOGLE_ISSUER,
  clientId: required('GOOGLE_OAUTH_CLIENT_ID'),
  clientSecret: required('GOOGLE_OAUTH_CLIENT_SECRET'),
  baseUrl: required('VS01_BASE_URL').replace(/\/+$/, ''),
  redirectPath: GOOGLE_REDIRECT_PATH,
})

export const redirectUri = (config: OidcConfig): string => `${config.baseUrl}${config.redirectPath}`

/**
 * Si el despliegue quedara sin login configurado, la app no debe arrancar en modo
 * abierto: la comprobación existe para que la ausencia de configuración sea un error
 * visible y no un bypass de autenticación silencioso.
 */
export const assertAuthConfigured = (): void => {
  admissionConfig()
  sessionConfig()
  oidcConfig()
}
