// Base de los tests de integración del contexto: siempre delcampo_communication_test,
// en el mismo servidor que usan los tests de Broker y nunca en la base de Broker.
//
// La URL sale de COMMUNICATION_DATABASE_URL. Si falta, se deriva de DATABASE_URL (del
// entorno o del `.env` raíz, con la última asignación ganando, como en la guarda)
// cambiando solo el nombre de la base. Así `pnpm check` local y CI corren estos tests
// en su propia base, sin otra variable ni otro paso de CI. La guarda de
// scripts/guard-db-tests.mjs ya validó ambas variables antes de llegar acá.

import { existsSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

import postgres from 'postgres'

import { connect, notLocalDatabase, type Sql } from './database.ts'
import { migrate } from './migrations.ts'

export const TEST_DATABASE = 'delcampo_communication_test'

const ROOT_ENV = fileURLToPath(new URL('../../../../.env', import.meta.url))

const databaseUrlFromEnvFile = (): string | undefined => {
  if (!existsSync(ROOT_ENV)) return undefined
  let value: string | undefined
  for (const line of readFileSync(ROOT_ENV, 'utf8').split('\n')) {
    const clean = line.trim()
    if (clean === '' || clean.startsWith('#')) continue
    const cut = clean.indexOf('=')
    if (cut !== -1 && clean.slice(0, cut).trim() === 'DATABASE_URL') value = clean.slice(cut + 1).trim()
  }
  return value
}

export const testDatabaseUrl = (env: NodeJS.ProcessEnv = process.env): string => {
  const own = env.COMMUNICATION_DATABASE_URL
  if (own !== undefined && own !== '') return own
  const base = env.DATABASE_URL ?? databaseUrlFromEnvFile()
  const url = new URL(base !== undefined && base !== '' ? base : 'postgres://localhost:5432/postgres')
  url.pathname = `/${TEST_DATABASE}`
  return url.href
}

/** Crea la base si falta, aplica las migraciones pendientes y devuelve la conexión. */
export const openTestDatabase = async (): Promise<Sql> => {
  const raw = testDatabaseUrl()
  const refusal = notLocalDatabase(raw)
  if (refusal !== null) throw new Error(`tests de communication abortados: ${refusal}`)
  const url = new URL(raw)
  if (url.pathname !== `/${TEST_DATABASE}`) {
    throw new Error(`los tests de communication vacían sus tablas: solo corren sobre ${TEST_DATABASE}`)
  }

  const admin = new URL(url.href)
  admin.pathname = '/postgres'
  const root = postgres(admin.href, { max: 1, onnotice: () => undefined })
  try {
    const exists = await root`select 1 from pg_database where datname = ${TEST_DATABASE}`
    if (exists.length === 0) await root.unsafe(`create database ${TEST_DATABASE}`)
  } finally {
    await root.end()
  }

  const sql = connect(url.href)
  await migrate(sql)
  return sql
}

export const truncateAll = async (sql: Sql): Promise<void> => {
  await sql`
    truncate communication.webhook_delivery, communication.message,
             communication.outbound_status, communication.unsupported_message,
             communication.outbound_attempt
    restart identity`
}
