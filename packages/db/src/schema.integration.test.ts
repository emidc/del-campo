// Tests de integración de T-0012: contra un Postgres real (R-26), no contra un mock.
// Cada test negativo intenta la escritura inválida y espera el rechazo de la base.
// Las pruebas de causalidad retiran el mecanismo dentro de una transacción que se
// revierte, así que nunca dejan el schema en un estado distinto del que encontraron.
//
// Requiere DATABASE_URL apuntando a una base con la migración 0001 aplicada
// (`pnpm db:create` la deja lista). No hay skip silencioso: sin Postgres respondiendo,
// esta suite falla, porque eso es exactamente lo que R-26 pide que se declare.

import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { after, describe, it } from 'node:test'

import postgres from 'postgres'

const RAIZ = resolve(import.meta.dirname, '..', '..', '..')

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
  throw new Error(
    'DATABASE_URL no está configurada: los tests de integración de T-0012 (R-26) ' +
      'necesitan un Postgres real, no se saltean en silencio.',
  )
}

const sql = postgres(databaseUrl, { max: 5 })

/** Sentinel para forzar el rollback de una transacción de prueba de causalidad. */
class Rollback extends Error {}

/** Corre `accion` en una transacción y la revierte siempre, exitosa o no. */
const enTransaccionDescartable = async <T>(
  accion: (tx: postgres.TransactionSql) => Promise<T>,
): Promise<T> => {
  let resultado: T | undefined
  try {
    await sql.begin(async (tx) => {
      resultado = await accion(tx)
      throw new Rollback('descartar la transacción de prueba')
    })
  } catch (error) {
    if (!(error instanceof Rollback)) throw error
  }
  return resultado as T
}

interface FilaId {
  readonly id: string
}

/** `noUncheckedIndexedAccess` deja el primer elemento como `T | undefined`; esto lo
 * afirma con un mensaje legible en vez de un `!` que silencia el chequeo del compilador. */
const unaFila = <T>(filas: readonly T[], contexto: string): T => {
  const fila = filas[0]
  if (fila === undefined) {
    throw new Error(`se esperaba al menos una fila: ${contexto}`)
  }
  return fila
}

const crearOrganizationParty = async (tx: postgres.TransactionSql, nombre: string): Promise<string> => {
  const filas = await tx<FilaId[]>`
    insert into party (kind) values ('ORGANIZATION') returning id
  `
  const party = unaFila(filas, 'insert de party ORGANIZATION')
  await tx`
    insert into organization_profile (party_id, legal_name) values (${party.id}, ${nombre})
  `
  return party.id
}

const crearPersonParty = async (tx: postgres.TransactionSql, nombre: string): Promise<string> => {
  const filas = await tx<FilaId[]>`
    insert into party (kind) values ('PERSON') returning id
  `
  const party = unaFila(filas, 'insert de party PERSON')
  await tx`
    insert into person_profile (party_id, first_name, last_name)
    values (${party.id}, ${nombre}, 'Apellido')
  `
  return party.id
}

const crearInsurer = async (tx: postgres.TransactionSql, nombre: string): Promise<string> => {
  const organizationPartyId = await crearOrganizationParty(tx, nombre)
  const filas = await tx<FilaId[]>`
    insert into insurer (organization_party_id, canonical_name)
    values (${organizationPartyId}, ${nombre})
    returning id
  `
  return unaFila(filas, 'insert de insurer').id
}

const crearPolicy = async (tx: postgres.TransactionSql, insurerId: string, numero: string): Promise<string> => {
  const filas = await tx<FilaId[]>`
    insert into policy (insurer_id, policy_number) values (${insurerId}, ${numero}) returning id
  `
  return unaFila(filas, 'insert de policy').id
}

after(async () => {
  await sql.end()
})

// ── Tests positivos: el schema acepta datos válidos del subconjunto de VS01 ─────

describe('positivos — el schema admite el flujo válido de VS01', () => {
  it('Party PERSON, PartyRole PROSPECT, ContactPoint, y una Policy con su PolicyVersion abierta', async () => {
    await enTransaccionDescartable(async (tx) => {
      const personId = await crearPersonParty(tx, 'Positivo')
      await tx`
        insert into party_role (party_id, role) values (${personId}, 'PROSPECT')
      `
      await tx`
        insert into contact_point (party_id, channel, value, normalized_value)
        values (${personId}, 'EMAIL', 'Test@Example.com', 'test@example.com')
      `

      const insurerId = await crearInsurer(tx, 'Aseguradora Positiva')
      const policyId = await crearPolicy(tx, insurerId, 'POS-0001')

      const versiones = await tx<FilaId[]>`
        insert into policy_version (
          policy_id, version_number, effective_from, holder_party_id,
          term_start_date, term_end_date, renewal_mode
        ) values (
          ${policyId}, 1, '2026-01-01', ${personId},
          '2026-01-01', '2027-01-01', 'MANUAL'
        ) returning id
      `
      const version = unaFila(versiones, 'insert de policy_version positivo')

      const filas = await tx`select id from policy_version where id = ${version.id}`
      assert.equal(filas.length, 1)
    })
  })

  it('coverage_data queda NULL sin que ningún DEFAULT lo complete', async () => {
    await enTransaccionDescartable(async (tx) => {
      const personId = await crearPersonParty(tx, 'SinCobertura')
      const insurerId = await crearInsurer(tx, 'Aseguradora Sin Cobertura')
      const policyId = await crearPolicy(tx, insurerId, 'POS-0002')

      const versiones = await tx<{ coverage_data: unknown }[]>`
        insert into policy_version (
          policy_id, version_number, effective_from, holder_party_id,
          term_start_date, term_end_date, renewal_mode
        ) values (
          ${policyId}, 1, '2026-01-01', ${personId},
          '2026-01-01', '2027-01-01', 'MANUAL'
        ) returning coverage_data
      `
      const version = unaFila(versiones, 'insert de policy_version sin coverage_data')

      assert.equal(version.coverage_data, null)
    })
  })
})

