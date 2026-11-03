// T-0035, incremento 5: la entrada con Google y el acceso por persona de Risk OS, de punta a
// punta contra los handlers reales de la app (detrás de `withSesion`), las páginas y
// delcampo_risk_test, dentro de una transacción que se revierte. El canje con Google se
// reemplaza por una identidad sintética: lo que se prueba es lo que pasa después (admisión en la
// base, sesión, guard, matriz aprobada, orden previo ciego, auditoría y revocación).
//
// El equipo se arma como lo haría el owner con la CLI (`invitar`, `asignar`): una
// Administradora, una Operadora y un Revisor nuevos, y la persona de siempre, que ya usaba Risk
// OS con contraseña, invitada por su id para que conserve su autoría.

import assert from 'node:assert/strict'
import { fileURLToPath } from 'node:url'
import { after, before, describe, it } from 'node:test'

import { sellarHandshake, type Identidad } from '@del-campo/identidad'
import {
  asignar, cambiarRol, connect, darDeBaja, EXPLICACION, importarLote, invitar, leerArchivosDeLote, leerContrato, migrate, SIN_ORDEN_PREVIO,
  SinPermiso, VERSION_METODOLOGIA, vistaDetalle, vistaLista, pantallaOrdenPrevio, type RolInterno, type Sql, type TransactionSql,
} from '@del-campo/risk'
import { renderToStaticMarkup } from 'react-dom/server'

import { PaginaSinAcceso, permisosDe } from '../vistas/comun.ts'
import { PaginaDetalle } from '../vistas/detalle.ts'
import { PaginaOrdenPrevio } from '../vistas/organizacion.ts'
import { actualizarRiesgoResponse, ordenPrevioResponse } from './actualizar.ts'
import { callbackResponse } from './entrada.ts'
import { withSesion, type Deps } from './guard.ts'
import { detalleResponse, loginResponse, logoutResponse, organizacionesResponse, vistaDeOrganizacionResponse } from './handlers.ts'
import { COOKIE_HANDSHAKE, COOKIE_IDENTIDAD, PROPOSITO } from './identidad.ts'
import { sesionDePagina } from './pagina.ts'
import { issueSession, SESSION_COOKIE } from './sesion.ts'

const TEST_DATABASE = 'delcampo_risk_test'
const SINTETICOS = fileURLToPath(new URL('../../../../SPIKES/T-0021/v0/fase-15/sinteticos/', import.meta.url))
const ORIGIN = 'http://localhost:3200'
const SECRET = 'secreto-de-sesion-de-prueba-0123456789abcdef'
const LEGADO = 'PER-01M50T00000000000000000004'
const HASH = `scrypt:32768:8:1:${Buffer.alloc(16).toString('base64')}:${Buffer.alloc(32).toString('base64')}`
const ORG = 'ORG-01M3QSRT00VT0W3XH3JG6NDTEX'

const OIDC = {
  AUTH_MODE: 'oidc',
  RISK_BASE_URL: ORIGIN,
  RISK_GOOGLE_CLIENT_ID: 'cliente-de-prueba.apps.example.test',
  RISK_GOOGLE_CLIENT_SECRET: 'secreto-de-cliente-de-prueba',
  RISK_UI_SESSION_SECRET: SECRET,
  RISK_DATABASE_URL: 'postgres://no-se-usa',
}
const LEGACY = { RISK_UI_SESSION_SECRET: SECRET, RISK_DATABASE_URL: 'postgres://no-se-usa' }

const testUrl = (): string => {
  const own = process.env.RISK_DATABASE_URL
  const url = new URL(own !== undefined && own !== '' ? own : (process.env.DATABASE_URL ?? 'postgres://localhost:5432/postgres'))
  if (own === undefined || own === '') url.pathname = `/${TEST_DATABASE}`
  if (url.pathname !== `/${TEST_DATABASE}`) throw new Error(`este test importa y revierte: sólo corre sobre ${TEST_DATABASE}`)
  return url.href
}

let sql: Sql
before(async () => {
  const url = new URL(testUrl())
  const admin = new URL(url.href)
  admin.pathname = '/postgres'
  const root = connect(admin.href)
  try {
    const existe = await root`select 1 from pg_database where datname = ${TEST_DATABASE}`
    if (existe.length === 0) await root.unsafe(`create database ${TEST_DATABASE}`)
  } finally {
    await root.end()
  }
  sql = connect(url.href)
  await migrate(sql)
})
after(async () => {
  await sql.end()
})

