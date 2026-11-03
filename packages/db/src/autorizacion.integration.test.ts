// T-0035, incrementos 2 y 3: identidad y autorización híbrida en la base de Broker OS
// (0007_identidad_y_autorizacion.sql y 0008_conexion_asume_roles.sql; D-0022, D-0027, D-0077). Contra un Postgres real
// (R-26), con datos sintéticos y cada caso en una transacción revertida (R-19).
//
// Requiere DATABASE_URL apuntando a una base con 0007 aplicada (`pnpm db:migrate`).

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

const uno = <T>(filas: readonly T[]): T => {
  const [fila] = filas
  if (fila === undefined) throw new Error('se esperaba una fila')
  return fila
}

interface Id {
  readonly id: string
}

// ── Semilla sintética ───────────────────────────────────────────────────────
// E1 y E2 son empresas; P1 es miembro vigente de E1; PX fue miembro de E1 pero ya no;
// P3 es un cliente particular. Hay una póliza por tomador: E1, E2, P3.

interface Mundo {
  readonly e1: string
  readonly e2: string
  readonly p1: string
  readonly px: string
  readonly p3: string
  readonly polE1: string
  readonly polE2: string
  readonly polP3: string
  readonly admin: string
  readonly op: string
  readonly opSinAsignar: string
  readonly opVencido: string
  readonly revisor: string
  readonly baja: string
  readonly invitado: string
  readonly sinRol: string
}

const sembrar = async (tx: postgres.TransactionSql): Promise<Mundo> => {
  const party = async (kind: 'PERSON' | 'ORGANIZATION'): Promise<string> =>
    uno(await tx<Id[]>`insert into party (kind) values (${kind}) returning id`).id
  const e1 = await party('ORGANIZATION')
  const e2 = await party('ORGANIZATION')
  const p1 = await party('PERSON')
  const px = await party('PERSON')
  const p3 = await party('PERSON')
  const aseguradora = await party('ORGANIZATION')

  await tx`
    insert into organization_membership (organization_party_id, person_party_id, kind, valid_from, valid_to)
    values (${e1}, ${p1}, 'EMPLOYEE', now() - interval '1 year', null),
           (${e1}, ${px}, 'EMPLOYEE', now() - interval '1 year', now() - interval '1 day')
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
      values (
        ${id}, 1, current_date - 30, ${tomador},
        current_date - 30, current_date + 335, 'MANUAL', 'ACTIVE', 'ISSUANCE'
      )
    `
    return id
  }
  const polE1 = await poliza('SINT-E1', e1)
  const polE2 = await poliza('SINT-E2', e2)
  const polP3 = await poliza('SINT-P3', p3)

  const usuario = async (email: string, status: string, role: string | null): Promise<string> =>
    uno(
      await tx<Id[]>`
        insert into app_user (email, status, auth_provider, role) values (${email}, ${status}, 'google', ${role}) returning id
      `,
    ).id
  const admin = await usuario('admin@sintetico.test', 'ACTIVE', 'ADMINISTRADOR')
  const op = await usuario('op@sintetico.test', 'ACTIVE', 'OPERADOR')
  const opSinAsignar = await usuario('op2@sintetico.test', 'ACTIVE', 'OPERADOR')
  const opVencido = await usuario('op3@sintetico.test', 'ACTIVE', 'OPERADOR')
  const revisor = await usuario('rev@sintetico.test', 'ACTIVE', 'REVISOR')
  const baja = await usuario('baja@sintetico.test', 'INACTIVE', 'OPERADOR')
  const invitado = await usuario('inv@sintetico.test', 'INVITED', 'OPERADOR')
  const sinRol = await usuario('sinrol@sintetico.test', 'ACTIVE', null)

  await tx`
    insert into client_assignment (user_id, client_party_id, valid) values
      (${op}, ${e1}, tstzrange(now() - interval '1 day', null, '[)')),
      (${op}, ${p3}, tstzrange(now() - interval '1 day', null, '[)')),
      (${opVencido}, ${e1}, tstzrange(now() - interval '1 month', now(), '[)')),
      (${baja}, ${e1}, tstzrange(now() - interval '1 day', null, '[)')),
      (${invitado}, ${e1}, tstzrange(now() - interval '1 day', null, '[)')),
      (${revisor}, ${e1}, tstzrange(now() - interval '1 day', null, '[)'))
  `
  return { e1, e2, p1, px, p3, polE1, polE2, polP3, admin, op, opSinAsignar, opVencido, revisor, baja, invitado, sinRol }
}

