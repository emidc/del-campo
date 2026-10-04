// Conexión a la base y configuración del envío, leídas del entorno en el primer uso y
// no en el build (R-16, R-18: ningún valor está en el repositorio).

import {
  cloudApiConfigProblem,
  cloudApiSender,
  connect,
  type CloudApiConfig,
  type Sql,
  type TextSender,
} from '@del-campo/communication'

import type { Env } from './guard.ts'

let sql: Sql | null = null

/** Una sola conexión por proceso. Sin `COMMUNICATION_DATABASE_URL`, falla. */
export const database = (env: Env = process.env): Sql => {
  if (sql !== null) return sql
  const url = env.COMMUNICATION_DATABASE_URL ?? ''
  if (url === '') throw new Error('falta COMMUNICATION_DATABASE_URL')
  sql = connect(url)
  return sql
}

export interface SendSetup {
  readonly send: TextSender
  readonly phoneNumberId: string
}

export const cloudApiConfigFromEnv = (env: Env): CloudApiConfig => {
  const base = env.WHATSAPP_GRAPH_BASE_URL ?? ''
  return {
    accessToken: env.WHATSAPP_ACCESS_TOKEN ?? '',
    phoneNumberId: env.WHATSAPP_PHONE_NUMBER_ID ?? '',
    apiVersion: env.WHATSAPP_GRAPH_API_VERSION ?? '',
    ...(base === '' ? {} : { baseUrl: base }),
  }
}

/** El envío configurado, o `null` si falta algo: se ve sin poder responder. */
export const sendSetup = (env: Env = process.env): SendSetup | null => {
  const config = cloudApiConfigFromEnv(env)
  if (cloudApiConfigProblem(config) !== null) return null
  return { send: cloudApiSender(config), phoneNumberId: config.phoneNumberId }
}

/** Solo ids y estados (R-19). */
export const log = (line: string): void => {
  console.info(`[communication] ${line}`)
}
