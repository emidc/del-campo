// T-0035, incremento 5: la matriz de Risk OS en las dos capas, contra Postgres. Cada caso corre
// como `risk_persona` con el principal de una persona (`conPrincipal`), sobre las sintéticas
// importadas en una transacción que se revierte. Para cada regla se prueba la aplicación (el
// caso de uso explica el rechazo) y la base (la misma escritura, directa, la rechaza RLS).
//
// La regla de login real (`decidirLogin`) es de `@del-campo/identidad`, que el contexto no
// importa (R-25): acá va una mínima, y la real se prueba en la app.

import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { after, before, describe, it } from 'node:test'
import { fileURLToPath } from 'node:url'

import { VERSION_METODOLOGIA as V } from '../domain/modelo.ts'
import { ACCIONES, puede, SIN_ORDEN_PREVIO, SinPermiso, TRABAJO_PROPIO, type AccionRisk, type RolInterno } from '../domain/permisos.ts'
import type { Sql, TransactionSql } from '../persistence/database.ts'
import {
  conPrincipal as conPrincipalDeLaBase, ingresar as ingresarDeLaBase, type CredencialEncontrada, type DecisionLogin, type IdentidadDeLogin,
  type InvitacionEncontrada, type PrincipalRisk, type ResultadoPrincipal,
} from '../persistence/identidad.ts'
import { enTransaccionRevertida, openTestDatabase } from '../persistence/testing.ts'
import { conEscenario, filasSinteticas, id, PERSONA, REVISOR, reevaluacionNueva } from '../testing/actualizacion.ts'
import type { Sesion } from './acceso.ts'
import { asignar, cambiarRol, darDeBaja, invitar } from './accesos.ts'
import {
  cargarReevaluacion, cerrarConReevaluacion, cerrarSinCambio, pantallaOrdenPrevio, registrarNovedad, registrarOrdenPrevio, reordenar, revisar,
} from './actualizacion.ts'
import { organizaciones, vistaLista } from './vistas.ts'

const F = filasSinteticas()
const RIESGO = id('S36-R01')
const ORG = F['risks.csv'].find((r) => r.risk_id === RIESGO)?.organizacion_id ?? ''
const OTRA_ORG = 'ORG-01M3QSRT00VT0W3XH3JG6NDTEX'

let sql: Sql
before(async () => {
  sql = await openTestDatabase()
})
after(async () => {
  await sql.end()
})

/**
 * `ingresar` y `conPrincipal` corren sólo con la conexión de `oidc` (0009), que no lee ninguna
 * tabla: acá también, como en producción. Lo demás (la CLI y las comprobaciones), como el dueño.
 */
const conConexionOidc = async <T>(tx: TransactionSql, f: () => Promise<T>): Promise<T> => {
  await tx`set local role risk_oidc`
  try {
    return await f()
  } finally {
    await tx`reset role`
  }
}
const ingresar = (tx: TransactionSql, identidad: IdentidadDeLogin, d: Parameters<typeof ingresarDeLaBase>[2]): Promise<DecisionLogin> =>
  conConexionOidc(tx, () => ingresarDeLaBase(tx, identidad, d))
const conPrincipal = <T>(
  tx: TransactionSql, identidad: Pick<IdentidadDeLogin, 'proveedor' | 'sujeto'>, accion: (t: TransactionSql, p: PrincipalRisk) => Promise<T>,
): Promise<ResultadoPrincipal<T>> => conConexionOidc(tx, () => conPrincipalDeLaBase(tx, identidad, accion))

/** Una regla mínima: entra quien tiene credencial activa; se vincula quien tiene invitación vigente. */
const decidir = (c: CredencialEncontrada | null, i: InvitacionEncontrada | null): DecisionLogin => {
  if (c !== null) return c.estadoUsuario === 'ACTIVO' ? { tipo: 'ENTRA', usuarioId: c.usuarioId } : { tipo: 'RECHAZA', motivo: 'DADO_DE_BAJA' }
  if (i === null || i.venceEn <= Date.now() || i.estadoUsuario === 'BAJA') return { tipo: 'RECHAZA', motivo: 'NO_INVITADO' }
  return { tipo: 'VINCULA', usuarioId: i.usuarioId }
}

interface Equipo {
  readonly tx: TransactionSql
  readonly admin: string
  /** La persona de las sintéticas que ya escribía con contraseña: ahora entra con Google. */
  readonly operador: string
  readonly operador2: string
  readonly revisor: string
  /** Sus sesiones con contraseña (`legacy`), anteriores al vínculo. */
  readonly legado: Sesion
}

const sujeto = (personaId: string): string => `sujeto-${personaId}`

