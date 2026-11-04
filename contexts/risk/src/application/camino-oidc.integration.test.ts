// T-0035, preparación de la fase 4 (decisión del owner, 2026-11-04): el camino `oidc` no lee
// datos por privilegios heredados ni por `legado_risk_app` (migración 0009).
//
// Lo que se prueba, contra delcampo_risk_test:
//   1. `risk_oidc`, la conexión del modo `oidc`, no lee ni escribe ninguna tabla, ni por grants
//      ni por políticas; sólo asume `risk_persona` (sin heredar), llama a las tres funciones de
//      admisión y audita un rechazo sin actor.
//   2. `legado_risk_app` no le alcanza: no es miembro de `risk_app`, y `risk_app` ya no es
//      miembro de `risk_persona` ni puede admitir a nadie.
//   3. `ingresar` y `conPrincipal` no corren con la conexión de `legacy` ni con la del dueño.
//   4. La base vuelve a comprobar cada ingreso: si la app se equivocara, no escribe nada.
//
// El resto del camino (login, páginas, endpoints, token entre contextos) corre ya como
// `risk_oidc` en `apps/risk/src/lib/acceso.integration.test.ts` y en
// `autorizacion.integration.test.ts`.

import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { after, before, describe, it } from 'node:test'
import { fileURLToPath } from 'node:url'

import type { Sql, TransactionSql } from '../persistence/database.ts'
import { conPrincipal, ingresar, ROL_CONEXION_OIDC, type DecisionLogin } from '../persistence/identidad.ts'
import { enTransaccionRevertida, openTestDatabase } from '../persistence/testing.ts'
import { verificarOidc } from '../persistence/verificacion-oidc.ts'
import { conEscenario } from '../testing/actualizacion.ts'
import { invitar } from './accesos.ts'

let sql: Sql
before(async () => {
  sql = await openTestDatabase()
})
after(async () => {
  await sql.end()
})

const ADMISION = ['risk.admision_credencial(text,text)', 'risk.admision_invitacion(text)', 'risk.admision_registrar(text,text,text,text,bigint)']

/** El SQLSTATE de una sentencia que tiene que fallar, dentro de un savepoint. */
const codigo = async (tx: TransactionSql, f: (t: TransactionSql) => Promise<unknown>): Promise<string> => {
  try {
    await tx.savepoint(f)
  } catch (e) {
    return String((e as { code?: string }).code)
  }
  return 'sin error'
}

const como = async <T>(tx: TransactionSql, rol: string, f: () => Promise<T>): Promise<T> => {
  await tx`set local role ${tx(rol)}`
  try {
    return await f()
  } finally {
    await tx`reset role`
  }
}

const tablas = async (db: Sql | TransactionSql): Promise<string[]> =>
  (await db<{ t: string }[]>`
    select c.relname as t from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'risk' and c.relkind = 'r' order by 1`).map((x) => x.t)

