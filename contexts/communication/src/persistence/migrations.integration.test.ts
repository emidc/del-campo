// Aplicar, revertir y volver a aplicar las migraciones del contexto sobre
// delcampo_communication_test. Termina con todo aplicado, como lo encontró.

import assert from 'node:assert/strict'
import { after, before, describe, it } from 'node:test'

import type { Sql } from './database.ts'
import { appliedMigrations, down, migrate } from './migrations.ts'
import { openTestDatabase } from './testing.ts'

const TABLES = ['webhook_delivery', 'message', 'outbound_status', 'unsupported_message', 'outbound_attempt']
const FILES = ['0001_communication_schema.sql', '0002_outbound_attempt.sql']

let sql: Sql
before(async () => {
  sql = await openTestDatabase()
})
after(async () => {
  await migrate(sql)
  await sql.end()
})

const existing = async (): Promise<string[]> => {
  const rows = await sql<{ t: string }[]>`
    select table_name as t from information_schema.tables
    where table_schema = 'communication' and table_name <> 'schema_migrations' order by table_name`
  return rows.map((r) => r.t)
}

describe('migraciones del contexto', () => {
  it('aplicar, revertir todas y volver a aplicar', async () => {
    assert.deepEqual(await existing(), [...TABLES].sort())

    let reverted: string | null
    const order: string[] = []
    while ((reverted = await down(sql)) !== null) order.push(reverted)
    assert.deepEqual(order, [...FILES].reverse())
    assert.deepEqual(await existing(), [])
    assert.deepEqual(await appliedMigrations(sql), [])

    assert.deepEqual(await migrate(sql), FILES)
    assert.deepEqual(await existing(), [...TABLES].sort())
    assert.deepEqual(await migrate(sql), [], 'una segunda pasada no aplica nada')
  })

  it('no toca nada fuera del esquema communication', async () => {
    const rows = await sql<{ s: string }[]>`
      select distinct table_schema as s from information_schema.tables
      where table_schema not in ('pg_catalog', 'information_schema')`
    assert.deepEqual(rows.map((r) => r.s), ['communication'])
  })
})
