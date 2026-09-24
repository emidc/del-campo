export { archivosDeMigracion, pendientes, parsearNombre } from './migraciones.ts'
export type { Migracion } from './migraciones.ts'
export { getPartyOverview, getPolicyDetail, searchPolicies } from './policy-query.ts'
export type {
  CurrentPolicyVersion,
  DocumentLinkSummary,
  EndorsementSummary,
  ExternalDocumentReferenceSummary,
  HolderSummary,
  InsurerSummary,
  PartyMembershipSummary,
  PartyOverview,
  PolicyCandidate,
  PolicyDetail,
  PolicySearchCriteria,
  PolicySearchResult,
  PolicyVersionHistoryEntry,
} from './policy-query.ts'

// T-0017. La vinculación documental ya existía en el paquete pero no en su superficie
// pública: T-0018 la consume desde `packages/api`, que no puede alcanzar rutas internas.
// Se exporta lo que ya estaba escrito; no se redefine ninguna consulta (D-0058).
export {
  countDocumentLinkingCategories,
  getDocumentAccessForPolicies,
} from './document-linking/query.ts'
export type {
  ClientFolderAccess,
  DocumentAccess,
  DocumentLinkingCounts,
  PendingDocumentInfo,
  PolicyDocumentAccess,
} from './document-linking/query.ts'