describe('risk_oidc: la conexión del modo oidc no lee datos', () => {
  it('no salta RLS y sólo es miembro de risk_persona, sin heredar; no alcanza a risk_app ni al dueño', async () => {
    const [r] = await sql<{ bypass: boolean; superusuario: boolean; hereda: boolean; crea: boolean }[]>`
      select rolbypassrls as bypass, rolsuper as superusuario, rolinherit as hereda, (rolcreaterole or rolcreatedb) as crea
      from pg_roles where rolname = ${ROL_CONEXION_OIDC}`
    assert.deepEqual({ ...r }, { bypass: false, superusuario: false, hereda: false, crea: false })
    const miembro = await sql<{ rol: string; inherit: boolean; set: boolean }[]>`
      select g.rolname as rol, m.inherit_option as inherit, m.set_option as set
      from pg_auth_members m join pg_roles g on g.oid = m.roleid
      where m.member = 'risk_oidc'::regrole`
    assert.deepEqual(miembro.map((m) => ({ ...m })), [{ rol: 'risk_persona', inherit: false, set: true }])
    const [alcanza] = await sql<{ app: boolean; dueno: boolean }[]>`
      select pg_has_role('risk_oidc', 'risk_app', 'member') as app,
             pg_has_role('risk_oidc', (select relowner from pg_class where oid = 'risk.riesgo'::regclass), 'member') as dueno`
    assert.deepEqual({ ...alcanza }, { app: false, dueno: false })
  })

  it('ningún privilegio sobre ninguna tabla de risk, salvo insertar en la auditoría', async () => {
    const todas = await tablas(sql)
    assert.ok(todas.length >= 26)
    const privilegios = await sql<{ t: string; p: string }[]>`
      select c.relname as t, p.p from pg_class c join pg_namespace n on n.oid = c.relnamespace
      cross join unnest(array['select', 'insert', 'update', 'delete', 'truncate', 'references', 'trigger']) as p(p)
      where n.nspname = 'risk' and c.relkind in ('r', 'v', 'm', 'f', 'p')
        and (has_table_privilege('risk_oidc', c.oid, p.p)
             or (p.p in ('select', 'insert', 'update', 'references') and has_any_column_privilege('risk_oidc', c.oid, p.p)))
      order by 1, 2`
    assert.deepEqual(privilegios.map((x) => `${x.t} ${x.p}`), ['evento_auditoria insert'])
    // Y ahí, sólo las columnas del evento: `id` y `ocurrido_en` los pone la base.
    const [tabla] = await sql<{ entera: boolean; id: boolean; ocurrido: boolean; motivo: boolean }[]>`
      select has_table_privilege('risk_oidc', 'risk.evento_auditoria', 'insert') as entera,
             has_column_privilege('risk_oidc', 'risk.evento_auditoria', 'id', 'insert') as id,
             has_column_privilege('risk_oidc', 'risk.evento_auditoria', 'ocurrido_en', 'insert') as ocurrido,
             has_column_privilege('risk_oidc', 'risk.evento_auditoria', 'motivo', 'insert') as motivo`
    assert.deepEqual({ ...tabla }, { entera: false, id: false, ocurrido: false, motivo: true })
    const secuencias = await sql<{ s: string }[]>`
      select c.relname as s from pg_class c join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'risk' and c.relkind = 'S'
        and (has_sequence_privilege('risk_oidc', c.oid, 'usage') or has_sequence_privilege('risk_oidc', c.oid, 'select'))`
    assert.deepEqual(secuencias.map((s) => s.s), [])
    const [crea] = await sql<{ crea: boolean }[]>`select has_schema_privilege('risk_oidc', 'risk', 'create') as crea`
    assert.equal(crea?.crea, false)
  })

  it('como risk_oidc, leer cualquier tabla da 42501, también con filas cargadas', () =>
    conEscenario(sql, async ({ tx }) => {
      for (const t of await tablas(tx)) {
        assert.equal(await como(tx, 'risk_oidc', () => codigo(tx, (u) => u`select 1 from ${u(`risk.${t}`)} limit 1`)), '42501', t)
      }
    }))

  it('ninguna política le deja ver filas: sólo la de rechazos; legado_risk_app es sólo de risk_app', async () => {
    const politicas = await sql<{ tabla: string; politica: string; cmd: string; roles: string[] }[]>`
      select c.relname as tabla, p.polname as politica, p.polcmd::text as cmd,
             array(select coalesce((select rolname from pg_roles where oid = r), 'public') from unnest(p.polroles) r order by 1) as roles
      from pg_policy p join pg_class c on c.oid = p.polrelid join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'risk'`
    const deOidc = politicas.filter((p) => p.roles.includes('risk_oidc') || p.roles.includes('public'))
    assert.deepEqual(deOidc.map((p) => ({ ...p })), [{ tabla: 'evento_auditoria', politica: 'evento_auditoria_rechazo', cmd: 'a', roles: ['risk_oidc'] }])
    const legado = politicas.filter((p) => p.politica === 'legado_risk_app')
    assert.equal(legado.length, (await tablas(sql)).length, 'legacy sigue igual: la política no se tocó')
    assert.ok(legado.every((p) => p.roles.length === 1 && p.roles[0] === 'risk_app'))
  })

  it('sólo audita rechazos sin actor ni objeto, y no lee la auditoría', () =>
    enTransaccionRevertida(sql, async (tx) => {
      const evento = (accion: string, resultado: string, actor: string | null = null, objeto: string | null = null) =>
        como(tx, 'risk_oidc', () => codigo(tx, (u) => u`
          insert into risk.evento_auditoria (actor_persona_id, origen, accion, tipo_objeto, id_objeto, resultado, motivo)
          values (${actor}, 'app', ${accion}, ${objeto === null ? null : 'persona'}, ${objeto}, ${resultado}, 'SIN_ACCESO')`))
      assert.equal(await evento('acceso.consultar', 'denied'), 'sin error')
      assert.equal(await evento('acceso.ingresar', 'denied'), 'sin error')
      assert.equal(await evento('acceso.token', 'denied'), 'sin error')
      assert.equal(await evento('acceso.ingresar', 'ok'), '42501', 'un ingreso exitoso lo escribe sólo admision_registrar')
      assert.equal(await evento('acceso.vincular', 'denied'), '42501')
      assert.equal(await evento('riesgo.novedad', 'denied'), '42501')
      assert.equal(await evento('persona.dar_de_baja', 'denied'), '42501')
      assert.equal(await evento('acceso.consultar', 'denied', null, 'PER-01M50T00000000000000000002'), '42501', 'sin objeto')
      assert.equal(await como(tx, 'risk_oidc', () => codigo(tx, (u) => u`select count(*) from risk.evento_auditoria`)), '42501')
      // Ni fechar un rechazo ni ocupar un id futuro (revisión ciega de 0009, hallazgo 2).
      assert.equal(await como(tx, 'risk_oidc', () => codigo(tx, (u) => u`
        insert into risk.evento_auditoria (id, actor_persona_id, origen, accion, resultado, motivo)
        overriding system value values (999999999, null, 'app', 'acceso.consultar', 'denied', 'SIN_ACCESO')`)), '42501')
      assert.equal(await como(tx, 'risk_oidc', () => codigo(tx, (u) => u`
        insert into risk.evento_auditoria (ocurrido_en, actor_persona_id, origen, accion, resultado, motivo)
        values ('2020-01-01', null, 'app', 'acceso.consultar', 'denied', 'SIN_ACCESO')`)), '42501')
    }))
})

