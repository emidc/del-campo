// T-0045 — Gestiones manuales (0013_gestion.sql). Contra Postgres real, con datos
// sintéticos y cada caso en una transacción revertida.
//
// Requiere DATABASE_URL apuntando a una base con 0013 aplicada (`pnpm db:migrate`).

import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { after, describe, it } from 'node:test'

import postgres from 'postgres'

import {
  addClaimRequirement,
  addServiceCaseNote,
  assignServiceCase,
  changeServiceCaseStatus,
  createServiceCase,
  getServiceCase,
  getWorkload,
  listAssignableMembers,
  listServiceCases,
  moveClaimStage,
  setClaimRequirementDone,
  takeServiceCase,
} from './service-case.ts'

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
  throw new Error('DATABASE_URL no está configurada: T-0045 requiere PostgreSQL real.')
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
  readonly poliza: string
  readonly polizaAjena: string
  readonly admin: string
  readonly op: string
  readonly op2: string
  readonly revisor: string
}

// Un cliente asignado a `op`, otro asignado a `op2`; una póliza de cada uno.
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
  const usuario = async (email: string, role: string): Promise<string> =>
    uno(
      await tx<Id[]>`
        insert into app_user (email, status, auth_provider, role) values (${email}, 'ACTIVE', 'google', ${role}) returning id
      `,
    ).id
  const admin = await usuario('admin@sintetico.test', 'ADMINISTRADOR')
  const op = await usuario('op@sintetico.test', 'OPERADOR')
  const op2 = await usuario('op2@sintetico.test', 'OPERADOR')
  const revisor = await usuario('rev@sintetico.test', 'REVISOR')
  await tx`
    insert into client_assignment (user_id, client_party_id, valid) values
      (${op}, ${cliente}, tstzrange(now() - interval '1 day', null, '[)')),
      (${op2}, ${otroCliente}, tstzrange(now() - interval '1 day', null, '[)')),
      (${revisor}, ${cliente}, tstzrange(now() - interval '1 day', null, '[)'))
  `
  return {
    cliente,
    otroCliente,
    poliza: await poliza('SINT-1', cliente),
    polizaAjena: await poliza('SINT-2', otroCliente),
    admin,
    op,
    op2,
    revisor,
  }
}

/** Actúa como `broker_app` con el principal `usuario`, local a la transacción. */
const como = async (tx: postgres.TransactionSql, usuario: string): Promise<void> => {
  await tx`reset role`
  await tx`select set_config('authz.usuario_id', ${usuario}, true)`
  await tx`set local role broker_app`
}

