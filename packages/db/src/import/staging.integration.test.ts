// Fixture sintética únicamente: nunca datos reales. Corre contra Postgres real (R-26) y
// revierte su transacción al terminar.
//
// Regresión concreta que este archivo existe para atrapar: `raw` se guardó una vez como
// un string jsonb doblemente codificado (`jsonb_typeof(raw) = 'string'`, con el JSON
// entero escapado adentro) en vez de un objeto, porque el placeholder del INSERT no
// tenía `::jsonb`. Cero errores de tipos, cero fallos de constraint — el bug sólo se
// notaba al leer un campo del `raw` y obtener `undefined` en silencio para todas las
// filas. Ese modo de falla es exactamente el que una prueba de tipo, no de contenido,
// puede atrapar antes de correr contra el lote real.

import assert from 'node:assert/strict'
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { after, describe, it } from 'node:test'

import postgres from 'postgres'

import { cargarCuentas } from './staging.ts'

const RAIZ = join(import.meta.dirname, '..', '..', '..', '..')

const leerEnv = (): Record<string, string> => {
  const archivo = join(RAIZ, '.env')
  if (!existsSync(archivo)) return {}
  const pares: Record<string, string> = {}
  for (const linea of readFileSync(archivo, 'utf8').split('\n')) {
    const limpia = linea.trim()
    if (limpia === '' || limpia.startsWith('#')) continue
    const corte = limpia.indexOf('=')
    if (corte === -1) continue
    pares[limpia.slice(0, corte).trim()] = limpia.slice(corte + 1).trim()
  }
  return pares
}

const databaseUrl = process.env.DATABASE_URL ?? leerEnv().DATABASE_URL
if (databaseUrl === undefined || databaseUrl === '') {
  throw new Error('DATABASE_URL no está configurada: staging.ts se verifica contra PostgreSQL real.')
}

const sql = postgres(databaseUrl, { max: 3 })

class Rollback extends Error {}

describe('cargarCuentas', () => {
  after(async () => {
    await sql.end()
  })

  it('guarda `raw` como objeto jsonb, no como string doblemente codificado', async () => {
    const directorio = mkdtempSync(join(tmpdir(), 't0013-staging-'))
    try {
      writeFileSync(
        join(directorio, 'sintetico.csv'),
        'ID de registro,Nombre de Cuenta,CUIT,Teléfono\nSINT-001,Cuenta Sintética SA,20111111112,+54 11 0000-0000\n',
      )

      await assert.rejects(
        sql.begin(async (tx) => {
          const [batch] = await tx<{ id: string }[]>`
            insert into staging_import_batch (source_manifest_sha256, notes)
            values ('test', 'fixture sintética') returning id
          `
          if (batch === undefined) throw new Error('no se pudo crear batch de prueba')

          const conteo = await cargarCuentas(tx, batch.id, join(directorio, 'sintetico.csv'))
          assert.equal(conteo, 1)

          const [tipo] = await tx<{ t: string }[]>`
            select jsonb_typeof(raw) as t from staging_account where source_record_id = 'SINT-001'
          `
          assert.equal(tipo?.t, 'object')

          const [valor] = await tx<{ nombre: string | null }[]>`
            select raw ->> 'Nombre de Cuenta' as nombre from staging_account where source_record_id = 'SINT-001'
          `
          assert.equal(valor?.nombre, 'Cuenta Sintética SA')

          throw new Rollback('revertir la fixture')
        }),
        Rollback,
      )
    } finally {
      rmSync(directorio, { recursive: true, force: true })
    }
  })
})
