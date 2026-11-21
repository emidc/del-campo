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
  clearDoneWeeklyTasks,
  commentTask,
  completeTaskAction,
  createTask,
  deleteTask,
  getTask,
  involveInTask,
  listTaskAssignees,
  listTasks,
  listTeamMembers,
  setTaskDueDate,
  setTaskFollowUp,
  setTaskPriority,
  setTaskServiceCase,
  setTaskWeekly,
} from './task.ts'
import { getMemberPhoto, getOwnProfile, updateProfile } from './profile.ts'

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
      assert.deepEqual((await listTaskAssignees(tx, m.cliente)).map((i) => i.email), ['admin@sintetico.test', 'op2@sintetico.test', 'op@sintetico.test'])
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

  it('cualquier integrante del equipo ve la tarea y puede recibirla (0020)', async () => {
    await descartable(async (tx) => {
      const m = await sembrar(tx)
      await como(tx, m.op)
      const id = await createTask(tx, {
        title: 'Seguimiento', partyId: m.cliente, policyId: null, serviceCaseId: null,
        dueDate: null, assignedUserId: null, comment: null,
      })
      await assignTask(tx, id, m.op2, null)
      await createTask(tx, {
        title: 'De otro cliente', partyId: m.otroCliente, policyId: null, serviceCaseId: null,
        dueDate: null, assignedUserId: null, comment: null,
      })

      await como(tx, m.op2)
      assert.equal((await getTask(tx, id))?.assignedToMe, true)
      assert.equal((await listTaskAssignees(tx, m.cliente)).length, 3)
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

  it('vencimiento, prioridad y seguimiento se editan y quedan en la historia (0026)', async () => {
    await descartable(async (tx) => {
      const m = await sembrar(tx)
      await como(tx, m.op)
      const id = await createTask(tx, {
        title: 'Cotizar flota', partyId: m.cliente, policyId: null, serviceCaseId: null,
        dueDate: '2026-11-30', assignedUserId: null, comment: null,
      })
      await setTaskDueDate(tx, id, '2026-12-15')
      await setTaskPriority(tx, id, 'ALTA')
      await setTaskFollowUp(tx, id, 'COTIZANDO')
      await setTaskFollowUp(tx, id, 'COTIZANDO')
      const t = await getTask(tx, id)
      assert.ok(t)
      assert.equal(t.dueDate, '2026-12-15')
      assert.equal(t.priority, 'ALTA')
      assert.equal(t.followUp, 'COTIZANDO')
      assert.equal(t.status, 'PENDIENTE')
      assert.deepEqual(
        t.events.filter((e) => e.kind === 'CAMBIO').map((e) => e.body),
        ['Vencimiento: 30/11/2026 → 15/12/2026', 'Prioridad: Alta', 'Seguimiento: Cotizando'],
      )
    })
  })

  it('involucrar a alguien no cambia responsable ni estado, y sólo esa persona marca su acción (0026)', async () => {
    await descartable(async (tx) => {
      const m = await sembrar(tx)
      await como(tx, m.op)
      const id = await createTask(tx, {
        title: 'Renovar póliza', partyId: m.cliente, policyId: null, serviceCaseId: null,
        dueDate: null, assignedUserId: null, comment: null,
      })
      await changeTaskStatus(tx, id, 'EN_CURSO', null)
      const accion = await involveInTask(tx, id, m.op2, 'Pedir la inspección del vehículo')

      await tx`savepoint s1`
      await assert.rejects(completeTaskAction(tx, accion), /no es tuya/)
      await tx`rollback to savepoint s1`

      await como(tx, m.op2)
      const antes = await getTask(tx, id)
      assert.ok(antes)
      assert.deepEqual(antes.actions.map((a) => [a.description, a.status, a.assignedToMe]), [['Pedir la inspección del vehículo', 'PENDIENTE', true]])
      await completeTaskAction(tx, accion)

      const t = await getTask(tx, id)
      assert.ok(t)
      const [hecha] = t.actions
      assert.ok(hecha)
      assert.equal(hecha.status, 'HECHA')
      assert.ok(hecha.doneAt)
      assert.equal(t.status, 'EN_CURSO')
      assert.equal(t.assignedEmail, 'op@sintetico.test')
      assert.deepEqual(
        t.events.filter((e) => e.kind === 'ACCION').map((e) => e.body),
        ['Involucró a op2@sintetico.test: Pedir la inspección del vehículo', 'Hizo: Pedir la inspección del vehículo'],
      )
    })
  })

  it('eliminar una tarea la borra con sus acciones y su historia (0026)', async () => {
    await descartable(async (tx) => {
      const m = await sembrar(tx)
      await como(tx, m.op)
      const id = await createTask(tx, {
        title: 'Para borrar', partyId: m.cliente, policyId: null, serviceCaseId: null,
        dueDate: null, assignedUserId: null, comment: 'algo',
      })
      const otra = await createTask(tx, {
        title: 'Queda', partyId: m.cliente, policyId: null, serviceCaseId: null,
        dueDate: null, assignedUserId: null, comment: null,
      })
      await involveInTask(tx, id, m.admin, 'Revisar')
      await deleteTask(tx, id)
      assert.deepEqual((await listTasks(tx)).map((t) => t.id), [otra])
      assert.equal(await getTask(tx, id), null)
      await tx`reset role`
      assert.equal(uno(await tx<{ n: number }[]>`select count(*)::int as n from task_event where task_id = ${id}`).n, 0)
      assert.equal(uno(await tx<{ n: number }[]>`select count(*)::int as n from task_action where task_id = ${id}`).n, 0)
      // Fuera de `eliminar_tarea`, la historia sigue sin poder borrarse.
      await tx`savepoint s1`
      await assert.rejects(tx`delete from task_event where task_id = ${otra}`, /sólo de alta/)
      await tx`rollback to savepoint s1`
    })
  })

  it('tareas de la semana: se marcan, se filtran y el lunes se destildan sólo las hechas (0027)', async () => {
    await descartable(async (tx) => {
      const m = await sembrar(tx)
      await como(tx, m.op)
      const nueva = (title: string) =>
        createTask(tx, { title, partyId: m.cliente, policyId: null, serviceCaseId: null, dueDate: null, assignedUserId: null, comment: null })
      const abierta = await nueva('Abierta')
      const hecha = await nueva('Hecha')
      const fuera = await nueva('Fuera del tablero')
      await setTaskWeekly(tx, abierta, true)
      await setTaskWeekly(tx, hecha, true)
      await changeTaskStatus(tx, hecha, 'HECHA', null)
      assert.equal((await getTask(tx, fuera))?.weekly, false)
      assert.deepEqual((await listTasks(tx, { weekly: true, onlyMine: true })).map((t) => t.title).sort(), ['Abierta', 'Hecha'])
      await como(tx, m.op2)
      assert.deepEqual(await listTasks(tx, { weekly: true, onlyMine: true }), [])
      assert.equal((await listTasks(tx, { weekly: true })).length, 2)
      assert.deepEqual((await listTeamMembers(tx)).map((i) => i.email), ['admin@sintetico.test', 'op2@sintetico.test', 'op@sintetico.test'])

      await tx`reset role`
      assert.equal(await clearDoneWeeklyTasks(tx), 1)
      await como(tx, m.op)
      assert.deepEqual((await listTasks(tx, { weekly: true })).map((t) => t.title), ['Abierta'])
      const t = await getTask(tx, hecha)
      assert.ok(t)
      assert.equal(t.weekly, false)
      assert.equal(t.status, 'HECHA')
    })
  })

  it('perfiles: nombre y foto visibles para el equipo; cada uno edita el suyo y el administrador, cualquiera (0028)', async () => {
    await descartable(async (tx) => {
      const m = await sembrar(tx)
      const foto = { bytes: new Uint8Array([0xff, 0xd8, 0xff, 0xd9]), type: 'image/jpeg' as const }
      await como(tx, m.op)
      await updateProfile(tx, m.op, 'Operadora', foto)
      const id = await createTask(tx, {
        title: 'Con nombre', partyId: m.cliente, policyId: null, serviceCaseId: null,
        dueDate: null, assignedUserId: null, comment: null,
      })
      await involveInTask(tx, id, m.op, 'Revisar')
      const t = await getTask(tx, id)
      assert.ok(t)
      assert.equal(t.assignedName, 'Operadora')
      assert.equal(t.assignedUserId, m.op)
      assert.equal(t.events[0]?.authorName, 'Operadora')
      assert.equal(t.actions[0]?.assignedName, 'Operadora')
      const equipo = await listTaskAssignees(tx, m.cliente)
      assert.deepEqual(
        equipo.map((i) => [i.name, i.hasPhoto]).sort(),
        [['Operadora', true], ['admin@sintetico.test', false], ['op2@sintetico.test', false]].sort(),
      )
      const propio = await getOwnProfile(tx)
      assert.deepEqual(propio && [propio.userId, propio.name, propio.hasDisplayName, propio.hasPhoto], [m.op, 'Operadora', true, true])
      const guardada = await getMemberPhoto(tx, m.op)
      assert.deepEqual(guardada === null ? null : [Array.from(guardada.bytes), guardada.type], [Array.from(foto.bytes), foto.type])

      await tx`savepoint s1`
      await assert.rejects(updateProfile(tx, m.op2, 'Otra persona'), /sólo la persona o un administrador/)
      await tx`rollback to savepoint s1`

      await como(tx, m.admin)
      await updateProfile(tx, m.op2, 'Beto', null)
      assert.equal((await listTeamMembers(tx)).find((i) => i.userId === m.op2)?.name, 'Beto')
      await updateProfile(tx, m.op, '')
      assert.equal((await listTeamMembers(tx)).find((i) => i.userId === m.op)?.name, 'op@sintetico.test')
      assert.ok(await getMemberPhoto(tx, m.op), 'sin `photo`, la foto queda como estaba')
      const delAdmin = await getOwnProfile(tx)
      assert.deepEqual(delAdmin && [delAdmin.userId, delAdmin.hasDisplayName], [m.admin, false])
    })
  })

  it('la gestión de una tarea se cambia, se quita y se vuelve a vincular, sólo del mismo cliente (0028)', async () => {
    await descartable(async (tx) => {
      const m = await sembrar(tx)
      await como(tx, m.admin)
      const gestion = await createServiceCase(tx, { kind: 'OTRO', title: 'Endoso', partyId: m.cliente, policyId: null, dueDate: null, note: null })
      const ajena = await createServiceCase(tx, { kind: 'OTRO', title: 'Ajena', partyId: m.otroCliente, policyId: null, dueDate: null, note: null })
      const id = await createTask(tx, {
        title: 'Vincular', partyId: m.cliente, policyId: null, serviceCaseId: null,
        dueDate: null, assignedUserId: null, comment: null,
      })
      await setTaskServiceCase(tx, id, gestion)
      assert.equal((await getTask(tx, id))?.serviceCaseTitle, 'Endoso')
      await setTaskServiceCase(tx, id, null)
      assert.equal((await getTask(tx, id))?.serviceCaseId, null)
      await tx`savepoint s1`
      await assert.rejects(setTaskServiceCase(tx, id, ajena), /de otro cliente/)
      await tx`rollback to savepoint s1`
      assert.deepEqual(
        (await getTask(tx, id))?.events.filter((e) => e.kind === 'CAMBIO').map((e) => e.body),
        ['Gestión: Endoso', 'Gestión: sin gestión'],
      )
    })
  })
})
