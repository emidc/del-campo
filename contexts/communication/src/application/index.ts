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
export { connect, type Sql } from '../persistence/database.ts'
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
export { sendReply, type ReplyDeps, type ReplyRequest, type ReplyResult } from './reply.ts'
export {
  createWebhookHandler,
  deliveryStore,
  type DeliveryStore,
  type WebhookConfig,
  type WebhookResult,
} from './webhook.ts'
