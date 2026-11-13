// T-0035 — `conDatos`: las consultas reales de VS01, como `broker_app`. Contra un
// Postgres real (R-26), con datos sintéticos y cada caso en una transacción revertida
// (R-19). Requiere DATABASE_URL con las migraciones hasta 0010 aplicadas.

import assert from 'node:assert/strict'
import { after, describe, it } from 'node:test'

import { getDocumentAccessForPolicies, getPolicyDetail } from '@del-campo/db'
import postgres from 'postgres'

import type { Principal } from '../session/admission.ts'
import { leerLote } from '../vs01/batch.ts'
import { AccesoDenegado, conDatos } from './datos.ts'

const databaseUrl = process.env.DATABASE_URL
if (databaseUrl === undefined || databaseUrl === '') {
  throw new Error('DATABASE_URL no está configurada: T-0035 requiere PostgreSQL real.')
}

const sql = postgres(databaseUrl, { max: 1, prepare: false, onnotice: () => undefined })

after(async () => {
  await sql.end()
})

class Rollback extends Error {}

const descartable = async <T>(accion: (tx: postgres.TransactionSql) => Promise<T>): Promise<T> => {
  let resultado: T | undefined
  try {
    await sql.begin(async (tx) => {
      resultado = await accion(tx)
      throw new Rollback('descartar')
    })
  } catch (error) {
    if (!(error instanceof Rollback)) throw error
  }
  return resultado as T
}

interface Id {
  readonly id: string
}

const uno = <T>(filas: readonly T[]): T => {
  const [fila] = filas
  if (fila === undefined) throw new Error('se esperaba una fila')
  return fila
}

const principal = (sub: string): Principal => ({ sub, email: `${sub}@sintetico.test`, displayName: null })

// E1 es una empresa y P1 su empleado. polE1 es de E1 y tiene una referencia documental
// de Zoho; polP1 es la póliza personal de P1. `sub-op` es un Operador con E1 asignada;
// `sub-baja` lo mismo, pero dado de baja.
interface Mundo {
  readonly polE1: string
  readonly polP1: string
}

const sembrar = async (tx: postgres.TransactionSql): Promise<Mundo> => {
  const party = async (kind: 'PERSON' | 'ORGANIZATION'): Promise<string> =>
    uno(await tx<Id[]>`insert into party (kind) values (${kind}) returning id`).id
  const e1 = await party('ORGANIZATION')
  const p1 = await party('PERSON')
  const aseguradora = await party('ORGANIZATION')
  await tx`
    insert into organization_membership (organization_party_id, person_party_id, kind, valid_from)
    values (${e1}, ${p1}, 'EMPLOYEE', now() - interval '1 year')
  `
  const insurer = uno(
    await tx<Id[]>`insert into insurer (organization_party_id, canonical_name) values (${aseguradora}, 'Aseguradora Sintética') returning id`,
  ).id
  const poliza = async (numero: string, tomador: string): Promise<string> => {
    const id = uno(await tx<Id[]>`insert into policy (insurer_id, policy_number) values (${insurer}, ${numero}) returning id`).id
    await tx`
      insert into policy_version (
        policy_id, version_number, effective_from, holder_party_id,
        term_start_date, term_end_date, renewal_mode, status, source_event_type
      )
      values (${id}, 1, current_date - 30, ${tomador}, current_date - 30, current_date + 335, 'MANUAL', 'ACTIVE', 'ISSUANCE')
    `
    return id
  }
  const polE1 = await poliza('SINT-DATOS-E1', e1)
  const polP1 = await poliza('SINT-DATOS-P1', p1)

  const referencia = uno(
    await tx<Id[]>`
      insert into external_reference (
        source_system, source_entity_type, source_external_id, source_value,
        relation_type, resolution_status, unresolved_reason
      ) values (
        'fixture', 'SyntheticDocument', 'DOC-DATOS', 'Documento Sintético',
        'POLICY_DOCUMENT', 'UNRESOLVED', 'MOTIVO_SINTETICO_NO_RESUELTO'
      ) returning id
    `,
  ).id
  await tx`insert into policy_document_reference (external_reference_id, policy_id) values (${referencia}, ${polE1})`
  await tx`set constraints all immediate`
  await tx`
    insert into staging_import_batch (started_at, source_manifest_sha256, notes)
    values (now(), repeat('a', 64), 'lote sintético')
  `

  const operador = async (sub: string, status: string): Promise<void> => {
    const usuario = uno(
      await tx<Id[]>`
        insert into app_user (email, status, auth_provider, role)
        values (${`${sub}@sintetico.test`}, ${status}, 'google', 'OPERADOR') returning id
      `,
    ).id
    await tx`insert into user_credential (user_id, provider, subject) values (${usuario}, 'google', ${sub})`
    await tx`
      insert into client_assignment (user_id, client_party_id, valid)
      values (${usuario}, ${e1}, tstzrange(now() - interval '1 day', null, '[)'))
    `
  }
  await operador('sub-op', 'ACTIVE')
  await operador('sub-baja', 'INACTIVE')
  return { polE1, polP1 }
}

