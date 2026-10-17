// Base de los tests de integración del contexto: siempre delcampo_risk_test, en el mismo
// servidor que usan los tests de Broker y nunca en la base de Broker ni en la de
// Communication OS. Copia de `contexts/communication/src/persistence/testing.ts`.
//
// La URL sale de RISK_DATABASE_URL. Si falta, se deriva de DATABASE_URL (del
// entorno o del `.env` raíz, con la última asignación ganando, como en la guarda)
// cambiando solo el nombre de la base. Así `pnpm check` local y CI corren estos tests
// en su propia base, sin otra variable ni otro paso de CI. La guarda de
// scripts/guard-db-tests.mjs ya validó ambas variables antes de llegar acá.

import { existsSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

import postgres from 'postgres'

import { connect, notLocalDatabase, type Sql, type TransactionSql } from './database.ts'
import { migrate } from './migrations.ts'

export const TEST_DATABASE = 'delcampo_risk_test'

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
  const own = env.RISK_DATABASE_URL
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
  if (refusal !== null) throw new Error(`tests de risk abortados: ${refusal}`)
  const url = new URL(raw)
  if (url.pathname !== `/${TEST_DATABASE}`) {
    throw new Error(`los tests de risk migran y revierten el esquema: solo corren sobre ${TEST_DATABASE}`)
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

/** El esquema es sólo de inserción y no se vacía: cada test escribe dentro de una transacción que se revierte. */
export class Revertir extends Error {
  constructor() {
    super('revertir')
    this.name = 'Revertir'
  }
}

export const enTransaccionRevertida = async (sql: Sql, cuerpo: (tx: TransactionSql) => Promise<void>): Promise<void> => {
  try {
    await sql.begin(async (tx) => {
      await cuerpo(tx)
      throw new Revertir()
    })
  } catch (error) {
    if (!(error instanceof Revertir)) throw error
  }
}

/**
 * Una base propia, al lado de delcampo_risk_test en el mismo servidor local, migrada y vacía,
 * para un test que tiene que confirmar de verdad (varias conexiones, transacciones separadas):
 * delcampo_risk_test no se vacía. Se borra al terminar.
 */
export const conBaseTemporal = async (nombre: string, cuerpo: (sql: Sql) => Promise<void>): Promise<void> => {
  if (!/^delcampo_risk_[a-z0-9_]+_test$/.test(nombre)) throw new Error('una base temporal se llama delcampo_risk_…_test')
  const raw = testDatabaseUrl()
  const refusal = notLocalDatabase(raw)
  if (refusal !== null) throw new Error(`tests de risk abortados: ${refusal}`)
  const url = new URL(raw)
  url.pathname = '/postgres'
  const admin = postgres(url.href, { max: 1, onnotice: () => undefined })
  try {
    await admin.unsafe(`drop database if exists ${nombre} with (force)`)
    await admin.unsafe(`create database ${nombre}`)
    url.pathname = `/${nombre}`
    const sql = connect(url.href)
    try {
      await migrate(sql)
      await cuerpo(sql)
    } finally {
      await sql.end()
    }
  } finally {
    await admin.unsafe(`drop database if exists ${nombre} with (force)`)
    await admin.end()
  }
}
