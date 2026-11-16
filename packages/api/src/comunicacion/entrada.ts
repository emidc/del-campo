// Las tres entradas de Comunicación que no pasan por la sesión del equipo: el webhook de
// Meta, protegido por la firma `X-Hub-Signature-256`, y las dos tareas programadas,
// protegidas por `CRON_SECRET`, que Vercel manda solo en `Authorization: Bearer` a sus
// cron jobs. Escritas contra `Request`/`Response` estándar; los route handlers de la web
// son envoltorios de una línea. La configuración se lee del entorno en cada pedido y no
// en el build (R-16, R-18: ningún valor está en el repositorio).

import { createHash, timingSafeEqual } from 'node:crypto'

import { sql as baseDeLaApp } from '../db.ts'
import { applyRetention } from './application/operations.ts'
import { reprocessDeliveries } from './application/reprocess.ts'
import { createWebhookHandler, deliveryStore, type WebhookResult } from './application/webhook.ts'
import { normalizePhoneNumberId } from './domain/payload.ts'
import type { Sql } from './persistence/database.ts'

export type Env = Readonly<Record<string, string | undefined>>

const json = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  })

/** Solo ids y estados (R-19). */
const log = (line: string): void => {
  console.info(`[comunicacion] ${line}`)
}

/**
 * Receptor de Meta. Devuelve la respuesta y, aparte, lo que hay que correr después de
 * responder (`after` en la web). Sin configuración, 503: Meta reintenta, y no hay modo
 * sin firma. Solo se persiste lo del número configurado.
 */
export const whatsappWebhook = async (
  request: Request,
  env: Env = process.env,
  sql: () => Sql = baseDeLaApp,
): Promise<WebhookResult> => {
  const appSecret = env.WHATSAPP_APP_SECRET ?? ''
  const verifyToken = env.WHATSAPP_VERIFY_TOKEN ?? ''
  const phoneNumberId = normalizePhoneNumberId(env.WHATSAPP_PHONE_NUMBER_ID)
  if (appSecret === '' || verifyToken === '' || phoneNumberId === null) {
    return { response: new Response(null, { status: 503 }), process: null }
  }
  const receive = createWebhookHandler({ appSecret, verifyToken, phoneNumberId, store: deliveryStore(sql()), log })
  return receive(request)
}

export const MIN_CRON_SECRET_LENGTH = 32

const sameSecret = (a: string, b: string): boolean =>
  timingSafeEqual(createHash('sha256').update(a).digest(), createHash('sha256').update(b).digest())

/**
 * `null` si el request trae el secreto; si no, la negativa, sin datos. Sin secreto
 * configurado, 503. El secreto se compara entero y nunca se loguea.
 */
export const jobDenial = (request: Request, env: Env): Response | null => {
  const secret = env.CRON_SECRET ?? ''
  if (secret.length < MIN_CRON_SECRET_LENGTH) return json({ error: 'las tareas no están configuradas' }, 503)
  const header = request.headers.get('authorization') ?? ''
  const given = header.startsWith('Bearer ') ? header.slice('Bearer '.length) : ''
  if (given === '' || !sameSecret(given, secret)) return json({ error: 'sin credencial válida' }, 401)
  return null
}

/** Retención de D-0065: entregas crudas y textos de intentos no aceptados, a los 30 días. */
export const tareaDeRetencion = async (
  request: Request,
  env: Env = process.env,
  sql: () => Sql = baseDeLaApp,
): Promise<Response> => {
  const denied = jobDenial(request, env)
  if (denied !== null) return denied
  const result = await applyRetention(sql())
  log(
    `retención: ${String(result.deliveries)} entregas borradas (${String(result.ignoredDeleted)} ignoradas por ser de otro número), ` +
      `${String(result.unprocessedDeleted)} vencidas sin procesar ` +
      `borradas, ${String(result.staleAttempts)} intentos cerrados, ${String(result.attemptBodies)} textos borrados`,
  )
  return json(result)
}

/** Reproceso de entregas `failed` y atascadas, con el mismo filtro por número que el receptor. */
export const tareaDeReproceso = async (
  request: Request,
  env: Env = process.env,
  sql: () => Sql = baseDeLaApp,
): Promise<Response> => {
  const denied = jobDenial(request, env)
  if (denied !== null) return denied
  const phoneNumberId = normalizePhoneNumberId(env.WHATSAPP_PHONE_NUMBER_ID)
  if (phoneNumberId === null) return json({ error: 'falta WHATSAPP_PHONE_NUMBER_ID o no es numérico' }, 503)
  const result = await reprocessDeliveries(sql(), { phoneNumberId, log })
  log(
    `reproceso: ${String(result.processed)} procesadas, ${String(result.ignored)} de otro número, ` +
      `${String(result.failed)} fallidas, ${String(result.skipped)} salteadas`,
  )
  return json(result)
}
