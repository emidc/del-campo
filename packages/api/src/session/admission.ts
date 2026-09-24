// La regla de admisión de D-0059, como función pura sobre claims. Vive fuera de la
// biblioteca de OIDC a propósito (D-0060): lo que hay que probar es *nuestra* regla, no
// que hayamos configurado bien la de otro. Sin red, sin base y sin navegador, para que
// las pruebas negativas que D-0059 exige sean baratas y por lo tanto existan.

/** Lo que el ID token de Google aporta y esta regla mira. Nada más. */
export interface IdentityClaims {
  /** Identificador estable de Google. Es la identidad (D-0059), no el email. */
  readonly sub: string
  readonly email: string
  readonly emailVerified: boolean
  /**
   * Claim `hd`: Google lo emite sólo para cuentas de un Workspace. Se compara este
   * claim y no el sufijo del email porque `SLICES/VS01.md` §5 dice, con todas las
   * letras, que un sufijo por sí solo no es prueba de identidad.
   */
  readonly hostedDomain: string | null
  readonly displayName: string | null
}

/**
 * Estado de la sesión tal como llega desde la cookie. Modelar "no hay", "no se pudo
 * descifrar" y "venció" como estados y no como excepciones es lo que permite que una
 * sola función pura cubra los siete resultados del contrato de T-0018.
 */
export type SessionState =
  | { readonly kind: 'NONE' }
  | { readonly kind: 'INVALID' }
  | { readonly kind: 'EXPIRED' }
  | { readonly kind: 'CLAIMS'; readonly claims: IdentityClaims }

export type AdmissionDenial =
  | 'NO_SESSION'
  | 'INVALID_TOKEN'
  | 'EXPIRED'
  | 'EMAIL_UNVERIFIED'
  | 'OUTSIDE_WORKSPACE'
  | 'NOT_ADMITTED'

/** Lo único que el resto de la app conoce de quien consulta. Sólo lo construye el guard. */
export interface Principal {
  readonly sub: string
  readonly email: string
  readonly displayName: string | null
}

export type AdmissionOutcome =
  | { readonly admitted: true; readonly principal: Principal }
  | { readonly admitted: false; readonly reason: AdmissionDenial }

/**
 * Una entrada de la lista del owner. `sub` es opcional porque lo que el owner puede
 * administrar son direcciones; fijar el `sub` es la defensa opcional contra que una
 * dirección se reasigne a otra persona. → `DECISIONS/0059-sesion-y-admision-vs01.md`
 */
export interface AdmittedAccount {
  readonly email: string
  readonly sub: string | null
}

export interface AdmissionConfig {
  readonly workspaceDomain: string
  readonly admitted: readonly AdmittedAccount[]
}

const normalizeEmail = (value: string): string => value.trim().toLowerCase()

/**
 * Parsea la lista de cuentas admitidas. Formato: entradas separadas por coma o salto de
 * línea, cada una `persona@dominio` o `persona@dominio=<sub>`.
 *
 * Una entrada vacía se ignora; una entrada sin arroba **lanza**. Descartarla en silencio
 * dejaría fuera de la lista a alguien que el owner creyó haber agregado, y el síntoma
 * sería una negación de acceso sin causa visible.
 */
export const parseAdmittedAccounts = (raw: string | undefined): AdmittedAccount[] => {
  if (raw === undefined) return []
  const accounts: AdmittedAccount[] = []
  for (const chunk of raw.split(/[\n,;]/)) {
    const entry = chunk.trim()
    if (entry === '') continue
    const separator = entry.indexOf('=')
    const email = normalizeEmail(separator === -1 ? entry : entry.slice(0, separator))
    const sub = separator === -1 ? null : entry.slice(separator + 1).trim()
    if (!email.includes('@')) {
      throw new Error(`lista de cuentas admitidas: "${entry}" no es una dirección de correo`)
    }
    accounts.push({ email, sub: sub === null || sub === '' ? null : sub })
  }
  return accounts
}

/**
 * Las cuatro condiciones de D-0059, en orden. El orden importa para el diagnóstico, no
 * para la seguridad: cualquiera que falle niega el acceso.
 */
export const evaluateAdmission = (
  session: SessionState,
  config: AdmissionConfig,
): AdmissionOutcome => {
  if (session.kind === 'NONE') return { admitted: false, reason: 'NO_SESSION' }
  if (session.kind === 'INVALID') return { admitted: false, reason: 'INVALID_TOKEN' }
  if (session.kind === 'EXPIRED') return { admitted: false, reason: 'EXPIRED' }

  const { claims } = session
  if (claims.sub.trim() === '' || claims.email.trim() === '') {
    return { admitted: false, reason: 'INVALID_TOKEN' }
  }
  if (!claims.emailVerified) return { admitted: false, reason: 'EMAIL_UNVERIFIED' }

  const domain = claims.hostedDomain?.trim().toLowerCase() ?? ''
  if (domain === '' || domain !== config.workspaceDomain.trim().toLowerCase()) {
    return { admitted: false, reason: 'OUTSIDE_WORKSPACE' }
  }

  const email = normalizeEmail(claims.email)
  const entry = config.admitted.find((account) => account.email === email)
  if (entry === undefined) return { admitted: false, reason: 'NOT_ADMITTED' }

  // Una cuenta del Workspace, en la lista, pero cuyo `sub` no es el que el owner fijó:
  // la dirección se reasignó a otra persona. Se niega con el mismo motivo que si no
  // estuviera en la lista, porque desde afuera es la misma situación.
  if (entry.sub !== null && entry.sub !== claims.sub) {
    return { admitted: false, reason: 'NOT_ADMITTED' }
  }

  return {
    admitted: true,
    principal: { sub: claims.sub, email, displayName: claims.displayName },
  }
}

/**
 * 401 cuando no hay una sesión utilizable; 403 cuando la sesión es válida pero la cuenta
 * no está admitida. La distinción es para quien opera, no para quien consulta: el cuerpo
 * de la respuesta es vacío en los dos casos, y ninguna respuesta negativa dice si el
 * recurso pedido existe.
 */
export const denialStatus = (reason: AdmissionDenial): 401 | 403 =>
  reason === 'NO_SESSION' || reason === 'INVALID_TOKEN' || reason === 'EXPIRED' ? 401 : 403
