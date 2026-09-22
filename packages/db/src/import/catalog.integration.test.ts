// Fixture sintética únicamente: un catálogo de aseguradoras fabricado en un archivo
// temporal, nunca el catalog-curation-approved-20260919.local.json real. Corre contra
// Postgres real (R-26) y revierte su transacción al terminar.

import assert from 'node:assert/strict'
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { after, describe, it } from 'node:test'

import postgres from 'postgres'

import { importarCatalogoAseguradoras } from './catalog.ts'

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
  throw new Error('DATABASE_URL no está configurada: catalog.ts se verifica contra PostgreSQL real.')
}

const sql = postgres(databaseUrl, { max: 3 })

class Rollback extends Error {}

const CATALOGO_SINTETICO = {
  status: 'test',
  existing_suppliers_retained: [
    { source_id: 'SUP-EXISTENTE-1', nombre: 'Aseguradora Existente Uno', tipo_propuesto: 'ASEGURADORA' },
    { source_id: 'SUP-NO-ASEGURADORA', nombre: 'No Es Aseguradora', tipo_propuesto: 'OTRO' },
  ],
  exact_import_mapping: [
    {
      module: 'Proveedores',
      source_id: 'SUP-NUEVA-1',
      observed_label_exact: 'Aseguradora Nueva Aprobada',
      planned_target_reference: 'APPROVED_NEW:PROV-TEST-01',
      disposition: 'NEW_ENTITY',
      human_approved: true,
    },
    {
      module: 'Proveedores',
      source_id: 'SUP-MISMA-1',
      observed_label_exact: 'Alias De La Existente Uno',
      planned_target_reference: 'EXISTING_SOURCE:SUP-EXISTENTE-1',
      disposition: 'SAME_ENTITY',
      human_approved: true,
    },
  ],
}

describe('importarCatalogoAseguradoras', () => {
  const directorio = mkdtempSync(join(tmpdir(), 't0013-catalog-'))
  const rutaCatalogo = join(directorio, 'catalogo-sintetico.json')
  writeFileSync(rutaCatalogo, JSON.stringify(CATALOGO_SINTETICO))

  after(async () => {
    rmSync(directorio, { recursive: true, force: true })
    await sql.end()
  })

  it('crea un Insurer por aseguradora existente y por NEW_ENTITY, resuelve SAME_ENTITY al mismo id, filtra tipo_propuesto != ASEGURADORA', async () => {
    await assert.rejects(
      sql.begin(async (tx) => {
        // La base ya tiene aseguradoras de la corrida real sobre el lote (D-0053); se
        // mide la DIFERENCIA que produce esta fixture, no el conteo absoluto.
        const [antes] = await tx<{ n: number }[]>`select count(*)::int as n from insurer`

        const mapa = await importarCatalogoAseguradoras(tx, rutaCatalogo)

        assert.equal(mapa.size, 3)
        const idExistente = mapa.get('SUP-EXISTENTE-1')
        const idNueva = mapa.get('SUP-NUEVA-1')
        const idMisma = mapa.get('SUP-MISMA-1')

        assert.ok(idExistente)
        assert.ok(idNueva)
        assert.notEqual(idExistente, idNueva)
        // SAME_ENTITY resuelve al MISMO insurer que su destino, no crea uno nuevo.
        assert.equal(idMisma, idExistente)
        // El source_id no-ASEGURADORA no entra al mapa.
        assert.equal(mapa.has('SUP-NO-ASEGURADORA'), false)

        const [despues] = await tx<{ n: number }[]>`select count(*)::int as n from insurer`
        assert.equal((despues?.n ?? 0) - (antes?.n ?? 0), 2)

        throw new Rollback('revertir fixture')
      }),
      Rollback,
    )
  })

  it('correr dos veces sobre el mismo catálogo no duplica Insurer ni InsurerAlias', async () => {
    await assert.rejects(
      sql.begin(async (tx) => {
        const [antesInsurer] = await tx<{ n: number }[]>`select count(*)::int as n from insurer`
        const [antesAlias] = await tx<{ n: number }[]>`select count(*)::int as n from insurer_alias`

        const primera = await importarCatalogoAseguradoras(tx, rutaCatalogo)
        const segunda = await importarCatalogoAseguradoras(tx, rutaCatalogo)

        assert.equal(primera.size, segunda.size)
        for (const [sourceId, insurerId] of primera) {
          assert.equal(segunda.get(sourceId), insurerId)
        }

        const [despuesInsurer] = await tx<{ n: number }[]>`select count(*)::int as n from insurer`
        const [despuesAlias] = await tx<{ n: number }[]>`select count(*)::int as n from insurer_alias`
        assert.equal((despuesInsurer?.n ?? 0) - (antesInsurer?.n ?? 0), 2)
        assert.equal((despuesAlias?.n ?? 0) - (antesAlias?.n ?? 0), 2)

        throw new Rollback('revertir fixture')
      }),
      Rollback,
    )
  })
})