// ── Tests negativos: la base rechaza datos que violan el dominio ────────────────

describe('negativos — la base rechaza, no la aplicación', () => {
  it('INV-PV-003: dos PolicyVersion con intervalos solapados', async () => {
    await enTransaccionDescartable(async (tx) => {
      const personId = await crearPersonParty(tx, 'Solapa')
      const insurerId = await crearInsurer(tx, 'Aseguradora Solapada')
      const policyId = await crearPolicy(tx, insurerId, 'OVL-0001')

      await tx`
        insert into policy_version (
          policy_id, version_number, effective_from, effective_to, holder_party_id,
          term_start_date, term_end_date, renewal_mode
        ) values (
          ${policyId}, 1, '2026-01-01', '2026-06-01', ${personId},
          '2026-01-01', '2027-01-01', 'MANUAL'
        )
      `

      await assert.rejects(
        tx`
          insert into policy_version (
            policy_id, version_number, effective_from, effective_to, holder_party_id,
            term_start_date, term_end_date, renewal_mode
          ) values (
            ${policyId}, 2, '2026-03-01', '2026-09-01', ${personId},
            '2026-01-01', '2027-01-01', 'MANUAL'
          )
        `,
        /exclusion/i,
      )
    })
  })

  it('INV-PV-004: dos PolicyVersion abiertas para la misma Policy', async () => {
    await enTransaccionDescartable(async (tx) => {
      const personId = await crearPersonParty(tx, 'DosAbiertas')
      const insurerId = await crearInsurer(tx, 'Aseguradora Dos Abiertas')
      const policyId = await crearPolicy(tx, insurerId, 'OPN-0001')

      await tx`
        insert into policy_version (
          policy_id, version_number, effective_from, holder_party_id,
          term_start_date, term_end_date, renewal_mode
        ) values (
          ${policyId}, 1, '2026-01-01', ${personId},
          '2026-01-01', '2027-01-01', 'MANUAL'
        )
      `

      await assert.rejects(
        tx`
          insert into policy_version (
            policy_id, version_number, effective_from, holder_party_id,
            term_start_date, term_end_date, renewal_mode
          ) values (
            ${policyId}, 2, '2026-06-01', ${personId},
            '2026-01-01', '2027-01-01', 'MANUAL'
          )
        `,
        /exclusion/i,
      )
    })
  })

  it('INV-006: dos PartyRole PROSPECT activos para la misma Party', async () => {
    await enTransaccionDescartable(async (tx) => {
      const personId = await crearPersonParty(tx, 'DosRoles')
      await tx`insert into party_role (party_id, role) values (${personId}, 'PROSPECT')`

      await assert.rejects(
        tx`insert into party_role (party_id, role) values (${personId}, 'PROSPECT')`,
        /exclusion/i,
      )
    })
  })

  it('INV-003: un merge que formaría un ciclo', async () => {
    await enTransaccionDescartable(async (tx) => {
      const a = await crearPersonParty(tx, 'CicloA')
      const b = await crearPersonParty(tx, 'CicloB')

      await tx`update party set status = 'MERGED', merged_into_party_id = ${b} where id = ${a}`

      await assert.rejects(
        tx`update party set status = 'MERGED', merged_into_party_id = ${a} where id = ${b}`,
        /merge cycle detected/i,
      )
    })
  })

  it('INV-020: dos Policy con el mismo par (insurerId, policyNumber)', async () => {
    await enTransaccionDescartable(async (tx) => {
      const insurerId = await crearInsurer(tx, 'Aseguradora Duplicada')
      await crearPolicy(tx, insurerId, 'DUP-0001')

      await assert.rejects(crearPolicy(tx, insurerId, 'DUP-0001'), /duplicate key/i)
    })
  })

  it('INV-023: una PolicyVersion sin holder_party_id', async () => {
    await enTransaccionDescartable(async (tx) => {
      const insurerId = await crearInsurer(tx, 'Aseguradora Sin Tomador')
      const policyId = await crearPolicy(tx, insurerId, 'HLD-0001')

      await assert.rejects(
        tx`
          insert into policy_version (
            policy_id, version_number, effective_from,
            term_start_date, term_end_date, renewal_mode
          ) values (
            ${policyId}, 1, '2026-01-01',
            '2026-01-01', '2027-01-01', 'MANUAL'
          )
        `,
        /null value in column "holder_party_id"/i,
      )
    })
  })

  it('INV-001: cambiar party.id de una Party existente', async () => {
    await enTransaccionDescartable(async (tx) => {
      const personId = await crearPersonParty(tx, 'IdInmutable')

      await assert.rejects(
        tx`update party set id = gen_random_uuid() where id = ${personId}`,
        /es inmutable/i,
      )
    })
  })

  it('INV-002: borrar una Party perdedora después de un merge', async () => {
    await enTransaccionDescartable(async (tx) => {
      const a = await crearPersonParty(tx, 'PerdedoraA')
      const b = await crearPersonParty(tx, 'PerdedoraB')
      await tx`update party set status = 'MERGED', merged_into_party_id = ${b} where id = ${a}`

      await assert.rejects(tx`delete from party where id = ${a}`, /no se puede borrar una Party MERGED/i)
    })
  })

  it('INV-004: borrar un PartyRole', async () => {
    await enTransaccionDescartable(async (tx) => {
      const personId = await crearPersonParty(tx, 'RolBorrado')
      const filas = await tx<FilaId[]>`
        insert into party_role (party_id, role) values (${personId}, 'PROSPECT') returning id
      `
      const rol = unaFila(filas, 'insert de party_role')

      await assert.rejects(tx`delete from party_role where id = ${rol.id}`, /no se puede borrar/i)
    })
  })

  it('INV-PV-005/INV-013: sobrescribir el premium de una PolicyVersion cerrada', async () => {
    await enTransaccionDescartable(async (tx) => {
      const personId = await crearPersonParty(tx, 'VersionCerrada')
      const insurerId = await crearInsurer(tx, 'Aseguradora Version Cerrada')
      const policyId = await crearPolicy(tx, insurerId, 'CLO-0001')

      const filas = await tx<FilaId[]>`
        insert into policy_version (
          policy_id, version_number, effective_from, effective_to, holder_party_id,
          term_start_date, term_end_date, renewal_mode, premium
        ) values (
          ${policyId}, 1, '2026-01-01', '2026-06-01', ${personId},
          '2026-01-01', '2027-01-01', 'MANUAL', 100
        ) returning id
      `
      const version = unaFila(filas, 'insert de policy_version cerrada')

      await assert.rejects(
        tx`update policy_version set premium = 999 where id = ${version.id}`,
        /no se puede modificar una versión ya cerrada/i,
      )
    })
  })

  it('INV-PV-005/INV-013: borrar una PolicyVersion cerrada', async () => {
    await enTransaccionDescartable(async (tx) => {
      const personId = await crearPersonParty(tx, 'VersionCerradaBorrado')
      const insurerId = await crearInsurer(tx, 'Aseguradora Version Cerrada Borrado')
      const policyId = await crearPolicy(tx, insurerId, 'CLO-0002')

      const filas = await tx<FilaId[]>`
        insert into policy_version (
          policy_id, version_number, effective_from, effective_to, holder_party_id,
          term_start_date, term_end_date, renewal_mode
        ) values (
          ${policyId}, 1, '2026-01-01', '2026-06-01', ${personId},
          '2026-01-01', '2027-01-01', 'MANUAL'
        ) returning id
      `
      const version = unaFila(filas, 'insert de policy_version cerrada')

      await assert.rejects(
        tx`delete from policy_version where id = ${version.id}`,
        /no se puede borrar una versión cerrada/i,
      )
    })
  })

  it('cerrar una versión abierta (UPDATE con OLD.effective_to NULL) sigue permitido: no es la escritura que INV-PV-005 prohíbe', async () => {
    await enTransaccionDescartable(async (tx) => {
      const personId = await crearPersonParty(tx, 'CerrarAbierta')
      const insurerId = await crearInsurer(tx, 'Aseguradora Cerrar Abierta')
      const policyId = await crearPolicy(tx, insurerId, 'CLO-0003')

      const filas = await tx<FilaId[]>`
        insert into policy_version (
          policy_id, version_number, effective_from, holder_party_id,
          term_start_date, term_end_date, renewal_mode
        ) values (
          ${policyId}, 1, '2026-01-01', ${personId},
          '2026-01-01', '2027-01-01', 'MANUAL'
        ) returning id
      `
      const version = unaFila(filas, 'insert de policy_version abierta')

      await tx`update policy_version set effective_to = '2026-06-01' where id = ${version.id}`

      const cerrada = await tx<{ effective_to: Date }[]>`
        select effective_to from policy_version where id = ${version.id}
      `
      assert.equal(unaFila(cerrada, 'lectura de versión cerrada').effective_to.toISOString().slice(0, 10), '2026-06-01')
    })
  })

  it('BR-008 consecuencia práctica: insertar historia ya cerrada (carga inicial de T-0013) sigue permitido', async () => {
    await enTransaccionDescartable(async (tx) => {
      const personId = await crearPersonParty(tx, 'CargaHistorica')
      const insurerId = await crearInsurer(tx, 'Aseguradora Carga Historica')
      const policyId = await crearPolicy(tx, insurerId, 'HIS-0001')

      const filas = await tx<FilaId[]>`
        insert into policy_version (
          policy_id, version_number, effective_from, effective_to, holder_party_id,
          term_start_date, term_end_date, renewal_mode
        ) values (
          ${policyId}, 1, '2025-01-01', '2026-01-01', ${personId},
          '2025-01-01', '2026-01-01', 'MANUAL'
        ) returning id
      `
      assert.ok(unaFila(filas, 'insert de historia ya cerrada').id)
    })
  })

  it('BR-004: PolicyVersion.endorsement_id apuntando a un Endorsement de otra Policy', async () => {
    await enTransaccionDescartable(async (tx) => {
      const personId = await crearPersonParty(tx, 'EndorsementCruzado')
      const insurerId = await crearInsurer(tx, 'Aseguradora Endorsement Cruzado')
      const policyId1 = await crearPolicy(tx, insurerId, 'END-0001')
      const policyId2 = await crearPolicy(tx, insurerId, 'END-0002')

      const endorsements = await tx<FilaId[]>`
        insert into endorsement (policy_id, kind, source_reference)
        values (${policyId2}, 'ENDOSO', 'src-1')
        returning id
      `
      const endorsement = unaFila(endorsements, 'insert de endorsement de policyId2')

      await assert.rejects(
        tx`
          insert into policy_version (
            policy_id, version_number, effective_from, holder_party_id,
            term_start_date, term_end_date, renewal_mode, endorsement_id
          ) values (
            ${policyId1}, 1, '2026-01-01', ${personId},
            '2026-01-01', '2027-01-01', 'MANUAL', ${endorsement.id}
          )
        `,
        /foreign key/i,
      )
    })
  })

  it('BR-005: cambiar party.kind con un PersonProfile dependiente', async () => {
    await enTransaccionDescartable(async (tx) => {
      const personId = await crearPersonParty(tx, 'KindCambiado')

      await assert.rejects(
        tx`update party set kind = 'ORGANIZATION' where id = ${personId}`,
        /no se puede cambiar kind/i,
      )
    })
  })

  it('BR-006: borrar una Policy con un DocumentLink asociado', async () => {
    await enTransaccionDescartable(async (tx) => {
      const insurerId = await crearInsurer(tx, 'Aseguradora Con Documento')
      const policyId = await crearPolicy(tx, insurerId, 'DOC-0001')

      await tx`
        insert into document_link (
          resource_type, resource_id, drive_file_id, drive_item_type, reconciliation_status
        ) values ('POLICY', ${policyId}, 'drive-file-1', 'FILE', 'SYNCED')
      `

      await assert.rejects(tx`delete from policy where id = ${policyId}`, /document_link asociados/i)
    })
  })

  it('BR-007: coverage_data sin linaje de origen (coverage_source_batch_id/record_id)', async () => {
    await enTransaccionDescartable(async (tx) => {
      const personId = await crearPersonParty(tx, 'SinLinaje')
      const insurerId = await crearInsurer(tx, 'Aseguradora Sin Linaje')
      const policyId = await crearPolicy(tx, insurerId, 'LIN-0001')

      await assert.rejects(
        tx`
          insert into policy_version (
            policy_id, version_number, effective_from, holder_party_id,
            term_start_date, term_end_date, renewal_mode, coverage_data
          ) values (
            ${policyId}, 1, '2026-01-01', ${personId},
            '2026-01-01', '2027-01-01', 'MANUAL', '{"incendio": true}'::jsonb
          )
        `,
        /policy_version_coverage_lineage/i,
      )
    })
  })

  it('INV-022: modificar source_value de un ExternalReference ya insertado', async () => {
    await enTransaccionDescartable(async (tx) => {
      const referencias = await tx<FilaId[]>`
        insert into external_reference (
          source_system, source_entity_type, source_value, relation_type, resolution_status
        ) values ('zoho', 'Policy', 'ORIGINAL-0001', 'renewal_predecessor', 'UNRESOLVED')
        returning id
      `
      const reference = unaFila(referencias, 'insert de external_reference')

      await assert.rejects(
        tx`update external_reference set source_value = 'MODIFICADO' where id = ${reference.id}`,
        /son inmutables/i,
      )
    })
  })
})