describe('gestiones manuales (0013)', () => {
  it('un Operador crea, anota, cambia de estado y cierra una gestión de su cliente', async () => {
    await descartable(async (tx) => {
      const m = await sembrar(tx)
      await como(tx, m.op)
      const id = await createServiceCase(tx, {
        kind: 'SINIESTRO',
        title: '  Choque en estacionamiento ',
        partyId: m.cliente,
        policyId: m.poliza,
        dueDate: '2030-01-15',
        note: 'Denuncia recibida por teléfono',
      })
      await addServiceCaseNote(tx, id, 'Pedí fotos al cliente')
      await changeServiceCaseStatus(tx, id, 'ESPERANDO_COMPANIA', null)
      await changeServiceCaseStatus(tx, id, 'CERRADA', 'Pagado por la compañía')

      const g = await getServiceCase(tx, id)
      assert.ok(g)
      assert.equal(g.title, 'Choque en estacionamiento')
      assert.equal(g.status, 'CERRADA')
      assert.equal(g.partyName, 'Ana Sintética')
      assert.equal(g.policyNumber, 'SINT-1')
      assert.equal(g.dueDate, '2030-01-15')
      assert.equal(g.outcome, 'Pagado por la compañía')
      assert.equal(g.assignedEmail, 'op@sintetico.test')
      assert.equal(g.assignedToMe, true)
      assert.notEqual(g.closedAt, null)
      assert.deepEqual(
        g.events.map((e) => [e.kind, e.fromStatus, e.toStatus, e.body]),
        [
          ['ALTA', null, 'ABIERTA', 'Denuncia recibida por teléfono'],
          ['NOTA', null, null, 'Pedí fotos al cliente'],
          ['ESTADO', 'ABIERTA', 'ESPERANDO_COMPANIA', null],
          ['CIERRE', 'ESPERANDO_COMPANIA', 'CERRADA', 'Pagado por la compañía'],
        ],
      )
      assert.ok(g.events.every((e) => e.authorEmail === 'op@sintetico.test'))

      // Cerrada no aparece en la lista por defecto; sí al pedir las cerradas.
      assert.equal((await listServiceCases(tx)).length, 0)
      assert.equal((await listServiceCases(tx, { includeClosed: true })).length, 1)

      // Reabrir la saca del cierre.
      await changeServiceCaseStatus(tx, id, 'EN_CURSO', 'Reclamo por diferencia')
      const reabierta = await getServiceCase(tx, id)
      assert.ok(reabierta)
      assert.equal(reabierta.status, 'EN_CURSO')
      assert.equal(reabierta.closedAt, null)
    })
  })

  it('cada Operador ve sólo las gestiones de sus clientes; el Administrador ve todas', async () => {
    await descartable(async (tx) => {
      const m = await sembrar(tx)
      await como(tx, m.op)
      const mia = await createServiceCase(tx, {
        kind: 'ENDOSO', title: 'Cambio de domicilio', partyId: m.cliente, policyId: null, dueDate: null, note: null,
      })
      await como(tx, m.op2)
      const ajena = await createServiceCase(tx, {
        kind: 'COTIZACION', title: 'Cotizar flota', partyId: m.otroCliente, policyId: null, dueDate: null, note: null,
      })
      assert.deepEqual((await listServiceCases(tx)).map((g) => g.id), [ajena])
      assert.equal(await getServiceCase(tx, mia), null)

      await como(tx, m.op)
      assert.deepEqual((await listServiceCases(tx)).map((g) => g.id), [mia])
      // Ver el responsable de una gestión ajena tampoco es posible: la gestión no se ve.
      await tx`savepoint s1`
      await assert.rejects(addServiceCaseNote(tx, ajena, 'intrusión'), /row-level security/)
      await tx`rollback to savepoint s1`

      await como(tx, m.admin)
      assert.equal((await listServiceCases(tx)).length, 2)
      assert.deepEqual((await listServiceCases(tx, { partyId: m.cliente })).map((g) => g.id), [mia])
      assert.deepEqual((await listServiceCases(tx, { onlyMine: true })).map((g) => g.id), [])
      await takeServiceCase(tx, mia)
      assert.deepEqual((await listServiceCases(tx, { onlyMine: true })).map((g) => g.id), [mia])
    })
  })

  it('un Operador no crea gestiones de un cliente ajeno ni con una póliza ajena', async () => {
    await descartable(async (tx) => {
      const m = await sembrar(tx)
      await como(tx, m.op)
      await tx`savepoint s1`
      await assert.rejects(
        createServiceCase(tx, {
          kind: 'OTRO', title: 'x', partyId: m.otroCliente, policyId: null, dueDate: null, note: null,
        }),
        /row-level security/,
      )
      await tx`rollback to savepoint s1`
      await assert.rejects(
        createServiceCase(tx, {
          kind: 'OTRO', title: 'x', partyId: m.cliente, policyId: m.polizaAjena, dueDate: null, note: null,
        }),
        /row-level security/,
      )
    })
  })

  it('un Revisor no ve ni crea gestiones en Broker OS', async () => {
    await descartable(async (tx) => {
      const m = await sembrar(tx)
      await como(tx, m.op)
      await createServiceCase(tx, {
        kind: 'OTRO', title: 'algo', partyId: m.cliente, policyId: null, dueDate: null, note: null,
      })
      await como(tx, m.revisor)
      assert.equal((await listServiceCases(tx)).length, 0)
      await assert.rejects(
        createServiceCase(tx, { kind: 'OTRO', title: 'x', partyId: m.cliente, policyId: null, dueDate: null, note: null }),
        /row-level security/,
      )
    })
  })

  it('la historia es sólo de alta, también para el dueño de la tabla', async () => {
    await descartable(async (tx) => {
      const m = await sembrar(tx)
      await como(tx, m.op)
      const id = await createServiceCase(tx, {
        kind: 'OTRO', title: 'algo', partyId: m.cliente, policyId: null, dueDate: null, note: null,
      })
      await tx`reset role`
      await tx`savepoint s1`
      await assert.rejects(tx`update service_case_event set body = 'x' where service_case_id = ${id}`, /sólo de alta/)
      await tx`rollback to savepoint s1`
      await assert.rejects(tx`delete from service_case_event where service_case_id = ${id}`, /sólo de alta/)
    })
  })

  it('una gestión se asigna sólo a quien ve al cliente, y queda en la historia y en la carga del equipo', async () => {
    await descartable(async (tx) => {
      const m = await sembrar(tx)
      await tx`
        insert into client_assignment (user_id, client_party_id, valid)
        values (${m.op2}, ${m.cliente}, tstzrange(now() - interval '1 day', null, '[)'))
      `
      await como(tx, m.op)
      const id = await createServiceCase(tx, {
        kind: 'OTRO', title: 'algo', partyId: m.cliente, policyId: null, dueDate: '2000-01-01', note: null,
      })
      // Ven al cliente: el admin, op y op2. El Revisor tiene asignación pero no es Operador.
      assert.deepEqual(
        (await listAssignableMembers(tx, id)).map((i) => i.email),
        ['admin@sintetico.test', 'op2@sintetico.test', 'op@sintetico.test'],
      )
      await tx`savepoint s1`
      await assert.rejects(assignServiceCase(tx, id, m.revisor), /row-level security/)
      await tx`rollback to savepoint s1`

      await assignServiceCase(tx, id, m.op2)
      const g = await getServiceCase(tx, id)
      assert.ok(g)
      assert.equal(g.assignedEmail, 'op2@sintetico.test')
      assert.equal(g.events.at(-1)?.kind, 'ASIGNACION')
      assert.equal(g.events.at(-1)?.body, 'op2@sintetico.test')

      assert.deepEqual(await getWorkload(tx), [{ userId: m.op2, email: 'op2@sintetico.test', open: 1, overdue: 1 }])
      assert.deepEqual((await listServiceCases(tx, { assignedUserId: m.op2 })).map((x) => x.id), [id])
      assert.deepEqual(await listServiceCases(tx, { assignedUserId: m.op }), [])

      await assignServiceCase(tx, id, null)
      assert.deepEqual((await listServiceCases(tx, { assignedUserId: 'SIN_RESPONSABLE' })).map((x) => x.id), [id])
      assert.equal((await getServiceCase(tx, id))?.events.at(-1)?.body, 'sin responsable')

      await takeServiceCase(tx, id)
      assert.equal((await getServiceCase(tx, id))?.assignedToMe, true)
    })
  })

  it('un siniestro avanza por etapas sólo con los requisitos de la actual cumplidos', async () => {
    await descartable(async (tx) => {
      const m = await sembrar(tx)
      await como(tx, m.op)
      const id = await createServiceCase(tx, {
        kind: 'SINIESTRO', title: 'Granizo', partyId: m.cliente, policyId: m.poliza, dueDate: null, note: null,
      })
      const inicial = await getServiceCase(tx, id)
      assert.ok(inicial)
      assert.equal(inicial.claimStage, 'DENUNCIA')
      assert.deepEqual(
        inicial.requirements.map((r) => [r.stage, r.name]),
        [
          ['DENUNCIA', 'Denuncia presentada a la compañía'],
          ['DOCUMENTACION', 'Fotos o constancias del daño'],
          ['DOCUMENTACION', 'Presupuesto o detalle de daños'],
          ['INSPECCION', 'Inspección o peritaje realizado'],
          ['LIQUIDACION', 'Propuesta de liquidación aceptada'],
          ['PAGO', 'Pago o rechazo registrado'],
        ],
      )

      await tx`savepoint s1`
      await assert.rejects(moveClaimStage(tx, id, 'NEXT'), /falta Denuncia presentada a la compañía/)
      await tx`rollback to savepoint s1`

      const [denuncia] = inicial.requirements
      assert.ok(denuncia)
      await setClaimRequirementDone(tx, denuncia.id, true)
      await moveClaimStage(tx, id, 'NEXT')
      await addClaimRequirement(tx, id, 'DOCUMENTACION', 'Copia del registro')
      await moveClaimStage(tx, id, 'BACK')
      await moveClaimStage(tx, id, 'NEXT')

      const g = await getServiceCase(tx, id)
      assert.ok(g)
      assert.equal(g.claimStage, 'DOCUMENTACION')
      assert.equal(g.requirements.filter((r) => r.stage === 'DOCUMENTACION').length, 3)
      assert.equal(g.requirements.find((r) => r.id === denuncia.id)?.doneByEmail, 'op@sintetico.test')
      assert.deepEqual(
        g.events.filter((e) => e.kind === 'ETAPA' || e.kind === 'REQUISITO').map((e) => e.body),
        [
          'Cumplido: Denuncia presentada a la compañía',
          'Denuncia → Documentación',
          'Documentación → Denuncia',
          'Denuncia → Documentación',
        ],
      )

      // Saltar etapas no se puede ni desde la base.
      await tx`savepoint s2`
      await assert.rejects(tx`update service_case set claim_stage = 'PAGO' where id = ${id}`, /de a una etapa/)
      await tx`rollback to savepoint s2`
    })
  })

  it('sólo un siniestro tiene etapa', async () => {
    await descartable(async (tx) => {
      const m = await sembrar(tx)
      await como(tx, m.op)
      const id = await createServiceCase(tx, {
        kind: 'ENDOSO', title: 'x', partyId: m.cliente, policyId: null, dueDate: null, note: null,
      })
      const g = await getServiceCase(tx, id)
      assert.ok(g)
      assert.equal(g.claimStage, null)
      assert.deepEqual(g.requirements, [])
      await assert.rejects(moveClaimStage(tx, id, 'NEXT'), /sólo un siniestro/)
    })
  })
})
