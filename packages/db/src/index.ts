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
  LinkLevel,
  PendingDocumentInfo,
  PolicyDocumentAccess,
} from './document-linking/query.ts'

// T-0045: gestiones manuales.
export {
  CLAIM_STAGES,
  CLAIM_STAGE_LABELS,
  SERVICE_CASE_KINDS,
  addClaimRequirement,
  moveClaimStage,
  setClaimRequirementDone,
  SERVICE_CASE_STATUSES,
  addServiceCaseNote,
  assignServiceCase,
  changeServiceCaseStatus,
  createServiceCase,
  getServiceCase,
  getWorkload,
  listAssignableMembers,
  listServiceCases,
  takeServiceCase,
  QUOTE_CURRENCIES,
  QUOTE_OPTION_STATUSES,
  chooseQuoteOption,
  declineQuoteOption,
  formatQuotePremium,
  listActiveInsurers,
  recordQuoteAnswer,
  requestQuoteOption,
  unchooseQuoteOption,
} from './service-case.ts'
export type {
  ClaimStage,
  InsurerOption,
  NewServiceCase,
  QuoteAnswer,
  QuoteCurrency,
  QuoteOption,
  QuoteOptionStatus,
  QuoteProgress,
  ServiceCaseDetail,
  ServiceCaseEvent,
  ServiceCaseFilter,
  ServiceCaseKind,
  ServiceCaseRequirement,
  ServiceCaseStatus,
  ServiceCaseSummary,
  TeamMember,
  Workload,
} from './service-case.ts'
// T-0052: tareas.
export {
  TASK_STATUSES,
  assignTask,
  changeTaskStatus,
  commentTask,
  createTask,
  getTask,
  listTaskAssignees,
  listTasks,
} from './task.ts'
export type { NewTask, TaskDetail, TaskEvent, TaskFilter, TaskStatus, TaskSummary } from './task.ts'
export { listRenewals } from './renewal.ts'
export type { RenewalFilter, RenewalItem, RenewalMode, RenewalState } from './renewal.ts'