/** Actúa como `rol` con el principal `usuario`, local a la transacción (D-0022). */
const como = async (tx: postgres.TransactionSql, rol: string, usuario: string | null): Promise<void> => {
  await tx`select set_config('authz.usuario_id', ${usuario ?? ''}, true)`
  await tx.unsafe(`set local role ${rol}`)
}

const idsVisibles = async (tx: postgres.TransactionSql, tabla: 'party' | 'policy'): Promise<string[]> =>
  (await tx.unsafe<Id[]>(`select id from ${tabla} order by id`)).map((fila) => fila.id)

const ordenados = (...ids: string[]): string[] => [...ids].sort()

// ── Lo que no cambia para quien se conecta hoy ──────────────────────────────

describe('0007 no cambia el comportamiento de quien se conecta hoy', () => {
  it('ninguna tabla tiene FORCE ROW LEVEL SECURITY: el dueño queda exento', async () => {
    const forzadas = await sql<{ relname: string }[]>`
      select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public' and c.relkind = 'r' and c.relforcerowsecurity
    `
    assert.deepEqual([...forzadas], [])
  })

  it('un dueño sin BYPASSRLS ni superusuario sigue viendo y escribiendo todo con RLS habilitado y sin políticas', async () => {
    const visto = await descartable(async (tx) => {
      await tx`create role t0035_dueno nologin nobypassrls nosuperuser`
      await tx`create table t0035_prueba (n int)`
      await tx`alter table t0035_prueba owner to t0035_dueno`
      await tx`insert into t0035_prueba values (1), (2)`
      await tx`alter table t0035_prueba enable row level security`
      await tx`set local role t0035_dueno`
      await tx`insert into t0035_prueba values (3)`
      return uno(await tx<{ n: number }[]>`select count(*)::int as n from t0035_prueba`).n
    })
    assert.equal(visto, 3)
  })

  it('las filas existentes de app_user siguen siendo válidas: ACTIVE e INACTIVE, rol nulo', async () => {
    const ok = await descartable(async (tx) => {
      await tx`insert into app_user (email, status, auth_provider) values ('viejo@sintetico.test', 'ACTIVE', 'google')`
      await tx`insert into app_user (email, status, auth_provider) values ('viejo2@sintetico.test', 'INACTIVE', 'google')`
      return true
    })
    assert.equal(ok, true)
  })
})

// ── Condiciones de D-0022 en el catálogo ────────────────────────────────────

