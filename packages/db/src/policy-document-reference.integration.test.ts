// T-0019: asociación documental específica entre ExternalReference y Policy.
// Sólo fixtures sintéticas; cada caso corre en una transacción revertida (R-19/R-26).

import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { after, describe, it } from 'node:test'

import postgres from 'postgres'

const ROOT = resolve(import.meta.dirname, '..', '..', '..')
const UP_SQL = readFileSync(
  join(ROOT, 'packages', 'db', 'migrations', '0002_policy_document_reference.sql'),
  'utf8',
)
const DOWN_SQL = readFileSync(
  join(ROOT, 'packages', 'db', 'migrations', 'down', '0002_policy_document_reference.sql'),
  'utf8',
)

const readEnv = (): Record<string, string> => {
  const path = join(ROOT, '.env')
  if (!existsSync(path)) return {}
  const pairs: Record<string, string> = {}
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const trimmed = line.trim()
    if (trimmed === '' || trimmed.startsWith('#')) continue
    const separator = trimmed.indexOf('=')
    if (separator === -1) continue
    pairs[trimmed.slice(0, separator).trim()] = trimmed.slice(separator + 1).trim()
  }
  return pairs
}

const databaseUrl = process.env.DATABASE_URL ?? readEnv().DATABASE_URL
if (databaseUrl === undefined || databaseUrl === '') {
  throw new Error('DATABASE_URL no está configurada: T-0019 requiere PostgreSQL real.')
}

const sql = postgres(databaseUrl, { max: 5 })

class Rollback extends Error {}

const inRollbackTransaction = async <T>(
  action: (tx: postgres.TransactionSql) => Promise<T>,
): Promise<T> => {
  let result: T | undefined
  try {
    await sql.begin(async (tx) => {
      result = await action(tx)
      throw new Rollback('discard synthetic fixture')
    })
  } catch (error) {
    if (!(error instanceof Rollback)) throw error
  }
  return result as T
}

interface IdRow {
  readonly id: string
}

const one = <T>(rows: readonly T[], context: string): T => {
  const row = rows[0]
  if (row === undefined) throw new Error(`expected one row: ${context}`)
  return row
}

const createOrganization = async (tx: postgres.TransactionSql, name: string): Promise<string> => {
  const party = one(
    await tx<IdRow[]>`insert into party (kind) values ('ORGANIZATION') returning id`,
    'synthetic organization party',
  )
  await tx`insert into organization_profile (party_id, legal_name) values (${party.id}, ${name})`
  return party.id
}

const createPolicy = async (tx: postgres.TransactionSql, number: string): Promise<string> => {
  const organizationId = await createOrganization(tx, `Aseguradora Sintetica ${number}`)
  const insurer = one(
    await tx<IdRow[]>`
      insert into insurer (organization_party_id, canonical_name)
      values (${organizationId}, ${`Aseguradora Sintetica ${number}`})
      returning id
    `,
    'synthetic insurer',
  )
  return one(
    await tx<IdRow[]>`
      insert into policy (insurer_id, policy_number)
      values (${insurer.id}, ${number})
      returning id
    `,
    'synthetic policy',
  ).id
}

const createExternalReference = async (
  tx: postgres.TransactionSql,
  suffix: string,
  state: 'UNRESOLVED' | 'RESOLVED' = 'UNRESOLVED',
  relationType = 'POLICY_DOCUMENT',
): Promise<string> => {
  const resolvedTargetId = state === 'RESOLVED' ? 'f9000000-0000-4000-8000-000000000001' : null
  return one(
    await tx<IdRow[]>`
      insert into external_reference (
        source_system, source_entity_type, source_external_id, source_value,
        relation_type, resolution_status, unresolved_reason,
        resolved_target_type, resolved_target_id
      ) values (
        'fixture', 'SyntheticDocument', ${`DOC-${suffix}`}, ${`Documento Sintetico ${suffix}`},
        ${relationType}, ${state},
        ${state === 'UNRESOLVED' ? 'MOTIVO_SINTETICO_NO_RESUELTO' : null},
        ${state === 'RESOLVED' ? 'DRIVE_DOCUMENT' : null}, ${resolvedTargetId}
      ) returning id
    `,
    'synthetic external reference',
  ).id
}

