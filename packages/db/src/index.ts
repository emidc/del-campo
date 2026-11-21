export { archivosDeMigracion, pendientes, parsearNombre } from './migraciones.ts'
export type { Migracion } from './migraciones.ts'
export { getPartyOverview, getPolicyDetail, listClients, searchPolicies } from './policy-query.ts'
export type {
  ClientList,
  ClientSummary,
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
  PRIORIDADES_DE_TAREA,
  SEGUIMIENTOS_DE_TAREA,
  TASK_FOLLOW_UPS,
  TASK_PRIORITIES,
  TASK_STATUSES,
  assignTask,
  changeTaskStatus,
  clearDoneWeeklyTasks,
  commentTask,
  completeTaskAction,
  createTask,
  deleteTask,
  getTask,
  involveInTask,
  listTaskAssignees,
  listTasks,
  listTeamMembers,
  setTaskDueDate,
  setTaskFollowUp,
  setTaskPriority,
  setTaskServiceCase,
  setTaskWeekly,
} from './task.ts'
export { MAX_PHOTO_BYTES, PHOTO_TYPES, getMemberPhoto, getOwnProfile, updateProfile } from './profile.ts'
export type { MemberPhoto, OwnProfile, PhotoType } from './profile.ts'
export type {
  NewTask,
  TaskAction,
  TaskDetail,
  TaskEvent,
  TaskFilter,
  TaskFollowUp,
  TaskPriority,
  TaskStatus,
  TaskSummary,
  TeamMemberProfile,
} from './task.ts'
export { listRenewals } from './renewal.ts'
export type { RenewalFilter, RenewalItem, RenewalMode, RenewalState } from './renewal.ts'
export {
  CLAIM_CONTACT_ROLES,
  CLAIM_CONTACT_ROLE_LABELS,
  addClaimContact,
  listClaimContacts,
  recordClaimContact,
  updateClaimContact,
} from './claim-contact.ts'
export type { ClaimContact, ClaimContactRole, NewClaimContact } from './claim-contact.ts'
export {
  BROKER_OS_SOURCE,
  CONTACT_CHANNELS,
  addContactPoint,
  cleanContact,
  deleteContactPoint,
  endContactPoint,
  listContactPoints,
} from './contact-point.ts'
export type { AddContactResult, CleanContact, ContactChannel, ContactPoint } from './contact-point.ts'

// Pólizas y contactos editables desde la app (0023).
export {
  POLICY_FIELDS,
  POLICY_STATUS,
  deletePolicy,
  effectiveStatus,
  expirePolicies,
  isDate,
  isPolicyField,
  nextEndorsementNumber,
  parseAmount,
  registerRebilling,
  renewPolicy,
  statusFromZoho,
  todayInMendoza,
  updatePolicyField,
} from './policy-edit.ts'
export type {
  DeleteBlocker,
  EditResult,
  PolicyField,
  PolicyTerms,
  RebillingInput,
  RebillingResult,
  RenewResult,
  RenewalInput,
} from './policy-edit.ts'
export {
  contactBlockers,
  deleteContact,
  linkOrganization,
  searchOrganizations,
  searchPersons,
  unlinkOrganization,
  updateDriveFolder,
  updateOrganizationCuit,
  updateOrganizationName,
  updatePersonDni,
  updatePersonName,
} from './party-edit.ts'
export type { OrganizationOption, PartyEditResult, PersonOption } from './party-edit.ts'

// Prospectos (0025).
export {
  PROSPECT_ORIGINS,
  convertProspect,
  createProspect,
  getProspectStatus,
  isProspectOrigin,
  listProspects,
  updateProspectOrigin,
} from './prospect.ts'
export type {
  ConvertResult,
  NewProspect,
  NewProspectResult,
  ProspectList,
  ProspectListItem,
  ProspectOrigin,
  ProspectStatus,
} from './prospect.ts'