// ── Prueba de causalidad: cada mecanismo se retira, se comprueba la aceptación, y se
// restaura mostrando el rechazo de nuevo. Todo dentro de transacciones descartables:
// nunca se deja el schema alterado. → ## Verification de T-0012

describe('causalidad — cada test negativo mide el mecanismo que dice medir', () => {
  it('INV-PV-003/004: retirando el EXCLUDE de policy_version, el solapamiento se acepta; restaurado, se vuelve a rechazar', async () => {
    const aceptadaSinConstraint = await enTransaccionDescartable(async (tx) => {
      const personId = await crearPersonParty(tx, 'CausalidadPV')
      const insurerId = await crearInsurer(tx, 'Aseguradora Causalidad PV')
      const policyId = await crearPolicy(tx, insurerId, 'CAU-0001')

      await tx`alter table policy_version drop constraint policy_version_policy_id_daterange_excl`

      await tx`
        insert into policy_version (
          policy_id, version_number, effective_from, effective_to, holder_party_id,
          term_start_date, term_end_date, renewal_mode
        ) values (
          ${policyId}, 1, '2026-01-01', '2026-06-01', ${personId},
          '2026-01-01', '2027-01-01', 'MANUAL'
        )
      `
      await tx`
        insert into policy_version (
          policy_id, version_number, effective_from, effective_to, holder_party_id,
          term_start_date, term_end_date, renewal_mode
        ) values (
          ${policyId}, 2, '2026-03-01', '2026-09-01', ${personId},
          '2026-01-01', '2027-01-01', 'MANUAL'
        )
      `

      const filas = await tx<{ total: number }[]>`
        select count(*)::int as total from policy_version where policy_id = ${policyId}
      `
      return unaFila(filas, 'conteo de policy_version').total
    })

    assert.equal(
      aceptadaSinConstraint,
      2,
      'sin el EXCLUDE, las dos versiones solapadas se insertaron: la constraint es la causa real del rechazo',
    )

    // Constraint restaurada (la transacción anterior se revirtió) — el mismo caso vuelve a fallar.
    await enTransaccionDescartable(async (tx) => {
      const personId = await crearPersonParty(tx, 'CausalidadPVRestaurada')
      const insurerId = await crearInsurer(tx, 'Aseguradora Causalidad PV Restaurada')
      const policyId = await crearPolicy(tx, insurerId, 'CAU-0002')

      await tx`
        insert into policy_version (
          policy_id, version_number, effective_from, effective_to, holder_party_id,
          term_start_date, term_end_date, renewal_mode
        ) values (
          ${policyId}, 1, '2026-01-01', '2026-06-01', ${personId},
          '2026-01-01', '2027-01-01', 'MANUAL'
        )
      `

      await assert.rejects(
        tx`
          insert into policy_version (
            policy_id, version_number, effective_from, effective_to, holder_party_id,
            term_start_date, term_end_date, renewal_mode
          ) values (
            ${policyId}, 2, '2026-03-01', '2026-09-01', ${personId},
            '2026-01-01', '2027-01-01', 'MANUAL'
          )
        `,
        /exclusion/i,
      )
    })
  })

  it('INV-006: retirando el EXCLUDE de party_role, dos roles activos se aceptan; restaurado, se vuelve a rechazar', async () => {
    const aceptadaSinConstraint = await enTransaccionDescartable(async (tx) => {
      const personId = await crearPersonParty(tx, 'CausalidadRol')
      await tx`alter table party_role drop constraint party_role_party_id_role_tstzrange_excl`

      await tx`insert into party_role (party_id, role) values (${personId}, 'PROSPECT')`
      await tx`insert into party_role (party_id, role) values (${personId}, 'PROSPECT')`

      const filas = await tx<{ total: number }[]>`
        select count(*)::int as total from party_role where party_id = ${personId}
      `
      return unaFila(filas, 'conteo de party_role').total
    })

    assert.equal(
      aceptadaSinConstraint,
      2,
      'sin el EXCLUDE, los dos roles activos se insertaron: la constraint es la causa real del rechazo',
    )

    await enTransaccionDescartable(async (tx) => {
      const personId = await crearPersonParty(tx, 'CausalidadRolRestaurada')
      await tx`insert into party_role (party_id, role) values (${personId}, 'PROSPECT')`

      await assert.rejects(
        tx`insert into party_role (party_id, role) values (${personId}, 'PROSPECT')`,
        /exclusion/i,
      )
    })
  })

  it('INV-003: retirando el trigger de ciclos, un merge cíclico se acepta; restaurado, se vuelve a rechazar', async () => {
    const aceptadoSinTrigger = await enTransaccionDescartable(async (tx) => {
      const a = await crearPersonParty(tx, 'CausalidadCicloA')
      const b = await crearPersonParty(tx, 'CausalidadCicloB')

      await tx`drop trigger party_merge_cycle_guard on party`

      await tx`update party set status = 'MERGED', merged_into_party_id = ${b} where id = ${a}`
      await tx`update party set status = 'MERGED', merged_into_party_id = ${a} where id = ${b}`

      const filas = await tx<{ merged_into_party_id: string }[]>`
        select merged_into_party_id from party where id = ${b}
      `
      return unaFila(filas, 'lectura de party mergeada').merged_into_party_id === a
    })

    assert.equal(
      aceptadoSinTrigger,
      true,
      'sin el trigger, el ciclo A->B->A se completó: el trigger es la causa real del rechazo',
    )

    await enTransaccionDescartable(async (tx) => {
      const a = await crearPersonParty(tx, 'CausalidadCicloARestaurada')
      const b = await crearPersonParty(tx, 'CausalidadCicloBRestaurada')

      await tx`update party set status = 'MERGED', merged_into_party_id = ${b} where id = ${a}`

      await assert.rejects(
        tx`update party set status = 'MERGED', merged_into_party_id = ${a} where id = ${b}`,
        /merge cycle detected/i,
      )
    })
  })

  it('INV-022: retirando el trigger de inmutabilidad, source_value se puede sobrescribir; restaurado, se vuelve a rechazar', async () => {
    const seModifico = await enTransaccionDescartable(async (tx) => {
      const referencias = await tx<FilaId[]>`
        insert into external_reference (
          source_system, source_entity_type, source_value, relation_type, resolution_status
        ) values ('zoho', 'Policy', 'ORIGINAL-CAUSALIDAD', 'renewal_predecessor', 'UNRESOLVED')
        returning id
      `
      const reference = unaFila(referencias, 'insert de external_reference para causalidad')

      await tx`drop trigger external_reference_immutable_source on external_reference`
      await tx`update external_reference set source_value = 'MODIFICADO' where id = ${reference.id}`

      const filas = await tx<{ source_value: string }[]>`
        select source_value from external_reference where id = ${reference.id}
      `
      return unaFila(filas, 'lectura de external_reference modificada').source_value === 'MODIFICADO'
    })

    assert.equal(
      seModifico,
      true,
      'sin el trigger, source_value se sobrescribió: el trigger es la causa real del rechazo',
    )

    await enTransaccionDescartable(async (tx) => {
      const referencias = await tx<FilaId[]>`
        insert into external_reference (
          source_system, source_entity_type, source_value, relation_type, resolution_status
        ) values ('zoho', 'Policy', 'ORIGINAL-CAUSALIDAD-2', 'renewal_predecessor', 'UNRESOLVED')
        returning id
      `
      const reference = unaFila(referencias, 'insert de external_reference restaurado')

      await assert.rejects(
        tx`update external_reference set source_value = 'MODIFICADO' where id = ${reference.id}`,
        /son inmutables/i,
      )
    })
  })

/** Party sin PersonProfile/OrganizationProfile: para causalidad de INV-001/INV-002,
 * donde la FK de un profile taparía el mecanismo real que se quiere medir. */
const crearPartyDesnuda = async (tx: postgres.TransactionSql): Promise<string> => {
  const filas = await tx<FilaId[]>`insert into party (kind) values ('PERSON') returning id`
  return unaFila(filas, 'insert de party sin profile').id
}

  it('INV-001: retirando party_id_immutable, party.id se puede cambiar; restaurado, se vuelve a rechazar', async () => {
    const seModifico = await enTransaccionDescartable(async (tx) => {
      const personId = await crearPartyDesnuda(tx)
      await tx`drop trigger party_id_immutable on party`

      const nuevoId = await tx<FilaId[]>`
        update party set id = gen_random_uuid() where id = ${personId} returning id
      `
      return unaFila(nuevoId, 'party con id cambiado').id !== personId
    })

    assert.equal(seModifico, true, 'sin el trigger, party.id se pudo cambiar: el trigger es la causa real del rechazo')

    await enTransaccionDescartable(async (tx) => {
      const personId = await crearPartyDesnuda(tx)
      await assert.rejects(
        tx`update party set id = gen_random_uuid() where id = ${personId}`,
        /es inmutable/i,
      )
    })
  })

  it('INV-002: retirando party_merged_no_delete, una Party MERGED se puede borrar; restaurado, se vuelve a rechazar', async () => {
    const seBorro = await enTransaccionDescartable(async (tx) => {
      const a = await crearPartyDesnuda(tx)
      const b = await crearPartyDesnuda(tx)
      await tx`update party set status = 'MERGED', merged_into_party_id = ${b} where id = ${a}`
      await tx`drop trigger party_merged_no_delete on party`

      await tx`delete from party where id = ${a}`
      const filas = await tx`select id from party where id = ${a}`
      return filas.length === 0
    })

    assert.equal(seBorro, true, 'sin el trigger, la Party MERGED se borró: el trigger es la causa real del rechazo')

    await enTransaccionDescartable(async (tx) => {
      const a = await crearPartyDesnuda(tx)
      const b = await crearPartyDesnuda(tx)
      await tx`update party set status = 'MERGED', merged_into_party_id = ${b} where id = ${a}`

      await assert.rejects(tx`delete from party where id = ${a}`, /no se puede borrar una Party MERGED/i)
    })
  })

  it('INV-004: retirando party_role_no_delete, un PartyRole se puede borrar; restaurado, se vuelve a rechazar', async () => {
    const seBorro = await enTransaccionDescartable(async (tx) => {
      const personId = await crearPersonParty(tx, 'CausalidadRolBorrado')
      const filas = await tx<FilaId[]>`
        insert into party_role (party_id, role) values (${personId}, 'PROSPECT') returning id
      `
      const rol = unaFila(filas, 'insert de party_role')
      await tx`drop trigger party_role_no_delete on party_role`

      await tx`delete from party_role where id = ${rol.id}`
      const restante = await tx`select id from party_role where id = ${rol.id}`
      return restante.length === 0
    })

    assert.equal(seBorro, true, 'sin el trigger, el PartyRole se borró: el trigger es la causa real del rechazo')

    await enTransaccionDescartable(async (tx) => {
      const personId = await crearPersonParty(tx, 'CausalidadRolBorradoRestaurada')
      const filas = await tx<FilaId[]>`
        insert into party_role (party_id, role) values (${personId}, 'PROSPECT') returning id
      `
      const rol = unaFila(filas, 'insert de party_role restaurado')
      await assert.rejects(tx`delete from party_role where id = ${rol.id}`, /no se puede borrar/i)
    })
  })

  it('INV-PV-005/INV-013: retirando policy_version_closed_immutable, una versión cerrada se puede sobrescribir; restaurado, se vuelve a rechazar', async () => {
    const seModifico = await enTransaccionDescartable(async (tx) => {
      const personId = await crearPersonParty(tx, 'CausalidadCerrada')
      const insurerId = await crearInsurer(tx, 'Aseguradora Causalidad Cerrada')
      const policyId = await crearPolicy(tx, insurerId, 'CAU-CLO-0001')

      const filas = await tx<FilaId[]>`
        insert into policy_version (
          policy_id, version_number, effective_from, effective_to, holder_party_id,
          term_start_date, term_end_date, renewal_mode, premium
        ) values (
          ${policyId}, 1, '2026-01-01', '2026-06-01', ${personId},
          '2026-01-01', '2027-01-01', 'MANUAL', 100
        ) returning id
      `
      const version = unaFila(filas, 'insert de policy_version cerrada')
      await tx`drop trigger policy_version_closed_immutable on policy_version`

      await tx`update policy_version set premium = 999 where id = ${version.id}`
      const leida = await tx<{ premium: string }[]>`select premium from policy_version where id = ${version.id}`
      return unaFila(leida, 'lectura de premium modificado').premium === '999'
    })

    assert.equal(
      seModifico,
      true,
      'sin el trigger, la versión cerrada se sobrescribió: el trigger es la causa real del rechazo',
    )

    await enTransaccionDescartable(async (tx) => {
      const personId = await crearPersonParty(tx, 'CausalidadCerradaRestaurada')
      const insurerId = await crearInsurer(tx, 'Aseguradora Causalidad Cerrada Restaurada')
      const policyId = await crearPolicy(tx, insurerId, 'CAU-CLO-0002')

      const filas = await tx<FilaId[]>`
        insert into policy_version (
          policy_id, version_number, effective_from, effective_to, holder_party_id,
          term_start_date, term_end_date, renewal_mode
        ) values (
          ${policyId}, 1, '2026-01-01', '2026-06-01', ${personId},
          '2026-01-01', '2027-01-01', 'MANUAL'
        ) returning id
      `
      const version = unaFila(filas, 'insert de policy_version cerrada restaurada')

      await assert.rejects(
        tx`update policy_version set premium = 999 where id = ${version.id}`,
        /no se puede modificar una versión ya cerrada/i,
      )
    })
  })

  it('BR-005: retirando party_kind_immutable_with_dependents, party.kind se puede cambiar con dependientes; restaurado, se vuelve a rechazar', async () => {
    const seModifico = await enTransaccionDescartable(async (tx) => {
      const personId = await crearPersonParty(tx, 'CausalidadKind')
      await tx`drop trigger party_kind_immutable_with_dependents on party`

      await tx`update party set kind = 'ORGANIZATION' where id = ${personId}`
      const filas = await tx<{ kind: string }[]>`select kind from party where id = ${personId}`
      return unaFila(filas, 'lectura de kind modificado').kind === 'ORGANIZATION'
    })

    assert.equal(
      seModifico,
      true,
      'sin el trigger, party.kind se cambió con un PersonProfile dependiente: el trigger es la causa real del rechazo',
    )

    await enTransaccionDescartable(async (tx) => {
      const personId = await crearPersonParty(tx, 'CausalidadKindRestaurada')
      await assert.rejects(
        tx`update party set kind = 'ORGANIZATION' where id = ${personId}`,
        /no se puede cambiar kind/i,
      )
    })
  })

  it('BR-006: retirando policy_no_delete_with_document_links, una Policy con DocumentLink se puede borrar; restaurado, se vuelve a rechazar', async () => {
    const seBorro = await enTransaccionDescartable(async (tx) => {
      const insurerId = await crearInsurer(tx, 'Aseguradora Causalidad Documento')
      const policyId = await crearPolicy(tx, insurerId, 'CAU-DOC-0001')
      await tx`
        insert into document_link (
          resource_type, resource_id, drive_file_id, drive_item_type, reconciliation_status
        ) values ('POLICY', ${policyId}, 'drive-file-causal', 'FILE', 'SYNCED')
      `
      await tx`drop trigger policy_no_delete_with_document_links on policy`

      await tx`delete from policy where id = ${policyId}`
      const restante = await tx`select id from policy where id = ${policyId}`
      return restante.length === 0
    })

    assert.equal(
      seBorro,
      true,
      'sin el trigger, la Policy con DocumentLink se borró: el trigger es la causa real del rechazo',
    )

    await enTransaccionDescartable(async (tx) => {
      const insurerId = await crearInsurer(tx, 'Aseguradora Causalidad Documento Restaurada')
      const policyId = await crearPolicy(tx, insurerId, 'CAU-DOC-0002')
      await tx`
        insert into document_link (
          resource_type, resource_id, drive_file_id, drive_item_type, reconciliation_status
        ) values ('POLICY', ${policyId}, 'drive-file-causal-2', 'FILE', 'SYNCED')
      `

      await assert.rejects(tx`delete from policy where id = ${policyId}`, /document_link asociados/i)
    })
  })

  it('BR-007: retirando policy_version_coverage_lineage, coverage_data sin linaje se acepta; restaurado, se vuelve a rechazar', async () => {
    const seAcepto = await enTransaccionDescartable(async (tx) => {
      const personId = await crearPersonParty(tx, 'CausalidadLinaje')
      const insurerId = await crearInsurer(tx, 'Aseguradora Causalidad Linaje')
      const policyId = await crearPolicy(tx, insurerId, 'CAU-LIN-0001')
      await tx`alter table policy_version drop constraint policy_version_coverage_lineage`

      const filas = await tx<FilaId[]>`
        insert into policy_version (
          policy_id, version_number, effective_from, holder_party_id,
          term_start_date, term_end_date, renewal_mode, coverage_data
        ) values (
          ${policyId}, 1, '2026-01-01', ${personId},
          '2026-01-01', '2027-01-01', 'MANUAL', '{"incendio": true}'::jsonb
        ) returning id
      `
      return Boolean(unaFila(filas, 'insert de coverage_data sin linaje').id)
    })

    assert.equal(
      seAcepto,
      true,
      'sin el CHECK, coverage_data sin linaje se insertó: la constraint es la causa real del rechazo',
    )

    await enTransaccionDescartable(async (tx) => {
      const personId = await crearPersonParty(tx, 'CausalidadLinajeRestaurada')
      const insurerId = await crearInsurer(tx, 'Aseguradora Causalidad Linaje Restaurada')
      const policyId = await crearPolicy(tx, insurerId, 'CAU-LIN-0002')

      await assert.rejects(
        tx`
          insert into policy_version (
            policy_id, version_number, effective_from, holder_party_id,
            term_start_date, term_end_date, renewal_mode, coverage_data
          ) values (
            ${policyId}, 1, '2026-01-01', ${personId},
            '2026-01-01', '2027-01-01', 'MANUAL', '{"incendio": true}'::jsonb
          )
        `,
        /policy_version_coverage_lineage/i,
      )
    })
  })
})

