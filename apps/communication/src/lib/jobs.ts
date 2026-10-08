// Tareas programadas de CO01 (T-0026): retención y reproceso. Sus endpoints quedan fuera
// de la credencial de la UI y exigen un secreto propio, `CRON_SECRET`, que es el nombre
// con el que Vercel lo manda solo en `Authorization: Bearer` a sus cron jobs. El owner
// los puede correr a pedido con el mismo header.

import { createHash, timingSafeEqual } from 'node:crypto'

import { applyRetention, normalizePhoneNumberId, reprocessDeliveries, type Sql } from '@del-campo/communication'

import { json, type Env } from './guard.ts'

export const MIN_CRON_SECRET_LENGTH = 32

const sameSecret = (a: string, b: string): boolean =>
  timingSafeEqual(createHash('sha256').update(a).digest(), createHash('sha256').update(b).digest())

/**
 * `null` si el request trae el secreto; si no, la negativa, sin datos. Sin secreto
 * configurado, 503. El secreto solo viaja en `Authorization: Bearer`, como lo manda
 * Vercel Cron, y se compara entero: un prefijo, un sufijo o un valor parecido no pasan.
 * Nunca se loguea.
 */
export const jobDenial = (request: Request, env: Env): Response | null => {
  const secret = env.CRON_SECRET ?? ''
  if (secret.length < MIN_CRON_SECRET_LENGTH) return json({ error: 'las tareas no están configuradas' }, 503)
  const header = request.headers.get('authorization') ?? ''
  const given = header.startsWith('Bearer ') ? header.slice('Bearer '.length) : ''
  if (given === '' || !sameSecret(given, secret)) return json({ error: 'sin credencial válida' }, 401)
  return null
}

/** Envoltorio de un endpoint de tarea: nada corre sin el secreto. */
export const withJobSecret =
  (handler: (request: Request) => Promise<Response>, env?: Env) =>
  async (request: Request): Promise<Response> => {
    const denied = jobDenial(request, env ?? process.env)
    if (denied !== null) return denied
    return handler(request)
  }

export const retentionJobResponse = async (sql: Sql, log: (line: string) => void): Promise<Response> => {
  const result = await applyRetention(sql)
  log(
    `retención: ${String(result.deliveries)} entregas borradas (${String(result.ignoredDeleted)} ignoradas por ser de otro número), ` +
      `${String(result.unprocessedKept)} vencidas sin procesar ` +
      `conservadas, ${String(result.staleAttempts)} intentos cerrados, ${String(result.attemptBodies)} textos borrados`,
  )
  return json(result)
}

export const reprocessJobResponse = async (sql: Sql, env: Env, log: (line: string) => void): Promise<Response> => {
  // El mismo filtro por número que el receptor: sin número válido, no se reprocesa.
  const phoneNumberId = normalizePhoneNumberId(env.WHATSAPP_PHONE_NUMBER_ID)
  if (phoneNumberId === null) return json({ error: 'falta WHATSAPP_PHONE_NUMBER_ID o no es numérico' }, 503)
  const result = await reprocessDeliveries(sql, { phoneNumberId, log })
  log(
    `reproceso: ${String(result.processed)} procesadas, ${String(result.ignored)} de otro número, ` +
      `${String(result.failed)} fallidas, ${String(result.skipped)} salteadas`,
  )
  return json(result)
}
