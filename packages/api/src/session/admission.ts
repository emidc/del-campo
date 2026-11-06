// La regla de admisión del guard de sesión, como función pura sobre claims. Vive fuera de la
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
   * Claim `hd`: Google lo emite sólo para cuentas de un Workspace. Desde la fase 5 de
   * T-0035 no decide la admisión (la decide la base); se conserva para no cambiar el
   * formato de la cookie de sesión.
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
 * `oidc` (T-0035, D-0072, D-0077), el único modo desde la fase 5: cualquier cuenta de Google
 * con email verificado pasa este guard, y quien decide es la base. Al volver de Google,
 * `ingresar` exige una credencial vinculada o una invitación vigente; en cada consulta,
 * `conDatos` exige que la persona siga ACTIVE y con rol. El Workspace y la lista del owner
 * (D-0059) se retiraron con el modo `legacy`.
 */
export interface AdmissionConfig {
  readonly modo: 'oidc'
}

const normalizeEmail = (value: string): string => value.trim().toLowerCase()

/**
 * Lo que el guard puede decidir sin la base, en orden: que haya una sesión utilizable y un
 * email verificado. El resto (invitación, credencial, estado y rol) lo decide la base.
 */
export const evaluateAdmission = (
  session: SessionState,
  _config: AdmissionConfig,
): AdmissionOutcome => {
  if (session.kind === 'NONE') return { admitted: false, reason: 'NO_SESSION' }
  if (session.kind === 'INVALID') return { admitted: false, reason: 'INVALID_TOKEN' }
  if (session.kind === 'EXPIRED') return { admitted: false, reason: 'EXPIRED' }

  const { claims } = session
  if (claims.sub.trim() === '' || claims.email.trim() === '') {
    return { admitted: false, reason: 'INVALID_TOKEN' }
  }
  if (!claims.emailVerified) return { admitted: false, reason: 'EMAIL_UNVERIFIED' }

  return {
    admitted: true,
    principal: { sub: claims.sub, email: normalizeEmail(claims.email), displayName: claims.displayName },
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
