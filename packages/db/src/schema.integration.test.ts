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

  it('INV-PV-004: el índice único parcial NO es la causa real mientras el EXCLUDE exista (hallazgo documentado en D-0051)', async () => {
    const seRechazoSoloConIndiceParcialRetirado = await enTransaccionDescartable(async (tx) => {
      const personId = await crearPersonParty(tx, 'CausalidadIndiceParcial')
      const insurerId = await crearInsurer(tx, 'Aseguradora Indice Parcial')
      const policyId = await crearPolicy(tx, insurerId, 'CAU-0003')

      await tx`drop index policy_version_one_open_per_policy`

      await tx`
        insert into policy_version (
          policy_id, version_number, effective_from, holder_party_id,
          term_start_date, term_end_date, renewal_mode
        ) values (
          ${policyId}, 1, '2026-01-01', ${personId},
          '2026-01-01', '2027-01-01', 'MANUAL'
        )
      `

      let rechazada = false
      try {
        await tx`
          insert into policy_version (
            policy_id, version_number, effective_from, holder_party_id,
            term_start_date, term_end_date, renewal_mode
          ) values (
            ${policyId}, 2, '2026-06-01', ${personId},
            '2026-01-01', '2027-01-01', 'MANUAL'
          )
        `
      } catch {
        rechazada = true
      }
      return rechazada
    })

    assert.equal(
      seRechazoSoloConIndiceParcialRetirado,
      true,
      'con el índice único parcial retirado pero el EXCLUDE intacto, la segunda versión abierta sigue rechazada: ' +
        'el EXCLUDE es la causa real, no el índice parcial (documentado en D-0051)',
    )
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
})
