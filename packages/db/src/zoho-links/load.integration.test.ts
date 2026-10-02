// T-0022 / D-0064 — carga del nivel "según Zoho" contra PostgreSQL real (R-26).
// Sólo fixtures sintéticas (R-19): los lotes de este archivo se escriben en un temporal
// con ids y URLs inventados; nunca se abre `data/zoho-export-*` ni `data/vs01-acceptance/`.
//
// Cubre cada checkbox de ## Verification del contrato:
// - archivo de póliza ofrecido, carpeta de póliza omitida, carpeta de cliente ofrecida,
//   archivo de cliente omitido, URL vacía o inválida, póliza o cliente fuera del scope;
// - precedencia: un vínculo comprobado por una persona prevalece, y un pendiente humano
//   sigue visible aunque Zoho ofrezca enlace;
// - foto del lote: recargar la misma no cambia nada, otra agrega/cambia/quita sólo Zoho;
// - la consulta nunca devuelve un enlace de Zoho con nivel HUMAN ni una carpeta como
//   documento, y los conteos separan la cobertura sin comprobar;
// - el resultado de la carga es sólo conteos agregados.

import assert from 'node:assert/strict'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { after, describe, it } from 'node:test'

import postgres from 'postgres'

import { getDocumentAccessForPolicies, countDocumentLinkingCategories } from '../document-linking/query.ts'
import { DIRECTORIOS_MODULO } from '../import/lote.ts'
import { loadZohoLinks } from './load.ts'

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
  throw new Error('DATABASE_URL no está configurada: T-0022 requiere PostgreSQL real.')
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

// ── Lote sintético en disco ──────────────────────────────────────────────────
// Misma forma que un lote real (`raw/<file_id>/0001.csv`) para que el cargador se
// ejercite por la ruta por la que de verdad se usa, con contenido inventado.

const HEADER_POLIZAS = 'ID de registro,Número de póliza,URL drive doc poliza'
const HEADER_CLIENTES = 'ID de registro,Nombre,Drive URL'

interface LoteSintetico {
  readonly polizas?: readonly (readonly [string, string])[]
  readonly contactos?: readonly (readonly [string, string])[]
  readonly cuentas?: readonly (readonly [string, string])[]
}

const campo = (valor: string): string => `"${valor.replaceAll('"', '""')}"`

const escribirLote = (lote: LoteSintetico): string => {
  const raiz = mkdtempSync(join(tmpdir(), 't0022-lote-'))
  const escribir = (
    modulo: keyof typeof DIRECTORIOS_MODULO,
    header: string,
    filas: readonly (readonly [string, string])[],
  ): void => {
    const dir = join(raiz, 'raw', DIRECTORIOS_MODULO[modulo])
    mkdirSync(dir, { recursive: true })
    const cuerpo = filas.map(([id, url]) => [id, `registro ${id}`, url].map(campo).join(','))
    writeFileSync(join(dir, '0001.csv'), [header, ...cuerpo].join('\n') + '\n', 'utf8')
  }
  escribir('polizas', HEADER_POLIZAS, lote.polizas ?? [])
  escribir('contactos', HEADER_CLIENTES, lote.contactos ?? [])
  escribir('cuentas', HEADER_CLIENTES, lote.cuentas ?? [])
  return raiz
}

// ── Fixtures de dominio ──────────────────────────────────────────────────────

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

/** Vincula una Party a su registro de origen igual que lo hace T-0013. */
const linkPartyToZoho = async (
  tx: postgres.TransactionSql,
  entityType: 'Contactos' | 'Cuentas',
  sourceRecordId: string,
  partyId: string,
): Promise<void> => {
  await tx`
    insert into party_source_link (source_system, source_entity_type, source_record_id, party_id)
    values ('Zoho', ${entityType}, ${sourceRecordId}, ${partyId})
  `
}

