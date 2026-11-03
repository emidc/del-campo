// T-0035, incremento 4: identidad, admisión y autorización de Communication OS en la base.
// Contra delcampo_communication_test con 0005 aplicada (R-26), con datos sintéticos y cada
// caso en una transacción revertida (R-19): las operaciones abren savepoints dentro de ella.

import assert from 'node:assert/strict'
import { after, before, describe, it } from 'node:test'

import { cambiarRol, darDeBaja, invitar } from './acceso.ts'
import { puede, type AccionCommunication } from '../domain/permisos.ts'
import {
  afirmarRestringida,
  conPrincipal,
  ingresar,
  type CredencialEncontrada,
  type DecisionLogin,
  type InvitacionEncontrada,
  type Rol,
} from '../persistence/acceso.ts'
import type { Sql, TransactionSql } from '../persistence/database.ts'
import { openTestDatabase } from '../persistence/testing.ts'

let sql: Sql
before(async () => {
  sql = await openTestDatabase()
})
after(async () => {
  await sql.end()
})

class Rollback extends Error {}

const descartable = async <T>(accion: (tx: TransactionSql) => Promise<T>): Promise<T> => {
  let resultado: T | undefined
  try {
    await sql.begin(async (tx) => {
      // La base es compartida con los tests de la app, que dejan personas y mensajes
      // (no pueden revertir entre requests). Dentro de esta transacción, que se revierte,
      // cada caso empieza sin personas activas, credenciales, invitaciones ni mensajes.
      await tx`
        truncate communication.outbound_attempt, communication.outbound_status,
                 communication.unsupported_message, communication.message,
                 communication.webhook_delivery, communication.user_invitation,
                 communication.user_credential`
      await tx`update communication.app_user set status = 'INACTIVE'`
      resultado = await accion(tx)
      throw new Rollback('descartar')
    })
  } catch (error) {
    if (!(error instanceof Rollback)) throw error
  }
  return resultado as T
}

/** Una regla mínima para los casos de la base. La regla real (`decidirLogin`) se prueba con la app. */
const decidirSimple =
  (ahora: number) =>
  (credencial: CredencialEncontrada | null, invitacion: InvitacionEncontrada | null): DecisionLogin => {
    if (credencial !== null) {
      return credencial.estadoUsuario === 'ACTIVO'
        ? { tipo: 'ENTRA', usuarioId: credencial.usuarioId }
        : { tipo: 'RECHAZA', motivo: 'DADO_DE_BAJA' }
    }
    if (invitacion === null || invitacion.venceEn <= ahora) return { tipo: 'RECHAZA', motivo: 'NO_INVITADO' }
    return { tipo: 'VINCULA', usuarioId: invitacion.usuarioId }
  }

const google = (sujeto: string, email: string) => ({ proveedor: 'google' as const, sujeto, email })

/** Un usuario ACTIVE con credencial, cargado directo: el caso de la base, no el del login. */
const persona = async (tx: TransactionSql, sujeto: string, rol: Rol, status = 'ACTIVE'): Promise<string> => {
  const [u] = await tx<{ id: string }[]>`
    insert into communication.app_user (email, role, status) values (${`${sujeto}@ejemplo.test`}, ${rol}, ${status})
    returning id`
  if (u === undefined) throw new Error('sin fila')
  await tx`insert into communication.user_credential (user_id, provider, subject) values (${u.id}, 'google', ${sujeto})`
  return u.id
}

const conversacion = async (tx: TransactionSql): Promise<void> => {
  await tx`
    insert into communication.message (wamid, direction, phone_number_id, wa_id, body, wa_timestamp)
    values ('wamid.acceso.1', 'inbound', '100000000000001', '5491100000001', 'texto sintético', now())`
  await tx`insert into communication.webhook_delivery (signature, body_raw) values ('valid', '{"crudo":true}')`
}

const DIGEST = Buffer.alloc(32, 7)

const nuevoIntento = (tx: TransactionSql, autor: string | null) => tx`
  insert into communication.outbound_attempt (idempotency_key, phone_number_id, wa_id, body, body_sha256, created_by)
  values (gen_random_uuid(), '100000000000001', '5491100000001', 'texto sintético', ${DIGEST}, ${autor})
  returning id`

const codigo = (error: unknown): string | undefined =>
  typeof error === 'object' && error !== null && 'code' in error && typeof error.code === 'string' ? error.code : undefined

