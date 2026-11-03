// T-0035, incremento 3: admisión de Broker OS en la base y administración de accesos.
// Contra un Postgres real con 0007 aplicada (R-26), con datos sintéticos y cada caso en
// una transacción revertida (R-19): las operaciones abren savepoints dentro de ella.

import assert from 'node:assert/strict'
import { after, describe, it } from 'node:test'

import type { Identidad } from '@del-campo/identidad'
import postgres from 'postgres'

import { asignarCliente, cambiarRol, cerrarAsignacion, darDeBaja, invitar } from './admin.ts'
import { afirmarRestringida, conPrincipal, ingresar } from './base.ts'

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

const identidad = (sujeto: string, email: string, emailVerificado = true): Identidad => ({
  proveedor: 'google',
  sujeto,
  email,
  emailVerificado,
  nombre: null,
})

const ok = <T>(resultado: { readonly ok: true; readonly valor: T } | { readonly ok: false; readonly motivo: string }): T => {
  if (!resultado.ok) throw new Error(`se esperaba ok y vino ${resultado.motivo}`)
  return resultado.valor
}

interface Evento {
  readonly action: string
  readonly outcome: string
  readonly reason_code: string | null
  readonly actor_user_id: string | null
  readonly origin: string
}

const eventos = async (tx: postgres.TransactionSql, accion: string): Promise<Evento[]> => [
  ...(await tx<Evento[]>`
    select action, outcome, reason_code, actor_user_id, origin from audit_event
    where action = ${accion} order by id
  `),
]

/** Un Administrador ya activo, como si hubiera entrado por invitación. */
const administrador = async (tx: postgres.TransactionSql): Promise<string> => {
  const invitacion = ok(await invitar(tx, { actor: null, email: 'admin@sintetico.test', rol: 'ADMINISTRADOR' }))
  const decision = await ingresar(tx, identidad('sub-admin', 'admin@sintetico.test'))
  assert.equal(decision.tipo, 'VINCULA')
  return invitacion.usuarioId
}

describe('login por invitación (D-0072, D-0077)', () => {
  it('una invitación vigente vincula la identidad, activa al usuario y se consume; después entra por sujeto', async () => {
    const r = await descartable(async (tx) => {
      const admin = await administrador(tx)
      const inv = ok(await invitar(tx, { actor: admin, email: 'Op@Sintetico.test', rol: 'OPERADOR' }))
      const primera = await ingresar(tx, identidad('sub-op', 'op@sintetico.test'))
      // El email puede cambiar después: la identidad es el sujeto.
      const segunda = await ingresar(tx, identidad('sub-op', 'otro@sintetico.test'))
      const [usuario] = await tx<{ status: string }[]>`select status from app_user where id = ${inv.usuarioId}`
      const [invitacion] = await tx<{ consumida: boolean }[]>`
        select consumed_at is not null as consumida from user_invitation where id = ${inv.invitacionId}
      `
      return { inv, primera, segunda, usuario, invitacion, vincular: await eventos(tx, 'acceso.vincular') }
    })
    assert.deepEqual(r.primera, { tipo: 'VINCULA', usuarioId: r.inv.usuarioId })
    assert.deepEqual(r.segunda, { tipo: 'ENTRA', usuarioId: r.inv.usuarioId })
    assert.equal(r.usuario?.status, 'ACTIVE')
    assert.equal(r.invitacion?.consumida, true)
    // El primer vínculo es el del Administrador que invitó; el segundo, el del Operador.
    const ultimo = r.vincular.at(-1)
    assert.equal(r.vincular.length, 2)
    assert.deepEqual([ultimo?.outcome, ultimo?.actor_user_id, ultimo?.origin], ['ok', r.inv.usuarioId, 'app'])
  })

  it('sin invitación no entra, aunque Google haya autenticado: queda auditado sin actor', async () => {
    const r = await descartable(async (tx) => {
      const decision = await ingresar(tx, identidad('sub-x', 'desconocido@sintetico.test'))
      const credenciales = await tx`select 1 from user_credential where subject = 'sub-x'`
      return { decision, credenciales: credenciales.length, ingresos: await eventos(tx, 'acceso.ingresar') }
    })
    assert.deepEqual(r.decision, { tipo: 'RECHAZA', motivo: 'NO_INVITADO' })
    assert.equal(r.credenciales, 0)
    assert.deepEqual(
      r.ingresos.map((e) => [e.outcome, e.reason_code, e.actor_user_id]),
      [['denied', 'NO_INVITADO', null]],
    )
  })

  it('un email no verificado, una invitación vencida o un usuario dado de baja no vinculan', async () => {
    const r = await descartable(async (tx) => {
      const admin = await administrador(tx)
      ok(await invitar(tx, { actor: admin, email: 'a@sintetico.test', rol: 'OPERADOR' }))
      const noVerificado = await ingresar(tx, identidad('sub-a', 'a@sintetico.test', false))

      ok(await invitar(tx, { actor: admin, email: 'b@sintetico.test', rol: 'OPERADOR', dias: 1 }))
      const vencida = await ingresar(tx, identidad('sub-b', 'b@sintetico.test'), Date.now() + 2 * 86_400_000)

      const c = ok(await invitar(tx, { actor: admin, email: 'c@sintetico.test', rol: 'OPERADOR' }))
      ok(await darDeBaja(tx, { actor: admin, usuarioId: c.usuarioId }))
      const deBaja = await ingresar(tx, identidad('sub-c', 'c@sintetico.test'))
      return { noVerificado, vencida, deBaja }
    })
    assert.deepEqual(r.noVerificado, { tipo: 'RECHAZA', motivo: 'EMAIL_NO_VERIFICADO' })
    assert.deepEqual(r.vencida, { tipo: 'RECHAZA', motivo: 'NO_INVITADO' })
    assert.deepEqual(r.deBaja, { tipo: 'RECHAZA', motivo: 'DADO_DE_BAJA' })
  })
})

