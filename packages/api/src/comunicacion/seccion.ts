// La sección Comunicación de Broker OS (T-0066): lo que leen y hacen las páginas. Como
// toda consulta, corre por `conDatos`: como `broker_app`, a nombre de quien mira, con RLS
// decidiendo. Todo el equipo ve todas las conversaciones (decisión de Emiliano, 15/11/2026).

import { conDatos } from '../acceso/datos.ts'
import { sql } from '../db.ts'
import type { Principal } from '../session/admission.ts'
import {
  conversationMessages,
  conversationSummaries,
  deliveryHealth,
  type ConversationMessages,
  type ConversationSummary,
  type DeliveryHealth,
} from './application/conversations.ts'
import { sendReply, type Phase, type ReplyResult } from './application/reply.ts'
import { cloudApiConfigProblem, cloudApiSender, type TextSender } from './integration/cloud-api.ts'
import { listConversationParties } from './persistence/clientes.ts'
import type { Conexion } from './persistence/database.ts'

export type { ConversationMessages, DeliveryHealth, ReplyResult }
export type { ThreadItem } from './application/conversations.ts'
export { MAX_REPLY_LENGTH } from './domain/reply.ts'

export interface ClienteDeConversacion {
  readonly partyId: string
  readonly name: string
}

export interface ConversacionResumen extends ConversationSummary {
  /** Los clientes cuyo teléfono coincide con el del participante. Vacío: sin identificar. */
  readonly clientes: ClienteDeConversacion[]
}

export interface Conversaciones {
  readonly conversaciones: ConversacionResumen[]
  readonly entregas: DeliveryHealth
}

export interface EnvioConfigurado {
  readonly send: TextSender
  readonly phoneNumberId: string
}

/** El envío configurado, o `null` si falta algo: se ve sin poder responder. */
export const envioConfigurado = (env: Readonly<Record<string, string | undefined>> = process.env): EnvioConfigurado | null => {
  const base = env.WHATSAPP_GRAPH_BASE_URL ?? ''
  const config = {
    accessToken: env.WHATSAPP_ACCESS_TOKEN ?? '',
    phoneNumberId: env.WHATSAPP_PHONE_NUMBER_ID ?? '',
    apiVersion: env.WHATSAPP_GRAPH_API_VERSION ?? '',
    ...(base === '' ? {} : { baseUrl: base }),
  }
  if (cloudApiConfigProblem(config) !== null) return null
  return { send: cloudApiSender(config), phoneNumberId: config.phoneNumberId }
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const agrupar = (pares: { conversationId: number; partyId: string; name: string }[]): Map<number, ClienteDeConversacion[]> => {
  const porConversacion = new Map<number, ClienteDeConversacion[]>()
  for (const { conversationId, partyId, name } of pares) {
    porConversacion.set(conversationId, [...(porConversacion.get(conversationId) ?? []), { partyId, name }])
  }
  return porConversacion
}

/**
 * Las entregas crudas del webhook no las lee `broker_app`: su estado (cuántas fallaron o
 * están atascadas, sin contenido) se cuenta con la conexión de la app, después de que la
 * base admitió a la persona.
 */
export const conversacionesCon = async (conexion: Conexion, principal: Principal, partyId: string | null = null): Promise<Conversaciones> =>
{
  const lista = await conDatos(conexion, principal, async (tx) => {
    const resumenes = await conversationSummaries(tx)
    const clientes = agrupar(await listConversationParties(tx, partyId))
    return resumenes
      .filter((c) => partyId === null || clientes.has(c.id))
      .map((c) => ({ ...c, clientes: clientes.get(c.id) ?? [] }))
  })
  return { conversaciones: lista, entregas: await deliveryHealth(conexion) }
}

/** Todas las conversaciones, la más reciente primero. */
export const conversaciones = (principal: Principal): Promise<Conversaciones> => conversacionesCon(sql(), principal)

/** Las conversaciones de un cliente: las de un teléfono que coincide con uno suyo. */
export const conversacionesDeCliente = async (principal: Principal, partyId: string): Promise<ConversacionResumen[]> =>
  UUID.test(partyId) ? (await conversacionesCon(sql(), principal, partyId)).conversaciones : []

export interface Conversacion {
  readonly hilo: ConversationMessages
  readonly entregas: DeliveryHealth
  readonly clientes: ClienteDeConversacion[]
  /** Si este entorno tiene configurado el envío por Cloud API. */
  readonly envioConfigurado: boolean
}

export const conversacion = async (principal: Principal, id: number): Promise<Conversacion | null> => {
  const conexion = sql()
  const leida = await conDatos(conexion, principal, async (tx) => {
    const hilo = await conversationMessages(tx, id)
    if (hilo === null) return null
    const clientes = (await listConversationParties(tx)).filter((c) => c.conversationId === id)
    return { hilo, clientes: clientes.map(({ partyId, name }) => ({ partyId, name })) }
  })
  if (leida === null) return null
  return { ...leida, entregas: await deliveryHealth(conexion), envioConfigurado: envioConfigurado() !== null }
}

export interface Respuesta {
  readonly idempotencyKey: string
  readonly conversationId: number
  readonly body: string
}

export type ResultadoDeRespuesta = ReplyResult | { readonly kind: 'not-configured' }

/**
 * Responde desde el hilo. Cada fase del envío corre en su propio `conDatos`, que termina
 * antes de llamar a la API: una baja durante el envío se respeta, y la red nunca corre
 * dentro de una transacción. El autor queda en el intento.
 */
export const responderCon = async (
  conexion: Conexion,
  principal: Principal,
  envio: EnvioConfigurado | null,
  respuesta: Respuesta,
): Promise<ResultadoDeRespuesta> => {
  if (envio === null) return { kind: 'not-configured' }
  const phase: Phase = (op) => conDatos(conexion, principal, op)
  const author = await phase(async (tx) => {
    const [fila] = await tx<{ id: string | null }[]>`select authz.usuario() as id`
    return fila?.id ?? null
  })
  return sendReply({ sql: conexion, phase, author, send: envio.send, phoneNumberId: envio.phoneNumberId }, respuesta)
}

export const responderConversacion = (principal: Principal, respuesta: Respuesta): Promise<ResultadoDeRespuesta> =>
  responderCon(sql(), principal, envioConfigurado(), respuesta)

/** Lo que se le dice a la persona por cada resultado de un envío. */
export const MENSAJE_DE_RESPUESTA: Readonly<Record<ResultadoDeRespuesta['kind'], string>> = {
  sent: 'Enviado.',
  rejected: 'WhatsApp rechazó el envío. No se envió nada.',
  unconfirmed: 'No se sabe si el mensaje salió. Queda en el hilo como intento sin confirmar: revisá antes de reenviar.',
  'in-progress': 'Este envío ya está en curso.',
  invalid: 'El mensaje no es válido.',
  'key-reused': 'El texto cambió respecto del intento anterior. Volvé a enviarlo.',
  'not-found': 'La conversación no existe.',
  'no-phone': 'El participante no tiene teléfono: no se puede responder desde acá.',
  'window-closed': 'La ventana de 24 h está cerrada: no se puede enviar texto libre.',
  'not-configured': 'El envío no está configurado en este entorno.',
}

export const esResultadoDeRespuesta = (valor: string): valor is ResultadoDeRespuesta['kind'] => Object.hasOwn(MENSAJE_DE_RESPUESTA, valor)
