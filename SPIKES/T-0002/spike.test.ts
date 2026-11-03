// Pruebas del spike T-0002 contra un Postgres local real. Cada `describe` responde una
// comprobación de `## Verification`; el documento del spike cita estos nombres.
import { execFileSync } from 'node:child_process'
import assert from 'node:assert/strict'
import { after, before, describe, test } from 'node:test'
import { conectar, enContexto, probarYDeshacer, type Sql } from './db.ts'
import { ESCRITURAS, LECTURAS } from './matriz.ts'
import { aplicacion, aprobarConDefecto, hibrido, leerSinFiltro, rls, type Mecanismo } from './mecanismos.ts'
import { AHORA, E, I, P, U, V } from './seed.ts'

const conexiones: Sql[] = []
const abrir = (perfil: Parameters<typeof conectar>[0]): Sql => {
  const sql = conectar(perfil)
  conexiones.push(sql)
  return sql
}
let mecanismos: Mecanismo[] = []
let owner: Sql

before(async () => {
  execFileSync(process.execPath, ['setup-db.ts'], { cwd: import.meta.dirname, stdio: 'ignore' })
  owner = abrir('owner')
  await owner`update authz.reloj set habilitado = true`
  // mutaciones.ts rompe una política a propósito para comprobar que estas pruebas lo ven.
  const mutacion = process.env.SPIKE_T0002_MUTACION
  if (mutacion !== undefined && mutacion !== '') await owner.unsafe(mutacion)
  mecanismos = [rls(abrir('app')), aplicacion(abrir('plain')), hibrido(abrir('app'))]
})

after(async () => {
  await owner`update authz.reloj set habilitado = false`
  await Promise.all(conexiones.map((c) => c.end()))
})

describe('1 · matriz: los tres mecanismos dan el resultado esperado', () => {
  for (const caso of LECTURAS) {
    test(`${caso.id} (${caso.origen})`, async () => {
      for (const m of mecanismos) {
        const ids = await m.leer({ usuario: caso.principal, instante: caso.instante }, caso.recurso)
        assert.deepEqual(ids, [...caso.esperado].sort(), `${m.nombre} en ${caso.id}`)
      }
    })
  }
  for (const caso of ESCRITURAS) {
    test(`${caso.id} (${caso.origen})`, async () => {
      for (const m of mecanismos) {
        const ctx = { usuario: caso.principal, instante: caso.instante }
        const ok = caso.accion === 'escribir_nota'
          ? await m.escribirNota(ctx, caso.objetivo, caso.autor ?? '')
          : await m.aprobarInforme(ctx, caso.objetivo)
        assert.equal(ok, caso.esperado, `${m.nombre} en ${caso.id}`)
      }
    })
  }
})

describe('2 · baja de una persona: corta el acceso en el request siguiente', () => {
  test('BAJ ve E1; tras la baja, cero filas en los tres mecanismos, sin reemitir nada', async () => {
    for (const m of mecanismos) assert.deepEqual(await m.leer({ usuario: U.BAJ, instante: AHORA }, 'empresa'), [E.E1])
    await owner`update broker.usuario set estado = 'BAJA' where id = ${U.BAJ}`
    try {
      for (const m of mecanismos) assert.deepEqual(await m.leer({ usuario: U.BAJ, instante: AHORA }, 'empresa'), [], m.nombre)
    } finally {
      await owner`update broker.usuario set estado = 'ACTIVO' where id = ${U.BAJ}`
    }
  })
})

describe('3 · regla de autor: dónde se hace cumplir y qué pasa si falla una capa', () => {
  test('la app con el defecto aprueba su propio informe si no hay RLS', async () => {
    const ok = await aprobarConDefecto(abrir('plain'), { usuario: U.OP1, instante: AHORA }, I.I1B_OP1, 'plain')
    assert.equal(ok, true, 'sólo aplicación: el defecto pasa')
  })
  test('la misma app con el defecto, sobre la conexión con RLS: la política lo frena', async () => {
    const ok = await aprobarConDefecto(abrir('app'), { usuario: U.OP1, instante: AHORA }, I.I1B_OP1, 'rls')
    assert.equal(ok, false, 'híbrido: WITH CHECK aprobado_por <> autor_id')
  })
  test('el autor no se puede reescribir para esquivar la regla (grant por columna)', async () => {
    await assert.rejects(
      probarYDeshacer(abrir('app'), { usuario: U.OP1, instante: AHORA },
        (tx) => tx`update broker.informe set autor_id = ${U.ADM} where id = ${I.I1B_OP1}`),
      /permission denied/)
  })
})