// ── BR-001 (revisión ciega T-0012): reproducción con DOS SESIONES REALES Y
// SIMULTÁNEAS, no secuencial. Un test secuencial no puede reproducir esta falla,
// porque el problema es exactamente que un trigger recursivo no ve las filas no
// commiteadas de OTRA transacción concurrente. Esta suite:
//   1. despliega una versión SIN el advisory lock del trigger (con un pg_sleep
//      deliberado para forzar la interseccion de ambas transacciones) y demuestra
//      que dos merges concurrentes A→B y B→A confirman un ciclo,
//   2. restaura la función real de la migración (con el lock) y demuestra que la
//      misma reproducción, con sesiones nuevas, ya no forma un ciclo.
// Todo corre contra filas reales, commiteadas — no hay rollback posible acá porque
// el punto es observar el efecto de dos transacciones que sí confirman.

const FUNCION_CON_LOCK = `
create or replace function prevent_party_merge_cycle() returns trigger
language plpgsql as $f$
declare
  cursor_id uuid;
  visited uuid[] := array[new.id];
begin
  if new.merged_into_party_id is null then
    return new;
  end if;

  perform pg_advisory_xact_lock(7346501);

  cursor_id := new.merged_into_party_id;
  loop
    if cursor_id = any (visited) then
      raise exception
        'merge cycle detected: party % cannot merge into % without forming a cycle (INV-003)',
        new.id, new.merged_into_party_id;
    end if;
    visited := visited || cursor_id;

    select merged_into_party_id into cursor_id from party where id = cursor_id;
    if cursor_id is null then
      exit;
    end if;
  end loop;

  return new;
end;
$f$;
`