describe('cada request: principal en la base (D-0022)', () => {
  it('el Operador ve sólo sus clientes; la baja corta el acceso en la transacción siguiente', async () => {
    const r = await descartable(async (tx) => {
      const admin = await administrador(tx)
      const [e1] = await tx<{ id: string }[]>`insert into party (kind) values ('ORGANIZATION') returning id`
      const [e2] = await tx<{ id: string }[]>`insert into party (kind) values ('ORGANIZATION') returning id`
      if (e1 === undefined || e2 === undefined) throw new Error('sin parties')
      const op = ok(await invitar(tx, { actor: admin, email: 'op@sintetico.test', rol: 'OPERADOR' }))
      await ingresar(tx, identidad('sub-op', 'op@sintetico.test'))
      ok(await asignarCliente(tx, { actor: admin, usuarioId: op.usuarioId, clientePartyId: e1.id }))

      const visto = await conPrincipal(tx, identidad('sub-op', 'op@sintetico.test'), async (dentro, principal) => ({
        principal,
        parties: (await dentro<{ id: string }[]>`select id from party where id in (${e1.id}, ${e2.id})`).map((f) => f.id),
      }))

      ok(await darDeBaja(tx, { actor: admin, usuarioId: op.usuarioId }))
      const despues = await conPrincipal(tx, identidad('sub-op', 'op@sintetico.test'), () => Promise.resolve('corrió'))
      const sinCredencial = await conPrincipal(tx, identidad('sub-nadie', 'n@sintetico.test'), () => Promise.resolve('corrió'))
      return { e1: e1.id, opId: op.usuarioId, visto, despues, sinCredencial }
    })
    assert.deepEqual(r.visto, { ok: true, valor: { principal: { usuarioId: r.opId, rol: 'OPERADOR' }, parties: [r.e1] } })
    assert.deepEqual(r.despues, { ok: false, motivo: 'SIN_ACCESO' })
    assert.deepEqual(r.sinCredencial, { ok: false, motivo: 'SIN_CREDENCIAL' })
  })
})

