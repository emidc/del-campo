// El único lugar donde se construye un `Principal`. Páginas y consultas de datos pasan
// por acá, de modo que las dos superficies no pueden divergir (D-0059).
//
// Deny-by-default estructural: los casos de uso de `../vs01/` reciben un `Principal`
// como primer parámetro y `Principal` sólo sale de esta función. Una consulta de datos
// sin sesión no es un camino abierto que un `if` cierra: es un programa que no tipa.

import type { AdmissionConfig, AdmissionOutcome } from './admission.ts'
import { evaluateAdmission } from './admission.ts'
import type { SessionConfig } from './config.ts'
import { SESSION_COOKIE, readSession } from './session.ts'

export interface GuardConfig {
  readonly admission: AdmissionConfig
  readonly session: SessionConfig
}

/**
 * Lee la cookie del header `Cookie` crudo. No se usa el helper de Next a propósito: esto
 * tiene que ser invocable desde un test con un `Request` fabricado, que es la única forma
 * de que las pruebas negativas ataquen la misma función que corre en producción y no una
 * imitación suya.
 */
export const readCookie = (header: string | null, name: string): string | undefined => {
  if (header === null) return undefined
  for (const part of header.split(';')) {
    const entry = part.trim()
    const separator = entry.indexOf('=')
    if (separator === -1) continue
    if (entry.slice(0, separator) !== name) continue
    return decodeURIComponent(entry.slice(separator + 1))
  }
  return undefined
}

export const admitRequest = async (
  request: Request,
  config: GuardConfig,
): Promise<AdmissionOutcome> => {
  const cookie = readCookie(request.headers.get('cookie'), SESSION_COOKIE)
  const state = await readSession(cookie, config.session.secret)
  return evaluateAdmission(state, config.admission)
}

/**
 * Variante para Server Components, que no reciben el `Request`. Toma el valor de la
 * cookie ya leído por quien llama y aplica exactamente la misma regla.
 */
export const admitCookie = async (
  cookieValue: string | undefined,
  config: GuardConfig,
): Promise<AdmissionOutcome> => {
  const state = await readSession(cookieValue, config.session.secret)
  return evaluateAdmission(state, config.admission)
}
