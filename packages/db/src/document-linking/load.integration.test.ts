// T-0017 — carga del insumo de conciliación asistida contra PostgreSQL real (R-26).
// Sólo fixtures sintéticas (R-19); cada caso corre en una transacción revertida.
//
// Cubre cada checkbox de ## Verification del contrato:
// - idempotencia de una segunda carga y de una carga con una relación modificada;
// - archivo revisado, carpeta del cliente sin documento, falta de referencia,
//   referencia ambigua, inaccesible/no comprobada y fila inválida del insumo;
// - la consulta distingue documento / carpeta del cliente / ausencia;
// - conteos por categoría con denominador explícito;
// - verificador/evidencia/fecha/cuenta se conservan y una fila VERIFIED sin esos datos
//   se rechaza.

import assert from 'node:assert/strict'
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { after, describe, it } from 'node:test'

import postgres from 'postgres'

import { countDocumentLinkingCategories, getDocumentAccessForPolicies } from './query.ts'
import { loadDocumentVerificationInput } from './load.ts'

const ROOT = resolve(import.meta.dirname, '..', '..', '..', '..')

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
  throw new Error('DATABASE_URL no está configurada: T-0017 requiere PostgreSQL real.')
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

const createOrganization = async (
  tx: postgres.TransactionSql,
  legalName: string,
): Promise<string> => {
  const party = one(
    await tx<IdRow[]>`insert into party (kind) values ('ORGANIZATION') returning id`,
    'organization party',
  )
  await tx`insert into organization_profile (party_id, legal_name) values (${party.id}, ${legalName})`
  return party.id
}

const createInsurer = async (tx: postgres.TransactionSql, canonicalName: string): Promise<string> => {
  const organizationId = await createOrganization(tx, `${canonicalName} Sociedad Sintética`)
  return one(
    await tx<IdRow[]>`
      insert into insurer (organization_party_id, canonical_name)
      values (${organizationId}, ${canonicalName})
      returning id
    `,
    'insurer',
  ).id
}

/** Policy con una PolicyVersion, con el linaje source_event_type/id que resuelve `policy_source_id`. */
const createPolicyFromZoho = async (
  tx: postgres.TransactionSql,
  insurerId: string,
  policyNumber: string,
  zohoId: string,
  holderPartyId: string,
): Promise<string> => {
  const policyId = one(
    await tx<IdRow[]>`
      insert into policy (insurer_id, policy_number) values (${insurerId}, ${policyNumber}) returning id
    `,
    'policy',
  ).id
  await tx`
    insert into policy_version (
      policy_id, version_number, effective_from, holder_party_id,
      term_start_date, term_end_date, renewal_mode, source_event_type, source_event_id
    ) values (
      ${policyId}, 1, '2026-01-01', ${holderPartyId},
      '2026-01-01', '2027-01-01', 'MANUAL', 'Polizas', ${zohoId}
    )
  `
  return policyId
}

const createBatch = async (tx: postgres.TransactionSql, sourceFile: string): Promise<string> =>
  one(
    await tx<IdRow[]>`
      insert into document_verification_batch (source_file) values (${sourceFile}) returning id
    `,
    'document_verification_batch',
  ).id

const CSV_HEADER =
  'policy_source_id,target_url,target_kind,link_scope,status,pending_reason,verified_by,verified_at,verified_account,evidence'

interface CsvRowInput {
  readonly policySourceId: string
  readonly targetUrl: string
  readonly targetKind: string
  readonly linkScope: string
  readonly status: string
  readonly pendingReason?: string
  readonly verifiedBy?: string
  readonly verifiedAt?: string
  readonly verifiedAccount?: string
  readonly evidence?: string
}

const csvField = (value: string): string => `"${value.replaceAll('"', '""')}"`