describe('login con invitación en la base (D-0072, D-0077)', () => {
  it('una cuenta externa invitada vincula su credencial, queda ACTIVE y consume la invitación', async () => {
    await descartable(async (tx) => {
      const invitacion = await invitar(tx, { actor: null, email: 'Externa@Gmail.example', rol: 'ADMINISTRADOR' })
      assert.ok(invitacion.ok)
      const decision = await ingresar(tx, google('sub-externa', ' externa@gmail.example '), decidirSimple(Date.now()))
      assert.deepEqual(decision, { tipo: 'VINCULA', usuarioId: invitacion.valor.usuarioId })

      const [u] = await tx<{ status: string }[]>`select status from communication.app_user where id = ${invitacion.valor.usuarioId}`
      assert.equal(u?.status, 'ACTIVE')
      const [i] = await tx<{ consumida: boolean }[]>`
        select consumed_at is not null as consumida from communication.user_invitation where id = ${invitacion.valor.invitacionId}`
      assert.equal(i?.consumida, true)

      // Desde acá la identidad es el sujeto: entra aunque cambie el email de la cuenta.
      const otraVez = await ingresar(tx, google('sub-externa', 'otro-email@ejemplo.test'), decidirSimple(Date.now()))
      assert.deepEqual(otraVez, { tipo: 'ENTRA', usuarioId: invitacion.valor.usuarioId })

      const eventos = await tx<{ action: string; outcome: string }[]>`
        select action, outcome from communication.audit_event order by id desc limit 3`
      assert.deepEqual(
        eventos.map((e) => `${e.action}:${e.outcome}`),
        ['acceso.ingresar:ok', 'acceso.vincular:ok', 'usuario.invitar:ok'],
      )
    })
  })

  it('una cuenta no invitada no entra, y el rechazo queda auditado sin actor ni email', async () => {
    await descartable(async (tx) => {
      const decision = await ingresar(tx, google('sub-ajena', 'ajena@ejemplo.test'), decidirSimple(Date.now()))
      assert.deepEqual(decision, { tipo: 'RECHAZA', motivo: 'NO_INVITADO' })
      const [creds] = await tx<{ n: number }[]>`select count(*)::int as n from communication.user_credential`
      assert.equal(creds?.n, 0)
      const [e] = await tx<Record<string, unknown>[]>`
        select actor_user_id, object_id, outcome, reason_code from communication.audit_event order by id desc limit 1`
      assert.deepEqual({ ...e }, { actor_user_id: null, object_id: null, outcome: 'denied', reason_code: 'NO_INVITADO' })
    })
  })

  it('una invitación vencida no vincula', async () => {
    await descartable(async (tx) => {
      const invitacion = await invitar(tx, { actor: null, email: 'vencida@ejemplo.test', rol: 'ADMINISTRADOR', dias: 1 })
      assert.ok(invitacion.ok)
      const enDosDias = Date.now() + 2 * 24 * 3600 * 1000
      const decision = await ingresar(tx, google('sub-vencida', 'vencida@ejemplo.test'), decidirSimple(enDosDias))
      assert.deepEqual(decision, { tipo: 'RECHAZA', motivo: 'NO_INVITADO' })
    })
  })
})

describe('principal por transacción y revocación (D-0022)', () => {
  it('sin credencial o dada de baja, la consulta no corre', async () => {
    await descartable(async (tx) => {
      let corrio = false
      const sinCredencial = await conPrincipal(tx, google('sub-nadie', ''), () => {
        corrio = true
        return Promise.resolve(null)
      })
      assert.deepEqual(sinCredencial, { ok: false, motivo: 'SIN_CREDENCIAL' })

      const admin = await persona(tx, 'sub-admin', 'ADMINISTRADOR')
      const operador = await persona(tx, 'sub-operador', 'OPERADOR')
      assert.ok((await conPrincipal(tx, google('sub-operador', ''), () => Promise.resolve(1))).ok)
      assert.ok((await darDeBaja(tx, { actor: admin, usuarioId: operador })).ok)
      // La misma identidad, en el request siguiente: la base ya no la reconoce.
      const despues = await conPrincipal(tx, google('sub-operador', ''), () => {
        corrio = true
        return Promise.resolve(null)
      })
      assert.deepEqual(despues, { ok: false, motivo: 'SIN_ACCESO' })
      assert.equal(corrio, false)
    })
  })

  it('una persona sin rol no tiene acceso', async () => {
    await descartable(async (tx) => {
      const [u] = await tx<{ id: string }[]>`
        insert into communication.app_user (email, status) values ('sinrol@ejemplo.test', 'ACTIVE') returning id`
      await tx`insert into communication.user_credential (user_id, provider, subject) values (${u?.id ?? ''}, 'google', 'sub-sinrol')`
      assert.deepEqual(await conPrincipal(tx, google('sub-sinrol', ''), () => Promise.resolve(1)), {
        ok: false,
        motivo: 'SIN_ACCESO',
      })
    })
  })

  it('al terminar, la transacción de afuera vuelve a su rol y a su principal', async () => {
    await descartable(async (tx) => {
      await persona(tx, 'sub-operador', 'OPERADOR')
      const [antes] = await tx<{ rol: string }[]>`select current_user as rol`
      const dentro = await conPrincipal(tx, google('sub-operador', ''), async (inner) => {
        const [fila] = await inner<{ rol: string }[]>`select current_user as rol`
        return fila?.rol
      })
      assert.deepEqual(dentro, { ok: true, valor: 'communication_app' })
      const [despues] = await tx<{ rol: string; principal: string }[]>`
        select current_user as rol, coalesce(current_setting('authz.usuario_id', true), '') as principal`
      assert.deepEqual({ ...despues }, { rol: antes?.rol, principal: '' })
      await assert.rejects(afirmarRestringida(tx), /fuera de una transacción restringida/)
    })
  })
})