const identidad = (nombre: string, email = `${nombre}@ejemplo.invalid`): Identidad => ({
  proveedor: 'google', sujeto: `sub-${nombre}`, email, emailVerificado: true, nombre: null,
})

const cookieDe = (response: Response, nombre: string): string | null => {
  for (const c of response.headers.getSetCookie()) {
    const [par] = c.split(';')
    const [k, ...v] = (par ?? '').split('=')
    if (k === nombre) return v.join('=')
  }
  return null
}

interface Equipo {
  readonly tx: TransactionSql
  readonly ids: Readonly<Record<'admin' | 'operadora' | 'revisor' | 'legado', string>>
  /** La cookie de la sesión de Google de cada uno. */
  readonly cookies: Readonly<Record<'admin' | 'operadora' | 'revisor' | 'legado', string>>
  readonly volverDeGoogle: (quien: Identidad) => Promise<Response>
  readonly get: (quien: string, path: string) => Promise<Response>
  readonly post: (quien: string, path: string, campos: Record<string, string>) => Promise<{ ok: string | null; error: string | null }>
  readonly pagina: (quien: string) => ReturnType<typeof sesionDePagina>
  readonly ultimoEvento: (accion: string) => Promise<{ actor: string | null; resultado: string; motivo: string | null; idObjeto: string | null } | undefined>
}

class Revertir extends Error {}