/** Un vínculo comprobado por una persona, tal como lo deja T-0017 (nivel HUMAN). */
const seedHumanPolicyDocument = async (
  tx: postgres.TransactionSql,
  policyId: string,
  url: string,
): Promise<void> => {
  const link = one(
    await tx<IdRow[]>`
      insert into document_link (
        resource_type, resource_id, drive_file_id, drive_url, drive_item_type,
        reconciliation_status, link_level
      ) values ('POLICY', ${policyId}, ${url}, ${url}, 'FILE', 'SYNCED', 'HUMAN')
      returning id
    `,
    'document_link humano',
  )
  const reference = one(
    await tx<IdRow[]>`
      insert into external_reference (
        source_system, source_entity_type, source_value, relation_type,
        resolution_status, resolved_target_type, resolved_target_id
      ) values (
        'T-0017', 'PolicyDocumentReference', ${`sintetico-${policyId}`}, 'POLICY_DOCUMENT',
        'RESOLVED', 'DRIVE_FILE', ${link.id}
      )
      returning id
    `,
    'external_reference humana',
  )
  await tx`
    insert into policy_document_reference (external_reference_id, policy_id)
    values (${reference.id}, ${policyId})
  `
}

/** Un pendiente documental registrado por una persona, sin enlace. */
const seedHumanPending = async (
  tx: postgres.TransactionSql,
  policyId: string,
  reason: 'UNVERIFIED' | 'INACCESSIBLE',
): Promise<void> => {
  const reference = one(
    await tx<IdRow[]>`
      insert into external_reference (
        source_system, source_entity_type, source_value, relation_type,
        resolution_status, unresolved_reason
      ) values (
        'T-0017', 'PolicyDocumentReference', ${`pendiente-${policyId}`}, 'POLICY_DOCUMENT',
        'UNRESOLVED', ${reason}
      )
      returning id
    `,
    'external_reference pendiente',
  )
  await tx`
    insert into policy_document_reference (external_reference_id, policy_id)
    values (${reference.id}, ${policyId})
  `
}

const ARCHIVO = (n: string): string => `https://drive.google.com/file/d/SINTETICO-${n}/view`
const CARPETA = (n: string): string => `https://drive.google.com/drive/folders/SINTETICO-${n}`

after(async () => {
  await sql.end()
})