const FUNCION_SIN_LOCK_CON_SLEEP = `
create or replace function prevent_party_merge_cycle() returns trigger
language plpgsql as $f$
declare
  cursor_id uuid;
  visited uuid[] := array[new.id];
begin
  if new.merged_into_party_id is null then
    return new;
  end if;

  -- Sin advisory lock. pg_sleep fuerza que ambas sesiones concurrentes estén "a
  -- mitad" del trigger al mismo tiempo, para no depender de timing de scheduler.
  perform pg_sleep(0.3);

  cursor_id := new.merged_into_party_id;
  loop
    if cursor_id = any (visited) then
      raise exception
        'merge cycle detected: party % cannot merge into % without forming a cycle (INV-003)',
        new.id, new.merged_into_party_id;
    end if;
    visited := visited || cursor_id;

    select merged_into_party_id into cursor_id from party where id = cursor_id;
    if cursor_id is null then
      exit;
    end if;
  end loop;

  return new;
end;
$f$;
`

/** Deja A y B como Party ACTIVE sin merge, sin borrarlas (party_merged_no_delete lo impide). */
const desmergearYLimpiar = async (a: string, b: string): Promise<void> => {
  await sql`update party set status = 'ACTIVE', merged_into_party_id = null where id in (${a}, ${b})`
}

