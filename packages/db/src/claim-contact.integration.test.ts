// T-0053 — Interlocutores del siniestro (0018). Contra Postgres real, con datos sintéticos y cada caso
// en una transacción revertida.
//
// Requiere DATABASE_URL apuntando a una base con 0018 aplicada (`pnpm db:migrate`).

import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { after, describe, it } from 'node:test'

import postgres from 'postgres'

import {
  addClaimContact,
  listClaimContacts,
  recordClaimContact,
  updateClaimContact,
} from './claim-contact.ts'
import { createServiceCase, getServiceCase } from './service-case.ts'

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
  throw new Error('DATABASE_URL no está configurada: T-0053 requiere PostgreSQL real.')
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
      throw new Rollback()
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
  readonly admin: string
  readonly op: string
  readonly op2: string
}

const sembrar = async (tx: postgres.TransactionSql): Promise<Mundo> => {
  const party = async (): Promise<string> =>
    uno(await tx<Id[]>`insert into party (kind) values ('PERSON') returning id`).id
  const cliente = await party()
  const otroCliente = await party()
  await tx`insert into person_profile (party_id, first_name, last_name) values (${cliente}, 'Ana', 'Sintética')`
  const usuario = async (email: string, role: string): Promise<string> =>
    uno(
      await tx<Id[]>`
        insert into app_user (email, status, auth_provider, role) values (${email}, 'ACTIVE', 'google', ${role}) returning id
      `,
    ).id
  const admin = await usuario('admin@sintetico.test', 'ADMINISTRADOR')
  const op = await usuario('op@sintetico.test', 'OPERADOR')
  const op2 = await usuario('op2@sintetico.test', 'OPERADOR')
  await tx`
    insert into client_assignment (user_id, client_party_id, valid) values
      (${op}, ${cliente}, tstzrange(now() - interval '1 day', null, '[)')),
      (${op2}, ${otroCliente}, tstzrange(now() - interval '1 day', null, '[)'))
  `
  return { cliente, otroCliente, admin, op, op2 }
}

const como = async (tx: postgres.TransactionSql, usuario: string): Promise<void> => {
  await tx`reset role`
  await tx`select set_config('authz.usuario_id', ${usuario}, true)`
  await tx`set local role broker_app`
}

describe('interlocutores del siniestro (0018)', () => {
  it('se suman, se registra un contacto y se cambia el pendiente y el responsable, con historia', async () => {
    await descartable(async (tx) => {
      const m = await sembrar(tx)
      await como(tx, m.op)
      const siniestro = await createServiceCase(tx, {
        kind: 'SINIESTRO', title: 'Choque', partyId: m.cliente, policyId: null, dueDate: null, note: null,
      })
      const taller = await addClaimContact(tx, siniestro, {
        role: 'TALLER', name: 'Taller Sintético', contact: '11 0000-0000', assignedUserId: m.op, pending: 'Recibir presupuesto',
      })
      await addClaimContact(tx, siniestro, {
        role: 'CLIENTE', name: 'Ana Sintética', contact: null, assignedUserId: null, pending: '  ',
      })

      await recordClaimContact(tx, taller, 'Prometió el presupuesto para el viernes', undefined)
      let lista = await listClaimContacts(tx, siniestro)
      assert.deepEqual(lista.map((k) => [k.role, k.name, k.pending, k.assignedToMe]), [
        ['CLIENTE', 'Ana Sintética', null, false],
        ['TALLER', 'Taller Sintético', 'Recibir presupuesto', true],
      ])
      assert.ok(lista[1]?.lastContactOn)
      assert.equal(lista[0]?.lastContactOn, null)

      await updateClaimContact(tx, taller, { pending: '', assignedUserId: m.admin })
      lista = await listClaimContacts(tx, siniestro)
      assert.deepEqual(lista.map((k) => [k.pending, k.assignedEmail]), [
        [null, null],
        [null, 'admin@sintetico.test'],
      ])

      const g = await getServiceCase(tx, siniestro)
      assert.ok(g)
      assert.deepEqual(
        g.events.filter((e) => e.kind === 'INTERLOCUTOR').map((e) => e.body),
        [
          'Sumó a Taller: Taller Sintético',
          'Sumó a Cliente: Ana Sintética',
          'Contacto con Taller Taller Sintético: Prometió el presupuesto para el viernes',
          'Taller Taller Sintético, pendiente: sin intervención, responsable: admin@sintetico.test',
        ],
      )
    })
  })

  it('sólo un siniestro tiene interlocutores, y el responsable tiene que ver al cliente', async () => {
    await descartable(async (tx) => {
      const m = await sembrar(tx)
      await como(tx, m.op)
      const otra = await createServiceCase(tx, {
        kind: 'OTRO', title: 'Gestión', partyId: m.cliente, policyId: null, dueDate: null, note: null,
      })
      await tx`savepoint s1`
      await assert.rejects(
        addClaimContact(tx, otra, { role: 'PERITO', name: 'Perito', contact: null, assignedUserId: null, pending: null }),
        /sólo un siniestro/,
      )
      await tx`rollback to savepoint s1`

      const siniestro = await createServiceCase(tx, {
        kind: 'SINIESTRO', title: 'Choque', partyId: m.cliente, policyId: null, dueDate: null, note: null,
      })
      await tx`savepoint s2`
      await assert.rejects(
        addClaimContact(tx, siniestro, { role: 'PERITO', name: 'Perito', contact: null, assignedUserId: m.op2, pending: null }),
        /row-level security/,
      )
      await tx`rollback to savepoint s2`
      const perito = await addClaimContact(tx, siniestro, {
        role: 'PERITO', name: 'Perito', contact: null, assignedUserId: null, pending: null,
      })

      await como(tx, m.op2)
      assert.deepEqual(await listClaimContacts(tx, siniestro), [])
      await assert.rejects(recordClaimContact(tx, perito, null, undefined), /fuera de alcance/)
    })
  })
})