const conEquipo = async (cuerpo: (e: Equipo) => Promise<void>): Promise<void> => {
  try {
    await sql.begin(async (tx) => {
      const r = await importarLote(tx, leerContrato(), leerArchivosDeLote(SINTETICOS), { origen: 'test', importadoPor: 'test T-0035', fechaCorte: '2026-10-14' })
      assert.equal(r.estado, 'importado')
      await tx`insert into risk.persona ${tx({ id: LEGADO, nombre: 'Persona de siempre' })}`
      await tx`insert into risk.usuario ${tx({ usuario: 'persona-de-siempre', persona_id: LEGADO })}`
      await tx`insert into risk.credencial ${tx({ persona_id: LEGADO, password_hash: HASH })}`

      const deps = (): Deps => ({ env: OIDC, db: () => tx })
      const volverDeGoogle = async (quien: Identidad): Promise<Response> => {
        const handshake = await sellarHandshake({ state: 's', nonce: 'n', codeVerifier: 'v' }, SECRET, PROPOSITO)
        const request = new Request(`${ORIGIN}/api/auth/google/callback?code=c&state=s`, { headers: { cookie: `${COOKIE_HANDSHAKE}=${handshake}` } })
        return callbackResponse(request, OIDC, { pedir: () => Promise.reject(new Error('no se usa')), canjear: () => Promise.resolve(quien), conexion: () => tx })
      }
      const entrar = async (quien: Identidad): Promise<string> => {
        const response = await volverDeGoogle(quien)
        assert.equal(response.headers.get('location'), `${ORIGIN}/`)
        const c = cookieDe(response, COOKIE_IDENTIDAD)
        assert.ok(c !== null && c !== '', 'el callback emite la sesión')
        return c
      }
      const ok = <T>(r: { ok: true; valor: T } | { ok: false; motivo: string }): T => {
        assert.ok(r.ok, r.ok ? '' : r.motivo)
        return r.valor
      }

      // El arranque: la primera Administradora, sin actor. Después invita ella.
      const admin = ok(await invitar(tx, { actor: null, email: 'admin@ejemplo.invalid', rol: 'ADMINISTRADOR', nombre: 'Administradora de prueba' })).personaId
      const cookieAdmin = await entrar(identidad('admin'))
      const operadora = ok(await invitar(tx, { actor: admin, email: 'operadora@ejemplo.invalid', rol: 'OPERADOR', nombre: 'Operadora de prueba' })).personaId
      const revisor = ok(await invitar(tx, { actor: admin, email: 'revisor@ejemplo.invalid', rol: 'REVISOR', nombre: 'Revisor de prueba' })).personaId
      ok(await invitar(tx, { actor: admin, email: 'legado@ejemplo.invalid', rol: 'OPERADOR', personaId: LEGADO }))
      for (const p of [operadora, revisor, LEGADO]) ok(await asignar(tx, { actor: admin, personaId: p, organizacionId: ORG, vigente: true }))
      const cookies = {
        admin: cookieAdmin,
        operadora: await entrar(identidad('operadora')),
        revisor: await entrar(identidad('revisor')),
        legado: await entrar(identidad('legado')),
      }

      // Los mismos handlers que los `route.ts`, con la transacción como base.
      const organizacionesGET = withSesion((_r, s, db) => organizacionesResponse(s, db), deps)
      const vistaGET = withSesion<{ org: string; vista: 'lista' | 'plan' }>((r, s, db, c) => vistaDeOrganizacionResponse(r, s, db, c.vista, c.org), deps)
      const detalleGET = withSesion<{ id: string }>((_r, s, db, c) => detalleResponse(s, db, c.id), deps)
      const actualizarPOST = withSesion<{ id: string }>((r, s, db, c) => actualizarRiesgoResponse(r, s, db, c.id), deps)
      const ordenPrevioPOST = withSesion<{ org: string }>((r, s, db, c) => ordenPrevioResponse(r, s, db, c.org), deps)

      const cabecera = (quien: string, extra: Record<string, string> = {}): Record<string, string> => ({ cookie: `${COOKIE_IDENTIDAD}=${quien}`, ...extra })
      const get = (quien: string, path: string): Promise<Response> => {
        const request = new Request(`${ORIGIN}${path}`, { headers: cabecera(quien) })
        if (path === '/api/organizaciones') return organizacionesGET(request, {})
        const det = /^\/api\/r\/(.+)$/.exec(path)
        if (det !== null) return detalleGET(request, { id: det[1] ?? '' })
        const m = /^\/api\/o\/([^/]+)\/(lista|plan)$/.exec(path)
        assert.ok(m !== null, path)
        return vistaGET(request, { org: decodeURIComponent(m[1] ?? ''), vista: m[2] as 'lista' | 'plan' })
      }
      const post = async (quien: string, path: string, campos: Record<string, string>): Promise<{ ok: string | null; error: string | null }> => {
        const request = new Request(`${ORIGIN}${path}`, { method: 'POST', headers: cabecera(quien, { origin: ORIGIN }), body: new URLSearchParams(campos) })
        const act = /^\/api\/r\/([^/]+)\/actualizar$/.exec(path)
        const previo = /^\/api\/o\/([^/]+)\/orden-previo$/.exec(path)
        const r = act !== null ? await actualizarPOST(request, { id: act[1] ?? '' }) : await ordenPrevioPOST(request, { org: previo?.[1] ?? '' })
        assert.equal(r.status, 303, `${path}: ${String(r.status)}`)
        const u = new URL(r.headers.get('location') ?? '')
        return { ok: u.searchParams.get('ok'), error: u.searchParams.get('error') }
      }
      const pagina = (quien: string): ReturnType<typeof sesionDePagina> =>
        sesionDePagina({
          env: OIDC, cookie: (n) => (n === COOKIE_IDENTIDAD ? quien : undefined), db: () => tx,
          alLogin: () => { throw new Error('al login') },
        })
      const ultimoEvento: Equipo['ultimoEvento'] = async (accion) => {
        const [e] = await tx<{ actor: string | null; resultado: string; motivo: string | null; idObjeto: string | null }[]>`
          select actor_persona_id as actor, resultado, motivo, id_objeto as "idObjeto"
          from risk.evento_auditoria where accion = ${accion} order by id desc limit 1`
        return e
      }

      await cuerpo({ tx, ids: { admin, operadora, revisor, legado: LEGADO }, cookies, volverDeGoogle, get, post, pagina, ultimoEvento })
      throw new Revertir()
    })
  } catch (e) {
    if (!(e instanceof Revertir)) throw e
  }
}

const json = async <T>(r: Response): Promise<T> => (await r.json()) as T
const orgsDe = async (r: Response): Promise<string[]> =>
  (await json<{ organizaciones: { organizacionId: string }[] }>(r)).organizaciones.map((o) => o.organizacionId).sort()
const rolDe = async (e: Equipo, quien: string): Promise<RolInterno | undefined> => (await e.pagina(quien))?.rol

