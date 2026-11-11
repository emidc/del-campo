// T-0052 — Tareas (0017_tarea.sql). Contra Postgres real, con datos sintéticos y cada caso
// en una transacción revertida.
//
// Requiere DATABASE_URL apuntando a una base con 0017 aplicada (`pnpm db:migrate`).

import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { after, describe, it } from 'node:test'

import postgres from 'postgres'

import { createServiceCase } from './service-case.ts'
import {
  assignTask,
  changeTaskStatus,
  commentTask,
  createTask,
  getTask,
  listTaskAssignees,
  listTasks,
} from './task.ts'

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
  throw new Error('DATABASE_URL no está configurada: T-0052 requiere PostgreSQL real.')
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

describe('tareas (0017)', () => {
  it('una tarea se crea, se traba, se pasa con comentario y se termina, y todo queda en la historia', async () => {
    await descartable(async (tx) => {
      const m = await sembrar(tx)
      await como(tx, m.op)
      const id = await createTask(tx, {
        title: 'Pedir certificado de cobertura', partyId: m.cliente, policyId: null, serviceCaseId: null,
        dueDate: '2000-01-01', assignedUserId: null, comment: 'La empresa lo pidió por teléfono',
      })
      const nueva = await getTask(tx, id)
      assert.ok(nueva)
      assert.equal(nueva.status, 'PENDIENTE')
      assert.equal(nueva.assignedToMe, true)
      assert.equal(nueva.partyName, 'Ana Sintética')

      await changeTaskStatus(tx, id, 'TRABADA', 'Falta el CUIT')
      assert.deepEqual((await listTasks(tx, { status: 'TRABADA' })).map((t) => t.id), [id])

      await como(tx, m.admin)
      assert.deepEqual((await listTaskAssignees(tx, m.cliente)).map((i) => i.email), ['admin@sintetico.test', 'op@sintetico.test'])
      await assignTask(tx, id, m.admin, 'Lo pido yo a la empresa')
      await changeTaskStatus(tx, id, 'EN_CURSO', null)
      await commentTask(tx, id, 'Pedido por correo')
      assert.deepEqual((await listTasks(tx, { onlyMine: true })).map((t) => t.id), [id])
      await changeTaskStatus(tx, id, 'HECHA', 'Recibido')

      const t = await getTask(tx, id)
      assert.ok(t)
      assert.equal(t.status, 'HECHA')
      assert.ok(t.doneAt)
      assert.equal(t.assignedEmail, 'admin@sintetico.test')
      assert.deepEqual(
        t.events.map((e) => [e.kind, e.body, e.toStatus]),
        [
          ['ALTA', 'La empresa lo pidió por teléfono', 'PENDIENTE'],
          ['ESTADO', 'Falta el CUIT', 'TRABADA'],
          ['ASIGNACION', 'admin@sintetico.test: Lo pido yo a la empresa', null],
          ['ESTADO', null, 'EN_CURSO'],
          ['COMENTARIO', 'Pedido por correo', null],
          ['ESTADO', 'Recibido', 'HECHA'],
        ],
      )
      assert.deepEqual(await listTasks(tx), [])
      assert.equal((await listTasks(tx, { includeDone: true })).length, 1)

      // La historia no se toca, ni siquiera el dueño de la tabla.
      await tx`reset role`
      await tx`savepoint s1`
      await assert.rejects(tx`update task_event set body = 'x' where task_id = ${id}`, /sólo de alta/)
      await tx`rollback to savepoint s1`
    })
  })

  it('quien no ve al cliente no ve la tarea ni puede recibirla', async () => {
    await descartable(async (tx) => {
      const m = await sembrar(tx)
      await como(tx, m.op)
      const id = await createTask(tx, {
        title: 'Seguimiento', partyId: m.cliente, policyId: null, serviceCaseId: null,
        dueDate: null, assignedUserId: null, comment: null,
      })
      await tx`savepoint s1`
      await assert.rejects(assignTask(tx, id, m.op2, null), /row-level security/)
      await tx`rollback to savepoint s1`
      await tx`savepoint s2`
      await assert.rejects(
        createTask(tx, {
          title: 'Ajena', partyId: m.otroCliente, policyId: null, serviceCaseId: null,
          dueDate: null, assignedUserId: null, comment: null,
        }),
        /row-level security/,
      )
      await tx`rollback to savepoint s2`

      await como(tx, m.op2)
      assert.equal(await getTask(tx, id), null)
      assert.deepEqual(await listTaskAssignees(tx, m.cliente), [])
    })
  })

  it('una tarea cita una gestión sólo del mismo cliente', async () => {
    await descartable(async (tx) => {
      const m = await sembrar(tx)
      await como(tx, m.admin)
      const gestion = await createServiceCase(tx, {
        kind: 'OTRO', title: 'Gestión', partyId: m.cliente, policyId: null, dueDate: null, note: null,
      })
      const id = await createTask(tx, {
        title: 'Parte de la gestión', partyId: m.cliente, policyId: null, serviceCaseId: gestion,
        dueDate: null, assignedUserId: m.op, comment: null,
      })
      const t = await getTask(tx, id)
      assert.ok(t)
      assert.equal(t.serviceCaseTitle, 'Gestión')
      assert.equal(t.assignedEmail, 'op@sintetico.test')
      assert.deepEqual((await listTasks(tx, { serviceCaseId: gestion })).map((x) => x.id), [id])
      await tx`savepoint s1`
      await assert.rejects(
        createTask(tx, {
          title: 'Cruzada', partyId: m.otroCliente, policyId: null, serviceCaseId: gestion,
          dueDate: null, assignedUserId: null, comment: null,
        }),
        /de otro cliente/,
      )
      await tx`rollback to savepoint s1`
    })
  })
})