const motivo = async (promesa: Promise<unknown>): Promise<string> => {
  try {
    await promesa
    return 'sin error'
  } catch (error) {
    if (error instanceof AccesoDenegado) return error.motivo
    throw error
  }
}

describe('conDatos: las consultas de VS01 corren restringidas', () => {
  it('la consulta corre como broker_app, y el Operador ve también la póliza de un cliente que no tiene asignado', async () => {
    const hoy = new Date().toISOString().slice(0, 10)
    const r = await descartable(async (tx) => {
      const m = await sembrar(tx)
      return conDatos(tx, principal('sub-op'), async (ejecutor) => ({
        rol: uno(await ejecutor<{ rol: string }[]>`select current_user as rol`).rol,
        deEmpresa: await getPolicyDetail(ejecutor, m.polE1, hoy),
        personal: await getPolicyDetail(ejecutor, m.polP1, hoy),
      }))
    })
    assert.equal(r.rol, 'broker_app')
    assert.notEqual(r.deEmpresa, null)
    assert.notEqual(r.personal, null)
  })

  it('la referencia documental y el lote se leen igual que con la conexión dueña: sin 42501 por falta de grants (0010)', async () => {
    const leer = async (ejecutor: postgres.Sql | postgres.TransactionSql, polizas: readonly string[]) => ({
      acceso: await getDocumentAccessForPolicies(ejecutor, polizas),
      lote: await leerLote(ejecutor),
    })
    const r = await descartable(async (tx) => {
      const m = await sembrar(tx)
      const duena = await leer(tx, [m.polE1])
      const oidc = await conDatos(tx, principal('sub-op'), (e) => leer(e, [m.polE1]))
      return { duena, oidc }
    })
    assert.deepEqual(r.oidc, r.duena)
    assert.equal(r.oidc.lote.known, true)
    assert.equal(r.oidc.lote.manifestPrefix, 'a'.repeat(12))
  })

  it('el resto de staging sigue cerrado para broker_app, incluidas las notas del lote (0011)', async () => {
    for (const columna of ['id', 'notes']) {
      const r = await descartable(async (tx) => {
        await sembrar(tx)
        return conDatos(tx, principal('sub-op'), async (ejecutor) => {
          try {
            await ejecutor`select ${ejecutor(columna)} from staging_import_batch`
            return 'leyó'
          } catch (error) {
            return (error as { code?: string }).code
          }
        }).catch((error: unknown) => (error as { code?: string }).code)
      })
      assert.equal(r, '42501', columna)
    }
  })

  it('sin credencial vinculada o dado de baja, la consulta no corre: AccesoDenegado', async () => {
    const r = await descartable(async (tx) => {
      await sembrar(tx)
      let corrio = false
      const consulta = (): Promise<void> => {
        corrio = true
        return Promise.resolve()
      }
      const sinCredencial = await motivo(conDatos(tx, principal('sub-desconocido'), consulta))
      const baja = await motivo(conDatos(tx, principal('sub-baja'), consulta))
      const auditados = [
        ...(await tx<{ outcome: string; reason_code: string; origin: string }[]>`
          select outcome, reason_code, origin from audit_event
          where action = 'acceso.consultar' order by id
        `),
      ]
      return { sinCredencial, baja, corrio, auditados }
    })
    assert.equal(r.sinCredencial, 'SIN_CREDENCIAL')
    assert.equal(r.baja, 'SIN_ACCESO')
    assert.equal(r.corrio, false)
    // El motivo queda registrado en el servidor, no en la respuesta.
    assert.deepEqual(r.auditados, [
      { outcome: 'denied', reason_code: 'SIN_CREDENCIAL', origin: 'app' },
      { outcome: 'denied', reason_code: 'SIN_ACCESO', origin: 'app' },
    ])
  })
})