describe('qué ve y qué hace cada rol, en la base', () => {
  const comoRol = async <T>(rol: Rol, accion: (tx: TransactionSql, id: string) => Promise<T>): Promise<T> =>
    descartable(async (tx) => {
      await conversacion(tx)
      const id = await persona(tx, `sub-${rol.toLowerCase()}`, rol)
      const resultado = await conPrincipal(tx, google(`sub-${rol.toLowerCase()}`, ''), (inner) => accion(inner, id))
      if (!resultado.ok) throw new Error(resultado.motivo)
      return resultado.valor
    })

  const cuenta = async (tx: TransactionSql, tabla: 'message' | 'webhook_delivery'): Promise<number> => {
    const [fila] = await tx<{ n: number }[]>`select count(*)::int as n from ${tx(`communication.${tabla}`)}`
    return fila?.n ?? -1
  }

  it('Administrador y Operador ven las conversaciones; el Revisor no ve nada', async () => {
    for (const [rol, esperado] of [['ADMINISTRADOR', 1], ['OPERADOR', 1], ['REVISOR', 0]] as const) {
      const visto = await comoRol(rol, async (tx) => [await cuenta(tx, 'message'), await cuenta(tx, 'webhook_delivery')])
      assert.deepEqual(visto, [esperado, esperado], rol)
    }
  })

  it('nadie lee el cuerpo crudo de las entregas ni el ledger de migraciones', async () => {
    for (const rol of ['ADMINISTRADOR', 'OPERADOR'] as const) {
      await comoRol(rol, async (tx) => {
        await assert.rejects(tx.savepoint((sp) => sp`select body_raw from communication.webhook_delivery`), (e) => codigo(e) === '42501')
        await assert.rejects(tx.savepoint((sp) => sp`select * from communication.schema_migrations`), (e) => codigo(e) === '42501')
      })
    }
  })

  it('Administrador y Operador crean un intento de envío, sólo a su nombre; el Revisor no', async () => {
    for (const rol of ['ADMINISTRADOR', 'OPERADOR'] as const) {
      await comoRol(rol, async (tx, yo) => {
        assert.equal((await nuevoIntento(tx, yo)).length, 1, rol)
        const [otro] = await tx<{ id: string }[]>`select gen_random_uuid()::text as id`
        await assert.rejects(tx.savepoint((sp) => nuevoIntento(sp, otro?.id ?? null)), (e) => codigo(e) === '42501', rol)
        await assert.rejects(tx.savepoint((sp) => nuevoIntento(sp, null)), (e) => codigo(e) === '42501', rol)
      })
    }
    await comoRol('REVISOR', async (tx, yo) => {
      await assert.rejects(tx.savepoint((sp) => nuevoIntento(sp, yo)), (e) => codigo(e) === '42501')
    })
  })

  it('nadie escribe un mensaje entrante ni borra mensajes', async () => {
    await comoRol('OPERADOR', async (tx) => {
      await assert.rejects(
        tx.savepoint(
          (sp) => sp`
            insert into communication.message (wamid, direction, phone_number_id, wa_id, body, wa_timestamp)
            values ('wamid.falso', 'inbound', '100000000000001', '5491100000001', 'x', now())`,
        ),
        (e) => codigo(e) === '42501',
      )
      await assert.rejects(tx.savepoint((sp) => sp`delete from communication.message`), (e) => codigo(e) === '42501')
    })
  })

  it('la regla de la app y la de la base dicen lo mismo para cada rol y acción', async () => {
    const FUNCION: Record<AccionCommunication, string> = {
      'conversacion.consultar': 'authz_puede_leer',
      'conversacion.responder': 'authz_puede_responder',
    }
    for (const rol of ['ADMINISTRADOR', 'OPERADOR', 'REVISOR'] as const) {
      await comoRol(rol, async (tx) => {
        for (const [accion, funcion] of Object.entries(FUNCION) as [AccionCommunication, string][]) {
          // `funcion` sale de la tabla de arriba, no de una entrada.
          const [fila] = await tx.unsafe<{ v: boolean }[]>(`select communication.${funcion}() as v`)
          assert.equal(fila?.v, puede(rol, accion), `${rol} ${accion}`)
        }
      })
    }
  })
})