describe('4 · filtro olvidado: la clase de defecto que separa los mecanismos', () => {
  test('una consulta sin WHERE como OP1: con RLS ve P1; con BYPASSRLS ve todo', async () => {
    const ctx = { usuario: U.OP1, instante: AHORA }
    assert.deepEqual(await enContexto(abrir('app'), ctx, (tx) => leerSinFiltro(tx, 'poliza')), [P.P1])
    assert.deepEqual(await enContexto(abrir('plain'), ctx, (tx) => leerSinFiltro(tx, 'poliza')), [P.P1, P.P2].sort())
  })
  test('el portal con una consulta sin WHERE no ve borradores ni notas con RLS', async () => {
    const ctx = { usuario: U.CT1, instante: AHORA }
    assert.deepEqual(await enContexto(abrir('app'), ctx, (tx) => leerSinFiltro(tx, 'informe')), [I.I1C])
    assert.deepEqual(await enContexto(abrir('app'), ctx, (tx) => leerSinFiltro(tx, 'nota_interna')), [])
  })
})

describe('5 · perfiles de conexión: mínimo privilegio y deny-by-default', () => {
  test('app: sin principal, cero filas en cada tabla de datos', async () => {
    for (const r of ['empresa', 'poliza', 'nota_interna', 'informe'] as const)
      assert.deepEqual(await enContexto(abrir('app'), {}, (tx) => leerSinFiltro(tx, r)), [], r)
  })
  test('app: no lee las tablas de permisos ni de usuarios', async () => {
    for (const t of ['usuario', 'asignacion', 'acceso_portal'])
      await assert.rejects(enContexto(abrir('app'), { usuario: U.ADM }, (tx) => tx.unsafe(`select * from broker.${t}`)), /permission denied/, t)
  })
  test('app: no borra', async () => {
    await assert.rejects(probarYDeshacer(abrir('app'), { usuario: U.ADM }, (tx) => tx`delete from broker.nota_interna`), /permission denied/)
  })
  test('worker: lee todas las pólizas (su trabajo) y nada más', async () => {
    const w = abrir('worker')
    assert.deepEqual(await enContexto(w, {}, (tx) => leerSinFiltro(tx, 'poliza')), [P.P1, P.P2].sort())
    for (const t of ['empresa', 'nota_interna', 'informe', 'usuario'])
      await assert.rejects(enContexto(w, {}, (tx) => tx.unsafe(`select * from broker.${t}`)), /permission denied/, t)
    await assert.rejects(probarYDeshacer(w, {}, (tx) => tx`update broker.poliza set numero = 'x'`), /permission denied/)
  })
  test('worker: declarar un principal no le agrega nada', async () => {
    assert.deepEqual(await enContexto(abrir('worker'), { usuario: U.CT1 }, (tx) => leerSinFiltro(tx, 'poliza')), [P.P1, P.P2].sort())
  })
  test('MCP: sin principal, cero filas; con principal, exactamente lo de esa persona', async () => {
    const m = abrir('mcp')
    assert.deepEqual(await enContexto(m, {}, (tx) => leerSinFiltro(tx, 'empresa')), [])
    assert.deepEqual(await enContexto(m, { usuario: U.OP1, instante: AHORA }, (tx) => leerSinFiltro(tx, 'poliza')), [P.P1])
    assert.deepEqual(await enContexto(m, { usuario: U.CT1, instante: AHORA }, (tx) => leerSinFiltro(tx, 'informe')), [I.I1C])
  })
  test('MCP: no escribe ni aunque declare un administrador', async () => {
    const m = abrir('mcp')
    await assert.rejects(probarYDeshacer(m, { usuario: U.ADM }, (tx) =>
      tx`insert into broker.nota_interna (empresa_id, autor_id, texto) values (${E.E1}, ${U.ADM}, 'x')`), /permission denied/)
    await assert.rejects(probarYDeshacer(m, { usuario: U.ADM }, (tx) =>
      tx`update broker.informe set estado = 'APROBADO' where id = ${I.I1B_OP1}`), /permission denied/)
  })
  test('service role (BYPASSRLS): ve todo sin principal; por eso ninguna app, worker ni agente lo usa', async () => {
    assert.deepEqual(await enContexto(abrir('service'), {}, (tx) => leerSinFiltro(tx, 'nota_interna')), [E.E1, E.E2].sort())
  })
  test('ningún perfil de la app puede darse BYPASSRLS ni cambiar de rol', async () => {
    for (const perfil of ['app', 'worker', 'mcp'] as const) {
      await assert.rejects(enContexto(abrir(perfil), {}, (tx) => tx`set local role spike_t0002_service`), /permission denied/, perfil)
      const [f] = await abrir(perfil)<{ rolbypassrls: boolean; rolsuper: boolean }[]>`
        select rolbypassrls, rolsuper from pg_roles where rolname = current_user`
      assert.deepEqual({ ...f }, { rolbypassrls: false, rolsuper: false }, perfil)
    }
  })
})

describe('6 · el principal es una afirmación de la app: lo que RLS NO protege', () => {
  test('la app puede declarar cualquier usuario: RLS no autentica, filtra', async () => {
    assert.deepEqual(await enContexto(abrir('app'), { usuario: U.ADM, instante: AHORA }, (tx) => leerSinFiltro(tx, 'poliza')), [P.P1, P.P2].sort())
  })
  test('el reloj de prueba deshabilitado: el GUC no mueve el instante', async () => {
    await owner`update authz.reloj set habilitado = false`
    try {
      const [f] = await enContexto(abrir('app'), { instante: '2020-01-01T00:00:00Z' }, (tx) => tx<{ t: Date }[]>`select authz.instante() as t`)
      assert.ok(f !== undefined && f.t.getFullYear() >= 2026)
    } finally {
      await owner`update authz.reloj set habilitado = true`
    }
  })
})

