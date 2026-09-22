// T-0016: consultas internas de VS01 contra PostgreSQL real (R-26).
// Todas las fixtures son sintéticas y cada caso se revierte al terminar (R-19).

import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { after, describe, it } from 'node:test'

import postgres from 'postgres'

import { getPartyOverview, getPolicyDetail, searchPolicies } from './policy-query.ts'

const ROOT = resolve(import.meta.dirname, '..', '..', '..')
const AS_OF = '2026-09-21'
const MEMBERSHIP_AT = '2026-09-21T12:00:00Z'

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
  throw new Error(
    'DATABASE_URL no está configurada: las consultas de T-0016 se verifican contra PostgreSQL real.',
  )
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

interface Fixture {
  readonly organizationId: string
  readonly personOneId: string
  readonly policyOneId: string
  readonly policyTwoId: string
  readonly policyWithoutDocumentId: string
}

const createPerson = async (
  tx: postgres.TransactionSql,
  firstName: string,
  lastName: string,
  dni: string,
): Promise<string> => {
  const party = one(await tx<IdRow[]>`insert into party (kind) values ('PERSON') returning id`, 'person party')
  await tx`
    insert into person_profile (party_id, first_name, last_name, dni)
    values (${party.id}, ${firstName}, ${lastName}, ${dni})
  `
  return party.id
}

const createOrganization = async (
  tx: postgres.TransactionSql,
  legalName: string,
  tradeName: string,
  cuit: string,
): Promise<string> => {
  const party = one(
    await tx<IdRow[]>`insert into party (kind) values ('ORGANIZATION') returning id`,
    'organization party',
  )
  await tx`
    insert into organization_profile (party_id, legal_name, trade_name, cuit)
    values (${party.id}, ${legalName}, ${tradeName}, ${cuit})
  `
  return party.id
}

const createInsurer = async (
  tx: postgres.TransactionSql,
  canonicalName: string,
): Promise<string> => {
  const organizationId = await createOrganization(
    tx,
    `${canonicalName} Sociedad Sintética`,
    canonicalName,
    `CUIT-${canonicalName}`,
  )
  return one(
    await tx<IdRow[]>`
      insert into insurer (organization_party_id, canonical_name)
      values (${organizationId}, ${canonicalName})
      returning id
    `,
    'insurer',
  ).id
}

const createPolicy = async (
  tx: postgres.TransactionSql,
  insurerId: string,
  policyNumber: string,
): Promise<string> => one(
  await tx<IdRow[]>`
    insert into policy (insurer_id, policy_number)
    values (${insurerId}, ${policyNumber})
    returning id
  `,
  'policy',
).id

