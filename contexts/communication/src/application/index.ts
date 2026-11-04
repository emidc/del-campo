// Lo único que exporta @del-campo/communication (D-0063). Quien consuma el contexto —su
// app o su tarea programada— importa de acá y de ningún otro archivo.

export { normalizePhoneNumberId, type Participant } from '../domain/payload.ts'
export { MAX_REPLY_LENGTH } from '../domain/reply.ts'
export type { OutboundStatus } from '../domain/status.ts'
export type { ServiceWindow } from '../domain/window.ts'
export {
  cloudApiConfigProblem,
  cloudApiSender,
  type CloudApiConfig,
  type SendOutcome,
  type TextSender,
} from '../integration/cloud-api.ts'
export { connect, type Conexion, type Sql } from '../persistence/database.ts'
export {
  EXPLICACION,
  puede,
  type AccionCommunication,
  type RolInterno,
} from '../domain/permisos.ts'
export {
  afirmarRestringida,
  auditar,
  conPrincipal,
  ingresar,
  ROL_RESTRINGIDO,
  type CredencialEncontrada,
  type DecisionLogin,
  type IdentidadDeLogin,
  type InvitacionEncontrada,
  type MotivoDenegado,
  type PrincipalCommunication,
  type Rol,
} from '../persistence/acceso.ts'
export { cambiarRol, darDeBaja, invitar, type ResultadoAdmin } from './acceso.ts'
// T-0035: el registro de `jti` del token entre contextos, que la app pasa a `verificarToken`.
export { registroJtiPostgres, type RegistroJtiPostgres, type UsoJti } from '../persistence/jti.ts'
export { listThread, type OutboundMessage, type ThreadMessage } from '../persistence/store.ts'
export {
  conversationList,
  conversationThread,
  deliveryHealth,
  type ConversationList,
  type ConversationSummary,
  type ConversationThread,
  type DeliveryHealth,
  type ParticipantLabel,
  type ThreadItem,
} from './conversations.ts'
export {
  applyRetention,
  purgeExpiredDeliveries,
  recordOutboundMessage,
  type RetentionResult,
} from './operations.ts'
export {
  REPROCESS_BATCH,
  reprocessDeliveries,
  type ReprocessOptions,
  type ReprocessOutcome,
  type ReprocessResult,
} from './reprocess.ts'
export { sendReply, type Phase, type ReplyDeps, type ReplyRequest, type ReplyResult } from './reply.ts'
export {
  createWebhookHandler,
  deliveryStore,
  type DeliveryStore,
  type WebhookConfig,
  type WebhookResult,
} from './webhook.ts'
