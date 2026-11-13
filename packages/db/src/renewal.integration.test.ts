// T-0048 — Renovaciones (vista derivada, C6-02b). Contra Postgres real, con datos
// sintéticos y cada caso en una transacción revertida.
//
// Requiere DATABASE_URL apuntando a una base con 0014 aplicada (`pnpm db:migrate`).

import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { after, describe, it } from 'node:test'

import postgres from 'postgres'

import { listRenewals } from './renewal.ts'
import { createServiceCase } from './service-case.ts'

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
  throw new Error('DATABASE_URL no está configurada: T-0048 requiere PostgreSQL real.')
}

const sql = postgres(databaseUrl, { max: 1, prepare: false, onnotice: () => undefined })

after(async () => {
  await sql.end()
})

class Rollback extends Error {}

const descartable = async (accion: (tx: postgres.TransactionSql) => Promise<void>): Promise<void> => {
  try {
    await sql.begin(async (tx) => {
      await accion(tx)
      throw new Rollback('descartar')
    })
  } catch (error) {
    if (!(error instanceof Rollback)) throw error
  }
}

interface Id {
  readonly id: string
}

const uno = <T>(filas: readonly T[]): T => {
  const [fila] = filas
  if (fila === undefined) throw new Error('se esperaba una fila')
  return fila
}

interface Mundo {
  readonly cliente: string
  readonly otroCliente: string
  readonly manual: string
  readonly automatica: string
  readonly renovada: string
  readonly lejana: string
  readonly ajena: string
  readonly admin: string
  readonly op: string
}

// Pólizas del cliente de `op`: una manual y una automática que vencen en 10 días, una que
// ya tiene sucesora y una que vence en 200 días; y una del otro cliente.
const sembrar = async (tx: postgres.TransactionSql): Promise<Mundo> => {
  const party = async (): Promise<string> =>
    uno(await tx<Id[]>`insert into party (kind) values ('PERSON') returning id`).id
  const cliente = await party()
  const otroCliente = await party()
  await tx`insert into person_profile (party_id, first_name, last_name) values (${cliente}, 'Ana', 'Sintética')`
  const aseguradora = uno(await tx<Id[]>`insert into party (kind) values ('ORGANIZATION') returning id`).id
  const insurer = uno(
    await tx<Id[]>`insert into insurer (organization_party_id, canonical_name) values (${aseguradora}, 'Aseguradora Sintética') returning id`,
  ).id
  const poliza = async (numero: string, tomador: string, finEnDias: number, modo: string, de: string | null = null): Promise<string> => {
    const id = uno(
      await tx<Id[]>`insert into policy (insurer_id, policy_number, renewed_from_policy_id) values (${insurer}, ${numero}, ${de}) returning id`,
    ).id
    await tx`
      insert into policy_version (
        policy_id, version_number, effective_from, holder_party_id,
        term_start_date, term_end_date, renewal_mode, source_event_type
      )
      values (${id}, 1, current_date - 300, ${tomador}, current_date - 300, current_date + ${finEnDias}::int, ${modo}, 'ISSUANCE')
    `
    return id
  }
  const usuario = async (email: string, role: string): Promise<string> =>
    uno(
      await tx<Id[]>`
        insert into app_user (email, status, auth_provider, role) values (${email}, 'ACTIVE', 'google', ${role}) returning id
      `,
    ).id
  const admin = await usuario('admin@sintetico.test', 'ADMINISTRADOR')
  const op = await usuario('op@sintetico.test', 'OPERADOR')
  await tx`
    insert into client_assignment (user_id, client_party_id, valid) values
      (${op}, ${cliente}, tstzrange(now() - interval '1 day', null, '[)'))
  `
  const renovada = await poliza('SINT-R3', cliente, 12, 'MANUAL')
  await poliza('SINT-R3-B', cliente, 377, 'MANUAL', renovada)
  return {
    cliente,
    otroCliente,
    manual: await poliza('SINT-R1', cliente, 10, 'MANUAL'),
    automatica: await poliza('SINT-R2', cliente, 10, 'AUTOMATIC'),
    renovada,
    lejana: await poliza('SINT-R4', cliente, 200, 'MANUAL'),
    ajena: await poliza('SINT-R5', otroCliente, 10, 'MANUAL'),
    admin,
    op,
  }
}

const como = async (tx: postgres.TransactionSql, usuario: string): Promise<void> => {
  await tx`reset role`
  await tx`select set_config('authz.usuario_id', ${usuario}, true)`
  await tx`set local role broker_app`
}

const ventana = async (tx: postgres.TransactionSql): Promise<{ from: string; to: string }> => {
  const [r] = await tx<{ from: string; to: string }[]>`
    select to_char(current_date, 'YYYY-MM-DD') as from, to_char(current_date + 30, 'YYYY-MM-DD') as to
  `
  if (r === undefined) throw new Error('sin fecha')
  return r
}

describe('renovaciones (C6-02b)', () => {
  it('las renovaciones de un cliente en la ventana, con su estado', async () => {
    await descartable(async (tx) => {
      const m = await sembrar(tx)
      await como(tx, m.op)
      const v = await ventana(tx)

      // SINT-R5 es de otro cliente: desde 0020 también se ve, y acá no se mira.
      const propias = async (filtro: Parameters<typeof listRenewals>[1]) =>
        (await listRenewals(tx, filtro)).filter((r) => r.policyNumber !== 'SINT-R5')
      const antes = await propias(v)
      assert.deepEqual(
        antes.map((r) => [r.policyNumber, r.renewalMode, r.state]),
        [
          ['SINT-R1', 'MANUAL', 'PENDIENTE'],
          ['SINT-R2', 'AUTOMATIC', 'PENDIENTE'],
          ['SINT-R3', 'MANUAL', 'RENOVADA'],
        ],
      )
      assert.equal(antes[0]?.holderName, 'Ana Sintética')
      assert.equal(antes[2]?.successorPolicyNumber, 'SINT-R3-B')

      await createServiceCase(tx, {
        kind: 'RENOVACION', title: 'Renovación SINT-R1', partyId: m.cliente, policyId: m.manual, dueDate: null, note: null,
      })
      const despues = await propias({ ...v, mode: 'MANUAL', state: 'CON_GESTION' })
      assert.equal(despues.length, 1)
      const [conGestion] = despues
      assert.ok(conGestion)
      assert.equal(conGestion.policyId, m.manual)
      assert.notEqual(conGestion.caseId, null)
      assert.equal(conGestion.caseStatus, 'ABIERTA')

      assert.deepEqual((await propias({ ...v, state: 'PENDIENTE' })).map((r) => r.policyNumber), ['SINT-R2'])
    })
  })

  it('cualquier integrante del equipo ve las de todos los clientes (0020)', async () => {
    await descartable(async (tx) => {
      const m = await sembrar(tx)
      await como(tx, m.op)
      const numeros = (await listRenewals(tx, await ventana(tx))).map((r) => r.policyNumber)
      assert.ok(numeros.includes('SINT-R5'))
      assert.ok(!numeros.includes('SINT-R4'))
    })
  })

  it('rechaza una ventana que no son fechas', async () => {
    await descartable(async (tx) => {
      await assert.rejects(listRenewals(tx, { from: 'ayer', to: '2030-01-01' }), /YYYY-MM-DD/)
    })
  })
})
