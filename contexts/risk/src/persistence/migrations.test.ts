import assert from 'node:assert/strict'
import { readdirSync } from 'node:fs'
import { join } from 'node:path'
import { describe, it } from 'node:test'

import { MIGRATIONS_DIR, MigrationError, migrationFiles, pendingMigrations } from './migrations.ts'

describe('nombres y orden de migraciones', () => {
  it('ordena por número, no por sistema de archivos', () => {
    assert.deepEqual(migrationFiles(['0002_b.sql', '0010_c.sql', '0001_a.sql', 'README.md']).map((m) => m.file),
      ['0001_a.sql', '0002_b.sql', '0010_c.sql'])
  })
  it('un nombre inválido es un error, no un archivo ignorado', () => {
    assert.throws(() => migrationFiles(['1_a.sql']), MigrationError)
    assert.throws(() => migrationFiles(['0001_Mayus.sql']), MigrationError)
  })
  it('rechaza números duplicados', () => {
    assert.throws(() => migrationFiles(['0001_a.sql', '0001_b.sql']), /duplicado/)
  })
})

describe('pendientes', () => {
  const all = migrationFiles(['0001_a.sql', '0002_b.sql'])
  it('devuelve las no aplicadas, en orden', () => {
    assert.deepEqual(pendingMigrations(all, []).map((m) => m.file), ['0001_a.sql', '0002_b.sql'])
    assert.deepEqual(pendingMigrations(all, ['0001_a.sql']).map((m) => m.file), ['0002_b.sql'])
  })
  it('falla si la base registra una migración que no está en el repositorio (R-23)', () => {
    assert.throws(() => pendingMigrations(all, ['0001_a.sql', '0003_borrada.sql']), /0003_borrada/)
  })
})

describe('migraciones del repositorio', () => {
  it('toda migración tiene su reversa en down/', () => {
    const up = migrationFiles(readdirSync(MIGRATIONS_DIR)).map((m) => m.file)
    const downs = readdirSync(join(MIGRATIONS_DIR, 'down'))
    assert.ok(up.length > 0)
    assert.deepEqual(up.filter((f) => !downs.includes(f)), [])
  })
})