describe('concurrencia — BR-001: INV-003 con dos sesiones reales y simultáneas', () => {
  it('sin el advisory lock, dos merges concurrentes A→B y B→A confirman un ciclo', async () => {
    await sql.unsafe(FUNCION_SIN_LOCK_CON_SLEEP)

    const filasA = await sql<FilaId[]>`insert into party (kind) values ('PERSON') returning id`
    const filasB = await sql<FilaId[]>`insert into party (kind) values ('PERSON') returning id`
    const a = unaFila(filasA, 'party A concurrencia sin lock').id
    const b = unaFila(filasB, 'party B concurrencia sin lock').id

    const clienteA = postgres(databaseUrl, { max: 1 })
    const clienteB = postgres(databaseUrl, { max: 1 })

    try {
      const resultados = await Promise.allSettled([
        clienteA.begin(async (tx) => {
          await tx`update party set status = 'MERGED', merged_into_party_id = ${b} where id = ${a}`
        }),
        clienteB.begin(async (tx) => {
          await tx`update party set status = 'MERGED', merged_into_party_id = ${a} where id = ${b}`
        }),
      ])

      assert.equal(
        resultados.every((resultado) => resultado.status === 'fulfilled'),
        true,
        `sin el lock, se esperaba que ambas transacciones confirmaran: ${JSON.stringify(resultados)}`,
      )

      const filas = await sql<{ id: string; merged_into_party_id: string }[]>`
        select id, merged_into_party_id from party where id in (${a}, ${b})
      `
      const porId = new Map(filas.map((fila) => [fila.id, fila.merged_into_party_id]))
      const hayCiclo = porId.get(a) === b && porId.get(b) === a

      assert.equal(
        hayCiclo,
        true,
        'sin el advisory lock, las dos transacciones concurrentes confirmaron un ciclo A→B→A: ' +
          'la ausencia de serialización es la causa real del defecto BR-001',
      )
    } finally {
      await clienteA.end()
      await clienteB.end()
      await desmergearYLimpiar(a, b)
      await sql.unsafe(FUNCION_CON_LOCK)
    }
  })

  it('con el advisory lock (mecanismo real de la migración), la misma reproducción no confirma un ciclo', async () => {
    const filasA = await sql<FilaId[]>`insert into party (kind) values ('PERSON') returning id`
    const filasB = await sql<FilaId[]>`insert into party (kind) values ('PERSON') returning id`
    const a = unaFila(filasA, 'party A concurrencia con lock').id
    const b = unaFila(filasB, 'party B concurrencia con lock').id

    const clienteA = postgres(databaseUrl, { max: 1 })
    const clienteB = postgres(databaseUrl, { max: 1 })

    try {
      const resultados = await Promise.allSettled([
        clienteA.begin(async (tx) => {
          await tx`update party set status = 'MERGED', merged_into_party_id = ${b} where id = ${a}`
        }),
        clienteB.begin(async (tx) => {
          await tx`update party set status = 'MERGED', merged_into_party_id = ${a} where id = ${b}`
        }),
      ])

      const rechazos = resultados.filter((resultado) => resultado.status === 'rejected')
      assert.equal(
        rechazos.length >= 1,
        true,
        `con el lock, se esperaba que al menos una transacción fuera rechazada: ${JSON.stringify(resultados)}`,
      )

      const filas = await sql<{ id: string; merged_into_party_id: string }[]>`
        select id, merged_into_party_id from party where id in (${a}, ${b})
      `
      const porId = new Map(filas.map((fila) => [fila.id, fila.merged_into_party_id]))
      const hayCiclo = porId.get(a) === b && porId.get(b) === a

      assert.equal(
        hayCiclo,
        false,
        'con el advisory lock, las dos transacciones concurrentes NO confirmaron un ciclo: ' +
          'la serialización de BR-001 es la causa real de que el ciclo no se forme',
      )
    } finally {
      await clienteA.end()
      await clienteB.end()
      await desmergearYLimpiar(a, b)
    }
  })
})