/** Invita, vincula con Google y asigna `ORG` al Operador, a la Operadora 2 y al Revisor. */
const conEquipo = (cuerpo: (e: Equipo) => Promise<void>): Promise<void> =>
  conEscenario(sql, async ({ tx, sesion }) => {
    const entra = async (personaId: string, email: string): Promise<void> => {
      const d = await ingresar(tx, { proveedor: 'google', sujeto: sujeto(personaId), email }, decidir)
      assert.equal(d.tipo, 'VINCULA')
    }
    const a = await invitar(tx, { actor: null, email: 'admin@ejemplo.invalid', rol: 'ADMINISTRADOR', nombre: 'Administradora de prueba' })
    assert.ok(a.ok)
    const admin = a.valor.personaId
    await entra(admin, 'admin@ejemplo.invalid')
    const o = await invitar(tx, { actor: admin, email: 'operadora@ejemplo.invalid', rol: 'OPERADOR', personaId: PERSONA })
    const o2 = await invitar(tx, { actor: admin, email: 'operadora2@ejemplo.invalid', rol: 'OPERADOR', nombre: 'Operadora 2 de prueba' })
    const r = await invitar(tx, { actor: admin, email: 'revisor@ejemplo.invalid', rol: 'REVISOR', personaId: REVISOR })
    assert.ok(o.ok && o2.ok && r.ok)
    await entra(PERSONA, 'operadora@ejemplo.invalid')
    await entra(o2.valor.personaId, 'OPERADORA2@ejemplo.invalid ')
    await entra(REVISOR, 'revisor@ejemplo.invalid')
    for (const p of [PERSONA, o2.valor.personaId, REVISOR]) {
      assert.ok((await asignar(tx, { actor: admin, personaId: p, organizacionId: ORG, vigente: true })).ok)
    }
    await cuerpo({ tx, admin, operador: PERSONA, operador2: o2.valor.personaId, revisor: REVISOR, legado: sesion })
  })

/** Corre `fn` como esa persona, en una transacción restringida; falla si la base no la admite. */
const como = async <T>(tx: TransactionSql, personaId: string, fn: (t: TransactionSql, s: Sesion) => Promise<T>): Promise<T> => {
  const r = await conPrincipal(tx, { proveedor: 'google', sujeto: sujeto(personaId) }, (t, p) =>
    fn(t, { personaId: p.personaId, nombre: p.nombre, credencialId: p.credencialId, rol: p.rol }))
  if (!r.ok) throw new Error(`no admitida: ${r.motivo}`)
  return r.valor
}

/** El SQLSTATE de una sentencia que tiene que fallar, dentro de un savepoint. */
const codigo = async (tx: TransactionSql, f: (t: TransactionSql) => Promise<unknown>): Promise<string> => {
  try {
    await tx.savepoint(f)
  } catch (e) {
    return String((e as { code?: string }).code)
  }
  return 'sin error'
}

const sinPermiso = (patron: RegExp | string) => (e: unknown): boolean =>
  e instanceof SinPermiso && (typeof patron === 'string' ? e.message === patron : patron.test(e.message))

const informacionNueva = (t: TransactionSql, s: Sesion) =>
  registrarNovedad(t, s, { riskId: RIESGO, tipo: 'informacion_nueva', texto: 'Llegó el informe del perito.', evidencia: 'DOC-SINTETICO-2' })

const reevaluacion = (t: TransactionSql, s: Sesion) =>
  cargarReevaluacion(t, s, reevaluacionNueva(F, RIESGO, { motivo: 'informacion_nueva', accionId: null, fecha: '2026-10-15' }))

const ordenPrevio = async (t: TransactionSql, s: Sesion): Promise<void> => {
  const p = await pantallaOrdenPrevio(t, s, ORG)
  assert.ok(p !== null && p.objetos.length > 0)
  await registrarOrdenPrevio(t, s, ORG, { materialRef: 'MAT-CIEGO-1', items: p.objetos.map((x, i) => ({ riskId: x.riskId, posicion: i + 1 })) })
}

const PREDICADO: Readonly<Partial<Record<AccionRisk, string>>> = {
  'riesgo.cargar': 'authz_puede_cargar',
  'riesgo.revisar': 'authz_puede_revisar',
  'riesgo.reordenar': 'authz_puede_reordenar',
  'riesgo.orden_previo': 'authz_puede_orden_previo',
}

describe('matriz de Risk OS: la aplicación y la base dicen lo mismo', () => {
  it('cada rol, cada acción: puede() coincide con su authz_puede_*', () =>
    conEquipo(async (e) => {
      const personas: Record<RolInterno, string> = { ADMINISTRADOR: e.admin, OPERADOR: e.operador, REVISOR: e.revisor }
      for (const [rol, persona] of Object.entries(personas) as [RolInterno, string][]) {
        await como(e.tx, persona, async (t, s) => {
          assert.equal(s.rol, rol)
          for (const accion of ACCIONES) {
            const f = PREDICADO[accion]
            if (f === undefined) continue
            const [r] = await t.unsafe<{ v: boolean }[]>(`select risk.${f}() as v`)
            assert.equal(r?.v, puede(rol, accion), `${rol} ${accion}`)
          }
        })
      }
    }))

  it('la tabla aprobada por el owner', () => {
    const tabla = Object.fromEntries(ACCIONES.map((a) => [a, (['ADMINISTRADOR', 'OPERADOR', 'REVISOR'] as const).filter((r) => puede(r, a))]))
    assert.deepEqual(tabla, {
      'riesgo.consultar': ['ADMINISTRADOR', 'OPERADOR', 'REVISOR'],
      'riesgo.ver_resultados': ['ADMINISTRADOR', 'OPERADOR', 'REVISOR'],
      'riesgo.cargar': ['ADMINISTRADOR', 'OPERADOR'],
      'riesgo.revisar': ['ADMINISTRADOR', 'OPERADOR', 'REVISOR'],
      'riesgo.reordenar': ['ADMINISTRADOR', 'OPERADOR', 'REVISOR'],
      'riesgo.orden_previo': ['REVISOR'],
    })
  })
})

