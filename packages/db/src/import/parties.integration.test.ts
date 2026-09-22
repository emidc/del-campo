// Fixtures sintéticas únicamente: filas de staging_contact/staging_account fabricadas
// en la transacción de cada test, nunca el lote real. Corre contra Postgres real (R-26)
// y revierte su transacción al terminar.

import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { after, describe, it } from 'node:test'

import postgres from 'postgres'

import { CAMPOS_CONTACTO, CAMPOS_CUENTA } from './zoho-fields.ts'
import { importarContactos, importarCuentas, importarMembresias } from './parties.ts'

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
  throw new Error('DATABASE_URL no está configurada: parties.ts se verifica contra PostgreSQL real.')
}

const sql = postgres(databaseUrl, { max: 3 })

class Rollback extends Error {}

const insertarBatch = async (tx: postgres.TransactionSql): Promise<string> => {
  const [batch] = await tx<{ id: string }[]>`
    insert into staging_import_batch (source_manifest_sha256, notes) values ('test', 'fixture sintética') returning id
  `
  if (batch === undefined) throw new Error('fixture: no se pudo crear batch')
  return batch.id
}

const insertarStagingContact = async (
  tx: postgres.TransactionSql,
  batchId: string,
  sourceRecordId: string,
  raw: Record<string, string>,
  accountSourceId: string | null,
): Promise<void> => {
  await tx.unsafe(
    `insert into staging_contact (source_record_id, batch_id, account_source_id, raw) values ($1, $2, $3, $4::jsonb)`,
    [sourceRecordId, batchId, accountSourceId, raw],
  )
}

const insertarStagingAccount = async (
  tx: postgres.TransactionSql,
  batchId: string,
  sourceRecordId: string,
  raw: Record<string, string>,
): Promise<void> => {
  await tx.unsafe(`insert into staging_account (source_record_id, batch_id, raw) values ($1, $2, $3::jsonb)`, [
    sourceRecordId,
    batchId,
    raw,
  ])
}

describe('importarContactos / importarCuentas / importarMembresias', () => {
  after(async () => {
    await sql.end()
  })

  it('crea Party+profile+ContactPoint para un Contacto sintético, e idempotente en una segunda corrida', async () => {
    await assert.rejects(
      sql.begin(async (tx) => {
        const batchId = await insertarBatch(tx)
        await insertarStagingContact(
          tx,
          batchId,
          'CONT-TEST-001',
          {
            [CAMPOS_CONTACTO.idDeRegistro]: 'CONT-TEST-001',
            [CAMPOS_CONTACTO.nombre]: 'Nombre',
            [CAMPOS_CONTACTO.apellidos]: 'Apellido',
            [CAMPOS_CONTACTO.correoElectronico]: 'sintetico@example.test',
            [CAMPOS_CONTACTO.telefono]: '+54 11 5555-0000',
          },
          null,
        )

        // importarContactos procesa TODA staging_contact, no sólo la fixture: la base ya
        // trae las filas reales de la corrida sobre el lote (D-0053). Se verifica que
        // procesó al menos la nuestra, y el resto de las aserciones son específicas al
        // party_id de esta fixture, no al conteo total.
        const primera = await importarContactos(tx)
        assert.ok(primera >= 1)

        const [vinculo] = await tx<{ party_id: string }[]>`
          select party_id from party_source_link
          where source_system = 'Zoho' and source_entity_type = 'Contactos' and source_record_id = 'CONT-TEST-001'
        `
        assert.ok(vinculo)

        const [profile] = await tx<{ first_name: string; last_name: string }[]>`
          select first_name, last_name from person_profile where party_id = ${vinculo.party_id}
        `
        assert.ok(profile)
        assert.equal(profile.first_name, 'Nombre')
        assert.equal(profile.last_name, 'Apellido')

        const contactPoints = await tx<{ channel: string }[]>`
          select channel from contact_point where party_id = ${vinculo.party_id} order by channel
        `
        assert.deepEqual(
          contactPoints.map((f) => f.channel),
          ['EMAIL', 'PHONE'],
        )

        // Segunda corrida sobre la misma fila: mismo party_id, sin duplicar ContactPoint.
        const segunda = await importarContactos(tx)
        assert.equal(segunda, primera)

        const [mismoVinculo] = await tx<{ party_id: string }[]>`
          select party_id from party_source_link
          where source_system = 'Zoho' and source_entity_type = 'Contactos' and source_record_id = 'CONT-TEST-001'
        `
        assert.equal(mismoVinculo?.party_id, vinculo.party_id)

        const [conteoCp] = await tx<{ n: number }[]>`
          select count(*)::int as n from contact_point where party_id = ${vinculo.party_id}
        `
        assert.equal(conteoCp?.n, 2)

        throw new Rollback('revertir fixture')
      }),
      Rollback,
    )
  })

  it('vincula Contacto↔Cuenta vía OrganizationMembership, y una segunda corrida no duplica la membresía', async () => {
    await assert.rejects(
      sql.begin(async (tx) => {
        const batchId = await insertarBatch(tx)
        await insertarStagingAccount(tx, batchId, 'CTA-TEST-001', {
          [CAMPOS_CUENTA.idDeRegistro]: 'CTA-TEST-001',
          [CAMPOS_CUENTA.nombreDeCuenta]: 'Cuenta Sintética SA',
        })
        await insertarStagingContact(
          tx,
          batchId,
          'CONT-TEST-002',
          {
            [CAMPOS_CONTACTO.idDeRegistro]: 'CONT-TEST-002',
            [CAMPOS_CONTACTO.nombre]: 'Otro',
            [CAMPOS_CONTACTO.apellidos]: 'Contacto',
          },
          'CTA-TEST-001',
        )

        await importarCuentas(tx)
        await importarContactos(tx)

        const primera = await importarMembresias(tx)
        assert.equal(primera, 1)

        const segunda = await importarMembresias(tx)
        assert.equal(segunda, 0)

        const [vinculoCuenta] = await tx<{ party_id: string }[]>`
          select party_id from party_source_link
          where source_system = 'Zoho' and source_entity_type = 'Cuentas' and source_record_id = 'CTA-TEST-001'
        `
        assert.ok(vinculoCuenta)
        const [conteo] = await tx<{ n: number }[]>`
          select count(*)::int as n from organization_membership where organization_party_id = ${vinculoCuenta.party_id}
        `
        assert.equal(conteo?.n, 1)

        throw new Rollback('revertir fixture')
      }),
      Rollback,
    )
  })
})