const createFixture = async (tx: postgres.TransactionSql): Promise<Fixture> => {
  const personOneId = await createPerson(tx, 'NombreCompartido', 'ApellidoUno', 'DNI-SINTETICO-001')
  const personTwoId = await createPerson(tx, 'NombreCompartido', 'ApellidoDos', 'DNI-SINTETICO-002')
  const organizationId = await createOrganization(
    tx,
    'Organizacion Sintetica Delta SA',
    'Delta Sintetica',
    'CUIT-SINTETICO-003',
  )

  await tx`
    insert into organization_membership (
      organization_party_id, person_party_id, kind, role_or_position, is_primary,
      valid_from, valid_to
    ) values (
      ${organizationId}, ${personOneId}, 'SYNTHETIC', 'Contacto de prueba', true,
      '2026-09-21T10:00:00Z', '2026-09-21T14:00:00Z'
    )
  `

  const insurerAlphaId = await createInsurer(tx, 'Aseguradora Sintetica Alfa')
  const insurerBetaId = await createInsurer(tx, 'Aseguradora Sintetica Beta')
  await tx`
    insert into insurer_alias (insurer_id, alias, source_system)
    values (${insurerAlphaId}, 'Alias Sintetico Alfa', 'fixture')
  `

  const policyOneId = await createPolicy(tx, insurerAlphaId, 'POL-SINTETICA-001')
  const policyTwoId = await createPolicy(tx, insurerBetaId, 'POL-SINTETICA-002')
  const policyWithoutDocumentId = await createPolicy(tx, insurerAlphaId, 'POL-SINTETICA-003')

  const endorsement = one(
    await tx<IdRow[]>`
      insert into endorsement (
        policy_id, number, kind, effective_from, source_reference
      ) values (
        ${policyOneId}, 'END-SINTETICO-001', 'CAMBIO_SINTETICO', '2026-04-01', 'fixture:end:001'
      ) returning id
    `,
    'endorsement',
  )

  await tx`
    insert into policy_version (
      policy_id, version_number, effective_from, effective_to, holder_party_id,
      term_start_date, term_end_date, renewal_mode, status
    ) values (
      ${policyOneId}, 1, '2026-01-01', '2026-04-01', ${personOneId},
      '2026-01-01', '2027-01-01', 'MANUAL', 'HISTORICA_SINTETICA'
    )
  `
  await tx`
    insert into policy_version (
      policy_id, version_number, effective_from, holder_party_id,
      term_start_date, term_end_date, renewal_mode, status, endorsement_id
    ) values (
      ${policyOneId}, 2, '2026-04-01', ${personOneId},
      '2026-01-01', '2027-01-01', 'MANUAL', 'VIGENTE_SINTETICA', ${endorsement.id}
    )
  `
  await tx`
    insert into policy_version (
      policy_id, version_number, effective_from, holder_party_id,
      term_start_date, term_end_date, renewal_mode, status
    ) values (
      ${policyTwoId}, 1, '2026-01-01', ${personTwoId},
      '2026-01-01', '2027-01-01', 'AUTOMATIC', 'VIGENTE_SINTETICA'
    )
  `
  await tx`
    insert into policy_version (
      policy_id, version_number, effective_from, holder_party_id,
      term_start_date, term_end_date, renewal_mode, status
    ) values (
      ${policyWithoutDocumentId}, 1, '2026-01-01', ${organizationId},
      '2026-01-01', '2027-01-01', 'MANUAL', 'VIGENTE_SINTETICA'
    )
  `

  await tx`
    insert into document_link (
      resource_type, resource_id, drive_file_id, drive_url, drive_item_type,
      document_kind, reconciliation_status
    ) values (
      'POLICY', ${policyOneId}, 'drive-sintetico-001', 'https://example.invalid/synthetic/001',
      'FILE', 'POLIZA_SINTETICA', 'SYNCED'
    )
  `

  const unresolvedDocumentReference = one(
    await tx<IdRow[]>`
      insert into external_reference (
        source_system, source_entity_type, source_external_id, source_value,
        relation_type, resolution_status, unresolved_reason
      ) values (
        'fixture', 'SyntheticDocument', 'DOC-SINTETICO-SIN-VINCULO-002',
        'Documento Sintetico Sin Vinculo 002', 'POLICY_DOCUMENT', 'UNRESOLVED',
        'MOTIVO_SINTETICO_DOCUMENTO_NO_ENCONTRADO'
      ) returning id
    `,
    'unresolved documentary reference',
  )
  await tx`
    insert into policy_document_reference (external_reference_id, policy_id)
    values (${unresolvedDocumentReference.id}, ${policyTwoId})
  `

  return { organizationId, personOneId, policyOneId, policyTwoId, policyWithoutDocumentId }
}

after(async () => {
  await sql.end()
})