describe('alcance por organización (D-0027)', () => {
  it('el Operador ve sólo lo asignado; el Administrador, todo; quitar la asignación corta en el request siguiente', () =>
    conEquipo(async (e) => {
      const todas = (await organizaciones(e.tx, e.legado)).map((o) => o.organizacionId).sort()
      assert.ok(todas.length > 1)
      assert.deepEqual((await como(e.tx, e.admin, (t, s) => organizaciones(t, s))).map((o) => o.organizacionId).sort(), todas)
      assert.deepEqual((await como(e.tx, e.operador, (t, s) => organizaciones(t, s))).map((o) => o.organizacionId), [ORG])
      assert.equal(await como(e.tx, e.operador, (t, s) => vistaLista(t, s, V, OTRA_ORG)), null, 'otra organización no existe para él')
      assert.ok((await como(e.tx, e.operador, (t, s) => vistaLista(t, s, V, ORG))) !== null)
      // La base, sin la app: ninguna fila de otra organización.
      const ajenas = await como(e.tx, e.operador, (t) => t<{ n: number }[]>`select count(*)::int as n from risk.riesgo where organizacion_id <> ${ORG}`)
      assert.equal(ajenas[0]?.n, 0)
      const escribe = await como(e.tx, e.operador, (t) => codigo(t, (u) => u`
        insert into risk.novedad (id, risk_id, tipo, texto, evidencia, autor_persona_id)
        values ('NOV-00000000000000000000000077', ${id('S07-R06')}, 'comentario', 'x', '{sin_evidencia}', ${e.operador})`))
      assert.equal(escribe, '42501', 'tampoco escribe en una organización que no ve')

      assert.ok((await asignar(e.tx, { actor: e.admin, personaId: e.operador, organizacionId: ORG, vigente: false })).ok)
      assert.deepEqual(await como(e.tx, e.operador, (t, s) => organizaciones(t, s)), [])
    }))
})