/** Los campos de un orden previo completo para la organización, desde el material ciego. */
const ordenPrevio = async (tx: TransactionSql, personaId: string): Promise<Record<string, string>> => {
  const p = await pantallaOrdenPrevio(tx, { personaId, nombre: '', credencialId: '0' }, ORG)
  assert.ok(p !== null)
  return Object.fromEntries([['material', 'MAT-T0035'], ...p.objetos.map((o, i): [string, string] => [`pos_${o.riskId}`, String(i + 1)])])
}

describe('entrada con Google (AUTH_MODE=oidc)', () => {
  it('sin invitación no entra; la persona de siempre conserva su id; la contraseña no entra y el logout borra las dos cookies', async () => {
    await conEquipo(async (e) => {
      const r = await e.volverDeGoogle(identidad('nadie'))
      assert.equal(r.headers.get('location'), `${ORIGIN}/login?error=1`)
      assert.equal(cookieDe(r, COOKIE_IDENTIDAD), null)
      assert.deepEqual(await e.ultimoEvento('acceso.ingresar'), { actor: null, resultado: 'denied', motivo: 'NO_INVITADO', idObjeto: null })

      // La persona que usaba Risk OS con contraseña entra con Google como la misma persona.
      const legado = await e.pagina(e.cookies.legado)
      assert.equal(legado?.nombre, 'Persona de siempre')
      assert.equal(legado.rol, 'OPERADOR')
      const [c] = await e.tx<{ persona_id: string }[]>`select persona_id from risk.credencial_externa where sujeto = 'sub-legado'`
      assert.equal(c?.persona_id, LEGADO)
      assert.deepEqual(await e.ultimoEvento('acceso.vincular'), { actor: LEGADO, resultado: 'ok', motivo: null, idObjeto: LEGADO })

      const login = await loginResponse(new Request(`${ORIGIN}/api/login`, { method: 'POST', headers: { origin: ORIGIN }, body: new URLSearchParams({ usuario: 'persona-de-siempre', contrasena: 'x' }) }), OIDC, () => e.tx)
      assert.equal(login.status, 404)
      const logout = logoutResponse(new Request(`${ORIGIN}/api/logout`, { method: 'POST', headers: { origin: ORIGIN } }), OIDC)
      assert.equal(cookieDe(logout, SESSION_COOKIE), '')
      assert.equal(cookieDe(logout, COOKIE_IDENTIDAD), '')

      // Sin la cookie de Google, o con la de usuario y contraseña, no hay acceso.
      assert.equal((await e.get('', '/api/organizaciones')).status, 401)
      assert.equal(await e.pagina('no-es-una-sesion'), null)
    })
  })
})

describe('alcance por organización y orden previo ciego, en la app', () => {
  it('la Operadora ve sólo lo asignado y la Administradora todo', async () => {
    await conEquipo(async (e) => {
      const todas = await orgsDe(await e.get(e.cookies.admin, '/api/organizaciones'))
      assert.equal(todas.length, 8)
      assert.deepEqual(await orgsDe(await e.get(e.cookies.operadora, '/api/organizaciones')), [ORG])
      const otra = todas.find((o) => o !== ORG) ?? ''
      assert.equal((await e.get(e.cookies.operadora, `/api/o/${encodeURIComponent(otra)}/lista`)).status, 404)
      assert.equal((await e.get(e.cookies.admin, `/api/o/${encodeURIComponent(otra)}/lista`)).status, 200)
      assert.equal((await e.get(e.cookies.operadora, `/api/o/${ORG}/lista`)).status, 200)
    })
  })

  it('el Revisor no ve resultados hasta registrar su orden previo; después sí', async () => {
    await conEquipo(async (e) => {
      const r = await e.get(e.cookies.revisor, `/api/o/${ORG}/lista`)
      assert.equal(r.status, 403)
      assert.deepEqual(await r.json(), { error: SIN_ORDEN_PREVIO })
      assert.deepEqual(await e.ultimoEvento('riesgo.ver_resultados'), { actor: e.ids.revisor, resultado: 'denied', motivo: 'SIN_ORDEN_PREVIO', idObjeto: null })
      const [riesgo] = await e.tx<{ id: string }[]>`select id from risk.riesgo where organizacion_id = ${ORG} limit 1`
      assert.equal((await e.get(e.cookies.revisor, `/api/r/${riesgo?.id ?? ''}`)).status, 403)
      // En la página, lo mismo: la explicación en lugar de los datos.
      const pagina = await e.pagina(e.cookies.revisor)
      assert.ok(pagina !== null)
      const vista = await pagina.datos((db, s) => vistaLista(db, s, VERSION_METODOLOGIA, ORG))
      assert.ok(vista instanceof SinPermiso)
      assert.match(renderToStaticMarkup(PaginaSinAcceso(vista.message, pagina.nombre, ORG)), /data-sin-acceso/)

      // La Operadora no registra un orden previo: es del Revisor.
      const campos = await ordenPrevio(e.tx, e.ids.revisor)
      assert.deepEqual(await e.post(e.cookies.operadora, `/api/o/${ORG}/orden-previo`, campos), { ok: null, error: EXPLICACION['riesgo.orden_previo'] })
      assert.deepEqual(await e.ultimoEvento('riesgo.orden_previo'), { actor: e.ids.operadora, resultado: 'denied', motivo: 'ROL_SIN_PERMISO', idObjeto: null })

      assert.deepEqual(await e.post(e.cookies.revisor, `/api/o/${ORG}/orden-previo`, campos), { ok: 'Orden previo registrado.', error: null })
      assert.deepEqual(await e.ultimoEvento('riesgo.orden_previo'), { actor: e.ids.revisor, resultado: 'ok', motivo: null, idObjeto: ORG })
      assert.equal((await e.get(e.cookies.revisor, `/api/o/${ORG}/lista`)).status, 200)
      assert.equal((await e.get(e.cookies.revisor, `/api/r/${riesgo?.id ?? ''}`)).status, 200)
    })
  })
})