const csvLine = (row: CsvRowInput): string =>
  [
    row.policySourceId,
    row.targetUrl,
    row.targetKind,
    row.linkScope,
    row.status,
    row.pendingReason ?? '',
    row.verifiedBy ?? '',
    row.verifiedAt ?? '',
    row.verifiedAccount ?? '',
    row.evidence ?? '',
  ]
    .map(csvField)
    .join(',')

const writeCsv = (rows: readonly CsvRowInput[]): string => {
  const dir = mkdtempSync(join(tmpdir(), 't0017-fixture-'))
  const path = join(dir, 'insumo.csv')
  writeFileSync(path, [CSV_HEADER, ...rows.map(csvLine)].join('\n') + '\n', 'utf8')
  return path
}

const verifiedRow = (over: Partial<CsvRowInput> & Pick<CsvRowInput, 'policySourceId' | 'targetUrl' | 'targetKind' | 'linkScope'>): CsvRowInput => ({
  status: 'VERIFIED',
  verifiedBy: 'owner@delcampo.invalid',
  verifiedAt: '2026-09-23T10:00:00-03:00',
  verifiedAccount: 'cuenta-corporativa@delcampo.invalid',
  evidence: 'evidencia sintetica agregada',
  ...over,
})

after(async () => {
  await sql.end()
})