describe('independencia del orden previo (RO01 §6, A8a)', () => {
  it('el Revisor no ve resultados hasta registrar su orden previo ciego; después sí, y puede reordenar', () =>
    conEquipo(async (e) => {
      // Aplicación: explica por qué no.
      await assert.rejects(como(e.tx, e.revisor, (t, s) => vistaLista(t, s, V, ORG)), sinPermiso(SIN_ORDEN_PREVIO))
      // Base: ve el material ciego, no las evaluaciones ni lo que las revisa.
      const antes = await como(e.tx, e.revisor, (t) => t<{ riesgos: number; evaluaciones: number; revisiones: number }[]>`
        select (select count(*)::int from risk.riesgo where organizacion_id = ${ORG}) as riesgos,
               (select count(*)::int from risk.evaluacion) as evaluaciones,
               (select count(*)::int from risk.revision_humana) as revisiones`)
      assert.ok((antes[0]?.riesgos ?? 0) > 0)
      assert.deepEqual([antes[0]?.evaluaciones, antes[0]?.revisiones], [0, 0])
      // Ni puede reordenar todavía: lo explica la app y lo exige la base.
      await assert.rejects(como(e.tx, e.revisor, (t, s) => reordenar(t, s, V, ORG, {
        tipo: 'banda', riskId: RIESGO, banda: 'Crítica', causa: 'desacuerdo_de_criterio_profesional', fundamento: 'x', patron: 'otro',
      })), sinPermiso(SIN_ORDEN_PREVIO))

      await como(e.tx, e.revisor, ordenPrevio)
      const vista = await como(e.tx, e.revisor, (t, s) => vistaLista(t, s, V, ORG))
      assert.ok(vista !== null)
      const despues = await como(e.tx, e.revisor, (t) => t<{ n: number }[]>`
        select count(*)::int as n from risk.evaluacion e join risk.riesgo r on r.id = e.risk_id where r.organizacion_id = ${ORG}`)
      assert.ok((despues[0]?.n ?? 0) > 0)

      // El reordenamiento no toca evaluaciones y queda a su nombre.
      const [ev] = await e.tx<{ n: number }[]>`select count(*)::int as n from risk.evaluacion`
      const { reordenamientoId } = await como(e.tx, e.revisor, (t, s) => reordenar(t, s, V, ORG, {
        tipo: 'banda', riskId: RIESGO, banda: 'Crítica', causa: 'desacuerdo_de_criterio_profesional', fundamento: 'Criterio profesional.', patron: 'otro',
      }))
      const [ro] = await e.tx<{ autor: string }[]>`select autor_persona_id as autor from risk.reordenamiento where id = ${reordenamientoId}`
      assert.equal(ro?.autor, e.revisor)
      const [ev2] = await e.tx<{ n: number }[]>`select count(*)::int as n from risk.evaluacion`
      assert.equal(ev2?.n, ev?.n)
    }))

  it('material ciego en la base: antes de su orden previo, el Revisor no lee nada evaluado de la organización', () =>
    conEquipo(async (e) => {
      // Una novedad con su revisión pendiente, para que no quede ninguna tabla vacía.
      await como(e.tx, e.operador, informacionNueva)
      const contar = (t: TransactionSql) => t<Record<string, number>[]>`
        select (select count(*)::int from risk.riesgo where organizacion_id = ${ORG}) as riesgo,
               (select count(*)::int from risk.accion a join risk.riesgo r on r.id = a.risk_id where r.organizacion_id = ${ORG}) as accion,
               (select count(*)::int from risk.accion_estado s join risk.accion a on a.id = s.accion_id
                  join risk.riesgo r on r.id = a.risk_id where r.organizacion_id = ${ORG}) as accion_estado,
               (select count(*)::int from risk.transferencia x join risk.riesgo r on r.id = x.risk_id where r.organizacion_id = ${ORG}) as transferencia,
               (select count(*)::int from risk.evento_poliza x join risk.riesgo r on r.id = x.risk_id where r.organizacion_id = ${ORG}) as evento_poliza,
               (select count(*)::int from risk.novedad x join risk.riesgo r on r.id = x.risk_id where r.organizacion_id = ${ORG}) as novedad,
               (select count(*)::int from risk.revision_pendiente x join risk.riesgo r on r.id = x.risk_id where r.organizacion_id = ${ORG}) as revision_pendiente,
               (select count(*)::int from risk.evaluacion x join risk.riesgo r on r.id = x.risk_id where r.organizacion_id = ${ORG}) as evaluacion`
      const [admin] = await como(e.tx, e.admin, contar)
      for (const [tabla, n] of Object.entries(admin ?? {})) assert.ok(n > 0, `sin filas sintéticas de ${tabla}: la prueba no probaría nada`)

      // Ni `suficiencia`, ni `exposicion_retenida_monto`, ni `efecto`, ni nada más que el material ciego.
      const [antes] = await como(e.tx, e.revisor, contar)
      assert.deepEqual({ ...antes }, {
        riesgo: admin?.riesgo, accion: 0, accion_estado: 0, transferencia: 0, evento_poliza: 0, novedad: 0, revision_pendiente: 0, evaluacion: 0,
      })
      const [campos] = await como(e.tx, e.revisor, (t) => t<{ suficiencia: number; efecto: number }[]>`
        select (select count(*)::int from risk.transferencia where suficiencia is not null or exposicion_retenida_monto is not null) as suficiencia,
               (select count(*)::int from risk.accion_estado where efecto is not null) as efecto`)
      assert.deepEqual({ ...campos }, { suficiencia: 0, efecto: 0 })

      // Con su orden previo registrado, ve lo mismo que el Operador.
      await como(e.tx, e.revisor, ordenPrevio)
      const [despues] = await como(e.tx, e.revisor, contar)
      const [operador] = await como(e.tx, e.operador, contar)
      assert.deepEqual({ ...despues }, { ...operador })
    }))

  it('el orden previo es sólo del Revisor, y de nadie más el de otro antes del propio', () =>
    conEquipo(async (e) => {
      await assert.rejects(como(e.tx, e.operador, ordenPrevio), sinPermiso(/Revisor profesional/))
      const directo = await como(e.tx, e.admin, (t) => codigo(t, (u) => u`
        insert into risk.orden_previo (id, organizacion_id, revisor_persona_id, material_ref)
        values ('OPR-00000000000000000000000077', ${ORG}, ${e.admin}, 'MAT')`))
      assert.equal(directo, '42501', 'ni el Administrador lo registra salteando la app')
    }))

  it('un orden previo escrito por SQL abre los resultados sólo si cubre todo el material ciego, y no se confirma si no lo cubre', () =>
    conEquipo(async (e) => {
      const opr = 'OPR-00000000000000000000000079'
      const ciegos = (await e.tx<{ id: string }[]>`
        select id from risk.riesgo where organizacion_id = ${ORG} and tipo_objeto in ('riesgo', 'padre') order by id`).map((r) => r.id)
      assert.ok(ciegos.length > 1)
      const evaluaciones = async (): Promise<number> => (await como(e.tx, e.revisor, (t) => t<{ n: number }[]>`
        select count(*)::int as n from risk.evaluacion x join risk.riesgo r on r.id = x.risk_id where r.organizacion_id = ${ORG}`))[0]?.n ?? -1

      // Con fecha atrasada no entra: si entrara, ningún riesgo quedaría antes de él.
      const atrasado = await como(e.tx, e.revisor, (t) => codigo(t, (u) => u`
        insert into risk.orden_previo (id, organizacion_id, revisor_persona_id, material_ref, registrado_en)
        values (${opr}, ${ORG}, ${e.revisor}, 'MAT', '2000-01-01')`))
      assert.equal(atrasado, '42501')

      await como(e.tx, e.revisor, (t) => t`
        insert into risk.orden_previo (id, organizacion_id, revisor_persona_id, material_ref) values (${opr}, ${ORG}, ${e.revisor}, 'MAT')`)
      assert.equal(await evaluaciones(), 0, 'vacío')
      const item = (riskId: string, posicion: number) => como(e.tx, e.revisor, (t) => t`
        insert into risk.orden_previo_item (orden_previo_id, organizacion_id, risk_id, posicion) values (${opr}, ${ORG}, ${riskId}, ${posicion})`)
      // Lo que exige el trigger al confirmar, adelantado con SET CONSTRAINTS.
      const alConfirmar = (): Promise<string> => codigo(e.tx, (u) => u`set constraints risk.orden_previo_cubre_el_material immediate`)
      for (const [i, riskId] of ciegos.slice(1).entries()) await item(riskId, i + 1)
      assert.equal(await evaluaciones(), 0, 'le falta uno')
      assert.equal(await alConfirmar(), '23514', 'y no se confirma')
      await item(ciegos[0] ?? '', ciegos.length)
      assert.ok(await evaluaciones() > 0, 'completo')

      // Un riesgo que otra transacción confirma antes que el registro lo deja sin cubrir: el
      // registro no se confirma y se reintenta, en vez de quedar trabado.
      const importado = 'RSK-00000000000000000000000079'
      await e.tx`
        insert into risk.riesgo (id, organizacion_id, tipo_objeto, titulo, origen, autor_persona_id)
        values (${importado}, ${ORG}, 'riesgo', 'Riesgo importado a la vez', 'sesion', ${e.operador})`
      assert.equal(await evaluaciones(), 0)
      assert.equal(await alConfirmar(), '23514')
      await item(importado, ciegos.length + 1)
      assert.equal(await alConfirmar(), 'sin error')
    }))

  it('el Revisor no carga datos: lo explica la app y lo exige la base', () =>
    conEquipo(async (e) => {
      await como(e.tx, e.revisor, ordenPrevio)
      await assert.rejects(como(e.tx, e.revisor, informacionNueva), sinPermiso(/Administrador y el Operador/))
      const directo = await como(e.tx, e.revisor, (t) => codigo(t, (u) => u`
        insert into risk.novedad (id, risk_id, tipo, texto, evidencia, autor_persona_id)
        values ('NOV-00000000000000000000000078', ${RIESGO}, 'comentario', 'x', '{sin_evidencia}', ${e.revisor})`))
      assert.equal(directo, '42501')
    }))
})