describe('escrituras según la matriz, con autoría y auditoría', () => {
  it('la Operadora carga y queda como autora; el Revisor no carga; fuera de lo asignado no se escribe', async () => {
    await conEquipo(async (e) => {
      const [riesgo] = await e.tx<{ id: string }[]>`select id from risk.riesgo where organizacion_id = ${ORG} limit 1`
      const rid = riesgo?.id ?? ''
      const ruta = `/api/r/${rid}/actualizar`
      const novedad = { op: 'novedad', tipo: 'informacion_nueva', texto: 'Informe sintético.', evidencia: 'DOC-T0035' }
      const novedades = async (): Promise<number> => (await e.tx<{ n: number }[]>`select count(*)::int as n from risk.novedad`)[0]?.n ?? -1
      const antes = await novedades()

      assert.deepEqual(await e.post(e.cookies.revisor, ruta, novedad), { ok: null, error: EXPLICACION['riesgo.cargar'] })
      assert.equal(await novedades(), antes)
      assert.deepEqual(await e.ultimoEvento('riesgo.cargar'), { actor: e.ids.revisor, resultado: 'denied', motivo: 'ROL_SIN_PERMISO', idObjeto: null })

      const r = await e.post(e.cookies.operadora, ruta, novedad)
      assert.ok(r.ok !== null && r.error === null, JSON.stringify(r))
      const [n] = await e.tx<{ autor: string }[]>`select autor_persona_id as autor from risk.novedad order by id desc limit 1`
      assert.equal(n?.autor, e.ids.operadora)
      assert.deepEqual(await e.ultimoEvento('riesgo.novedad'), { actor: e.ids.operadora, resultado: 'ok', motivo: null, idObjeto: rid })

      // Un riesgo de otra organización: ni lo ve ni le escribe.
      const [ajeno] = await e.tx<{ id: string }[]>`select id from risk.riesgo where organizacion_id <> ${ORG} limit 1`
      const fuera = await e.post(e.cookies.operadora, `/api/r/${ajeno?.id ?? ''}/actualizar`, novedad)
      assert.ok(fuera.error !== null && fuera.ok === null)
      assert.equal(await novedades(), antes + 1)
    })
  })

  it('la UI muestra a cada rol sólo los formularios que puede usar', async () => {
    await conEquipo(async (e) => {
      const [riesgo] = await e.tx<{ id: string }[]>`select id from risk.riesgo where organizacion_id = ${ORG} and tipo_objeto <> 'padre' limit 1`
      const rid = riesgo?.id ?? ''
      assert.ok((await e.post(e.cookies.revisor, `/api/o/${ORG}/orden-previo`, await ordenPrevio(e.tx, e.ids.revisor))).ok !== null)
      const html = async (quien: string): Promise<string> => {
        const p = await e.pagina(quien)
        assert.ok(p !== null)
        const v = await p.datos((db, s) => vistaDetalle(db, s, VERSION_METODOLOGIA, rid))
        assert.ok(v !== null && !(v instanceof SinPermiso))
        return renderToStaticMarkup(PaginaDetalle(v, p.nombre, undefined, permisosDe(p.rol)))
      }
      const operadora = await html(e.cookies.operadora)
      const revisor = await html(e.cookies.revisor)
      for (const op of ['novedad', 'reevaluacion', 'alta_accion', 'alta_cobertura']) {
        assert.match(operadora, new RegExp(`name="op" value="${op}"`), op)
        assert.doesNotMatch(revisor, new RegExp(`name="op" value="${op}"`), op)
      }

      const previo = async (quien: string): Promise<string> => {
        const p = await e.pagina(quien)
        assert.ok(p !== null)
        const v = await p.datos((db, s) => pantallaOrdenPrevio(db, s, ORG))
        assert.ok(v !== null && !(v instanceof SinPermiso))
        return renderToStaticMarkup(PaginaOrdenPrevio(v, p.nombre, undefined, permisosDe(p.rol)))
      }
      assert.doesNotMatch(await previo(e.cookies.operadora), /action="\/api\/o\/[^"]+\/orden-previo"/)
      assert.match(await previo(e.cookies.operadora), /El orden previo ciego lo registra el Revisor profesional/)
    })
  })
})