describe('loadZohoLinks — T-0022 / D-0064', () => {
  it('archivo de póliza ofrecido y carpeta de póliza omitida', async () => {
    await inRollbackTransaction(async (tx) => {
      const insurerId = await createInsurer(tx, 'Aseguradora Sintetica T0022 A')
      const holderId = await createOrganization(tx, 'Cliente Sintetico T0022 A')
      const conArchivo = await createPolicyFromZoho(tx, insurerId, 'POL-T0022-001', 'Z-P-001', holderId)
      const conCarpeta = await createPolicyFromZoho(tx, insurerId, 'POL-T0022-002', 'Z-P-002', holderId)

      const lote = escribirLote({
        polizas: [
          ['Z-P-001', ARCHIVO('001')],
          ['Z-P-002', CARPETA('002')],
        ],
      })
      const resultado = await loadZohoLinks(tx, lote)

      assert.equal(resultado.polizas.filas, 2)
      assert.equal(resultado.polizas.ofrecidos, 1)
      assert.equal(resultado.polizas.omitidos.CARPETA_EN_POLIZA, 1)
      assert.equal(resultado.insertados.policy, 1)

      const acceso = await getDocumentAccessForPolicies(tx, [conArchivo, conCarpeta])
      const porPolicy = new Map(acceso.map((entrada) => [entrada.policyId, entrada]))
      assert.deepEqual(porPolicy.get(conArchivo), {
        policyId: conArchivo,
        document: { kind: 'FILE', url: ARCHIVO('001'), level: 'ZOHO_UNVERIFIED' },
        clientFolder: null,
        pending: null,
      })
      // La carpeta no se ofrece como documento ni como ninguna otra cosa: se omitió.
      assert.deepEqual(porPolicy.get(conCarpeta), {
        policyId: conCarpeta,
        document: null,
        clientFolder: null,
        pending: null,
      })
    })
  })

  it('carpeta de cliente ofrecida y archivo de cliente omitido, para Contactos y Cuentas', async () => {
    await inRollbackTransaction(async (tx) => {
      const insurerId = await createInsurer(tx, 'Aseguradora Sintetica T0022 B')
      const conCarpeta = await createOrganization(tx, 'Cliente Sintetico T0022 B1')
      const conArchivo = await createOrganization(tx, 'Cliente Sintetico T0022 B2')
      await linkPartyToZoho(tx, 'Contactos', 'Z-C-001', conCarpeta)
      await linkPartyToZoho(tx, 'Cuentas', 'Z-A-001', conArchivo)
      const policyCarpeta = await createPolicyFromZoho(tx, insurerId, 'POL-T0022-010', 'Z-P-010', conCarpeta)
      const policyArchivo = await createPolicyFromZoho(tx, insurerId, 'POL-T0022-011', 'Z-P-011', conArchivo)

      const lote = escribirLote({
        contactos: [['Z-C-001', CARPETA('100')]],
        cuentas: [['Z-A-001', ARCHIVO('101')]],
      })
      const resultado = await loadZohoLinks(tx, lote)

      assert.equal(resultado.clientes.filas, 2)
      assert.equal(resultado.clientes.ofrecidos, 1)
      assert.equal(resultado.clientes.omitidos.ARCHIVO_EN_CLIENTE, 1)
      assert.equal(resultado.insertados.party, 1)

      const porPolicy = new Map(
        (await getDocumentAccessForPolicies(tx, [policyCarpeta, policyArchivo])).map((e) => [
          e.policyId,
          e,
        ]),
      )
      assert.deepEqual(porPolicy.get(policyCarpeta)?.clientFolder, {
        kind: 'FOLDER',
        url: CARPETA('100'),
        level: 'ZOHO_UNVERIFIED',
      })
      assert.equal(porPolicy.get(policyCarpeta)?.document, null)
      assert.equal(porPolicy.get(policyArchivo)?.clientFolder, null)
    })
  })

  it('URL vacía o inválida se omite por su motivo y no escribe nada', async () => {
    await inRollbackTransaction(async (tx) => {
      const insurerId = await createInsurer(tx, 'Aseguradora Sintetica T0022 C')
      const holderId = await createOrganization(tx, 'Cliente Sintetico T0022 C')
      await createPolicyFromZoho(tx, insurerId, 'POL-T0022-020', 'Z-P-020', holderId)
      await createPolicyFromZoho(tx, insurerId, 'POL-T0022-021', 'Z-P-021', holderId)
      await createPolicyFromZoho(tx, insurerId, 'POL-T0022-022', 'Z-P-022', holderId)

      const lote = escribirLote({
        polizas: [
          ['Z-P-020', ''],
          ['Z-P-021', 'no es una url'],
          ['Z-P-022', 'https://ejemplo.invalid/file/d/X'],
        ],
      })
      const resultado = await loadZohoLinks(tx, lote)

      assert.equal(resultado.polizas.ofrecidos, 0)
      assert.equal(resultado.polizas.omitidos.VACIA, 1)
      assert.equal(resultado.polizas.omitidos.NO_ES_URL, 1)
      assert.equal(resultado.polizas.omitidos.NO_ES_DRIVE, 1)
      assert.equal(resultado.insertados.policy, 0)
    })
  })

  it('una póliza o un cliente fuera del scope importado se cuenta y no se escribe', async () => {
    await inRollbackTransaction(async (tx) => {
      const lote = escribirLote({
        polizas: [['Z-P-NO-IMPORTADA', ARCHIVO('200')]],
        contactos: [['Z-C-NO-IMPORTADO', CARPETA('201')]],
      })
      const resultado = await loadZohoLinks(tx, lote)

      assert.equal(resultado.polizas.omitidos.FUERA_DEL_SCOPE, 1)
      assert.equal(resultado.clientes.omitidos.FUERA_DEL_SCOPE, 1)
      assert.deepEqual(resultado.insertados, { policy: 0, party: 0 })
    })
  })

  it('un vínculo comprobado por una persona prevalece sobre el de Zoho de la misma póliza', async () => {
    await inRollbackTransaction(async (tx) => {
      const insurerId = await createInsurer(tx, 'Aseguradora Sintetica T0022 D')
      const holderId = await createOrganization(tx, 'Cliente Sintetico T0022 D')
      const policyId = await createPolicyFromZoho(tx, insurerId, 'POL-T0022-030', 'Z-P-030', holderId)
      await seedHumanPolicyDocument(tx, policyId, ARCHIVO('comprobado'))

      await loadZohoLinks(tx, escribirLote({ polizas: [['Z-P-030', ARCHIVO('zoho')]] }))

      const acceso = one(await getDocumentAccessForPolicies(tx, [policyId]), 'acceso')
      assert.deepEqual(acceso.document, {
        kind: 'FILE',
        url: ARCHIVO('comprobado'),
        level: 'HUMAN',
      })
      // El enlace de Zoho se cargó igual: si mañana se borra el humano, vuelve a estar.
      const zoho = await tx<IdRow[]>`
        select id from document_link
        where resource_id = ${policyId} and link_level = 'ZOHO_UNVERIFIED'
      `
      assert.equal(zoho.length, 1)
    })
  })

  it('una carpeta de cliente comprobada prevalece sobre la de Zoho de la misma Party', async () => {
    await inRollbackTransaction(async (tx) => {
      const insurerId = await createInsurer(tx, 'Aseguradora Sintetica T0022 D2')
      const partyId = await createOrganization(tx, 'Cliente Sintetico T0022 D2')
      await linkPartyToZoho(tx, 'Contactos', 'Z-C-035', partyId)
      const policyId = await createPolicyFromZoho(tx, insurerId, 'POL-T0022-035', 'Z-P-035', partyId)
      // Carpeta comprobada por una persona, como la deja T-0017 para CLIENT_FOLDER.
      await tx`
        insert into document_link (
          resource_type, resource_id, drive_file_id, drive_url, drive_item_type,
          reconciliation_status, link_level
        ) values (
          'PARTY', ${partyId}, ${CARPETA('comprobada')}, ${CARPETA('comprobada')}, 'FOLDER',
          'SYNCED', 'HUMAN'
        )
      `

      await loadZohoLinks(tx, escribirLote({ contactos: [['Z-C-035', CARPETA('zoho')]] }))

      const acceso = one(await getDocumentAccessForPolicies(tx, [policyId]), 'acceso')
      assert.deepEqual(acceso.clientFolder, {
        kind: 'FOLDER',
        url: CARPETA('comprobada'),
        level: 'HUMAN',
      })
    })
  })

  it('una sola carpeta de Zoho sirve a todas las pólizas del mismo cliente', async () => {
    await inRollbackTransaction(async (tx) => {
      const insurerId = await createInsurer(tx, 'Aseguradora Sintetica T0022 D3')
      const partyId = await createOrganization(tx, 'Cliente Sintetico T0022 D3')
      await linkPartyToZoho(tx, 'Cuentas', 'Z-A-036', partyId)
      const unaPoliza = await createPolicyFromZoho(tx, insurerId, 'POL-T0022-036', 'Z-P-036', partyId)
      const otraPoliza = await createPolicyFromZoho(tx, insurerId, 'POL-T0022-037', 'Z-P-037', partyId)

      const resultado = await loadZohoLinks(
        tx,
        escribirLote({ cuentas: [['Z-A-036', CARPETA('compartida')]] }),
      )
      // Un enlace escrito, dos pólizas que lo ofrecen: la carpeta es del cliente, no de
      // la póliza (D-0057, DOMAIN.md §47-49).
      assert.equal(resultado.insertados.party, 1)

      for (const policyId of [unaPoliza, otraPoliza]) {
        const acceso = one(await getDocumentAccessForPolicies(tx, [policyId]), 'acceso')
        assert.deepEqual(acceso.clientFolder, {
          kind: 'FOLDER',
          url: CARPETA('compartida'),
          level: 'ZOHO_UNVERIFIED',
        })
      }
    })
  })

  it('un pendiente registrado por una persona sigue visible aunque Zoho ofrezca enlace', async () => {
    await inRollbackTransaction(async (tx) => {
      const insurerId = await createInsurer(tx, 'Aseguradora Sintetica T0022 E')
      const holderId = await createOrganization(tx, 'Cliente Sintetico T0022 E')
      const policyId = await createPolicyFromZoho(tx, insurerId, 'POL-T0022-040', 'Z-P-040', holderId)
      await seedHumanPending(tx, policyId, 'INACCESSIBLE')

      await loadZohoLinks(tx, escribirLote({ polizas: [['Z-P-040', ARCHIVO('300')]] }))

      const acceso = one(await getDocumentAccessForPolicies(tx, [policyId]), 'acceso')
      assert.deepEqual(acceso, {
        policyId,
        document: { kind: 'FILE', url: ARCHIVO('300'), level: 'ZOHO_UNVERIFIED' },
        clientFolder: null,
        pending: { reason: 'INACCESSIBLE' },
      })
    })
  })

  /**
   * El caso que la revisión ciega de T-0022 encontró: con DOS relaciones humanas para la
   * misma Policy existe material comprobado, y D-0057 reserva esa situación para el
   * pendiente ambiguo. Ofrecer ahí el enlace de Zoho sería presentar como documento algo
   * que nadie comprobó, en una Policy donde una persona sí trabajó.
   */
  it('con el vínculo humano ambiguo no se ofrece el enlace de Zoho', async () => {
    await inRollbackTransaction(async (tx) => {
      const insurerId = await createInsurer(tx, 'Aseguradora Sintetica T0022 K')
      const holderId = await createOrganization(tx, 'Cliente Sintetico T0022 K')
      const policyId = await createPolicyFromZoho(tx, insurerId, 'POL-T0022-100', 'Z-P-100', holderId)
      await seedHumanPolicyDocument(tx, policyId, ARCHIVO('comprobado-a'))
      await seedHumanPolicyDocument(tx, policyId, ARCHIVO('comprobado-b'))

      await loadZohoLinks(tx, escribirLote({ polizas: [['Z-P-100', ARCHIVO('zoho-no-ofrecido')]] }))

      const acceso = one(await getDocumentAccessForPolicies(tx, [policyId]), 'acceso')
      assert.equal(acceso.document, null)
      assert.deepEqual(acceso.pending, { reason: 'AMBIGUOUS' })
    })
  })

  it('con la carpeta humana ambigua tampoco se ofrece la de Zoho', async () => {
    await inRollbackTransaction(async (tx) => {
      const insurerId = await createInsurer(tx, 'Aseguradora Sintetica T0022 L')
      const partyId = await createOrganization(tx, 'Cliente Sintetico T0022 L')
      await linkPartyToZoho(tx, 'Contactos', 'Z-C-110', partyId)
      const policyId = await createPolicyFromZoho(tx, insurerId, 'POL-T0022-110', 'Z-P-110', partyId)
      for (const sufijo of ['a', 'b']) {
        const url = CARPETA('humana-' + sufijo)
        await tx`
          insert into document_link (
            resource_type, resource_id, drive_file_id, drive_url, drive_item_type,
            reconciliation_status, link_level
          ) values (
            'PARTY', ${partyId}, ${url}, ${url}, 'FOLDER', 'SYNCED', 'HUMAN'
          )
        `
      }

      await loadZohoLinks(tx, escribirLote({ contactos: [['Z-C-110', CARPETA('zoho-no-ofrecida')]] }))

      const acceso = one(await getDocumentAccessForPolicies(tx, [policyId]), 'acceso')
      assert.equal(acceso.clientFolder, null)
      assert.deepEqual(acceso.pending, { reason: 'AMBIGUOUS' })
    })
  })

  it('una fila del lote sin "ID de registro" se cuenta aparte del fuera de scope', async () => {
    await inRollbackTransaction(async (tx) => {
      const resultado = await loadZohoLinks(
        tx,
        escribirLote({
          polizas: [
            ['', ARCHIVO('120')],
            ['Z-P-NO-IMPORTADA', ARCHIVO('121')],
          ],
        }),
      )
      assert.equal(resultado.polizas.omitidos.SIN_ID_DE_ORIGEN, 1)
      assert.equal(resultado.polizas.omitidos.FUERA_DEL_SCOPE, 1)
      assert.equal(resultado.insertados.policy, 0)
    })
  })

  /**
   * Única vía por la que un enlace podría llegar a la Policy equivocada: un
   * `source_event_id` que resuelve a más de una Policy. No se elige ninguna.
   */
  it('un source_event_id que resuelve a dos Policies no recibe enlace', async () => {
    await inRollbackTransaction(async (tx) => {
      const insurerId = await createInsurer(tx, 'Aseguradora Sintetica T0022 M')
      const holderId = await createOrganization(tx, 'Cliente Sintetico T0022 M')
      const una = await createPolicyFromZoho(tx, insurerId, 'POL-T0022-130', 'Z-P-130', holderId)
      const otra = await createPolicyFromZoho(tx, insurerId, 'POL-T0022-131', 'Z-P-130', holderId)

      const resultado = await loadZohoLinks(
        tx,
        escribirLote({ polizas: [['Z-P-130', ARCHIVO('130')]] }),
      )
      assert.equal(resultado.polizas.omitidos.FUERA_DEL_SCOPE, 1)
      assert.equal(resultado.insertados.policy, 0)
      for (const policyId of [una, otra]) {
        assert.equal(one(await getDocumentAccessForPolicies(tx, [policyId]), 'acceso').document, null)
      }
    })
  })

  it('recargar la misma foto no cambia nada', async () => {
    await inRollbackTransaction(async (tx) => {
      const insurerId = await createInsurer(tx, 'Aseguradora Sintetica T0022 F')
      const holderId = await createOrganization(tx, 'Cliente Sintetico T0022 F')
      const policyId = await createPolicyFromZoho(tx, insurerId, 'POL-T0022-050', 'Z-P-050', holderId)
      const lote = escribirLote({ polizas: [['Z-P-050', ARCHIVO('400')]] })

      const primera = await loadZohoLinks(tx, lote)
      assert.equal(primera.borrados, 0)
      const estadoTrasPrimera = await getDocumentAccessForPolicies(tx, [policyId])

      const segunda = await loadZohoLinks(tx, lote)
      assert.equal(segunda.borrados, 1)
      assert.equal(segunda.insertados.policy, 1)
      assert.deepEqual(await getDocumentAccessForPolicies(tx, [policyId]), estadoTrasPrimera)
    })
  })

  it('una foto distinta agrega, cambia y quita, y sólo toca enlaces de Zoho', async () => {
    await inRollbackTransaction(async (tx) => {
      const insurerId = await createInsurer(tx, 'Aseguradora Sintetica T0022 G')
      const holderId = await createOrganization(tx, 'Cliente Sintetico T0022 G')
      const quitada = await createPolicyFromZoho(tx, insurerId, 'POL-T0022-060', 'Z-P-060', holderId)
      const cambiada = await createPolicyFromZoho(tx, insurerId, 'POL-T0022-061', 'Z-P-061', holderId)
      const agregada = await createPolicyFromZoho(tx, insurerId, 'POL-T0022-062', 'Z-P-062', holderId)
      const humana = await createPolicyFromZoho(tx, insurerId, 'POL-T0022-063', 'Z-P-063', holderId)
      await seedHumanPolicyDocument(tx, humana, ARCHIVO('humano-intacto'))

      await loadZohoLinks(
        tx,
        escribirLote({
          polizas: [
            ['Z-P-060', ARCHIVO('500')],
            ['Z-P-061', ARCHIVO('501')],
          ],
        }),
      )

      const segunda = await loadZohoLinks(
        tx,
        escribirLote({
          polizas: [
            ['Z-P-061', ARCHIVO('501-bis')],
            ['Z-P-062', ARCHIVO('502')],
          ],
        }),
      )
      assert.equal(segunda.borrados, 2)
      assert.equal(segunda.insertados.policy, 2)

      const porPolicy = new Map(
        (await getDocumentAccessForPolicies(tx, [quitada, cambiada, agregada, humana])).map((e) => [
          e.policyId,
          e,
        ]),
      )
      assert.equal(porPolicy.get(quitada)?.document, null)
      assert.deepEqual(porPolicy.get(cambiada)?.document, {
        kind: 'FILE',
        url: ARCHIVO('501-bis'),
        level: 'ZOHO_UNVERIFIED',
      })
      assert.deepEqual(porPolicy.get(agregada)?.document, {
        kind: 'FILE',
        url: ARCHIVO('502'),
        level: 'ZOHO_UNVERIFIED',
      })
      // El vínculo comprobado atravesó las dos cargas sin cambiar.
      assert.deepEqual(porPolicy.get(humana)?.document, {
        kind: 'FILE',
        url: ARCHIVO('humano-intacto'),
        level: 'HUMAN',
      })
      const humanos = await tx<IdRow[]>`
        select id from document_link where resource_id = ${humana} and link_level = 'HUMAN'
      `
      assert.equal(humanos.length, 1)
    })
  })

  it('dos registros de origen que resuelven a la misma Party con URLs distintas quedan ambiguos', async () => {
    await inRollbackTransaction(async (tx) => {
      const insurerId = await createInsurer(tx, 'Aseguradora Sintetica T0022 H')
      const partyId = await createOrganization(tx, 'Cliente Sintetico T0022 H')
      await linkPartyToZoho(tx, 'Contactos', 'Z-C-700', partyId)
      await linkPartyToZoho(tx, 'Cuentas', 'Z-A-700', partyId)
      const policyId = await createPolicyFromZoho(tx, insurerId, 'POL-T0022-070', 'Z-P-070', partyId)

      const resultado = await loadZohoLinks(
        tx,
        escribirLote({
          contactos: [['Z-C-700', CARPETA('700')]],
          cuentas: [['Z-A-700', CARPETA('701')]],
        }),
      )

      assert.equal(resultado.clientes.omitidos.AMBIGUO, 2)
      assert.equal(resultado.clientes.ofrecidos, 0)
      assert.equal(resultado.insertados.party, 0)
      const acceso = one(await getDocumentAccessForPolicies(tx, [policyId]), 'acceso')
      assert.equal(acceso.clientFolder, null)
    })
  })

  it('los conteos por categoría separan la cobertura sin comprobar', async () => {
    await inRollbackTransaction(async (tx) => {
      const insurerId = await createInsurer(tx, 'Aseguradora Sintetica T0022 I')
      const clienteZoho = await createOrganization(tx, 'Cliente Sintetico T0022 I1')
      const clienteSuelto = await createOrganization(tx, 'Cliente Sintetico T0022 I2')
      await linkPartyToZoho(tx, 'Contactos', 'Z-C-800', clienteZoho)

      const comprobada = await createPolicyFromZoho(tx, insurerId, 'POL-T0022-080', 'Z-P-080', clienteSuelto)
      await seedHumanPolicyDocument(tx, comprobada, ARCHIVO('comprobado-2'))
      const conZoho = await createPolicyFromZoho(tx, insurerId, 'POL-T0022-081', 'Z-P-081', clienteSuelto)
      const soloCarpetaZoho = await createPolicyFromZoho(tx, insurerId, 'POL-T0022-082', 'Z-P-082', clienteZoho)
      const sinNada = await createPolicyFromZoho(tx, insurerId, 'POL-T0022-083', 'Z-P-083', clienteSuelto)

      await loadZohoLinks(
        tx,
        escribirLote({
          polizas: [['Z-P-081', ARCHIVO('800')]],
          contactos: [['Z-C-800', CARPETA('801')]],
        }),
      )

      const conteos = await countDocumentLinkingCategories(tx, [
        comprobada,
        conZoho,
        soloCarpetaZoho,
        sinNada,
      ])
      assert.deepEqual(conteos, {
        denominator: 4,
        withDocument: 2,
        withClientFolderOnly: 1,
        withPending: 0,
        withoutReference: 1,
        withZohoDocument: 1,
        withZohoClientFolderOnly: 1,
      })
    })
  })

  it('el resultado de la carga es sólo conteos: ninguna URL ni id de origen lo atraviesa', async () => {
    await inRollbackTransaction(async (tx) => {
      const insurerId = await createInsurer(tx, 'Aseguradora Sintetica T0022 J')
      const holderId = await createOrganization(tx, 'Cliente Sintetico T0022 J')
      await createPolicyFromZoho(tx, insurerId, 'POL-T0022-090', 'Z-P-090', holderId)

      const resultado = await loadZohoLinks(
        tx,
        escribirLote({ polizas: [['Z-P-090', ARCHIVO('900')]] }),
      )

      const serializado = JSON.stringify(resultado)
      assert.ok(!serializado.includes('drive.google.com'), 'el resultado no contiene URLs')
      assert.ok(!serializado.includes('Z-P-090'), 'el resultado no contiene ids de origen')
      for (const valor of [
        resultado.borrados,
        resultado.insertados.policy,
        resultado.insertados.party,
        resultado.polizas.filas,
        resultado.polizas.ofrecidos,
        ...Object.values(resultado.polizas.omitidos),
        ...Object.values(resultado.clientes.omitidos),
      ]) {
        assert.equal(typeof valor, 'number')
      }
    })
  })
})