describe('personas: cada una ve a quienes escribieron lo que ella ve, no a todas', () => {
  it('ni una persona de otra organización ni una compañera sin nada escrito; sí la propia, y el Administrador ve todas', () =>
    conEquipo(async (e) => {
      const riesgoAjeno = id('S07-R06')
      const orgAjena = F['risks.csv'].find((r) => r.risk_id === riesgoAjeno)?.organizacion_id ?? ''
      assert.ok(orgAjena !== '' && orgAjena !== ORG)
      const x = await invitar(e.tx, { actor: e.admin, email: 'ajena@ejemplo.invalid', rol: 'OPERADOR', nombre: 'Operadora de otra organización' })
      assert.ok(x.ok)
      const ajena = x.valor.personaId
      assert.equal((await ingresar(e.tx, { proveedor: 'google', sujeto: sujeto(ajena), email: 'ajena@ejemplo.invalid' }, decidir)).tipo, 'VINCULA')
      assert.ok((await asignar(e.tx, { actor: e.admin, personaId: ajena, organizacionId: orgAjena, vigente: true })).ok)
      await como(e.tx, ajena, (t, s) => registrarNovedad(t, s, { riskId: riesgoAjeno, tipo: 'comentario', texto: 'Comentario sintético.', evidencia: 'DOC-SINTETICO-3' }))

      const ve = (quien: string) => async (personaId: string): Promise<boolean> =>
        (await como(e.tx, quien, (t) => t`select 1 from risk.persona where id = ${personaId}`)).length === 1

      const operadorVe = ve(e.operador)
      assert.equal(await operadorVe(e.operador), true, 'la propia')
      assert.equal(await operadorVe(ajena), false, 'escribió sólo en una organización que la Operadora no ve')
      assert.equal(await operadorVe(e.operador2), false, 'misma organización, pero nada escrito todavía')
      assert.equal(await operadorVe(e.admin), false)
      assert.equal(await ve(ajena)(ajena), true)
      assert.equal(await ve(ajena)(e.operador), false, 'y al revés: tampoco ve a quien trabaja sólo en otra organización')
      for (const p of [e.operador, e.operador2, e.revisor, ajena]) assert.equal(await ve(e.admin)(p), true)

      // En cuanto escribe algo visible, aparece con su nombre en el historial.
      await como(e.tx, e.operador2, informacionNueva)
      assert.equal(await operadorVe(e.operador2), true)
    }))
})

