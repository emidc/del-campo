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

export { TOPE_DE_CLIENTES, clientes, party, policy, search } from './vs01/queries.ts'
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
  CLAIM_STAGES,
  ESTADOS_DE_GESTION,
  ETAPAS_DE_SINIESTRO,
  SERVICE_CASE_KINDS,
  SERVICE_CASE_STATUSES,
  TIPOS_DE_GESTION,
  agregarRequisito,
  anotarGestion,
  renombrarGestion,
  asignarGestion,
  cambiarEstadoGestion,
  cargaDelEquipo,
  crearGestion,
  esEstadoDeGestion,
  esEtapaDeSiniestro,
  esTipoDeGestion,
  gestion,
  gestiones,
  integrantesAsignables,
  marcarRequisito,
  moverEtapaSiniestro,
  tomarGestion,
  ESTADOS_DE_PROPUESTA,
  QUOTE_CURRENCIES,
  companiasActivas,
  deshacerEleccion,
  elegirPropuesta,
  esMonedaDeCotizacion,
  formatQuotePremium,
  noCotiza,
  pedirCotizacion,
  registrarCotizacion,
} from './gestiones/casos.ts'
export { leerPrima } from './gestiones/prima.ts'
export type {
  ClaimStage,
  InsurerOption,
  NewServiceCase,
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
} from './gestiones/casos.ts'

// T-0048: renovaciones.
export {
  ESTADOS_DE_RENOVACION,
  comentarRenovacion,
  comentarRenovacionCon,
  renovaciones,
} from './renovaciones/renovaciones.ts'
export type { RenewalFilter, RenewalItem, RenewalMode, RenewalState, ResultadoDeComentario } from './renovaciones/renovaciones.ts'

// T-0052: tareas.
export {
  ESTADOS_DE_TAREA,
  PRIORIDADES_DE_TAREA,
  SEGUIMIENTOS_DE_TAREA,
  TASK_FOLLOW_UPS,
  TASK_PRIORITIES,
  TASK_STATUSES,
  cambiarEstadoTarea,
  cambiarGestionTarea,
  cambiarPrioridadTarea,
  cambiarSeguimientoTarea,
  cambiarVencimientoTarea,
  renombrarTarea,
  comentarTarea,
  completarAccionDeTarea,
  crearTarea,
  eliminarTarea,
  conteoDeTareas,
  esEstadoDeTarea,
  esPrioridadDeTarea,
  esSeguimientoDeTarea,
  integrantesDelEquipo,
  involucrarEnTarea,
  marcarTareaDeLaSemana,
  pasarTarea,
  responsablesPosibles,
  tarea,
  tareaDeLimpiezaSemanal,
  tareas,
} from './tareas/tareas.ts'
export type {
  NewTask,
  TaskAction,
  TaskCounts,
  TaskDetail,
  TaskEvent,
  TaskFilter,
  TaskFollowUp,
  TaskPriority,
  TaskStatus,
  TaskSummary,
  TeamMemberProfile,
} from './tareas/tareas.ts'

// T-0049: inicio con indicadores.
export { inicio, resumirInicio } from './inicio/indicadores.ts'
export type { CargaDeIntegrante, DatosDeInicio, Indicador, Inicio } from './inicio/indicadores.ts'

// T-0053: interlocutores del siniestro.
export {
  CLAIM_CONTACT_ROLES,
  ROLES_DE_INTERLOCUTOR,
  cambiarInterlocutor,
  esRolDeInterlocutor,
  interlocutores,
  registrarContacto,
  sumarInterlocutor,
} from './gestiones/interlocutores.ts'
export type { ClaimContact, ClaimContactRole, NewClaimContact } from './gestiones/interlocutores.ts'

// C4-03b: los riesgos de una empresa, leídos de Risk OS con el token entre contextos (D-0071).
export { leerCuerpo, riesgosDeEmpresa } from './riesgos/cliente.ts'
export type { DepsRiesgos, ResultadoRiesgos, RiesgoEnFicha, RiesgosVinculados } from './riesgos/cliente.ts'

// T-0062: servidor MCP y token personal.
export {
  autorizarAgente,
  generarTokenMcp,
  mcpBrokerOs,
  mcpBrokerOsOauth,
  quitarTokenMcp,
  tokenMcpDesde,
} from './mcp/http.ts'
export {
  canjear,
  credencialesManuales,
  metadatosDelRecurso,
  metadatosDelServidor,
  rechazar,
  registrarCliente,
  validarAutorizacion,
} from './mcp/oauth.ts'
export type { Autorizacion, PedidoDeAutorizacion } from './mcp/oauth.ts'

// T-0060: usuarios del equipo desde la app.
export { cambiarEmailDelEquipo, darDeBajaDelEquipo, equipo, invitarAlEquipo } from './acceso/usuarios.ts'
export { MAX_PHOTO_BYTES, PHOTO_TYPES, editarPerfil, fotoDeIntegrante, miPerfil } from './acceso/perfiles.ts'
export type { MemberPhoto, OwnProfile } from './acceso/perfiles.ts'
export type { Equipo, UsuarioDelEquipo } from './acceso/usuarios.ts'