describe('aislamiento de conPrincipal dentro de una transacción existente (revisión del #105)', () => {
  const estado = async (tx: postgres.TransactionSql): Promise<[string, string]> => {
    const [fila] = await tx<{ rol: string; principal: string }[]>`
      select current_user as rol, coalesce(current_setting('authz.usuario_id', true), '') as principal
    `
    if (fila === undefined) throw new Error('sin estado')
    return [fila.rol, fila.principal]
  }

  it('al terminar, con acceso o sin él, la transacción de afuera vuelve a su rol y a su principal', async () => {
    const r = await descartable(async (tx) => {
      const admin = await administrador(tx)
      const op = ok(await invitar(tx, { actor: admin, email: 'op@sintetico.test', rol: 'OPERADOR' }))
      await ingresar(tx, identidad('sub-op', 'op@sintetico.test'))
      const antes = await estado(tx)
      const adentro = await conPrincipal(tx, identidad('sub-op', 'op@sintetico.test'), (dentro) => estado(dentro))
      const despuesConAcceso = await estado(tx)
      ok(await darDeBaja(tx, { actor: admin, usuarioId: op.usuarioId }))
      await conPrincipal(tx, identidad('sub-op', 'op@sintetico.test'), () => Promise.resolve(null))
      const despuesSinAcceso = await estado(tx)
      return { antes, adentro, despuesConAcceso, despuesSinAcceso, opId: op.usuarioId }
    })
    assert.deepEqual(r.adentro, { ok: true, valor: ['broker_app', r.opId] })
    assert.notEqual(r.antes[0], 'broker_app')
    assert.deepEqual(r.despuesConAcceso, r.antes)
    assert.deepEqual(r.despuesSinAcceso, r.antes)
  })

  it('si la acción falla, el savepoint se revierte y la transacción de afuera sigue con su rol', async () => {
    const r = await descartable(async (tx) => {
      const admin = await administrador(tx)
      await invitar(tx, { actor: admin, email: 'op@sintetico.test', rol: 'OPERADOR' })
      await ingresar(tx, identidad('sub-op', 'op@sintetico.test'))
      const antes = await estado(tx)
      const error = await conPrincipal(tx, identidad('sub-op', 'op@sintetico.test'), async (dentro) => {
        await dentro`select 1/0`
      }).then(
        () => null,
        (e: unknown) => (e instanceof Error ? e.message : String(e)),
      )
      return { antes, error, despues: await estado(tx) }
    })
    assert.match(r.error ?? '', /division by zero/)
    assert.deepEqual(r.despues, r.antes)
  })

  it('una consulta con la conexión de la app, sin rol restringido, falla en vez de saltear RLS', async () => {
    const r = await descartable((tx) =>
      afirmarRestringida(tx).then(
        () => 'pasó',
        (e: unknown) => (e instanceof Error ? e.message : String(e)),
      ),
    )
    assert.match(r, /fuera de una transacción restringida/)
  })

  it('como broker_app pero sin principal declarado, también falla', async () => {
    const r = await descartable(async (tx) => {
      await tx`set local role broker_app`
      return afirmarRestringida(tx).then(
        () => 'pasó',
        (e: unknown) => (e instanceof Error ? e.message : String(e)),
      )
    })
    assert.match(r, /fuera de una transacción restringida/)
  })
})