describe('nadie aprueba su propio trabajo (tampoco un Administrador)', () => {
  it('quien abrió una revisión pendiente no la cierra «sin cambio», tampoco un Administrador; otra persona sí', () =>
    conEquipo(async (e) => {
      const abrir = async (quien: string): Promise<string> => {
        await como(e.tx, quien, informacionNueva)
        const filas = await e.tx<{ id: string; autor: string }[]>`
          select id, autor_persona_id as autor from risk.revision_pendiente order by abierta_en desc, id desc limit 1`
        const r = filas.at(0)
        assert.ok(r !== undefined)
        assert.equal(r.autor, quien)
        return r.id
      }
      const cerrados = async (rev: string): Promise<number | undefined> => {
        const [f] = await e.tx<{ n: number }[]>`select count(*)::int as n from risk.cierre_revision where revision_id = ${rev}`
        return f?.n
      }
      for (const quien of [e.operador, e.admin]) {
        const rev = await abrir(quien)
        await assert.rejects(como(e.tx, quien, (t, s) => cerrarSinCambio(t, s, { revisionId: rev, fundamento: 'No cambia.' })), sinPermiso(TRABAJO_PROPIO))
        const directo = await como(e.tx, quien, (t) => codigo(t, (u) => u`
          insert into risk.cierre_revision (revision_id, risk_id, resultado, fundamento, cerrada_por)
          values (${rev}, ${RIESGO}, 'sin_cambio', 'No cambia.', ${quien})`))
        assert.equal(directo, '42501', 'la base tampoco lo deja')
        assert.equal(await cerrados(rev), 0)
        await como(e.tx, e.operador2, (t, s) => cerrarSinCambio(t, s, { revisionId: rev, fundamento: 'Revisado por otra persona: no cambia.' }))
        assert.equal(await cerrados(rev), 1)
      }
    }))

  it('quien cargó una reevaluación no la revisa ni la acepta; otra persona sí, y cada fila queda con su autor', () =>
    conEquipo(async (e) => {
      const { revisionId } = await como(e.tx, e.operador, informacionNueva)
      assert.ok(revisionId !== null)
      const { evaluacionId } = await como(e.tx, e.operador, reevaluacion)

      await assert.rejects(como(e.tx, e.operador, (t, s) => revisar(t, s, { evaluacionId }, 'accepted')), sinPermiso(TRABAJO_PROPIO))
      await assert.rejects(como(e.tx, e.operador, (t, s) => cerrarConReevaluacion(t, s, { revisionId, evaluacionId })), sinPermiso(TRABAJO_PROPIO))
      const directo = await como(e.tx, e.operador, (t) => codigo(t, (u) => u`
        insert into risk.revision_humana (evaluacion_id, estado, revisado_por_actor, revisor_persona_id, fecha_revision, origen)
        values (${evaluacionId}, 'accepted', 'human', ${e.operador}, current_date, 'sesion')`))
      assert.equal(directo, '42501', 'la base tampoco deja aceptar lo propio')
      const cierre = await como(e.tx, e.operador, (t) => codigo(t, (u) => u`
        insert into risk.cierre_revision (revision_id, risk_id, resultado, evaluacion_id, cerrada_por)
        values (${revisionId}, ${RIESGO}, 'reevaluacion_aceptada', ${evaluacionId}, ${e.operador})`))
      assert.equal(cierre, '42501', 'ni cerrar la revisión con la propia reevaluación')

      const r = await como(e.tx, e.operador2, (t, s) => cerrarConReevaluacion(t, s, { revisionId, evaluacionId }))
      assert.equal(r.aceptada, true)
      const [f] = await e.tx<{ autor: string; revisor: string; cerro: string }[]>`
        select e.autor_persona_id as autor, h.revisor_persona_id as revisor, c.cerrada_por as cerro
        from risk.evaluacion e join risk.revision_humana h on h.evaluacion_id = e.id
        join risk.cierre_revision c on c.evaluacion_id = e.id where e.id = ${evaluacionId}`
      assert.deepEqual(f, { autor: e.operador, revisor: e.operador2, cerro: e.operador2 })
    }))

  it('un Administrador tampoco acepta lo suyo; el Revisor, después de su orden previo, acepta lo ajeno', () =>
    conEquipo(async (e) => {
      const { evaluacionId } = await como(e.tx, e.admin, reevaluacion)
      await assert.rejects(como(e.tx, e.admin, (t, s) => revisar(t, s, { evaluacionId }, 'accepted')), sinPermiso(TRABAJO_PROPIO))
      const directo = await como(e.tx, e.admin, (t) => codigo(t, (u) => u`
        insert into risk.revision_humana (evaluacion_id, estado, revisado_por_actor, revisor_persona_id, fecha_revision, origen)
        values (${evaluacionId}, 'accepted', 'human', ${e.admin}, current_date, 'sesion')`))
      assert.equal(directo, '42501')

      // Antes de su orden previo, para el Revisor esa evaluación no existe: la base no se la entrega.
      await assert.rejects(como(e.tx, e.revisor, (t, s) => revisar(t, s, { evaluacionId }, 'accepted')), /no existe/)
      await como(e.tx, e.revisor, ordenPrevio)
      await como(e.tx, e.revisor, (t, s) => revisar(t, s, { evaluacionId }, 'accepted'))
      const [f] = await e.tx<{ revisor: string }[]>`select revisor_persona_id as revisor from risk.revision_humana where evaluacion_id = ${evaluacionId}`
      assert.equal(f?.revisor, e.revisor)
    }))
})