describe('catálogo: roles, funciones y cobertura de RLS', () => {
  it('toda tabla de public tiene RLS habilitado (cobertura, condición 5)', async () => {
    const sinRls = await sql<{ relname: string }[]>`
      select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity
      order by 1
    `
    assert.deepEqual([...sinRls], [])
  })

  it('causalidad: la prueba de cobertura detecta una tabla nueva sin RLS', async () => {
    const sinRls = await descartable(async (tx) => {
      await tx`create table public.t0035_olvidada (n int)`
      return tx<{ relname: string }[]>`
        select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
        where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity
      `
    })
    assert.deepEqual(sinRls.map((fila) => fila.relname), ['t0035_olvidada'])
  })

  it('app, worker y MCP no tienen BYPASSRLS, ni superusuario, ni login todavía (condición 7)', async () => {
    const roles = await sql<{ rolname: string; rolbypassrls: boolean; rolsuper: boolean; rolcanlogin: boolean }[]>`
      select rolname, rolbypassrls, rolsuper, rolcanlogin from pg_roles
      where rolname in ('broker_app', 'broker_worker', 'broker_mcp') order by rolname
    `
    assert.deepEqual(roles.map((r) => r.rolname), ['broker_app', 'broker_mcp', 'broker_worker'])
    for (const rol of roles) {
      assert.equal(rol.rolbypassrls, false, rol.rolname)
      assert.equal(rol.rolsuper, false, rol.rolname)
      assert.equal(rol.rolcanlogin, false, rol.rolname)
    }
  })

  it('quien corrió la migración puede asumir app, worker y MCP, pero no hereda sus privilegios', async () => {
    const membresias = await sql<{ rol: string; heredar: boolean; asumir: boolean }[]>`
      select r.rolname as rol, m.inherit_option as heredar, m.set_option as asumir
      from pg_auth_members m join pg_roles r on r.oid = m.roleid
      where m.member = (select oid from pg_roles where rolname = current_user)
        and r.rolname in ('broker_app', 'broker_worker', 'broker_mcp')
      order by 1
    `
    assert.deepEqual(
      membresias.map((m) => [m.rol, m.heredar, m.asumir]),
      [
        ['broker_app', false, true],
        ['broker_mcp', false, true],
        ['broker_worker', false, true],
      ],
    )
  })

  it('un dueño que no es superusuario, con esa membresía, asume broker_app y queda sujeto a RLS', async () => {
    const visto = await descartable(async (tx) => {
      await tx`create role t0035_conexion nologin nobypassrls nosuperuser`
      await tx`grant broker_app to t0035_conexion with inherit false, set true`
      await tx`set local role t0035_conexion`
      await tx`set local role broker_app`
      // Sin principal declarado, RLS no deja ver ninguna parte.
      return uno(await tx<{ n: number }[]>`select count(*)::int as n from party`).n
    })
    assert.equal(visto, 0)
  })

  it('las funciones de authz son SECURITY DEFINER con search_path vacío y EXECUTE sólo para app y MCP (condición 4)', async () => {
    const funciones = await sql<{ firma: string; definer: boolean; config: string[] | null; publico: boolean; app: boolean; mcp: boolean; worker: boolean }[]>`
      select p.oid::regprocedure::text as firma, p.prosecdef as definer, p.proconfig as config,
             has_function_privilege('public', p.oid, 'execute') as publico,
             has_function_privilege('broker_app', p.oid, 'execute') as app,
             has_function_privilege('broker_mcp', p.oid, 'execute') as mcp,
             has_function_privilege('broker_worker', p.oid, 'execute') as worker
      from pg_proc p join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'authz' order by 1
    `
    assert.ok(funciones.length >= 7, `hay ${String(funciones.length)} funciones en authz`)
    for (const f of funciones) {
      assert.equal(f.definer, true, f.firma)
      assert.deepEqual(f.config, ['search_path=""'], f.firma)
      assert.equal(f.publico, false, f.firma)
      assert.equal(f.app, true, f.firma)
      assert.equal(f.mcp, true, f.firma)
      assert.equal(f.worker, false, f.firma)
    }
  })
})

// ── Matriz de filas ─────────────────────────────────────────────────────────