describe('searchPolicies — campos de DOMAIN.md §65', () => {
  const cases = [
    ['nombre', { firstName: 'nombrecompartido' }, ['POL-SINTETICA-001', 'POL-SINTETICA-002']],
    ['apellido', { lastName: 'apellidouno' }, ['POL-SINTETICA-001']],
    ['DNI', { dni: 'DNI-SINTETICO-001' }, ['POL-SINTETICA-001']],
    ['CUIT', { cuit: 'CUIT-SINTETICO-003' }, ['POL-SINTETICA-003']],
    ['empresa', { company: 'delta sintetica' }, ['POL-SINTETICA-003']],
    ['numero de poliza', { policyNumber: 'POL-SINTETICA-002' }, ['POL-SINTETICA-002']],
    ['aseguradora', { insurer: 'sintetica alfa' }, ['POL-SINTETICA-001', 'POL-SINTETICA-003']],
    ['alias de aseguradora', { insurer: 'alias sintetico alfa' }, ['POL-SINTETICA-001', 'POL-SINTETICA-003']],
  ] as const

  for (const [field, criteria, expectedPolicyNumbers] of cases) {
    it(`busca por ${field}`, async () => {
      await inRollbackTransaction(async (tx) => {
        await createFixture(tx)
        const result = await searchPolicies(tx, { ...criteria, asOf: AS_OF })

        assert.equal(result.state, 'CANDIDATES')
        assert.deepEqual(
          result.candidates.map((candidate) => candidate.policyNumber).sort(),
          [...expectedPolicyNumbers].sort(),
        )
      })
    })
  }

  it('combina criterios con AND sin convertir una coincidencia parcial en inequívoca', async () => {
    await inRollbackTransaction(async (tx) => {
      await createFixture(tx)
      const result = await searchPolicies(tx, {
        firstName: 'NombreCompartido',
        lastName: 'ApellidoDos',
        asOf: AS_OF,
      })

      assert.equal(result.state, 'CANDIDATES')
      assert.deepEqual(result.candidates.map((candidate) => candidate.policyNumber), ['POL-SINTETICA-002'])
    })
  })

  it('devuelve ausencia explícita y no selecciona nada', async () => {
    await inRollbackTransaction(async (tx) => {
      await createFixture(tx)
      const result = await searchPolicies(tx, { dni: 'DNI-SINTETICO-INEXISTENTE', asOf: AS_OF })

      assert.deepEqual(result, { state: 'NO_RESULTS', candidates: [] })
      assert.equal('selectedPolicyId' in result, false)
    })
  })

  it('conserva todos los candidatos ambiguos y no incluye una seleccion automatica', async () => {
    await inRollbackTransaction(async (tx) => {
      const fixture = await createFixture(tx)
      const result = await searchPolicies(tx, { firstName: 'NombreCompartido', asOf: AS_OF })

      assert.equal(result.state, 'CANDIDATES')
      assert.deepEqual(
        new Set(result.candidates.map((candidate) => candidate.policyId)),
        new Set([fixture.policyOneId, fixture.policyTwoId]),
      )
      assert.equal('selectedPolicyId' in result, false)
    })
  })

  it('la poliza sin document_link sigue en resultados con ausencia documental visible', async () => {
    await inRollbackTransaction(async (tx) => {
      const fixture = await createFixture(tx)
      const result = await searchPolicies(tx, { policyNumber: 'POL-SINTETICA-003', asOf: AS_OF })

      assert.equal(result.state, 'CANDIDATES')
      assert.equal(result.candidates.length, 1)
      const candidate = one(result.candidates, 'policy without document candidate')
      assert.equal(candidate.policyId, fixture.policyWithoutDocumentId)
      assert.deepEqual(candidate.documents, {
        state: 'NO_REFERENCE',
        linkCount: 0,
        referenceCount: 0,
        unresolvedReasons: [],
      })
    })
  })

  it('distingue una referencia conocida no resuelta y conserva su motivo', async () => {
    await inRollbackTransaction(async (tx) => {
      const fixture = await createFixture(tx)
      const result = await searchPolicies(tx, { policyNumber: 'POL-SINTETICA-002', asOf: AS_OF })

      assert.equal(result.state, 'CANDIDATES')
      const candidate = one(result.candidates, 'policy with unresolved document reference')
      assert.equal(candidate.policyId, fixture.policyTwoId)
      assert.deepEqual(candidate.documents, {
        state: 'KNOWN_UNRESOLVED',
        linkCount: 0,
        referenceCount: 1,
        unresolvedReasons: ['MOTIVO_SINTETICO_DOCUMENTO_NO_ENCONTRADO'],
      })
    })
  })
})