const forceDeferredConstraints = async (tx: postgres.TransactionSql): Promise<void> => {
  await tx`set constraints all immediate`
}

after(async () => {
  await sql.end()
})

describe('policy_document_reference — pertenencia separada del destino', () => {
  it('asocia una referencia no resuelta y conserva origen y motivo sin fabricar destino', async () => {
    await inRollbackTransaction(async (tx) => {
      const policyId = await createPolicy(tx, 'POL-SINTETICA-ASOC-001')
      const externalReferenceId = await createExternalReference(tx, '001')

      await tx`
        insert into policy_document_reference (external_reference_id, policy_id)
        values (${externalReferenceId}, ${policyId})
      `
      await forceDeferredConstraints(tx)

      const rows = await tx<{
        policy_id: string
        source_external_id: string
        unresolved_reason: string
        resolved_target_id: string | null
      }[]>`
        select
          pdr.policy_id,
          er.source_external_id,
          er.unresolved_reason,
          er.resolved_target_id
        from policy_document_reference pdr
        join external_reference er on er.id = pdr.external_reference_id
        where pdr.external_reference_id = ${externalReferenceId}
      `

      assert.deepEqual(one(rows, 'unresolved documentary association'), {
        policy_id: policyId,
        source_external_id: 'DOC-001',
        unresolved_reason: 'MOTIVO_SINTETICO_NO_RESUELTO',
        resolved_target_id: null,
      })
    })
  })

  it('mantiene Policy de pertenencia y destino resuelto como ejes distintos', async () => {
    await inRollbackTransaction(async (tx) => {
      const policyId = await createPolicy(tx, 'POL-SINTETICA-ASOC-002')
      const externalReferenceId = await createExternalReference(tx, '002', 'RESOLVED')

      await tx`
        insert into policy_document_reference (external_reference_id, policy_id)
        values (${externalReferenceId}, ${policyId})
      `
      await forceDeferredConstraints(tx)

      const rows = await tx<{ policy_id: string; resolved_target_id: string }[]>`
        select pdr.policy_id, er.resolved_target_id
        from policy_document_reference pdr
        join external_reference er on er.id = pdr.external_reference_id
        where pdr.external_reference_id = ${externalReferenceId}
      `
      const row = one(rows, 'resolved documentary association')
      assert.equal(row.policy_id, policyId)
      assert.equal(row.resolved_target_id, 'f9000000-0000-4000-8000-000000000001')
      assert.notEqual(row.policy_id, row.resolved_target_id)
    })
  })

  it('rechaza una segunda Policy de pertenencia para la misma referencia', async () => {
    await inRollbackTransaction(async (tx) => {
      const firstPolicyId = await createPolicy(tx, 'POL-SINTETICA-ASOC-003-A')
      const secondPolicyId = await createPolicy(tx, 'POL-SINTETICA-ASOC-003-B')
      const externalReferenceId = await createExternalReference(tx, '003')
      await tx`
        insert into policy_document_reference (external_reference_id, policy_id)
        values (${externalReferenceId}, ${firstPolicyId})
      `

      await assert.rejects(
        tx`
          insert into policy_document_reference (external_reference_id, policy_id)
          values (${externalReferenceId}, ${secondPolicyId})
        `,
        /policy_document_reference_external_reference_pk/i,
      )
    })
  })

  it('rechaza al confirmar una referencia documental sin Policy de pertenencia', async () => {
    await assert.rejects(
      sql.begin(async (tx) => {
        await createExternalReference(tx, 'SIN-PERTENENCIA')
      }),
      /POLICY_DOCUMENT requiere exactamente una Policy de pertenencia/i,
    )
  })

  it('rechaza asociar una referencia que no es documental', async () => {
    await inRollbackTransaction(async (tx) => {
      const policyId = await createPolicy(tx, 'POL-SINTETICA-ASOC-NO-DOC')
      const externalReferenceId = await createExternalReference(
        tx,
        'NO-DOCUMENTAL',
        'UNRESOLVED',
        'RENEWED_FROM_POLICY',
      )

      await assert.rejects(
        tx`
          insert into policy_document_reference (external_reference_id, policy_id)
          values (${externalReferenceId}, ${policyId})
        `,
        /external_reference debe tener relation_type POLICY_DOCUMENT/i,
      )
    })
  })

  it('rechaza borrar la pertenencia mientras la referencia documental exista', async () => {
    await assert.rejects(
      sql.begin(async (tx) => {
        const policyId = await createPolicy(tx, 'POL-SINTETICA-ASOC-BORRADO')
        const externalReferenceId = await createExternalReference(tx, 'BORRADO')
        await tx`
          insert into policy_document_reference (external_reference_id, policy_id)
          values (${externalReferenceId}, ${policyId})
        `
        await tx`
          delete from policy_document_reference
          where external_reference_id = ${externalReferenceId}
        `
      }),
      /POLICY_DOCUMENT requiere exactamente una Policy de pertenencia/i,
    )
  })

  it('rechaza una ExternalReference inexistente', async () => {
    await inRollbackTransaction(async (tx) => {
      const policyId = await createPolicy(tx, 'POL-SINTETICA-ASOC-004')

      await assert.rejects(
        tx`
          insert into policy_document_reference (external_reference_id, policy_id)
          values ('f8000000-0000-4000-8000-000000000001', ${policyId})
        `,
        /policy_document_reference_external_reference_fk/i,
      )
    })
  })

  it('rechaza una Policy inexistente', async () => {
    await inRollbackTransaction(async (tx) => {
      const externalReferenceId = await createExternalReference(tx, '004')

      await assert.rejects(
        tx`
          insert into policy_document_reference (external_reference_id, policy_id)
          values (${externalReferenceId}, 'f8000000-0000-4000-8000-000000000002')
        `,
        /policy_document_reference_policy_fk/i,
      )
    })
  })

  it('impide borrar la Policy mientras exista la asociacion', async () => {
    await inRollbackTransaction(async (tx) => {
      const policyId = await createPolicy(tx, 'POL-SINTETICA-ASOC-005')
      const externalReferenceId = await createExternalReference(tx, '005')
      await tx`
        insert into policy_document_reference (external_reference_id, policy_id)
        values (${externalReferenceId}, ${policyId})
      `

      await assert.rejects(
        tx`delete from policy where id = ${policyId}`,
        /policy_document_reference_policy_fk/i,
      )
    })
  })

  it('impide borrar la ExternalReference mientras exista la asociacion', async () => {
    await inRollbackTransaction(async (tx) => {
      const policyId = await createPolicy(tx, 'POL-SINTETICA-ASOC-006')
      const externalReferenceId = await createExternalReference(tx, '006')
      await tx`
        insert into policy_document_reference (external_reference_id, policy_id)
        values (${externalReferenceId}, ${policyId})
      `

      await assert.rejects(
        tx`delete from external_reference where id = ${externalReferenceId}`,
        /policy_document_reference_external_reference_fk/i,
      )
    })
  })
})