describe('filas: quién ve qué (D-0022, D-0027)', () => {
  it('un Administrador ve todos los clientes y todas las pólizas', async () => {
    const r = await descartable(async (tx) => {
      const m = await sembrar(tx)
      await como(tx, 'broker_app', m.admin)
      const polizas = await idsVisibles(tx, 'policy')
      return { m, polizas }
    })
    for (const id of [r.m.polE1, r.m.polE2, r.m.polP3]) assert.ok(r.polizas.includes(id))
  })

  it('un Operador ve sus clientes asignados, los miembros vigentes de sus empresas y sus pólizas; nada más', async () => {
    const r = await descartable(async (tx) => {
      const m = await sembrar(tx)
      await como(tx, 'broker_app', m.op)
      return { m, partes: await idsVisibles(tx, 'party'), polizas: await idsVisibles(tx, 'policy') }
    })
    assert.deepEqual(r.partes, ordenados(r.m.e1, r.m.p1, r.m.p3))
    assert.deepEqual(r.polizas, ordenados(r.m.polE1, r.m.polP3))
  })

  it('un Operador sin asignación no ve ningún cliente: no hay acceso universal', async () => {
    const r = await descartable(async (tx) => {
      const m = await sembrar(tx)
      await como(tx, 'broker_app', m.opSinAsignar)
      return { partes: await idsVisibles(tx, 'party'), polizas: await idsVisibles(tx, 'policy') }
    })
    assert.deepEqual(r, { partes: [], polizas: [] })
  })

  it('una asignación vencida no da acceso: el intervalo es [desde, hasta)', async () => {
    const r = await descartable(async (tx) => {
      const m = await sembrar(tx)
      await como(tx, 'broker_app', m.opVencido)
      return idsVisibles(tx, 'party')
    })
    assert.deepEqual(r, [])
  })

  it('el Revisor profesional no ve clientes ni pólizas por defecto, aunque tenga una asignación', async () => {
    const r = await descartable(async (tx) => {
      const m = await sembrar(tx)
      await como(tx, 'broker_app', m.revisor)
      const aseguradoras = uno(await tx<{ n: number }[]>`select count(*)::int as n from insurer`).n
      return { partes: await idsVisibles(tx, 'party'), polizas: await idsVisibles(tx, 'policy'), aseguradoras }
    })
    assert.deepEqual(r.partes, [])
    assert.deepEqual(r.polizas, [])
    assert.ok(r.aseguradoras >= 1, 'los datos de referencia sí los ve')
  })

  it('revocación: dado de baja, invitado o sin rol, no ve nada, aunque tenga asignaciones (condición 6)', async () => {
    for (const quien of ['baja', 'invitado', 'sinRol'] as const) {
      const r = await descartable(async (tx) => {
        const m = await sembrar(tx)
        await como(tx, 'broker_app', m[quien])
        const aseguradoras = uno(await tx<{ n: number }[]>`select count(*)::int as n from insurer`).n
        return { partes: await idsVisibles(tx, 'party'), aseguradoras }
      })
      assert.deepEqual(r, { partes: [], aseguradoras: 0 }, quien)
    }
  })

  it('la baja vale en la transacción siguiente, sin cambiar la sesión', async () => {
    const r = await descartable(async (tx) => {
      const m = await sembrar(tx)
      await tx`savepoint antes`
      await como(tx, 'broker_app', m.op)
      const antes = (await idsVisibles(tx, 'party')).length
      await tx`reset role`
      await tx`update app_user set status = 'INACTIVE' where id = ${m.op}`
      await como(tx, 'broker_app', m.op)
      const despues = (await idsVisibles(tx, 'party')).length
      return { antes, despues }
    })
    assert.deepEqual(r, { antes: 3, despues: 0 })
  })

  it('sin principal declarado no se ve nada (autenticación real, condición 1)', async () => {
    const r = await descartable(async (tx) => {
      await sembrar(tx)
      await como(tx, 'broker_app', null)
      return { partes: await idsVisibles(tx, 'party'), usuarios: (await tx`select id from app_user`).length }
    })
    assert.deepEqual(r, { partes: [], usuarios: 0 })
  })

  it('el principal es local a la transacción: la siguiente, en la misma conexión, no lo hereda (condición 3)', async () => {
    let usuario = ''
    try {
      await sql.begin(async (tx) => {
        const m = await sembrar(tx)
        usuario = m.op
        await tx`select set_config('authz.usuario_id', ${m.op}, true)`
        const dentro = uno(await tx<{ u: string | null }[]>`select authz.usuario_declarado()::text as u`).u
        assert.equal(dentro, m.op)
        throw new Rollback('descartar')
      })
    } catch (error) {
      if (!(error instanceof Rollback)) throw error
    }
    const fuera = uno(await sql<{ u: string | null }[]>`select authz.usuario_declarado()::text as u`).u
    assert.notEqual(usuario, '')
    assert.equal(fuera, null)
  })

  it('cada persona ve sólo su app_user y sus asignaciones; un Administrador ve todo', async () => {
    const r = await descartable(async (tx) => {
      const m = await sembrar(tx)
      await como(tx, 'broker_app', m.op)
      const propios = (await tx<Id[]>`select id from app_user`).map((f) => f.id)
      const asignaciones = (await tx`select 1 from client_assignment`).length
      return { m, propios, asignaciones }
    })
    assert.deepEqual(r.propios, [r.m.op])
    assert.equal(r.asignaciones, 2)
  })
})