describe('detalle e historial — limites de DOMAIN.md §63', () => {
  it('expone versiones y Endorsement, sin entidades fuera del subconjunto VS01', async () => {
    await inRollbackTransaction(async (tx) => {
      const fixture = await createFixture(tx)
      const detail = await getPolicyDetail(tx, fixture.policyOneId, AS_OF)

      assert.ok(detail)
      assert.equal(detail.policyNumber, 'POL-SINTETICA-001')
      assert.equal(detail.currentVersion?.versionNumber, 2)
      assert.deepEqual(detail.history.map((version) => version.versionNumber), [2, 1])
      assert.deepEqual(detail.history[0]?.endorsement, {
        id: detail.history[0]?.endorsement?.id,
        number: 'END-SINTETICO-001',
        kind: 'CAMBIO_SINTETICO',
        effectiveFrom: '2026-04-01',
      })
      assert.equal(detail.documents.length, 1)
      assert.deepEqual(Object.keys(detail).sort(), [
        'currentVersion',
        'documentReferences',
        'documents',
        'history',
        'holder',
        'insurer',
        'policyId',
        'policyNumber',
        'renewedFromPolicyId',
      ])
    })
  })

  it('el detalle de una poliza sin vinculo documental conserva la poliza y devuelve documents vacio', async () => {
    await inRollbackTransaction(async (tx) => {
      const fixture = await createFixture(tx)
      const detail = await getPolicyDetail(tx, fixture.policyWithoutDocumentId, AS_OF)

      assert.ok(detail)
      assert.equal(detail.policyId, fixture.policyWithoutDocumentId)
      assert.deepEqual(detail.documents, [])
      assert.deepEqual(detail.documentReferences, [])
    })
  })

  it('expone origen y motivo de la referencia documental no resuelta sin fabricar destino', async () => {
    await inRollbackTransaction(async (tx) => {
      const fixture = await createFixture(tx)
      const detail = await getPolicyDetail(tx, fixture.policyTwoId, AS_OF)

      assert.ok(detail)
      assert.deepEqual(detail.documents, [])
      assert.equal(detail.documentReferences.length, 1)
      assert.deepEqual(detail.documentReferences[0], {
        id: detail.documentReferences[0]?.id,
        sourceSystem: 'fixture',
        sourceEntityType: 'SyntheticDocument',
        sourceExternalId: 'DOC-SINTETICO-SIN-VINCULO-002',
        sourceValue: 'Documento Sintetico Sin Vinculo 002',
        resolutionStatus: 'UNRESOLVED',
        unresolvedReason: 'MOTIVO_SINTETICO_DOCUMENTO_NO_ENCONTRADO',
        resolvedTargetType: null,
        resolvedTargetId: null,
      })
    })
  })

  it('navega Party -> Policies y la relacion empresa -> contactos de OrganizationMembership', async () => {
    await inRollbackTransaction(async (tx) => {
      const fixture = await createFixture(tx)
      const person = await getPartyOverview(tx, fixture.personOneId, AS_OF, MEMBERSHIP_AT)
      const organization = await getPartyOverview(tx, fixture.organizationId, AS_OF, MEMBERSHIP_AT)

      assert.ok(person)
      assert.deepEqual(person.policies.map((policy) => policy.policyId), [fixture.policyOneId])
      assert.deepEqual(person.organizations.map((membership) => membership.partyId), [fixture.organizationId])

      assert.ok(organization)
      assert.deepEqual(
        organization.policies.map((policy) => policy.policyId),
        [fixture.policyWithoutDocumentId],
      )
      assert.deepEqual(organization.contacts.map((membership) => membership.partyId), [fixture.personOneId])
    })
  })
})

describe('OrganizationMembership — instante zonado y limites [validFrom, validTo)', () => {
  it('incluye el inicio exacto, conserva limites intradia y excluye el fin exacto', async () => {
    await inRollbackTransaction(async (tx) => {
      const fixture = await createFixture(tx)

      const atStart = await getPartyOverview(
        tx,
        fixture.personOneId,
        AS_OF,
        '2026-09-21T10:00:00Z',
      )
      const insideSameDay = await getPartyOverview(
        tx,
        fixture.personOneId,
        AS_OF,
        '2026-09-21T13:59:59.999Z',
      )
      const atEnd = await getPartyOverview(
        tx,
        fixture.personOneId,
        AS_OF,
        '2026-09-21T14:00:00Z',
      )

      assert.deepEqual(atStart?.organizations.map((item) => item.partyId), [fixture.organizationId])
      assert.deepEqual(
        insideSameDay?.organizations.map((item) => item.partyId),
        [fixture.organizationId],
      )
      assert.deepEqual(atEnd?.organizations, [])
    })
  })

  it('trata offsets distintos del mismo instante como la misma consulta', async () => {
    await inRollbackTransaction(async (tx) => {
      const fixture = await createFixture(tx)
      const utc = await getPartyOverview(tx, fixture.personOneId, AS_OF, '2026-09-21T12:00:00Z')
      const offset = await getPartyOverview(
        tx,
        fixture.personOneId,
        AS_OF,
        '2026-09-21T09:00:00-03:00',
      )

      assert.deepEqual(offset?.organizations, utc?.organizations)
    })
  })

  it('rechaza un datetime sin Z ni offset en vez de usar la zona de sesion', async () => {
    await inRollbackTransaction(async (tx) => {
      const fixture = await createFixture(tx)
      await assert.rejects(
        getPartyOverview(tx, fixture.personOneId, AS_OF, '2026-09-21T12:00:00'),
        /must be a valid ISO-8601 instant with Z or an explicit offset/i,
      )
    })
  })
})