describe('administración de accesos: actor, auditoría y límites', () => {
  it('sólo el primer Administrador entra sin actor; después, sin actor se rechaza y queda auditado', async () => {
    const r = await descartable(async (tx) => {
      await administrador(tx)
      const segundo = await invitar(tx, { actor: null, email: 'otro-admin@sintetico.test', rol: 'ADMINISTRADOR' })
      return { segundo, invitaciones: await eventos(tx, 'usuario.invitar') }
    })
    assert.deepEqual(r.segundo, { ok: false, motivo: 'ACTOR_NO_AUTORIZADO' })
    assert.deepEqual(
      r.invitaciones.map((e) => [e.outcome, e.reason_code, e.origin]),
      [
        ['ok', 'ARRANQUE', 'cli'],
        ['denied', 'ACTOR_NO_AUTORIZADO', 'cli'],
      ],
    )
  })

  it('nadie arranca como Operador: sin Administrador, invitar a un Operador sin actor se rechaza', async () => {
    const r = await descartable((tx) => invitar(tx, { actor: null, email: 'op@sintetico.test', rol: 'OPERADOR' }))
    assert.deepEqual(r, { ok: false, motivo: 'ACTOR_NO_AUTORIZADO' })
  })

  it('un Operador no administra: no invita, no asigna, no da de baja', async () => {
    const r = await descartable(async (tx) => {
      const admin = await administrador(tx)
      const op = ok(await invitar(tx, { actor: admin, email: 'op@sintetico.test', rol: 'OPERADOR' }))
      await ingresar(tx, identidad('sub-op', 'op@sintetico.test'))
      const [e1] = await tx<{ id: string }[]>`insert into party (kind) values ('ORGANIZATION') returning id`
      if (e1 === undefined) throw new Error('sin party')
      return [
        await invitar(tx, { actor: op.usuarioId, email: 'x@sintetico.test', rol: 'OPERADOR' }),
        await asignarCliente(tx, { actor: op.usuarioId, usuarioId: op.usuarioId, clientePartyId: e1.id }),
        await darDeBaja(tx, { actor: op.usuarioId, usuarioId: admin }),
      ]
    })
    for (const resultado of r) assert.deepEqual(resultado, { ok: false, motivo: 'ACTOR_NO_AUTORIZADO' })
  })

  it('no se puede dejar el sistema sin Administrador activo, ni por baja ni por cambio de rol', async () => {
    const r = await descartable(async (tx) => {
      const admin = await administrador(tx)
      return [
        await darDeBaja(tx, { actor: admin, usuarioId: admin }),
        await cambiarRol(tx, { actor: admin, usuarioId: admin, rol: 'OPERADOR' }),
      ]
    })
    for (const resultado of r) assert.deepEqual(resultado, { ok: false, motivo: 'ULTIMO_ADMINISTRADOR' })
  })

  it('una asignación superpuesta se rechaza sin romper la transacción; cerrarla conserva la historia', async () => {
    const r = await descartable(async (tx) => {
      const admin = await administrador(tx)
      const op = ok(await invitar(tx, { actor: admin, email: 'op@sintetico.test', rol: 'OPERADOR' }))
      const [e1] = await tx<{ id: string }[]>`insert into party (kind) values ('ORGANIZATION') returning id`
      if (e1 === undefined) throw new Error('sin party')
      const primera = ok(await asignarCliente(tx, { actor: admin, usuarioId: op.usuarioId, clientePartyId: e1.id }))
      const repetida = await asignarCliente(tx, { actor: admin, usuarioId: op.usuarioId, clientePartyId: e1.id })
      // `lower(valid)` es el instante de la asignación; cerrarla en el mismo instante la
      // vaciaría. Se corre el inicio una hora atrás, como si fuera de antes.
      await tx`update client_assignment set valid = tstzrange(now() - interval '1 hour', null, '[)') where id = ${primera}`
      const cierre = await cerrarAsignacion(tx, { actor: admin, asignacionId: primera })
      const [fila] = await tx<{ abierta: boolean }[]>`
        select upper_inf(valid) as abierta from client_assignment where id = ${primera}
      `
      return { repetida, cierre, abierta: fila?.abierta, asignar: await eventos(tx, 'cliente.asignar') }
    })
    assert.deepEqual(r.repetida, { ok: false, motivo: 'ASIGNACION_SUPERPUESTA' })
    assert.deepEqual(r.cierre, { ok: true, valor: null })
    assert.equal(r.abierta, false)
    assert.deepEqual(
      r.asignar.map((e) => [e.outcome, e.reason_code]),
      [
        ['ok', null],
        ['denied', 'ASIGNACION_SUPERPUESTA'],
      ],
    )
  })
})