// ── Asignación y auditoría ──────────────────────────────────────────────────

describe('asignación por cliente y auditoría', () => {
  it('dos asignaciones solapadas de la misma persona al mismo cliente se rechazan', async () => {
    const error = await descartable(async (tx) => {
      const m = await sembrar(tx)
      try {
        await tx`insert into client_assignment (user_id, client_party_id) values (${m.op}, ${m.e1})`
        return null
      } catch (e) {
        if (!(e instanceof postgres.PostgresError)) throw e
        return e.code
      }
    })
    assert.equal(error, '23P01')
  })

  it('la app audita a nombre de quien actúa, y no puede firmar por otro', async () => {
    const r = await descartable(async (tx) => {
      const m = await sembrar(tx)
      await como(tx, 'broker_app', m.op)
      await tx`
        insert into audit_event (actor_user_id, origin, action, object_type, object_id, outcome)
        values (${m.op}, 'app', 'poliza.leer', 'policy', ${m.polE1}, 'ok')
      `
      await tx`savepoint s`
      try {
        await tx`
          insert into audit_event (actor_user_id, origin, action, outcome) values (${m.admin}, 'app', 'poliza.leer', 'ok')
        `
        return 'aceptado'
      } catch (e) {
        if (!(e instanceof postgres.PostgresError)) throw e
        return e.code
      }
    })
    assert.equal(r, '42501')
  })

  it('la auditoría sólo admite identificadores: nada de texto libre ni payloads', async () => {
    const r = await descartable(async (tx) => {
      const m = await sembrar(tx)
      try {
        await tx`
          insert into audit_event (actor_user_id, origin, action, outcome, reason_code)
          values (${m.op}, 'app', 'nota.crear', 'ok', 'Tarjeta 4539 1488 0343 6467')
        `
        return 'aceptado'
      } catch (e) {
        if (!(e instanceof postgres.PostgresError)) throw e
        return e.code
      }
    })
    assert.equal(r, '23514')
  })

  it('la auditoría es sólo de inserción, también para el dueño', async () => {
    const r = await descartable(async (tx) => {
      await tx`insert into audit_event (origin, action, outcome) values ('cli', 'prueba.borrar', 'ok')`
      try {
        await tx`delete from audit_event`
        return 'aceptado'
      } catch (e) {
        if (!(e instanceof postgres.PostgresError)) throw e
        return e.code
      }
    })
    assert.equal(r, '23001')
  })

  it('el MCP sólo lee: no escribe auditoría ni ve credenciales, invitaciones o auditoría', async () => {
    const r = await descartable(async (tx) => {
      const m = await sembrar(tx)
      await como(tx, 'broker_mcp', m.admin)
      const resultados: string[] = []
      for (const consulta of [
        `insert into audit_event (origin, action, outcome) values ('mcp', 'x.y', 'ok')`,
        'select 1 from user_credential',
        'select 1 from user_invitation',
        'select 1 from audit_event',
      ]) {
        await tx`savepoint s`
        try {
          await tx.unsafe(consulta)
          resultados.push('aceptado')
        } catch (e) {
          if (!(e instanceof postgres.PostgresError)) throw e
          resultados.push(e.code)
          await tx`rollback to savepoint s`
        }
      }
      return resultados
    })
    assert.deepEqual(r, ['42501', '42501', '42501', '42501'])
  })

  it('el worker no tiene grants: no lee ninguna tabla de datos (deny-by-default)', async () => {
    const r = await descartable(async (tx) => {
      const m = await sembrar(tx)
      await como(tx, 'broker_worker', m.admin)
      try {
        await tx`select 1 from party`
        return 'aceptado'
      } catch (e) {
        if (!(e instanceof postgres.PostgresError)) throw e
        return e.code
      }
    })
    assert.equal(r, '42501')
  })
})