// T-0066: Comunicación como sección. Las entradas sin sesión: el webhook de WhatsApp y
// las tareas programadas.
export { tareaDeReproceso, tareaDeRetencion, whatsappWebhook } from './comunicacion/entrada.ts'
export {
  MAX_REPLY_LENGTH,
  MENSAJE_DE_RESPUESTA,
  avisosPendientes,
  conversacion,
  conversaciones,
  conversacionesDeCliente,
  crearProspectoDeConversacion,
  esResultadoDeRespuesta,
  responderConversacion,
  vincularConversacion,
} from './comunicacion/seccion.ts'
export type {
  ClienteDeConversacion,
  Conversacion,
  ConversacionResumen,
  Conversaciones,
  ConversationMessages,
  DeliveryHealth,
  ProspectoDeConversacion,
  ResultadoDeProspecto,
  ResultadoDeRespuesta,
  ResultadoDeVinculo,
  ThreadItem,
} from './comunicacion/seccion.ts'

// T-0068: teléfonos y mails del cliente.
export {
  CANALES_DE_CONTACTO,
  MENSAJE_DE_CONTACTO,
  agregarContacto,
  contactosDeCliente,
  corregirContacto,
  esCanalDeContacto,
  esResultadoDeContacto,
  quitarContacto,
} from './clientes/contactos.ts'
export type { CanalDeContacto, ContactChannel, ContactPoint, ResultadoDeContacto } from './clientes/contactos.ts'

// Automotores de un cliente y de sus pólizas (0035).
export {
  MENSAJE_DE_AUTOMOTOR,
  agregarAutomotor,
  automotoresDeCliente,
  automotoresDePoliza,
  corregirAutomotor,
  nuevoAutomotorEnPoliza,
  quitarAutomotor,
  quitarAutomotorDePoliza,
  riskTypeHasVehicles,
  sumarAutomotorAPoliza,
} from './clientes/automotores.ts'
export type { AutomotoresDePoliza, DatosDeAutomotor, ResultadoDeAutomotor, Vehicle } from './clientes/automotores.ts'

// Notas de una parte (0032).
export { MENSAJE_DE_NOTA, agregarNota, archivarNota, editarNota, eliminarNota, notasDeCliente } from './clientes/notas.ts'
export type { PartyNote, ResultadoDeNota } from './clientes/notas.ts'

// Pólizas y contactos editables desde la app (0023).
export {
  BLOQUEOS,
  POLICY_FIELDS,
  anularPoliza,
  cancelOption,
  describirBloqueos,
  editarCampoDePoliza,
  editarEndoso,
  editarPoliza,
  effectiveStatus,
  eliminarPoliza,
  esUuid,
  isPolicyField,
  refacturar,
  renovarPoliza,
  siguienteEndoso,
  tareaDeVencimiento,
  todayInMendoza,
} from './polizas/edicion.ts'
export type {
  DeleteBlocker,
  EditResult,
  EndorsementEdit,
  PolicyEdit,
  PolicyField,
  PolicyTerms,
  RebillingInput,
  RebillingResult,
  RenewResult,
  RenewalInput,
} from './polizas/edicion.ts'
export {
  asociarEmpresa,
  asociarPersona,
  bloqueosDeContacto,
  buscarEmpresas,
  buscarPersonas,
  editarCarpeta,
  editarCuit,
  editarDni,
  editarNombre,
  editarRazonSocial,
  editarResponsableDeMensajes,
  eliminarContacto,
  quitarDeEmpresa,
  responsableDeMensajes,
} from './clientes/edicion.ts'
export type { OrganizationOption, PartyEditResult, PersonOption } from './clientes/edicion.ts'
export {
  ORIGENES_DE_PROSPECTO,
  PROSPECT_ORIGINS,
  TOPE_DE_PROSPECTOS,
  convertirEnCliente,
  crearProspecto,
  editarOrigen,
  estadoDeProspecto,
  isProspectOrigin,
  prospectos,
} from './clientes/prospectos.ts'
export type { ConvertResult, NewProspect, ProspectList, ProspectOrigin, ProspectStatus } from './clientes/prospectos.ts'

// T-0061: la sección Riesgos de la ficha de empresa, desde la base de Broker OS.
export {
  MENSAJE_DE_ITEM,
  comentarItemDeRiesgo,
  crearItemDeRiesgo,
  darDeBajaItemDeRiesgo,
  editarItemDeRiesgo,
  esListaDeRiesgos,
  listasDeRiesgos,
} from './riesgos/seccion.ts'
export type { ResultadoDeItem, RiesgosDeEmpresa, RiskItem, RiskItemFields, RiskList } from './riesgos/seccion.ts'
export { RISK_LISTS, RISK_LIST_COLUMNS, RISK_LIST_PREFIX } from '@del-campo/db'
export type { Conclusion, CurrentFact, Finding, Location, RiskListColumn, Survey } from '@del-campo/db'

// Cuotas de las pólizas en efectivo y pantalla Pagos.
export {
  DEFAULT_PAY_DAY,
  MAX_INSTALLMENTS,
  MAX_PAY_DAY,
  MENSAJE_DE_CUOTAS,
  cuotasDePoliza,
  cuotasDelMes,
  editarCuotas,
  marcarCuota,
  pagaEnEfectivo,
  pagosDelMes,
  splitAmount,
  tieneCuotas,
} from './polizas/cuotas.ts'
export type { CuotasDePoliza, DatosDeCuotas, Installment, Pago, ResultadoDeCuotas } from './polizas/cuotas.ts'
