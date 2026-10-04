// Lo único que exporta @del-campo/communication (D-0063). Quien consuma el contexto —su
// app o su tarea programada— importa de acá y de ningún otro archivo.

export type { Participant } from '../domain/payload.ts'
export type { OutboundStatus } from '../domain/status.ts'
export { connect, type Sql } from '../persistence/database.ts'
export { listThread, type OutboundMessage, type ThreadMessage } from '../persistence/store.ts'
export { purgeExpiredDeliveries, recordOutboundMessage } from './operations.ts'
export {
  createWebhookHandler,
  deliveryStore,
  type DeliveryStore,
  type WebhookConfig,
  type WebhookResult,
} from './webhook.ts'