describe('condiciones de D-0022 en el esquema', () => {
  it('ningún rol de la app tiene BYPASSRLS ni puede iniciar sesión', async () => {
    const [r] = await sql<{ bypass: boolean; login: boolean; inherit: boolean }[]>`
      select rolbypassrls as bypass, rolcanlogin as login, rolinherit as inherit from pg_roles where rolname = 'communication_app'`
    assert.deepEqual({ ...r }, { bypass: false, login: false, inherit: false })
  })

  it('toda tabla del esquema tiene RLS habilitado', async () => {
    const sinRls = await sql<{ t: string }[]>`
      select c.relname as t from pg_class c join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'communication' and c.relkind = 'r' and not c.relrowsecurity`
    assert.deepEqual(sinRls.map((r) => r.t), [])
  })

  it('las funciones privilegiadas fijan search_path y sólo communication_app las ejecuta', async () => {
    const funciones = await sql<{ nombre: string; config: string[] | null; publico: boolean; app: boolean }[]>`
      select p.proname as nombre, p.proconfig as config,
             has_function_privilege('public', p.oid, 'execute') as publico,
             has_function_privilege('communication_app', p.oid, 'execute') as app
      from pg_proc p join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'communication' and p.prosecdef`
    assert.ok(funciones.length >= 6)
    for (const f of funciones) {
      assert.ok(f.config?.includes('search_path=""'), `${f.nombre}: search_path`)
      assert.equal(f.publico, false, `${f.nombre}: public`)
      assert.equal(f.app, true, `${f.nombre}: communication_app`)
    }
  })

  it('la auditoría es sólo de inserción y no admite texto libre', async () => {
    await descartable(async (tx) => {
      await tx`insert into communication.audit_event (origin, action, outcome) values ('cli', 'prueba.evento', 'ok')`
      await assert.rejects(tx.savepoint((sp) => sp`update communication.audit_event set outcome = 'error'`), /sólo de inserción/)
      await assert.rejects(tx.savepoint((sp) => sp`delete from communication.audit_event`), /sólo de inserción/)
      await assert.rejects(
        tx.savepoint(
          (sp) => sp`insert into communication.audit_event (origin, action, outcome, object_id)
                     values ('app', 'conversacion.responder', 'ok', ${'hola, te escribo por tu póliza: '.repeat(4)})`,
        ),
        (e) => codigo(e) === '23514',
      )
    })
  })
})

describe('administración de accesos', () => {
  it('sin actor sólo se invita al primer Administrador', async () => {
    await descartable(async (tx) => {
      assert.deepEqual(await invitar(tx, { actor: null, email: 'op@ejemplo.test', rol: 'OPERADOR' }), {
        ok: false,
        motivo: 'ACTOR_NO_AUTORIZADO',
      })
      assert.ok((await invitar(tx, { actor: null, email: 'admin@ejemplo.test', rol: 'ADMINISTRADOR' })).ok)
      await persona(tx, 'sub-admin-activo', 'ADMINISTRADOR')
      assert.deepEqual(await invitar(tx, { actor: null, email: 'otro@ejemplo.test', rol: 'ADMINISTRADOR' }), {
        ok: false,
        motivo: 'ACTOR_NO_AUTORIZADO',
      })
    })
  })

  it('un Operador no administra, y el último Administrador no se da de baja ni pierde el rol', async () => {
    await descartable(async (tx) => {
      const admin = await persona(tx, 'sub-admin', 'ADMINISTRADOR')
      const operador = await persona(tx, 'sub-operador', 'OPERADOR')
      assert.deepEqual(await darDeBaja(tx, { actor: operador, usuarioId: admin }), { ok: false, motivo: 'ACTOR_NO_AUTORIZADO' })
      assert.deepEqual(await darDeBaja(tx, { actor: admin, usuarioId: admin }), { ok: false, motivo: 'ULTIMO_ADMINISTRADOR' })
      assert.deepEqual(await cambiarRol(tx, { actor: admin, usuarioId: admin, rol: 'OPERADOR' }), {
        ok: false,
        motivo: 'ULTIMO_ADMINISTRADOR',
      })
      assert.ok((await cambiarRol(tx, { actor: admin, usuarioId: operador, rol: 'REVISOR' })).ok)
      const [e] = await tx<{ n: number }[]>`
        select count(*)::int as n from communication.audit_event where outcome = 'denied' and origin = 'cli'`
      assert.equal(e?.n, 3)
    })
  })
})
