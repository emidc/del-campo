// Aplicar, revertir y volver a aplicar las migraciones del contexto sobre
// delcampo_risk_test. Termina con todo aplicado, como lo encontró.

import assert from 'node:assert/strict'
import { after, before, describe, it } from 'node:test'

import type { Sql } from './database.ts'
import { appliedMigrations, down, migrate } from './migrations.ts'
import { openTestDatabase } from './testing.ts'

const TABLES = [
  'accion', 'accion_estado', 'cierre_revision', 'credencial', 'evaluacion', 'evento_poliza', 'lote_importacion', 'miembro_escenario', 'novedad',
  'orden_previo', 'orden_previo_item', 'persona', 'registro_acceso', 'reordenamiento', 'reordenamiento_vigente',
  'revision_humana', 'revision_pendiente', 'riesgo', 'transferencia', 'usuario',
]
const FILES = ['0001_risk_schema.sql', '0002_lote_importacion.sql', '0003_credencial.sql', '0004_actualizacion.sql']

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
    where table_schema = 'risk' and table_name <> 'schema_migrations' order by table_name`
  return rows.map((r) => r.t)
}

/** Lo que la reversa tiene que borrar además de las tablas: tipos y funciones. */
const otrosObjetos = async (): Promise<string[]> => {
  const rows = await sql<{ o: string }[]>`
    select typname as o from pg_type t join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'risk' and t.typtype = 'd'
    union all
    select proname from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'risk'`
  return rows.map((r) => r.o)
}

describe('migraciones del contexto', () => {
  it('aplicar, revertir todas y volver a aplicar', async () => {
    assert.deepEqual(await existing(), TABLES)
    assert.notDeepEqual(await otrosObjetos(), [])

    let reverted: string | null
    const order: string[] = []
    while ((reverted = await down(sql)) !== null) order.push(reverted)
    assert.deepEqual(order, [...FILES].reverse())
    assert.deepEqual(await existing(), [])
    assert.deepEqual(await otrosObjetos(), [], 'la reversa no deja tipos ni funciones')
    assert.deepEqual(await appliedMigrations(sql), [])

    assert.deepEqual(await migrate(sql), FILES)
    assert.deepEqual(await existing(), TABLES)
    assert.deepEqual(await migrate(sql), [], 'una segunda pasada no aplica nada')
  })

  it('no toca nada fuera del esquema risk', async () => {
    const rows = await sql<{ s: string }[]>`
      select distinct table_schema as s from information_schema.tables
      where table_schema not in ('pg_catalog', 'information_schema')`
    assert.deepEqual(rows.map((r) => r.s), ['risk'])
  })
})
