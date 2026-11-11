// Superficie pública de `@del-campo/api`. `apps/web` importa sólo de acá: R-25 le
// prohíbe alcanzar `@del-campo/db`, y esa frontera es la razón de existir del paquete.

export { denialStatus, evaluateAdmission } from './session/admission.ts'
export type {
  AdmissionConfig,
  AdmissionDenial,
  AdmissionOutcome,
  IdentityClaims,
  Principal,
  SessionState,
} from './session/admission.ts'

export {
  GOOGLE_ISSUER,
  GOOGLE_REDIRECT_PATH,
  GOOGLE_SCOPES,
  admissionConfig,
  assertAuthConfigured,
  oidcConfig,
  redirectUri,
  sessionConfig,
} from './session/config.ts'
export type { OidcConfig, SessionConfig } from './session/config.ts'

export { admitCookie, admitRequest, readCookie } from './session/guard.ts'
export type { GuardConfig } from './session/guard.ts'

export {
  SESSION_COOKIE,
  SESSION_TTL_SECONDS,
  clearedSessionCookie,
  principalOf,
  readSession,
  sealSession,
  sessionCookie,
} from './session/session.ts'
export type { CookieAttributes } from './session/session.ts'

export {
  HANDSHAKE_COOKIE,
  HANDSHAKE_TTL_SECONDS,
  readHandshake,
  sealHandshake,
} from './session/handshake.ts'

export { deniedResponse, guarded, jsonResponse } from './http.ts'

export { buildAuthorizationRequest, claimsFromCallback } from './session/oidc.ts'
export type { AuthorizationHandshake, AuthorizationRequest } from './session/oidc.ts'

export { batchLabel, latestBatch } from './vs01/batch.ts'
export type { BatchStamp } from './vs01/batch.ts'

export { party, policy, search } from './vs01/queries.ts'
export type { LinkLevel } from '@del-campo/db'
export type {
  DocumentTally,
  PolicyCandidate,
  PolicyDetail,
  PolicyDocumentAccess,
  PolicySearchCriteria,
  PolicyView,
  SearchOutcome,
} from './vs01/queries.ts'
export type { PartyOverview } from '@del-campo/db'

// T-0035: acceso individual de Broker OS. Toda consulta de VS01 pasa por `conDatos`, como
// `broker_app`; desde la fase 5 no hay otro modo.
export { modoAcceso } from './acceso/modo.ts'
export type { ModoAcceso } from './acceso/modo.ts'
export { conPrincipal, ingresar } from './acceso/base.ts'
export { AccesoDenegado, conDatos } from './acceso/datos.ts'
export { admitirLogin } from './acceso/login.ts'
export type { ResultadoLogin } from './acceso/login.ts'
export type { PrincipalBroker, ResultadoPrincipal, Rol } from './acceso/base.ts'

// T-0045: gestiones manuales.
export {
  ESTADOS_DE_GESTION,
  SERVICE_CASE_KINDS,
  SERVICE_CASE_STATUSES,
  TIPOS_DE_GESTION,
  anotarGestion,
  asignarGestion,
  cambiarEstadoGestion,
  cargaDelEquipo,
  crearGestion,
  esEstadoDeGestion,
  esTipoDeGestion,
  gestion,
  gestiones,
  integrantesAsignables,
  tomarGestion,
} from './gestiones/casos.ts'
export type {
  NewServiceCase,
  ServiceCaseDetail,
  ServiceCaseEvent,
  ServiceCaseFilter,
  ServiceCaseKind,
  ServiceCaseStatus,
  ServiceCaseSummary,
  TeamMember,
  Workload,
} from './gestiones/casos.ts'