describe('funciones de admisión (0009)', () => {
  it('son SECURITY DEFINER con search_path vacío, y sólo risk_oidc las ejecuta', async () => {
    const fs = await sql<{ f: string; definer: boolean; config: string[] | null; publico: boolean; oidc: boolean; app: boolean; persona: boolean }[]>`
      select p.oid::regprocedure::text as f, p.prosecdef as definer, p.proconfig as config,
             has_function_privilege('public', p.oid, 'execute') as publico,
             has_function_privilege('risk_oidc', p.oid, 'execute') as oidc,
             has_function_privilege('risk_app', p.oid, 'execute') as app,
             has_function_privilege('risk_persona', p.oid, 'execute') as persona
      from pg_proc p join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'risk' and p.proname like 'admision\\_%' order by 1`
    assert.deepEqual(fs.map((f) => f.f), ADMISION)
    for (const f of fs) {
      assert.deepEqual({ ...f }, { f: f.f, definer: true, config: ['search_path=""'], publico: false, oidc: true, app: false, persona: false })
    }
  })

  it('contestan por una identidad o un email concretos: nada que listar', () =>
    conEscenario(sql, async ({ tx }) => {
      const a = await invitar(tx, { actor: null, email: 'admin@ejemplo.invalid', rol: 'ADMINISTRADOR', nombre: 'Administradora de prueba' })
      assert.ok(a.ok)
      const vacias = await como(tx, 'risk_oidc', async () => [
        await tx`select * from risk.admision_credencial('google', '')`,
        await tx`select * from risk.admision_credencial('google', ${'%'})`,
        await tx`select * from risk.admision_invitacion('')`,
        await tx`select * from risk.admision_invitacion(${'%'})`,
      ])
      assert.deepEqual(vacias.map((v) => v.length), [0, 0, 0, 0])
      const [inv] = await como(tx, 'risk_oidc', () => tx<{ personaId: string }[]>`
        select persona_id as "personaId" from risk.admision_invitacion('admin@ejemplo.invalid')`)
      assert.equal(inv?.personaId, a.valor.personaId)
    }))

  it('la base vuelve a comprobar cada ingreso: si la app se equivocara, 42501 y nada escrito', () =>
    conEscenario(sql, async ({ tx }) => {
      const registrar = (persona: string, sujeto: string, email: string | null, invitacion: string | null) =>
        como(tx, 'risk_oidc', () => codigo(tx, (u) => u`
          select risk.admision_registrar(${persona}, 'google', ${sujeto}, ${email}, ${invitacion}::bigint)`))
      const escrito = async (): Promise<number> => (await tx<{ n: number }[]>`
        select ((select count(*) from risk.credencial_externa) + (select count(*) from risk.registro_acceso)
             + (select count(*) from risk.evento_auditoria where resultado = 'ok' and accion like 'acceso.%'))::int as n`)[0]?.n ?? -1

      const a = await invitar(tx, { actor: null, email: 'admin@ejemplo.invalid', rol: 'ADMINISTRADOR', nombre: 'Administradora de prueba' })
      assert.ok(a.ok)
      const admin = a.valor.personaId
      assert.equal(await registrar(admin, 'sub-admin', 'admin@ejemplo.invalid', a.valor.invitacionId), 'sin error')
      const o = await invitar(tx, { actor: admin, email: 'operadora@ejemplo.invalid', rol: 'OPERADOR', nombre: 'Operadora nueva' })
      assert.ok(o.ok)
      const operadora = o.valor.personaId
      const [vencida] = await tx<{ id: string }[]>`
        insert into risk.invitacion (persona_id, email, vence_en, creada_en)
        values (${operadora}, 'vencida@ejemplo.invalid', now() - interval '1 day', now() - interval '8 days') returning id::text`
      const antes = await escrito()

      // Vincular con la invitación de otra persona, con otro email o con una vencida.
      assert.equal(await registrar(admin, 'sub-x', 'operadora@ejemplo.invalid', o.valor.invitacionId), '42501')
      assert.equal(await registrar(operadora, 'sub-x', 'otra@ejemplo.invalid', o.valor.invitacionId), '42501')
      assert.equal(await registrar(operadora, 'sub-x', 'vencida@ejemplo.invalid', vencida?.id ?? ''), '42501')
      // Entrar sin credencial, o con la de otra persona.
      assert.equal(await registrar(operadora, 'sub-x', null, null), '42501')
      assert.equal(await registrar(operadora, 'sub-admin', null, null), '42501')
      // Una invitación se consume una sola vez.
      assert.equal(await registrar(admin, 'sub-admin-2', 'admin@ejemplo.invalid', a.valor.invitacionId), '42501')
      // Dada de baja, no entra aunque tenga su credencial, ni se vincula aunque tenga su invitación.
      await tx`insert into risk.rol_persona (persona_id, rol, autor_persona_id) values (${operadora}, null, ${admin})`
      assert.equal(await registrar(operadora, 'sub-x', 'operadora@ejemplo.invalid', o.valor.invitacionId), '42501')
      assert.equal(await escrito(), antes, 'nada de lo rechazado escribió')

      // Y lo válido sí: entrar con la credencial propia.
      assert.equal(await registrar(admin, 'sub-admin', null, null), 'sin error')
      assert.equal(await escrito(), antes + 2, 'su inicio de sesión y su evento')
      await tx`insert into risk.rol_persona (persona_id, rol, autor_persona_id) values (${admin}, null, null)`
      assert.equal(await registrar(admin, 'sub-admin', null, null), '42501', 'dada de baja, su credencial ya no entra')
      assert.equal(await escrito(), antes + 2)
    }))
})