describe('identidad, baja y autoría histórica', () => {
  it('la persona que ya escribía con contraseña entra con Google como la misma persona y conserva lo suyo', () =>
    conEquipo(async (e) => {
      // Una novedad de antes del vínculo, con la sesión de contraseña (legacy, sin rol).
      const antes = await registrarNovedad(e.tx, e.legado, { riskId: RIESGO, tipo: 'comentario', texto: 'Comentario previo.', evidencia: 'sin_evidencia' })
      const despues = await como(e.tx, e.operador, (t, s) =>
        registrarNovedad(t, s, { riskId: RIESGO, tipo: 'comentario', texto: 'Comentario con Google.', evidencia: 'sin_evidencia' }))
      const filas = await e.tx<{ autor: string }[]>`
        select autor_persona_id as autor from risk.novedad where id in (${antes.novedadId}, ${despues.novedadId})`
      assert.deepEqual(filas.map((f) => f.autor), [e.legado.personaId, e.legado.personaId])
      const [s] = await e.tx<{ n: number }[]>`
        select count(*)::int as n from risk.registro_acceso where persona_id = ${e.operador} and tipo = 'inicio_sesion'`
      assert.equal(s?.n, 1, 'el login con Google queda en el registro de la misma persona (A8a)')
      const [p] = await e.tx<{ n: number }[]>`select count(*)::int as n from risk.persona where nombre = 'Operadora de prueba'`
      assert.equal(p?.n, 1, 'no se creó otra persona')
    }))

  it('la baja y el cambio de rol valen desde el request siguiente; el último Administrador no se va', () =>
    conEquipo(async (e) => {
      assert.ok((await cambiarRol(e.tx, { actor: e.admin, personaId: e.operador2, rol: 'REVISOR' })).ok)
      assert.equal(await como(e.tx, e.operador2, (_t, s) => Promise.resolve(s.rol)), 'REVISOR')
      assert.ok((await darDeBaja(e.tx, { actor: e.admin, personaId: e.operador2 })).ok)
      const r = await conPrincipal(e.tx, { proveedor: 'google', sujeto: sujeto(e.operador2) }, () => Promise.resolve('corrió'))
      assert.deepEqual(r, { ok: false, motivo: 'SIN_ACCESO' })
      const vuelve = await ingresar(e.tx, { proveedor: 'google', sujeto: sujeto(e.operador2), email: 'operadora2@ejemplo.invalid' }, decidir)
      assert.equal(vuelve.tipo, 'RECHAZA')
      assert.deepEqual(await darDeBaja(e.tx, { actor: e.admin, personaId: e.admin }), { ok: false, motivo: 'ULTIMO_ADMINISTRADOR' })
      assert.deepEqual(await asignar(e.tx, { actor: e.operador, personaId: e.operador, organizacionId: OTRA_ORG, vigente: true }), { ok: false, motivo: 'ACTOR_NO_AUTORIZADO' })
    }))

  it('una identidad sin invitación no entra, y una invitación se consume una sola vez', () =>
    conEquipo(async (e) => {
      const nadie = await ingresar(e.tx, { proveedor: 'google', sujeto: 'sujeto-sin-invitacion', email: 'nadie@ejemplo.invalid' }, decidir)
      assert.deepEqual(nadie, { tipo: 'RECHAZA', motivo: 'NO_INVITADO' })
      const otra = await ingresar(e.tx, { proveedor: 'google', sujeto: 'otro-sujeto', email: 'operadora@ejemplo.invalid' }, decidir)
      assert.equal(otra.tipo, 'RECHAZA', 'la invitación de la operadora ya la consumió su cuenta')
      const r = await conPrincipal(e.tx, { proveedor: 'google', sujeto: 'sujeto-sin-invitacion' }, () => Promise.resolve('corrió'))
      assert.deepEqual(r, { ok: false, motivo: 'SIN_CREDENCIAL' })
      const eventos = await e.tx<{ motivo: string | null }[]>`
        select motivo from risk.evento_auditoria where accion = 'acceso.ingresar' and resultado = 'denied' order by id`
      assert.deepEqual(eventos.map((x) => x.motivo), ['NO_INVITADO', 'NO_INVITADO'])
      const columnas = await e.tx<{ c: string }[]>`
        select column_name as c from information_schema.columns where table_schema = 'risk' and table_name = 'evento_auditoria' order by ordinal_position`
      assert.deepEqual(columnas.map((x) => x.c), ['id', 'ocurrido_en', 'actor_persona_id', 'origen', 'accion', 'tipo_objeto', 'id_objeto', 'resultado', 'motivo'],
        'sin columnas de texto libre ni de payload')
    }))
})