describe('causalidad de las restricciones nuevas', () => {
  it('sin el constraint trigger, una referencia documental puede quedar sin pertenencia', async () => {
    const count = await inRollbackTransaction(async (tx) => {
      await tx`drop trigger external_reference_document_policy_total on external_reference`
      await createExternalReference(tx, 'CAUSA-SIN-PERTENENCIA')
      await forceDeferredConstraints(tx)
      const rows = await tx<{ total: number }[]>`
        select count(*)::int as total
        from external_reference
        where source_external_id = 'DOC-CAUSA-SIN-PERTENENCIA'
      `
      return one(rows, 'documentary reference without association').total
    })
    assert.equal(count, 1)
  })

  it('sin los triggers de tipo, una asociacion acepta una referencia no documental', async () => {
    const count = await inRollbackTransaction(async (tx) => {
      const policyId = await createPolicy(tx, 'POL-SINTETICA-CAUSA-NO-DOC')
      const externalReferenceId = await createExternalReference(
        tx,
        'CAUSA-NO-DOC',
        'UNRESOLVED',
        'RENEWED_FROM_POLICY',
      )
      await tx`drop trigger policy_document_reference_document_kind on policy_document_reference`
      await tx`drop trigger policy_document_reference_total on policy_document_reference`
      await tx`drop trigger external_reference_document_policy_total on external_reference`
      await tx`
        insert into policy_document_reference (external_reference_id, policy_id)
        values (${externalReferenceId}, ${policyId})
      `
      await forceDeferredConstraints(tx)
      const rows = await tx<{ total: number }[]>`
        select count(*)::int as total
        from policy_document_reference
        where external_reference_id = ${externalReferenceId}
      `
      return one(rows, 'non-documentary association').total
    })
    assert.equal(count, 1)
  })

  it('sin la PK, una referencia puede pertenecer a dos Policies', async () => {
    const count = await inRollbackTransaction(async (tx) => {
      const firstPolicyId = await createPolicy(tx, 'POL-SINTETICA-CAUSA-001-A')
      const secondPolicyId = await createPolicy(tx, 'POL-SINTETICA-CAUSA-001-B')
      const externalReferenceId = await createExternalReference(tx, 'CAUSA-001')
      await tx`alter table policy_document_reference drop constraint policy_document_reference_external_reference_pk`
      await tx`
        insert into policy_document_reference (external_reference_id, policy_id)
        values (${externalReferenceId}, ${firstPolicyId}), (${externalReferenceId}, ${secondPolicyId})
      `
      const rows = await tx<{ total: number }[]>`
        select count(*)::int as total
        from policy_document_reference
        where external_reference_id = ${externalReferenceId}
      `
      return one(rows, 'duplicate association count').total
    })
    assert.equal(count, 2)
  })

  it('sin las FKs, acepta ambos extremos inexistentes', async () => {
    const count = await inRollbackTransaction(async (tx) => {
      await tx`alter table policy_document_reference drop constraint policy_document_reference_external_reference_fk`
      await tx`alter table policy_document_reference drop constraint policy_document_reference_policy_fk`
      await tx`
        insert into policy_document_reference (external_reference_id, policy_id)
        values (
          'f7000000-0000-4000-8000-000000000001',
          'f7000000-0000-4000-8000-000000000002'
        )
      `
      const rows = await tx<{ total: number }[]>`
        select count(*)::int as total from policy_document_reference
      `
      return one(rows, 'orphan association count').total
    })
    assert.equal(count, 1)
  })
})