describe('el camino oidc no corre con la conexión de legacy', () => {
  const decidir = (): DecisionLogin => ({ tipo: 'RECHAZA', motivo: 'NO_INVITADO' })

  it('risk_app no es miembro de risk_persona ni de risk_oidc, y no ejecuta la admisión', async () => {
    const [r] = await sql<{ persona: boolean; oidc: boolean }[]>`
      select pg_has_role('risk_app', 'risk_persona', 'member') as persona, pg_has_role('risk_app', 'risk_oidc', 'member') as oidc`
    assert.deepEqual({ ...r }, { persona: false, oidc: false })
  })

  for (const rol of ['risk_app', null] as const) {
    it(`ingresar y conPrincipal fallan antes de leer con la conexión ${rol === null ? 'del dueño' : `de ${rol}`}`, () =>
      enTransaccionRevertida(sql, async (tx) => {
        if (rol !== null) await tx`set local role ${tx(rol)}`
        const auditoria = async (): Promise<number> => {
          if (rol !== null) await tx`reset role`
          const [n] = await tx<{ n: number }[]>`select count(*)::int as n from risk.evento_auditoria`
          if (rol !== null) await tx`set local role ${tx(rol)}`
          return n?.n ?? -1
        }
        const antes = await auditoria()
        let corrio = false
        await assert.rejects(ingresar(tx, { proveedor: 'google', sujeto: 's', email: 'x@ejemplo.invalid' }, () => {
          corrio = true
          return decidir()
        }), /sólo con la conexión de risk_oidc/)
        await assert.rejects(conPrincipal(tx, { proveedor: 'google', sujeto: 's' }, () => {
          corrio = true
          return Promise.resolve(null)
        }), /sólo con la conexión de risk_oidc/)
        assert.equal(corrio, false)
        assert.equal(await auditoria(), antes, 'ni siquiera el rechazo')
      }))
  }
})