describe('Party merge — resolucion canonica transitiva', () => {
  it('resuelve uno y varios saltos sin perder Policies ni duplicar identidades', async () => {
    await inRollbackTransaction(async (tx) => {
      const canonicalId = await createPerson(
        tx,
        'PersonaCanonica',
        'Sintetica',
        'DNI-SINTETICO-CANONICO',
      )
      const middleId = await createPerson(tx, 'AliasIntermedio', 'Sintetico', 'DNI-SINTETICO-MEDIO')
      const loserId = await createPerson(tx, 'AliasInicial', 'Sintetico', 'DNI-SINTETICO-INICIAL')
      const organizationId = await createOrganization(
        tx,
        'Organizacion Canonica Sintetica SA',
        'Organizacion Canonica Sintetica',
        'CUIT-SINTETICO-CANONICO',
      )
      const insurerId = await createInsurer(tx, 'Aseguradora Sintetica Canonica')
      const firstPolicyId = await createPolicy(tx, insurerId, 'POL-SINTETICA-MERGE-001')
      const secondPolicyId = await createPolicy(tx, insurerId, 'POL-SINTETICA-MERGE-002')

      await tx`
        insert into policy_version (
          policy_id, version_number, effective_from, holder_party_id,
          term_start_date, term_end_date, renewal_mode
        ) values
          (${firstPolicyId}, 1, '2026-01-01', ${loserId}, '2026-01-01', '2027-01-01', 'MANUAL'),
          (${secondPolicyId}, 1, '2026-01-01', ${middleId}, '2026-01-01', '2027-01-01', 'MANUAL')
      `
      await tx`
        insert into organization_membership (
          organization_party_id, person_party_id, valid_from, kind
        ) values
          (${organizationId}, ${loserId}, '2026-01-01T00:00:00Z', 'SYNTHETIC_ALIAS'),
          (${organizationId}, ${middleId}, '2026-02-01T00:00:00Z', 'SYNTHETIC_ALIAS')
      `
      await tx`
        update party
        set status = 'MERGED', merged_into_party_id = ${canonicalId}
        where id = ${middleId}
      `
      await tx`
        update party
        set status = 'MERGED', merged_into_party_id = ${middleId}
        where id = ${loserId}
      `

      const result = await searchPolicies(tx, { dni: 'DNI-SINTETICO-CANONICO', asOf: AS_OF })
      assert.equal(result.state, 'CANDIDATES')
      assert.deepEqual(
        new Set(result.candidates.map((candidate) => candidate.policyId)),
        new Set([firstPolicyId, secondPolicyId]),
      )
      assert.deepEqual(
        new Set(result.candidates.map((candidate) => candidate.holder?.partyId)),
        new Set([canonicalId]),
      )

      const overview = await getPartyOverview(tx, loserId, AS_OF, MEMBERSHIP_AT)
      assert.ok(overview)
      assert.equal(overview.partyId, canonicalId)
      assert.deepEqual(
        new Set(overview.policies.map((policy) => policy.policyId)),
        new Set([firstPolicyId, secondPolicyId]),
      )
      assert.deepEqual(overview.organizations.map((item) => item.partyId), [organizationId])

      const detail = await getPolicyDetail(tx, firstPolicyId, AS_OF)
      assert.ok(detail)
      assert.equal(detail.holder?.partyId, canonicalId)
      assert.deepEqual(
        new Set(detail.history.map((version) => version.holder.partyId)),
        new Set([canonicalId]),
      )
    })
  })
})
