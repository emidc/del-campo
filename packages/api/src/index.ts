// Superficie pública de `@del-campo/api`. `apps/web` importa sólo de acá: R-25 le
// prohíbe alcanzar `@del-campo/db`, y esa frontera es la razón de existir del paquete.

export { denialStatus, evaluateAdmission, parseAdmittedAccounts } from './session/admission.ts'
export type {
  AdmissionConfig,
  AdmissionDenial,
  AdmissionOutcome,
  AdmittedAccount,
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

export { buildAuthorizationRequest, claimsFromCallback } from './session/oidc.ts'
export type { AuthorizationHandshake, AuthorizationRequest } from './session/oidc.ts'

export { batchLabel, latestBatch } from './vs01/batch.ts'
export type { BatchStamp } from './vs01/batch.ts'

export { party, policy, search } from './vs01/queries.ts'
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