describe('reversibilidad de 0002', () => {
  it('el up rechaza referencias documentales preexistentes que no puede asociar', async () => {
    await inRollbackTransaction(async (tx) => {
      await tx.unsafe(DOWN_SQL)
      await createExternalReference(tx, 'PREEXISTENTE-SIN-PERTENENCIA')

      await assert.rejects(
        tx.unsafe(UP_SQL),
        /existen referencias POLICY_DOCUMENT sin Policy de pertenencia/i,
      )
    })
  })

  it('el down elimina la estructura vacia y el rollback del test la restaura', async () => {
    const tableAfterDown = await inRollbackTransaction(async (tx) => {
      await tx.unsafe(DOWN_SQL)
      const rows = await tx<{ table_name: string | null }[]>`
        select to_regclass('public.policy_document_reference')::text as table_name
      `
      return one(rows, 'table after down').table_name
    })
    assert.equal(tableAfterDown, null)
  })

  it('el down rechaza borrar asociaciones existentes', async () => {
    await inRollbackTransaction(async (tx) => {
      const policyId = await createPolicy(tx, 'POL-SINTETICA-DOWN-001')
      const externalReferenceId = await createExternalReference(tx, 'DOWN-001')
      await tx`
        insert into policy_document_reference (external_reference_id, policy_id)
        values (${externalReferenceId}, ${policyId})
      `
      await forceDeferredConstraints(tx)

      await assert.rejects(
        tx.unsafe(DOWN_SQL),
        /no se puede revertir con asociaciones existentes/i,
      )
    })
  })
})