describe('7 · pooler en modo transacción: el principal no sobrevive a la transacción', () => {
  test('set_config local muere con la transacción; set_config de sesión queda pegado a la conexión', async () => {
    const reservada = await abrir('app').reserve()
    try {
      await reservada`begin`
      await reservada`select set_config('authz.usuario_id', ${U.ADM}, true)`
      await reservada`commit`
      const [a] = await reservada<{ v: string | null }[]>`select nullif(current_setting('authz.usuario_id', true), '') as v`
      assert.equal(a?.v, null, 'local: limpio para el próximo cliente del pooler')
      await reservada`select set_config('authz.usuario_id', ${U.ADM}, false)`
      const [b] = await reservada<{ v: string | null }[]>`select nullif(current_setting('authz.usuario_id', true), '') as v`
      assert.equal(b?.v, U.ADM, 'sesión: el próximo request en esta conexión heredaría al administrador')
    } finally {
      await reservada`reset authz.usuario_id`
      reservada.release()
    }
  })
})

describe('8 · claims de Supabase Auth: las mismas políticas, otra fuente del principal', () => {
  test('con request.jwt.claims.sub (forma PostgREST) en vez de authz.usuario_id', async () => {
    const ctx = { claims: { sub: U.OP1, role: 'authenticated' }, instante: AHORA }
    assert.deepEqual(await enContexto(abrir('app'), ctx, (tx) => leerSinFiltro(tx, 'poliza')), [P.P1])
  })
  test('un sub válido de una persona dada de baja no entra: el token no alcanza', async () => {
    await owner`update broker.usuario set estado = 'BAJA' where id = ${U.BAJ}`
    try {
      const ctx = { claims: { sub: U.BAJ, role: 'authenticated' }, instante: AHORA }
      assert.deepEqual(await enContexto(abrir('app'), ctx, (tx) => leerSinFiltro(tx, 'empresa')), [])
    } finally {
      await owner`update broker.usuario set estado = 'ACTIVO' where id = ${U.BAJ}`
    }
  })
})

describe('9 · entre contextos: Broker OS lee a Risk OS con la identidad de la persona', () => {
  // La "API" de Risk OS es una función que recibe el principal y usa SU conexión y SUS
  // permisos. Broker OS no tiene credencial sobre el esquema risk.
  const apiRisk = (usuario: string | undefined): Promise<string[]> =>
    enContexto(abrir('riskapp'), { usuario, instante: AHORA }, async (tx) =>
      (await tx<{ id: string }[]>`select id from risk.evaluacion`).map((f) => f.id).sort())

  test('OP1 y REV ven en Risk OS sólo lo de sus empresas en Risk OS', async () => {
    assert.deepEqual(await apiRisk(U.OP1), [V.V1])
    assert.deepEqual(await apiRisk(U.REV), [V.V1])
    assert.deepEqual(await apiRisk(U.ADM), [V.V1, V.V2].sort())
  })
  test('OP2 está admitido en Broker OS pero no en Risk OS: Risk OS no le da nada', async () => {
    assert.deepEqual(await apiRisk(U.OP2), [])
  })
  test('la baja en Risk OS corta Risk OS aunque la persona siga activa en Broker OS', async () => {
    await owner`update risk.usuario set estado = 'BAJA' where id = ${U.REV}`
    try {
      assert.deepEqual(await apiRisk(U.REV), [])
    } finally {
      await owner`update risk.usuario set estado = 'ACTIVO' where id = ${U.REV}`
    }
  })
  test('sin principal reenviado (una identidad de servicio), Risk OS no da nada', async () => {
    assert.deepEqual(await apiRisk(undefined), [])
  })
  test('la app de Broker OS no puede leer el esquema risk', async () => {
    await assert.rejects(enContexto(abrir('app'), { usuario: U.ADM }, (tx) => tx`select * from risk.evaluacion`), /permission denied/)
  })
  test('en Risk OS quien escribe la evaluación no la acepta', async () => {
    const aceptar = (usuario: string): Promise<number> =>
      probarYDeshacer(abrir('riskapp'), { usuario, instante: AHORA }, async (tx) => {
        try {
          return (await tx.savepoint((sp) => sp`update risk.evaluacion set estado = 'ACEPTADA', aceptada_por = ${usuario} where id = ${V.V1} returning id`)).length
        } catch (error) {
          if ((error as { code?: string }).code === '42501') return 0
          throw error
        }
      })
    assert.equal(await aceptar(U.OP1), 1, 'OP1 acepta la de REV')
    assert.equal(await aceptar(U.REV), 0, 'REV no acepta la propia')
  })
})