describe('loadDocumentVerificationInput — T-0017', () => {
  it('archivo revisado: la Policy ofrece "documento de la póliza"', async () => {
    await inRollbackTransaction(async (tx) => {
      const insurerId = await createInsurer(tx, 'Aseguradora Sintetica T0017 A')
      const holderId = await createOrganization(tx, 'Cliente Sintetico T0017 A')
      const policyId = await createPolicyFromZoho(tx, insurerId, 'POL-T0017-001', 'ZOHO-001', holderId)
      const batchId = await createBatch(tx, 'fixture-a.csv')

      const path = writeCsv([
        verifiedRow({
          policySourceId: 'ZOHO-001',
          targetUrl: 'https://drive.example.invalid/file/001',
          targetKind: 'FILE',
          linkScope: 'POLICY_DOCUMENT',
        }),
      ])

      const result = await loadDocumentVerificationInput(tx, batchId, path)
      assert.equal(result.loaded, 1)
      assert.deepEqual(result.rejected, [])

      const access = one(await getDocumentAccessForPolicies(tx, [policyId]), 'document access')
      assert.deepEqual(access, {
        policyId,
        document: { kind: 'FILE', url: 'https://drive.example.invalid/file/001' },
        clientFolder: null,
        pending: null,
      })
    })
  })

  it('carpeta del cliente sin documento: ofrece la carpeta y conserva el pendiente de la Policy', async () => {
    await inRollbackTransaction(async (tx) => {
      const insurerId = await createInsurer(tx, 'Aseguradora Sintetica T0017 B')
      const holderId = await createOrganization(tx, 'Cliente Sintetico T0017 B')
      const policyId = await createPolicyFromZoho(tx, insurerId, 'POL-T0017-002', 'ZOHO-002', holderId)
      const batchId = await createBatch(tx, 'fixture-b.csv')

      const path = writeCsv([
        verifiedRow({
          policySourceId: 'ZOHO-002',
          targetUrl: 'https://drive.example.invalid/folder/002',
          targetKind: 'FOLDER',
          linkScope: 'CLIENT_FOLDER',
        }),
      ])

      const result = await loadDocumentVerificationInput(tx, batchId, path)
      assert.equal(result.loaded, 1)

      const access = one(await getDocumentAccessForPolicies(tx, [policyId]), 'document access')
      assert.deepEqual(access, {
        policyId,
        document: null,
        clientFolder: { kind: 'FOLDER', url: 'https://drive.example.invalid/folder/002' },
        pending: null,
      })
    })
  })

  it('falta de referencia: una Policy sin ninguna fila del insumo es ausencia, sin ocultar la póliza', async () => {
    await inRollbackTransaction(async (tx) => {
      const insurerId = await createInsurer(tx, 'Aseguradora Sintetica T0017 C')
      const holderId = await createOrganization(tx, 'Cliente Sintetico T0017 C')
      const policyId = await createPolicyFromZoho(tx, insurerId, 'POL-T0017-003', 'ZOHO-003', holderId)

      const access = one(await getDocumentAccessForPolicies(tx, [policyId]), 'document access')
      assert.deepEqual(access, { policyId, document: null, clientFolder: null, pending: null })
    })
  })

  it('referencia ambigua: dos POLICY_DOCUMENT verificados para la misma Policy quedan pendientes, ninguno se elige', async () => {
    await inRollbackTransaction(async (tx) => {
      const insurerId = await createInsurer(tx, 'Aseguradora Sintetica T0017 D')
      const holderId = await createOrganization(tx, 'Cliente Sintetico T0017 D')
      const policyId = await createPolicyFromZoho(tx, insurerId, 'POL-T0017-004', 'ZOHO-004', holderId)
      const batchId = await createBatch(tx, 'fixture-d.csv')

      const path = writeCsv([
        verifiedRow({
          policySourceId: 'ZOHO-004',
          targetUrl: 'https://drive.example.invalid/file/004a',
          targetKind: 'FILE',
          linkScope: 'POLICY_DOCUMENT',
        }),
        verifiedRow({
          policySourceId: 'ZOHO-004',
          targetUrl: 'https://drive.example.invalid/file/004b',
          targetKind: 'FILE',
          linkScope: 'POLICY_DOCUMENT',
        }),
      ])

      const result = await loadDocumentVerificationInput(tx, batchId, path)
      assert.equal(result.loaded, 2)
      assert.deepEqual(result.ambiguousPolicyIds, [policyId])

      const access = one(await getDocumentAccessForPolicies(tx, [policyId]), 'document access')
      assert.equal(access.document, null)
      assert.equal(access.pending?.reason, 'AMBIGUOUS')

      const inputs = await tx<{ status: string; pending_reason: string | null }[]>`
        select status, pending_reason from document_verification_input where policy_id = ${policyId}
      `
      assert.deepEqual(
        inputs.map((row) => [row.status, row.pending_reason]).sort(),
        [['PENDING', 'AMBIGUOUS'], ['PENDING', 'AMBIGUOUS']],
      )
    })
  })

  it('inaccesible / no comprobada: quedan pendientes con su motivo, sin inferir inexistencia', async () => {
    await inRollbackTransaction(async (tx) => {
      const insurerId = await createInsurer(tx, 'Aseguradora Sintetica T0017 E')
      const holderId = await createOrganization(tx, 'Cliente Sintetico T0017 E')
      const policyInaccesible = await createPolicyFromZoho(tx, insurerId, 'POL-T0017-005', 'ZOHO-005', holderId)
      const policyNoComprobada = await createPolicyFromZoho(tx, insurerId, 'POL-T0017-006', 'ZOHO-006', holderId)
      const batchId = await createBatch(tx, 'fixture-e.csv')

      const path = writeCsv([
        {
          policySourceId: 'ZOHO-005',
          targetUrl: 'https://drive.example.invalid/file/005',
          targetKind: 'FILE',
          linkScope: 'POLICY_DOCUMENT',
          status: 'PENDING',
          pendingReason: 'INACCESSIBLE',
          verifiedBy: 'owner@delcampo.invalid',
          verifiedAt: '2026-09-23T11:00:00-03:00',
          verifiedAccount: 'cuenta-corporativa@delcampo.invalid',
          evidence: 'intento fallido, 404 bajo la cuenta',
        },
        {
          policySourceId: 'ZOHO-006',
          targetUrl: 'https://drive.example.invalid/file/006',
          targetKind: 'FILE',
          linkScope: 'POLICY_DOCUMENT',
          status: 'PENDING',
          pendingReason: 'UNVERIFIED',
        },
      ])

      const result = await loadDocumentVerificationInput(tx, batchId, path)
      assert.equal(result.loaded, 2)

      const inaccesible = one(await getDocumentAccessForPolicies(tx, [policyInaccesible]), 'document access')
      assert.deepEqual(inaccesible, { policyId: policyInaccesible, document: null, clientFolder: null, pending: { reason: 'INACCESSIBLE' } })

      const noComprobada = one(await getDocumentAccessForPolicies(tx, [policyNoComprobada]), 'document access')
      assert.deepEqual(noComprobada, { policyId: policyNoComprobada, document: null, clientFolder: null, pending: { reason: 'UNVERIFIED' } })
    })
  })

  it('fila inválida del insumo: se rechaza nombrando fila y columna, nunca el contenido', async () => {
    await inRollbackTransaction(async (tx) => {
      const insurerId = await createInsurer(tx, 'Aseguradora Sintetica T0017 F')
      const holderId = await createOrganization(tx, 'Cliente Sintetico T0017 F')
      await createPolicyFromZoho(tx, insurerId, 'POL-T0017-007', 'ZOHO-007', holderId)
      const batchId = await createBatch(tx, 'fixture-f.csv')

      const path = writeCsv([
        // Fila 2: VERIFIED sin verified_by/verified_at/verified_account/evidence.
        {
          policySourceId: 'ZOHO-007',
          targetUrl: 'https://drive.example.invalid/file/007',
          targetKind: 'FILE',
          linkScope: 'POLICY_DOCUMENT',
          status: 'VERIFIED',
        },
        // Fila 3: target_kind inválido.
        {
          policySourceId: 'ZOHO-007',
          targetUrl: 'https://drive.example.invalid/file/007b',
          targetKind: 'CARPETA',
          linkScope: 'POLICY_DOCUMENT',
          status: 'PENDING',
          pendingReason: 'NO_REFERENCE',
        },
        // Fila 4: POLICY_DOCUMENT con target_kind FOLDER.
        {
          policySourceId: 'ZOHO-007',
          targetUrl: 'https://drive.example.invalid/folder/007c',
          targetKind: 'FOLDER',
          linkScope: 'POLICY_DOCUMENT',
          status: 'PENDING',
          pendingReason: 'NO_REFERENCE',
        },
        // Fila 5: policy_source_id que no resuelve a ninguna Policy.
        {
          policySourceId: 'ZOHO-DESCONOCIDO',
          targetUrl: 'https://drive.example.invalid/file/007d',
          targetKind: 'FILE',
          linkScope: 'POLICY_DOCUMENT',
          status: 'PENDING',
          pendingReason: 'NO_REFERENCE',
        },
      ])

      const result = await loadDocumentVerificationInput(tx, batchId, path)
      assert.equal(result.loaded, 0)
      assert.equal(result.rejected.length, 7)

      const byRow = new Map(result.rejected.map((error) => [`${String(error.rowNumber)}:${error.column}`, error]))
      assert.ok(byRow.has('1:verified_by'))
      assert.ok(byRow.has('1:verified_at'))
      assert.ok(byRow.has('1:verified_account'))
      assert.ok(byRow.has('1:evidence'))
      assert.ok(byRow.has('2:target_kind'))
      assert.ok(byRow.has('3:target_kind'))
      assert.ok(byRow.has('4:policy_source_id'))

      // Nunca el contenido: ningún mensaje de error contiene la URL ni el ID de Zoho.
      for (const error of result.rejected) {
        assert.ok(!error.reason.includes('drive.example.invalid'))
        assert.ok(!error.reason.includes('ZOHO-'))
      }
    })
  })

  it('idempotencia: una segunda carga del mismo insumo no duplica ni cambia las referencias', async () => {
    await inRollbackTransaction(async (tx) => {
      const insurerId = await createInsurer(tx, 'Aseguradora Sintetica T0017 G')
      const holderId = await createOrganization(tx, 'Cliente Sintetico T0017 G')
      const policyId = await createPolicyFromZoho(tx, insurerId, 'POL-T0017-008', 'ZOHO-008', holderId)
      const batch1 = await createBatch(tx, 'fixture-g-1.csv')
      const batch2 = await createBatch(tx, 'fixture-g-2.csv')

      const rows = [
        verifiedRow({
          policySourceId: 'ZOHO-008',
          targetUrl: 'https://drive.example.invalid/file/008',
          targetKind: 'FILE',
          linkScope: 'POLICY_DOCUMENT',
        }),
      ]
      const path = writeCsv(rows)

      await loadDocumentVerificationInput(tx, batch1, path)
      const afterFirst = await tx<{ id: string }[]>`select id from document_verification_input where policy_id = ${policyId}`
      const linksAfterFirst = await tx<{ id: string }[]>`select id from document_link where resource_type = 'POLICY' and resource_id = ${policyId}`
      const referencesAfterFirst = await tx<{ id: string }[]>`
        select er.id from policy_document_reference pdr join external_reference er on er.id = pdr.external_reference_id
        where pdr.policy_id = ${policyId}
      `

      await loadDocumentVerificationInput(tx, batch2, path)
      const afterSecond = await tx<{ id: string }[]>`select id from document_verification_input where policy_id = ${policyId}`
      const linksAfterSecond = await tx<{ id: string }[]>`select id from document_link where resource_type = 'POLICY' and resource_id = ${policyId}`
      const referencesAfterSecond = await tx<{ id: string }[]>`
        select er.id from policy_document_reference pdr join external_reference er on er.id = pdr.external_reference_id
        where pdr.policy_id = ${policyId}
      `

      assert.deepEqual(afterFirst.map((r) => r.id), afterSecond.map((r) => r.id))
      assert.deepEqual(linksAfterFirst.map((r) => r.id), linksAfterSecond.map((r) => r.id))
      assert.deepEqual(referencesAfterFirst.map((r) => r.id), referencesAfterSecond.map((r) => r.id))
    })
  })

  it('idempotencia: una carga con una relación modificada cambia sólo esa relación y deja rastro trazable', async () => {
    await inRollbackTransaction(async (tx) => {
      const insurerId = await createInsurer(tx, 'Aseguradora Sintetica T0017 H')
      const holderId = await createOrganization(tx, 'Cliente Sintetico T0017 H')
      const policyOneId = await createPolicyFromZoho(tx, insurerId, 'POL-T0017-009', 'ZOHO-009', holderId)
      const policyTwoId = await createPolicyFromZoho(tx, insurerId, 'POL-T0017-010', 'ZOHO-010', holderId)

      const batch1 = await createBatch(tx, 'fixture-h-1.csv')
      const firstPath = writeCsv([
        verifiedRow({ policySourceId: 'ZOHO-009', targetUrl: 'https://drive.example.invalid/file/009', targetKind: 'FILE', linkScope: 'POLICY_DOCUMENT' }),
        verifiedRow({ policySourceId: 'ZOHO-010', targetUrl: 'https://drive.example.invalid/file/010', targetKind: 'FILE', linkScope: 'POLICY_DOCUMENT' }),
      ])
      await loadDocumentVerificationInput(tx, batch1, firstPath)

      const policyTwoInputBefore = one(
        await tx<{ id: string; updated_at: Date }[]>`select id, updated_at from document_verification_input where policy_id = ${policyTwoId}`,
        'policy two input before',
      )

      const batch2 = await createBatch(tx, 'fixture-h-2.csv')
      const secondPath = writeCsv([
        verifiedRow({ policySourceId: 'ZOHO-009', targetUrl: 'https://drive.example.invalid/file/009', targetKind: 'FILE', linkScope: 'POLICY_DOCUMENT' }),
        {
          policySourceId: 'ZOHO-010',
          targetUrl: 'https://drive.example.invalid/file/010',
          targetKind: 'FILE',
          linkScope: 'POLICY_DOCUMENT',
          status: 'PENDING',
          pendingReason: 'INACCESSIBLE',
          verifiedBy: 'owner@delcampo.invalid',
          verifiedAt: '2026-09-23T12:00:00-03:00',
          verifiedAccount: 'cuenta-corporativa@delcampo.invalid',
          evidence: 'dejo de abrir, 404 bajo la cuenta',
        },
      ])
      await loadDocumentVerificationInput(tx, batch2, secondPath)

      const accessOne = one(await getDocumentAccessForPolicies(tx, [policyOneId]), 'document access')
      assert.deepEqual(accessOne.document, { kind: 'FILE', url: 'https://drive.example.invalid/file/009' })

      const accessTwo = one(await getDocumentAccessForPolicies(tx, [policyTwoId]), 'document access')
      assert.equal(accessTwo.document, null)
      assert.equal(accessTwo.pending?.reason, 'INACCESSIBLE')

      const policyTwoInputAfter = one(
        await tx<{ id: string; updated_at: Date; batch_id: string }[]>`
          select id, updated_at, batch_id from document_verification_input where policy_id = ${policyTwoId}
        `,
        'policy two input after',
      )
      assert.equal(policyTwoInputAfter.id, policyTwoInputBefore.id)
      assert.equal(policyTwoInputAfter.batch_id, batch2)
      assert.ok(policyTwoInputAfter.updated_at.getTime() > policyTwoInputBefore.updated_at.getTime())
    })
  })

  it('conteos por categoría coinciden con el lote consultado, con denominador explícito', async () => {
    await inRollbackTransaction(async (tx) => {
      const insurerId = await createInsurer(tx, 'Aseguradora Sintetica T0017 I')
      const holderDocumentId = await createOrganization(tx, 'Cliente Sintetico T0017 I Documento')
      const holderFolderId = await createOrganization(tx, 'Cliente Sintetico T0017 I Carpeta')
      const holderPendingId = await createOrganization(tx, 'Cliente Sintetico T0017 I Pendiente')
      const holderNoneId = await createOrganization(tx, 'Cliente Sintetico T0017 I Sin Referencia')
      const withDocument = await createPolicyFromZoho(tx, insurerId, 'POL-T0017-011', 'ZOHO-011', holderDocumentId)
      const withFolderOnly = await createPolicyFromZoho(tx, insurerId, 'POL-T0017-012', 'ZOHO-012', holderFolderId)
      const withPending = await createPolicyFromZoho(tx, insurerId, 'POL-T0017-013', 'ZOHO-013', holderPendingId)
      const withoutReference = await createPolicyFromZoho(tx, insurerId, 'POL-T0017-014', 'ZOHO-014', holderNoneId)

      const batchId = await createBatch(tx, 'fixture-i.csv')
      const path = writeCsv([
        verifiedRow({ policySourceId: 'ZOHO-011', targetUrl: 'https://drive.example.invalid/file/011', targetKind: 'FILE', linkScope: 'POLICY_DOCUMENT' }),
        verifiedRow({ policySourceId: 'ZOHO-012', targetUrl: 'https://drive.example.invalid/folder/012', targetKind: 'FOLDER', linkScope: 'CLIENT_FOLDER' }),
        {
          policySourceId: 'ZOHO-013',
          targetUrl: 'https://drive.example.invalid/file/013',
          targetKind: 'FILE',
          linkScope: 'POLICY_DOCUMENT',
          status: 'PENDING',
          pendingReason: 'UNVERIFIED',
        },
      ])
      await loadDocumentVerificationInput(tx, batchId, path)

      const counts = await countDocumentLinkingCategories(tx, [withDocument, withFolderOnly, withPending, withoutReference])
      assert.deepEqual(counts, {
        denominator: 4,
        withDocument: 1,
        withClientFolderOnly: 1,
        withPending: 1,
        withoutReference: 1,
      })
    })
  })
})
