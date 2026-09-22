// Fixtures sintéticas únicamente: nunca datos reales del lote. Corre contra Postgres
// real (R-26) y revierte su transacción al terminar.
//
// Cubre el hallazgo de la revisión ciega de T-0013 (2026-09-22, R-33): "vacío" y
// "ausente" en Número de póliza deben tratarse igual entre la agrupación de duplicados y
// el insert real, y el insert nunca debe fusionar dos filas de origen distintas bajo
// `on conflict ... do update`. Los cuatro casos mínimos que pidió el owner: número
// ausente, número vacío-pero-presente, dos filas con el mismo número, y dos filas con
// número vacío bajo la misma aseguradora.

import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { after, describe, it } from 'node:test'

import postgres from 'postgres'

import { CAMPOS_POLIZA } from './zoho-fields.ts'
import { importarPolizas } from './policies.ts'

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
  throw new Error('DATABASE_URL no está configurada: policies.ts se verifica contra PostgreSQL real.')
}

const sql = postgres(databaseUrl, { max: 3 })

class Rollback extends Error {}

/** Deja armado: un Insurer sintético, una Party ORGANIZATION vinculada como holder, y un batch. */
const armarFixtureBase = async (
  tx: postgres.TransactionSql,
): Promise<{ batchId: string; insurerId: string; insurerSourceId: string; holderPartyId: string; accountSourceId: string }> => {
  const insurerSourceId = 'PROV-TEST-001'
  const [insurerParty] = await tx<{ id: string }[]>`
    insert into party (kind, display_name_cache) values ('ORGANIZATION', 'Aseguradora Sintética') returning id
  `
  if (insurerParty === undefined) throw new Error('fixture: no se pudo crear party de insurer')
  const [insurer] = await tx<{ id: string }[]>`
    insert into insurer (organization_party_id, canonical_name) values (${insurerParty.id}, 'Aseguradora Sintética') returning id
  `
  if (insurer === undefined) throw new Error('fixture: no se pudo crear insurer')

  const accountSourceId = 'CTA-TEST-001'
  const [holderParty] = await tx<{ id: string }[]>`
    insert into party (kind, display_name_cache) values ('ORGANIZATION', 'Cuenta Sintética') returning id
  `
  if (holderParty === undefined) throw new Error('fixture: no se pudo crear party de holder')
  await tx`
    insert into party_source_link (source_system, source_entity_type, source_record_id, party_id)
    values ('Zoho', 'Cuentas', ${accountSourceId}, ${holderParty.id})
  `

  const [batch] = await tx<{ id: string }[]>`
    insert into staging_import_batch (source_manifest_sha256, notes) values ('test', 'fixture sintética') returning id
  `
  if (batch === undefined) throw new Error('fixture: no se pudo crear batch')

  return {
    batchId: batch.id,
    insurerId: insurer.id,
    insurerSourceId,
    holderPartyId: holderParty.id,
    accountSourceId,
  }
}

interface FilaSintetica {
  readonly sourceRecordId: string
  readonly numeroDePoliza: string | undefined
  readonly accountSourceId: string
  readonly insurerSourceId: string
}

const insertarStagingPolicy = async (tx: postgres.TransactionSql, batchId: string, fila: FilaSintetica): Promise<void> => {
  const raw: Record<string, string> = {
    [CAMPOS_POLIZA.idDeRegistro]: fila.sourceRecordId,
    [CAMPOS_POLIZA.estado]: 'VIGENTE',
    [CAMPOS_POLIZA.vigenciaInicio]: '2026-01-01',
    [CAMPOS_POLIZA.vigenciaFin]: '2026-12-31',
    [CAMPOS_POLIZA.compania]: 'Aseguradora Sintética',
  }
  if (fila.numeroDePoliza !== undefined) raw[CAMPOS_POLIZA.numeroDePoliza] = fila.numeroDePoliza

  await tx.unsafe(
    `insert into staging_policy (source_record_id, batch_id, account_source_id, insurer_source_id, raw)
     values ($1, $2, $3, $4, $5::jsonb)`,
    [fila.sourceRecordId, batchId, fila.accountSourceId, fila.insurerSourceId, raw],
  )
}