describe('condiciones de D-0022 en la base de Risk OS', () => {
  it('toda tabla tiene RLS y la política de legado; ningún rol de la app salta RLS', async () => {
    const sinRls = await sql<{ t: string }[]>`
      select c.relname as t from pg_class c join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'risk' and c.relkind = 'r' and not c.relrowsecurity`
    assert.deepEqual(sinRls.map((x) => x.t), [])
    const sinLegado = await sql<{ t: string }[]>`
      select c.relname as t from pg_class c join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'risk' and c.relkind = 'r'
        and not exists (select 1 from pg_policy p where p.polrelid = c.oid and p.polname = 'legado_risk_app')`
    assert.deepEqual(sinLegado.map((x) => x.t), [], 'risk_app sigue viendo todo en legacy')
    const roles = await sql<{ r: string; bypass: boolean; login: boolean }[]>`
      select rolname as r, rolbypassrls as bypass, rolcanlogin as login from pg_roles where rolname = 'risk_persona'`
    assert.deepEqual(roles.map((x) => ({ ...x })), [{ r: 'risk_persona', bypass: false, login: false }])
  })

  it('cada authz_* es SECURITY DEFINER, con search_path vacío, y sólo risk_persona la ejecuta', async () => {
    const fs = await sql<{ f: string; definer: boolean; config: string[] | null; publico: boolean; persona: boolean }[]>`
      select p.oid::regprocedure::text as f, p.prosecdef as definer, p.proconfig as config,
             has_function_privilege('public', p.oid, 'execute') as publico,
             has_function_privilege('risk_persona', p.oid, 'execute') as persona
      from pg_proc p join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'risk' and p.proname like 'authz\\_%'`
    assert.ok(fs.length >= 18)
    // Sólo las usan otras funciones, que corren como su dueño (0008).
    const internas = ['risk.authz_rol_de(text)', 'risk.authz_organizaciones_asignadas()', 'risk.authz_autor_de(text,text,text)']
    for (const f of fs) {
      assert.ok(f.definer, f.f)
      assert.deepEqual(f.config, ['search_path=""'], f.f)
      assert.equal(f.publico, false, f.f)
      assert.equal(f.persona, !internas.includes(f.f), f.f)
    }
    assert.equal(fs.filter((f) => internas.includes(f.f)).length, internas.length)
  })

  it('las authz_* no le dicen a quien consulta lo que RLS le oculta', () =>
    conEquipo(async (e) => {
      const riesgoAjeno = id('S07-R06')
      const [ajena] = await e.tx<{ ev: string }[]>`select id as ev from risk.evaluacion where risk_id = ${riesgoAjeno} limit 1`
      const [propia] = await e.tx<{ ev: string }[]>`select id as ev from risk.evaluacion where risk_id = ${RIESGO} limit 1`
      assert.ok(ajena !== undefined && propia !== undefined)

      const internas: readonly [string, (u: TransactionSql) => Promise<unknown>][] = [
        ['authz_rol_de', (u) => u`select risk.authz_rol_de(${e.admin})`],
        ['authz_organizaciones_asignadas', (u) => u`select risk.authz_organizaciones_asignadas()`],
        ['authz_autor_de', (u) => u`select risk.authz_autor_de(${ajena.ev}, null, null)`],
      ]
      for (const [nombre, consulta] of internas) {
        assert.equal(await como(e.tx, e.operador, (t) => codigo(t, consulta)), '42501', nombre)
      }

      const riesgoDe = (quien: string, ev: string) => como(e.tx, quien, (t) => t<{ r: string | null }[]>`
        select risk.authz_riesgo_de(${ev}, null, null) as r`).then((f) => f[0]?.r)
      assert.equal(await riesgoDe(e.operador, ajena.ev), null, 'de otra organización')
      assert.equal(await riesgoDe(e.operador, propia.ev), RIESGO)
      assert.equal(await riesgoDe(e.revisor, propia.ev), null, 'el Revisor, antes de su orden previo')

      // Autor de un reordenamiento y revisor de un orden previo: sólo si es quien consulta.
      await como(e.tx, e.revisor, ordenPrevio)
      assert.equal(await riesgoDe(e.revisor, propia.ev), RIESGO, 'y después')
      const { reordenamientoId } = await como(e.tx, e.revisor, (t, s) => reordenar(t, s, V, ORG, {
        tipo: 'banda', riskId: RIESGO, banda: 'Crítica', causa: 'desacuerdo_de_criterio_profesional', fundamento: 'Criterio profesional.', patron: 'otro',
      }))
      const [opr] = await e.tx<{ id: string }[]>`select id from risk.orden_previo where revisor_persona_id = ${e.revisor} and organizacion_id = ${ORG}`
      const autores = (quien: string) => como(e.tx, quien, (t) => t<{ ror: string | null; opr: string | null }[]>`
        select risk.authz_autor_reordenamiento(${reordenamientoId}) as ror, risk.authz_revisor_orden_previo(${opr?.id ?? ''}) as opr`)
        .then((f) => ({ ...f[0] }))
      assert.deepEqual(await autores(e.operador), { ror: null, opr: null })
      assert.deepEqual(await autores(e.revisor), { ror: e.revisor, opr: e.revisor })
    }))

  it('la auditoría sólo acepta de una persona acciones riesgo.*, y siempre con ella como actor', () =>
    conEquipo(async (e) => {
      const evento = (accion: string, actor: string | null = e.operador) => como(e.tx, e.operador, (t) => codigo(t, (u) => u`
        insert into risk.evento_auditoria (actor_persona_id, origen, accion, tipo_objeto, id_objeto, resultado)
        values (${actor}, 'app', ${accion}, 'persona', ${e.admin}, 'ok')`))
      assert.equal(await evento('persona.dar_de_baja'), '42501')
      assert.equal(await evento('acceso.ingresar'), '42501')
      assert.equal(await evento('riesgo.consultar', null), '42501', 'sin actor')
      assert.equal(await evento('riesgo.consultar', e.admin), '42501', 'a nombre de otra persona')
      assert.equal(await evento('riesgo.consultar'), 'sin error')
    }))

  it('el principal es local a la transacción: termina con ella, y conPrincipal restaura lo que había', () =>
    conEquipo(async (e) => {
      await como(e.tx, e.operador, async (t) => {
        const [r] = await t<{ rol: string; p: string }[]>`select current_user as rol, current_setting('authz.persona_id') as p`
        assert.deepEqual({ ...r }, { rol: 'risk_persona', p: e.operador })
      })
      const [r] = await e.tx<{ rol: string; p: string }[]>`select current_user as rol, coalesce(current_setting('authz.persona_id', true), '') as p`
      assert.notEqual(r?.rol, 'risk_persona')
      assert.equal(r?.p, '')
    }))

  it('deploy/rol-app.sql deja a risk_app sin ninguna membresía: no puede tomar el camino oidc (0009)', async () => {
    const texto = readFileSync(fileURLToPath(new URL('../../deploy/rol-app.sql', import.meta.url)), 'utf8').replace(/^(begin|commit);$/gm, '')
    await enTransaccionRevertida(sql, async (tx) => {
      // Como lo dejaba el rol-app.sql anterior a 0009, para ver que esta versión lo saca.
      await tx`grant risk_persona to risk_app with inherit false, set true`
      await tx.unsafe(texto)
      const miembro = await tx<{ r: string }[]>`
        select r.rolname as r from pg_auth_members m join pg_roles r on r.oid = m.roleid where m.member = 'risk_app'::regrole`
      assert.deepEqual(miembro.map((m) => m.r), [])
      // `set role` lo decide el usuario de la sesión (acá, el de los tests): se pregunta al catálogo.
      const [p] = await tx<{ persona: boolean; oidc: boolean }[]>`
        select pg_has_role('risk_app', 'risk_persona', 'member') as persona, pg_has_role('risk_app', 'risk_oidc', 'member') as oidc`
      assert.deepEqual({ ...p }, { persona: false, oidc: false })
    })
  })
})
