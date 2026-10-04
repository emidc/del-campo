// Runner de migraciones propio del contexto. `packages/db` tiene uno, pero D-0063
// prohíbe importarlo desde otro contexto y no crea un núcleo compartido en Q4: la
// duplicación es aceptada en T-0024 (## Risks) y extraerlo se decide al cierre de Q4.
//
// Dos diferencias con el de Broker, ambas a propósito:
//   - usa el driver `postgres` y no el binario `psql`, que no existe donde se despliega;
//   - el ledger vive dentro del esquema `communication`: todo el contexto cabe en su
//     esquema, y descartarlo es `drop schema communication cascade`.
//
// Mismas reglas que el de Broker: `NNNN_slug.sql`, orden por número, una transacción
// por migración con su registro adentro, y `down` revierte solo la última aplicada con
// el archivo homónimo de `migrations/down/`.

import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { SCHEMA, type Sql } from './database.ts'

export const MIGRATIONS_DIR = fileURLToPath(new URL('../../migrations/', import.meta.url))
const LEDGER = `${SCHEMA}.schema_migrations`

export class MigrationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'MigrationError'
  }
}

export interface Migration {
  readonly number: number
  readonly file: string
}

const NAME = /^(\d{4})_[a-z0-9]+(?:[-_][a-z0-9]+)*\.sql$/

/** Ordena y valida los nombres de un directorio. Un nombre inválido es un error, no un archivo ignorado. */
export const migrationFiles = (names: readonly string[]): Migration[] => {
  const migrations = names
    .filter((name) => name.endsWith('.sql'))
    .map((file) => {
      const match = NAME.exec(file)
      if (match === null) throw new MigrationError(`nombre de migración inválido: "${file}"; se espera NNNN_slug.sql`)
      return { number: Number(match[1]), file }
    })
    .sort((a, b) => a.number - b.number)

  const seen = new Map<number, string>()
  for (const m of migrations) {
    const previous = seen.get(m.number)
    if (previous !== undefined) {
      throw new MigrationError(`número de migración duplicado ${String(m.number)}: "${previous}" y "${m.file}"`)
    }
    seen.set(m.number, m.file)
  }
  return migrations
}

/** Las que faltan, en orden. Falla si la base registra una migración que ya no está en el repositorio (R-23). */
export const pendingMigrations = (all: readonly Migration[], applied: readonly string[]): Migration[] => {
  const known = new Set(all.map((m) => m.file))
  const orphans = applied.filter((file) => !known.has(file))
  if (orphans.length > 0) {
    throw new MigrationError(
      `la base registra migraciones que no están en el repositorio: ${orphans.join(', ')}. No se aplica nada.`,
    )
  }
  const done = new Set(applied)
  return all.filter((m) => !done.has(m.file))
}

const ensureLedger = async (sql: Sql): Promise<void> => {
  await sql.unsafe(`create schema if not exists ${SCHEMA}`)
  await sql.unsafe(
    `create table if not exists ${LEDGER} (file text primary key, applied_at timestamptz not null default now())`,
  )
}

export const appliedMigrations = async (sql: Sql): Promise<string[]> => {
  await ensureLedger(sql)
  const rows = await sql.unsafe<{ file: string }[]>(`select file from ${LEDGER} order by file`)
  return rows.map((r) => r.file)
}

/** Aplica las pendientes y devuelve sus nombres. */
export const migrate = async (sql: Sql, dir = MIGRATIONS_DIR): Promise<string[]> => {
  const all = migrationFiles(existsSync(dir) ? readdirSync(dir) : [])
  const pending = pendingMigrations(all, await appliedMigrations(sql))
  for (const m of pending) {
    const text = readFileSync(join(dir, m.file), 'utf8')
    await sql.begin(async (tx) => {
      await tx.unsafe(text)
      await tx.unsafe(`insert into ${LEDGER} (file) values ($1)`, [m.file])
    })
  }
  return pending.map((m) => m.file)
}

/** Revierte la última aplicada y devuelve su nombre, o `null` si no había ninguna. */
export const down = async (sql: Sql, dir = MIGRATIONS_DIR): Promise<string | null> => {
  const last = (await appliedMigrations(sql)).at(-1)
  if (last === undefined) return null
  const file = join(dir, 'down', last)
  if (!existsSync(file)) throw new MigrationError(`no existe down para "${last}": es irreversible`)
  const text = readFileSync(file, 'utf8')
  await sql.begin(async (tx) => {
    await tx.unsafe(text)
    await tx.unsafe(`delete from ${LEDGER} where file = $1`, [last])
  })
  return last
}