describe('importarPolizas — clasificación de Número de póliza (hallazgo R-33 2026-09-22)', () => {
  after(async () => {
    await sql.end()
  })

  it('número ausente → MISSING_POLICY_NUMBER, no crea Policy', async () => {
    await assert.rejects(
      sql.begin(async (tx) => {
        const base = await armarFixtureBase(tx)
        await insertarStagingPolicy(tx, base.batchId, {
          sourceRecordId: 'POL-AUSENTE',
          numeroDePoliza: undefined,
          accountSourceId: base.accountSourceId,
          insurerSourceId: base.insurerSourceId,
        })

        const mapa = new Map([[base.insurerSourceId, base.insurerId]])
        const resultado = await importarPolizas(tx, base.batchId, mapa)

        assert.equal(resultado.excepciones.MISSING_POLICY_NUMBER, 1)
        assert.equal(resultado.importadas, 0)

        const [policy] = await tx<{ n: number }[]>`select count(*)::int as n from policy where insurer_id = ${base.insurerId}`
        assert.equal(policy?.n, 0)

        throw new Rollback('revertir fixture')
      }),
      Rollback,
    )
  })

  it('número vacío-pero-presente → MISSING_POLICY_NUMBER, no crea Policy (el bug original no lo excluía)', async () => {
    await assert.rejects(
      sql.begin(async (tx) => {
        const base = await armarFixtureBase(tx)
        await insertarStagingPolicy(tx, base.batchId, {
          sourceRecordId: 'POL-VACIO',
          numeroDePoliza: '   ',
          accountSourceId: base.accountSourceId,
          insurerSourceId: base.insurerSourceId,
        })

        const mapa = new Map([[base.insurerSourceId, base.insurerId]])
        const resultado = await importarPolizas(tx, base.batchId, mapa)

        assert.equal(resultado.excepciones.MISSING_POLICY_NUMBER, 1)
        assert.equal(resultado.excepciones.DUPLICATE_INSURER_NUMBER, 0)
        assert.equal(resultado.importadas, 0)

        throw new Rollback('revertir fixture')
      }),
      Rollback,
    )
  })

  it('dos filas con el mismo número de póliza → ambas DUPLICATE_INSURER_NUMBER, ninguna Policy creada', async () => {
    await assert.rejects(
      sql.begin(async (tx) => {
        const base = await armarFixtureBase(tx)
        await insertarStagingPolicy(tx, base.batchId, {
          sourceRecordId: 'POL-DUP-A',
          numeroDePoliza: '999999',
          accountSourceId: base.accountSourceId,
          insurerSourceId: base.insurerSourceId,
        })
        await insertarStagingPolicy(tx, base.batchId, {
          sourceRecordId: 'POL-DUP-B',
          numeroDePoliza: '999999',
          accountSourceId: base.accountSourceId,
          insurerSourceId: base.insurerSourceId,
        })

        const mapa = new Map([[base.insurerSourceId, base.insurerId]])
        const resultado = await importarPolizas(tx, base.batchId, mapa)

        assert.equal(resultado.excepciones.DUPLICATE_INSURER_NUMBER, 2)
        assert.equal(resultado.importadas, 0)

        const [policy] = await tx<{ n: number }[]>`
          select count(*)::int as n from policy where insurer_id = ${base.insurerId} and policy_number = '999999'
        `
        assert.equal(policy?.n, 0)

        throw new Rollback('revertir fixture')
      }),
      Rollback,
    )
  })

  it('dos filas con número vacío y misma aseguradora → ambas MISSING_POLICY_NUMBER, nunca se fusionan en una Policy', async () => {
    await assert.rejects(
      sql.begin(async (tx) => {
        const base = await armarFixtureBase(tx)
        await insertarStagingPolicy(tx, base.batchId, {
          sourceRecordId: 'POL-VACIO-A',
          numeroDePoliza: '',
          accountSourceId: base.accountSourceId,
          insurerSourceId: base.insurerSourceId,
        })
        await insertarStagingPolicy(tx, base.batchId, {
          sourceRecordId: 'POL-VACIO-B',
          numeroDePoliza: '',
          accountSourceId: base.accountSourceId,
          insurerSourceId: base.insurerSourceId,
        })

        const mapa = new Map([[base.insurerSourceId, base.insurerId]])
        const resultado = await importarPolizas(tx, base.batchId, mapa)

        assert.equal(resultado.excepciones.MISSING_POLICY_NUMBER, 2)
        assert.equal(resultado.excepciones.DUPLICATE_INSURER_NUMBER, 0)
        assert.equal(resultado.importadas, 0)

        // Ninguna Policy se creó para ninguna de las dos filas: el bug original permitía
        // que ambas colisionaran en policy_number='' y se fusionaran vía on conflict do
        // update.
        const [policy] = await tx<{ n: number }[]>`
          select count(*)::int as n from policy where insurer_id = ${base.insurerId}
        `
        assert.equal(policy?.n, 0)

        throw new Rollback('revertir fixture')
      }),
      Rollback,
    )
  })

  it('una Policy válida se importa, y una segunda corrida sobre la misma fila reutiliza el mismo id (idempotencia)', async () => {
    await assert.rejects(
      sql.begin(async (tx) => {
        const base = await armarFixtureBase(tx)
        await insertarStagingPolicy(tx, base.batchId, {
          sourceRecordId: 'POL-OK',
          numeroDePoliza: '123456',
          accountSourceId: base.accountSourceId,
          insurerSourceId: base.insurerSourceId,
        })

        const mapa = new Map([[base.insurerSourceId, base.insurerId]])
        const primera = await importarPolizas(tx, base.batchId, mapa)
        assert.equal(primera.importadas, 1)

        const [antes] = await tx<{ id: string }[]>`
          select id from policy where insurer_id = ${base.insurerId} and policy_number = '123456'
        `
        assert.ok(antes)

        const segunda = await importarPolizas(tx, base.batchId, mapa)
        assert.equal(segunda.importadas, 1)

        const [despues] = await tx<{ id: string }[]>`
          select id from policy where insurer_id = ${base.insurerId} and policy_number = '123456'
        `
        assert.equal(despues?.id, antes.id)

        const [total] = await tx<{ n: number }[]>`select count(*)::int as n from policy where insurer_id = ${base.insurerId}`
        assert.equal(total?.n, 1)

        throw new Rollback('revertir fixture')
      }),
      Rollback,
    )
  })
})
