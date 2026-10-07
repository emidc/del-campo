// Aplicar, revertir y volver a aplicar las migraciones del contexto sobre
// delcampo_communication_test. Termina con todo aplicado, como lo encontró.

import assert from 'node:assert/strict'
import { after, before, describe, it } from 'node:test'

import type { Sql } from './database.ts'
import { appliedMigrations, down, migrate } from './migrations.ts'
import { openTestDatabase } from './testing.ts'

const TABLES = ['webhook_delivery', 'message', 'outbound_status', 'unsupported_message', 'outbound_attempt']
const FILES = ['0001_communication_schema.sql', '0002_outbound_attempt.sql', '0003_delivery_reprocessing.sql']

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

  it('la reversa de 0003 saca las columnas de reproceso sin tocar las entregas', async () => {
    const columns = async (): Promise<string[]> => {
      const rows = await sql<{ c: string }[]>`
        select column_name as c from information_schema.columns
        where table_schema = 'communication' and table_name = 'webhook_delivery'
          and column_name in ('reprocess_count', 'last_reprocessed_at') order by column_name`
      return rows.map((r) => r.c)
    }
    await sql`insert into communication.webhook_delivery (signature, body_raw) values ('valid', '{}')`
    assert.deepEqual(await columns(), ['last_reprocessed_at', 'reprocess_count'])
    assert.equal(await down(sql), '0003_delivery_reprocessing.sql')
    assert.deepEqual(await columns(), [])
    assert.deepEqual(await migrate(sql), ['0003_delivery_reprocessing.sql'])
    const [row] = await sql<{ n: number; c: number }[]>`
      select count(*)::int as n, min(reprocess_count) as c from communication.webhook_delivery`
    assert.deepEqual({ ...row }, { n: 1, c: 0 })
    await sql`delete from communication.webhook_delivery`
  })

  it('no toca nada fuera del esquema communication', async () => {
    const rows = await sql<{ s: string }[]>`
      select distinct table_schema as s from information_schema.tables
      where table_schema not in ('pg_catalog', 'information_schema')`
    assert.deepEqual(rows.map((r) => r.s), ['communication'])
  })
})