describe('revocación y modo legacy', () => {
  it('una baja corta el acceso en el request siguiente y un cambio de rol rige en el siguiente', async () => {
    await conEquipo(async (e) => {
      assert.equal((await e.get(e.cookies.operadora, '/api/organizaciones')).status, 200)
      assert.ok((await darDeBaja(e.tx, { actor: e.ids.admin, personaId: e.ids.operadora })).ok)
      const r = await e.get(e.cookies.operadora, '/api/organizaciones')
      assert.equal(r.status, 401)
      assert.deepEqual(await r.json(), { error: 'sin credencial válida' })
      assert.deepEqual(await e.ultimoEvento('acceso.consultar'), { actor: null, resultado: 'denied', motivo: 'SIN_ACCESO', idObjeto: null })
      assert.equal(await e.pagina(e.cookies.operadora), null)

      assert.equal(await rolDe(e, e.cookies.revisor), 'REVISOR')
      assert.ok((await cambiarRol(e.tx, { actor: e.ids.admin, personaId: e.ids.revisor, rol: 'OPERADOR' })).ok)
      assert.equal(await rolDe(e, e.cookies.revisor), 'OPERADOR')
      assert.equal((await e.get(e.cookies.revisor, `/api/o/${ORG}/lista`)).status, 200)
    })
  })

  it('en legacy, con todo lo anterior cargado, Risk OS se comporta como antes', async () => {
    await conEquipo(async (e) => {
      const [c] = await e.tx<{ id: string }[]>`select max(id)::text as id from risk.credencial where persona_id = ${LEGADO}`
      const cookie = `${SESSION_COOKIE}=${issueSession(SECRET, { personaId: LEGADO, credencialId: c?.id ?? '' })}`
      const deps = (): Deps => ({ env: LEGACY, db: () => e.tx })
      const get = withSesion((_r, s, db) => organizacionesResponse(s, db), deps)
      // La persona de siempre está asignada a una sola organización, pero en legacy no hay alcance.
      assert.equal((await orgsDe(await get(new Request(`${ORIGIN}/api/organizaciones`, { headers: { cookie } }), {}))).length, 8)
      // Y la cookie de Google no sirve en legacy.
      assert.equal((await get(new Request(`${ORIGIN}/api/organizaciones`, { headers: { cookie: `${COOKIE_IDENTIDAD}=${e.cookies.admin}` } }), {})).status, 401)
      const p = await sesionDePagina({ env: LEGACY, cookie: (n) => (n === SESSION_COOKIE ? cookie.split('=').slice(1).join('=') : undefined), db: () => e.tx, alLogin: () => { throw new Error('al login') } })
      assert.equal(p?.rol, undefined)
      assert.equal(p?.nombre, 'Persona de siempre')
    })
  })
})