describe('deploy/rol-oidc.sql y db:verificar-oidc', () => {
  /** El archivo sin su `begin;` y `commit;`: acá ya corre dentro de una transacción que se revierte. */
  const rolOidc = (): string => {
    const texto = readFileSync(fileURLToPath(new URL('../../deploy/rol-oidc.sql', import.meta.url)), 'utf8')
    assert.match(texto, /^begin;$/m)
    assert.match(texto, /^commit;$/m)
    return texto.replace(/^(begin|commit);$/gm, '')
  }
  const fallan = async (tx: TransactionSql): Promise<string[]> => (await verificarOidc(tx)).puntos.filter((p) => !p.cumple).map((p) => p.punto)

  it('es idempotente, le da LOGIN y le quita lo que alguien le haya dado de más', () =>
    enTransaccionRevertida(sql, async (tx) => {
      await tx`grant select on risk.riesgo to risk_oidc`
      await tx`grant risk_app to risk_oidc`
      await tx`grant risk_persona to risk_oidc with inherit true`
      await tx.unsafe(rolOidc())
      await tx.unsafe(rolOidc())
      const [r] = await tx<{ login: boolean }[]>`select rolcanlogin as login from pg_roles where rolname = 'risk_oidc'`
      assert.equal(r?.login, true)
      await tx`set local role risk_oidc`
      assert.deepEqual(await fallan(tx), [])
    }))

  it('verificar-oidc ve una conexión equivocada o con privilegios de más', () =>
    enTransaccionRevertida(sql, async (tx) => {
      await tx.unsafe(rolOidc())
      assert.ok((await fallan(tx)).includes('conectado como risk_oidc'), 'otra cadena no pasa por la de oidc')
      await tx`grant select on risk.credencial_externa to risk_oidc`
      await tx`grant risk_app to risk_oidc with inherit false, set true`
      await tx`set local role risk_oidc`
      assert.deepEqual(await fallan(tx), [
        'miembro sólo de risk_persona, sin heredar y con SET',
        'no alcanza a risk_app ni a otro rol (legado_risk_app no le llega)',
        'ningún privilegio sobre tablas ni vistas de risk, salvo insertar en la auditoría',
      ])
    }))

  it('después de una restauración con --no-privileges: verificar-oidc lo ve y rol-oidc.sql cierra las funciones', () =>
    enTransaccionRevertida(sql, async (tx) => {
      // Lo que deja `pg_restore --no-privileges`: las funciones con EXECUTE para PUBLIC y
      // `risk_persona` sin sus grants (revisión ciega de 0009, hallazgo 1).
      for (const f of ADMISION) await tx.unsafe(`grant execute on function ${f} to public`)
      await tx`create view risk.vista_t0035 as select id from risk.riesgo`
      await tx`grant select on risk.vista_t0035 to public`
      await tx`revoke usage on schema risk from risk_persona`
      await tx.unsafe(rolOidc())
      const publico = await tx<{ f: string }[]>`
        select p.oid::regprocedure::text as f from pg_proc p join pg_namespace n on n.oid = p.pronamespace
        where n.nspname = 'risk' and p.prosecdef and has_function_privilege('public', p.oid, 'execute')`
      assert.deepEqual(publico.map((x) => x.f), [], 'rol-oidc.sql se las vuelve a sacar a PUBLIC')
      await tx`set local role risk_oidc`
      assert.deepEqual(await fallan(tx), [
        'ningún privilegio sobre tablas ni vistas de risk, salvo insertar en la auditoría',
        'risk_persona conserva sus permisos (si no, oidc niega todo)',
      ])
      await tx`reset role`
      for (const f of ADMISION) await tx.unsafe(`grant execute on function ${f} to public`)
      await tx`set local role risk_oidc`
      assert.ok((await fallan(tx)).includes('PUBLIC no ejecuta ninguna función SECURITY DEFINER de risk'))
    }))
})
