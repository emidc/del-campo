// Lo que la UI lee (T-0025). Ninguna de estas formas lleva el `wamid` ni el `wa_id`
// completo: la app no puede mostrar lo que no recibe (CO01 §2, R-19).

import { visibleAttemptState } from '../domain/reply.ts'
import { redactErrorTitle } from '../integration/cloud-api.ts'
import { serviceWindow, type ServiceWindow } from '../domain/window.ts'
import { listOpenAttempts } from '../persistence/attempts.ts'
import {
  conversationParticipant,
  lastDeliveryReceivedAt,
  lastInboundAt,
  listConversations,
  listUnsupported,
} from '../persistence/conversations.ts'
import type { Sql } from '../persistence/database.ts'
import { listThread } from '../persistence/store.ts'
import type { OutboundStatus } from '../domain/status.ts'

export interface ParticipantLabel {
  readonly profileName: string | null
  readonly waIdLast4: string | null
  /** Solo cuando falta el teléfono. */
  readonly bsuid: string | null
}

export interface ConversationSummary extends ParticipantLabel {
  readonly id: number
  readonly lastMessageAt: Date
  readonly window: ServiceWindow
}

export interface ConversationList {
  readonly conversations: ConversationSummary[]
  /** Para que la UI no aparente estar al día si el receptor dejó de recibir. */
  readonly lastDeliveryAt: Date | null
}

export const conversationList = async (sql: Sql, now: Date = new Date()): Promise<ConversationList> => {
  const [rows, lastDeliveryAt] = await Promise.all([listConversations(sql), lastDeliveryReceivedAt(sql)])
  return {
    conversations: rows.map((r) => ({
      id: r.id,
      profileName: r.profileName,
      waIdLast4: r.waIdLast4,
      bsuid: r.bsuid,
      lastMessageAt: r.lastMessageAt,
      window: serviceWindow(r.lastInboundAt, now),
    })),
    lastDeliveryAt,
  }
}

export type ThreadItem =
  | {
      readonly kind: 'message'
      readonly id: number
      readonly direction: 'inbound' | 'outbound'
      readonly body: string
      readonly at: Date
      /** Solo en salientes; `null` mientras no llegó ningún estado. */
      readonly status: OutboundStatus | null
      readonly errorCode: number | null
      readonly errorTitle: string | null
    }
  | { readonly kind: 'unsupported'; readonly type: string; readonly at: Date }
  | {
      readonly kind: 'attempt'
      readonly id: number
      readonly state: 'sending' | 'unconfirmed'
      /** `null` si la retención ya lo borró. */
      readonly body: string | null
      readonly reason: string | null
      readonly at: Date
    }

export interface ConversationThread {
  readonly id: number
  readonly label: ParticipantLabel
  readonly items: ThreadItem[]
  readonly window: ServiceWindow
  /** Cloud API envía a un `wa_id`: sin teléfono no se puede responder desde acá. */
  readonly canReply: boolean
  readonly lastDeliveryAt: Date | null
}

/**
 * El hilo en el orden de `listThread`, con los marcadores de tipos fuera de alcance y
 * los intentos sin confirmar intercalados por hora. El orden de `sort` es estable: dos
 * mensajes del mismo instante conservan el desempate de `listThread`.
 */
export const conversationThread = async (
  sql: Sql,
  id: number,
  now: Date = new Date(),
): Promise<ConversationThread | null> => {
  const found = await conversationParticipant(sql, id)
  if (found === null) return null
  const { participant } = found
  const [messages, unsupported, attempts, lastInbound, lastDeliveryAt] = await Promise.all([
    listThread(sql, participant),
    listUnsupported(sql, participant),
    participant.waId === null ? Promise.resolve([]) : listOpenAttempts(sql, participant.waId),
    lastInboundAt(sql, participant),
    lastDeliveryReceivedAt(sql),
  ])

  const items: ThreadItem[] = [
    ...messages.map((m): ThreadItem => ({
      kind: 'message',
      id: m.id,
      direction: m.direction,
      body: m.body,
      at: m.waTimestamp,
      status: m.status,
      errorCode: m.errorCode,
      // El título viene del webhook de estado, tal como lo manda Meta: pasa por la misma
      // redacción que los errores del envío antes de llegar a la UI (nota N7).
      errorTitle: m.errorTitle === null ? null : redactErrorTitle(m.errorTitle),
    })),
    ...unsupported.map((u): ThreadItem => ({ kind: 'unsupported', type: u.type, at: u.waTimestamp })),
    ...attempts.map((a): ThreadItem => ({
      kind: 'attempt',
      id: a.id,
      state: visibleAttemptState(a.state, a.createdAt, now),
      body: a.body,
      reason: a.errorTitle,
      at: a.createdAt,
    })),
  ].sort((a, b) => a.at.getTime() - b.at.getTime())

  return {
    id,
    label: {
      profileName: found.profileName,
      waIdLast4: participant.waId === null ? null : participant.waId.slice(-4),
      bsuid: participant.waId === null ? participant.bsuid : null,
    },
    items,
    window: serviceWindow(lastInbound, now),
    canReply: participant.waId !== null,
    lastDeliveryAt,
  }
}
