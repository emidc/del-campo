// T-0035 — login por invitación en `oidc`, de punta a punta sobre las funciones que corren
// en producción: `admitirLogin` (callback), `guarded` (cada request de datos) y
// `conDatos` (la base). Contra un Postgres real (R-26), con datos sintéticos y cada caso
// en una transacción revertida (R-19). Cubre lo que pidió el owner al revisar el #107:
// cuentas externas invitadas, no invitadas, sesiones vencidas, revocación y `legacy`.

import assert from 'node:assert/strict'
import { after, describe, it } from 'node:test'

import postgres from 'postgres'

import { guarded, jsonResponse } from '../http.ts'
import type { IdentityClaims, LegacyAdmissionConfig, OidcAdmissionConfig } from '../session/admission.ts'
import type { GuardConfig } from '../session/guard.ts'
import { SESSION_COOKIE, sealSession } from '../session/session.ts'
import { darDeBaja, invitar } from './admin.ts'
import { conDatos } from './datos.ts'
import { admitirLogin } from './login.ts'

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

const ok = <T>(r: { readonly ok: true; readonly valor: T } | { readonly ok: false; readonly motivo: string }): T => {
  if (!r.ok) throw new Error(`se esperaba ok y vino ${r.motivo}`)
  return r.valor
}

const OIDC: OidcAdmissionConfig = { modo: 'oidc' }
const SECRET = 'secreto-sintetico-de-prueba-suficientemente-largo'

/** Una cuenta de Google cualquiera: sin `hd`, como cualquier cuenta externa. */
const externa = (sub: string, email: string, overrides: Partial<IdentityClaims> = {}): IdentityClaims => ({
  sub,
  email,
  emailVerified: true,
  hostedDomain: null,
  displayName: null,
  ...overrides,
})

const credenciales = async (tx: postgres.TransactionSql, sub: string): Promise<number> =>
  (await tx`select 1 from user_credential where provider = 'google' and subject = ${sub}`).length

const motivosAuditados = async (tx: postgres.TransactionSql, accion: string): Promise<(string | null)[]> =>
  (await tx<{ reason_code: string | null }[]>`
    select reason_code from audit_event where action = ${accion} and outcome = 'denied' order by id
  `).map((f) => f.reason_code)

/** Un request de datos con la cookie que el callback habría emitido para `claims`. */
const pedir = async (
  tx: postgres.TransactionSql,
  claims: IdentityClaims,
  ttl?: number,
): Promise<Response> => {
  const cookie = await sealSession(claims, SECRET, ttl)
  const config: GuardConfig = { admission: OIDC, session: { secret: SECRET, secureCookies: false } }
  const request = new Request('https://vs01.test/api/vs01/search', {
    headers: { cookie: `${SESSION_COOKIE}=${cookie}` },
  })
  return guarded(request, config, async (principal) =>
    jsonResponse(await conDatos(tx, principal, async (e) => [...(await e`select current_user as rol`)], 'oidc')),
  )
}

describe('oidc: cuenta externa invitada', () => {
  it('entra sin Workspace, vincula la credencial y consulta como broker_app; después entra por sub', async () => {
    const r = await descartable(async (tx) => {
      const admin = ok(await invitar(tx, { actor: null, email: 'admin@sintetico.test', rol: 'ADMINISTRADOR' }))
      await admitirLogin(externa('sub-admin', 'admin@sintetico.test'), OIDC, tx)
      ok(await invitar(tx, { actor: admin.usuarioId, email: 'Externa@Gmail-Sintetico.test', rol: 'OPERADOR' }))

      const primero = await admitirLogin(externa('sub-ext', 'externa@gmail-sintetico.test'), OIDC, tx)
      const vinculada = await credenciales(tx, 'sub-ext')
      // Cambió el email de la cuenta: entra igual, porque la identidad es el sub.
      const segundo = await admitirLogin(externa('sub-ext', 'otro@gmail-sintetico.test'), OIDC, tx)
      const respuesta = await pedir(tx, externa('sub-ext', 'otro@gmail-sintetico.test'))
      return { primero, vinculada, segundo, status: respuesta.status, cuerpo: await respuesta.json() }
    })
    assert.deepEqual(r.primero, { admitido: true })
    assert.equal(r.vinculada, 1)
    assert.deepEqual(r.segundo, { admitido: true })
    assert.equal(r.status, 200)
    assert.deepEqual(r.cuerpo, [{ rol: 'broker_app' }])
  })
})

describe('oidc: cuenta no invitada', () => {
  it('no recibe sesión, el motivo hacia afuera es NOT_ADMITTED y el detalle queda auditado', async () => {
    const r = await descartable(async (tx) => {
      const resultado = await admitirLogin(externa('sub-nadie', 'nadie@gmail-sintetico.test'), OIDC, tx)
      return { resultado, vinculada: await credenciales(tx, 'sub-nadie'), auditados: await motivosAuditados(tx, 'acceso.ingresar') }
    })
    assert.deepEqual(r.resultado, { admitido: false, motivo: 'NOT_ADMITTED' })
    assert.equal(r.vinculada, 0)
    assert.equal(r.auditados.length, 1)
    assert.notEqual(r.auditados[0], 'NOT_ADMITTED', 'el motivo real queda en la auditoría')
  })

  it('una cookie sin credencial vinculada (por ejemplo, de antes del cambio de modo) no lee datos', async () => {
    const r = await descartable(async (tx) => {
      const respuesta = await pedir(tx, externa('sub-nadie', 'nadie@gmail-sintetico.test'))
      return { status: respuesta.status, cuerpo: await respuesta.text(), denial: respuesta.headers.get('x-vs01-denial') }
    })
    assert.deepEqual(r, { status: 403, cuerpo: '', denial: 'NOT_ADMITTED' })
  })

  it('un email sin verificar no llega a la base', async () => {
    const r = await descartable(async (tx) => ({
      resultado: await admitirLogin(externa('sub-x', 'x@gmail-sintetico.test', { emailVerified: false }), OIDC, tx),
      auditados: await motivosAuditados(tx, 'acceso.ingresar'),
    }))
    assert.deepEqual(r.resultado, { admitido: false, motivo: 'EMAIL_UNVERIFIED' })
    assert.deepEqual(r.auditados, [])
  })
})

describe('oidc: sesión vencida y revocación', () => {
  it('una sesión vencida es 401 y la consulta no corre', async () => {
    const r = await descartable(async (tx) => {
      ok(await invitar(tx, { actor: null, email: 'admin@sintetico.test', rol: 'ADMINISTRADOR' }))
      await admitirLogin(externa('sub-admin', 'admin@sintetico.test'), OIDC, tx)
      const respuesta = await pedir(tx, externa('sub-admin', 'admin@sintetico.test'), -1)
      return { status: respuesta.status, cuerpo: await respuesta.text(), denial: respuesta.headers.get('x-vs01-denial') }
    })
    assert.deepEqual(r, { status: 401, cuerpo: '', denial: 'EXPIRED' })
  })

  it('una baja corta la sesión ya abierta en el request siguiente, y el login siguiente se rechaza', async () => {
    const r = await descartable(async (tx) => {
      const admin = ok(await invitar(tx, { actor: null, email: 'admin@sintetico.test', rol: 'ADMINISTRADOR' }))
      await admitirLogin(externa('sub-admin', 'admin@sintetico.test'), OIDC, tx)
      const op = ok(await invitar(tx, { actor: admin.usuarioId, email: 'op@gmail-sintetico.test', rol: 'OPERADOR' }))
      await admitirLogin(externa('sub-op', 'op@gmail-sintetico.test'), OIDC, tx)

      const antes = (await pedir(tx, externa('sub-op', 'op@gmail-sintetico.test'))).status
      ok(await darDeBaja(tx, { actor: admin.usuarioId, usuarioId: op.usuarioId }))
      const despues = await pedir(tx, externa('sub-op', 'op@gmail-sintetico.test'))
      const login = await admitirLogin(externa('sub-op', 'op@gmail-sintetico.test'), OIDC, tx)
      return { antes, despues: despues.status, denial: despues.headers.get('x-vs01-denial'), login }
    })
    assert.equal(r.antes, 200)
    assert.equal(r.despues, 403)
    assert.equal(r.denial, 'NOT_ADMITTED')
    assert.deepEqual(r.login, { admitido: false, motivo: 'NOT_ADMITTED' })
  })
})

describe('legacy: nada cambia', () => {
  const LEGACY: LegacyAdmissionConfig = {
    workspaceDomain: 'ejemplo-sintetico.test',
    admitted: [{ email: 'operadora@ejemplo-sintetico.test', sub: null }],
  }
  /** Una conexión que falla si alguien la usa: en legacy el login no toca la base. */
  const sinBase = new Proxy({}, { get: () => { throw new Error('legacy no debe consultar la base') } }) as postgres.Sql

  it('admite por Workspace y lista, sin consultar la base', async () => {
    const claims = externa('sub-ws', 'operadora@ejemplo-sintetico.test', { hostedDomain: 'ejemplo-sintetico.test' })
    assert.deepEqual(await admitirLogin(claims, LEGACY, sinBase), { admitido: true })
  })

  it('una cuenta externa invitada en la base no entra en legacy', async () => {
    const r = await descartable(async (tx) => {
      ok(await invitar(tx, { actor: null, email: 'admin@sintetico.test', rol: 'ADMINISTRADOR' }))
      return admitirLogin(externa('sub-admin', 'admin@sintetico.test'), LEGACY, tx)
    })
    assert.deepEqual(r, { admitido: false, motivo: 'OUTSIDE_WORKSPACE' })
  })
})

// Condición previa a la fase 2 (plan de migración, «Condiciones antes de ejecutar la fase
// 2»): una negativa de la base responde igual que una cuenta no admitida, y el motivo
// específico queda sólo en `audit_event`. Se comparan las respuestas enteras —status,
// cada header y cuerpo— y no sólo el status: un header de más ya distinguiría un caso.
describe('oidc: las negativas de la base no revelan el motivo', () => {
  /** Lo que ve quien está afuera: status, todos los headers y el cuerpo. */
  const externa_ = async (respuesta: Response): Promise<{ status: number; headers: [string, string][]; cuerpo: string }> => ({
    status: respuesta.status,
    headers: [...respuesta.headers.entries()].sort(([a], [b]) => a.localeCompare(b)),
    cuerpo: await respuesta.text(),
  })

  interface Evento { outcome: string; reason_code: string | null; actor_user_id: string | null; object_id: string | null }
  /** Lo auditado con `accion` después del evento `desde`. */
  const motivosDe = async (tx: postgres.TransactionSql, accion: string, desde: string): Promise<Evento[]> => [
    ...(await tx<Evento[]>`
      select outcome, reason_code, actor_user_id, object_id from audit_event
      where action = ${accion} and id > ${desde} order by id
    `),
  ]

  /**
   * Un Administrador y, para cada caso, una persona: `baja` (credencial vinculada y dada de
   * baja), `sinrol` (credencial vinculada, activa y sin rol) y `vencida` (invitación vencida,
   * sin credencial). `nadie` no existe en la base. Devuelve el último evento auditado de la
   * siembra: la auditoría es de sólo inserción, y lo que interesa es lo que viene después.
   */
  const sembrar = async (tx: postgres.TransactionSql): Promise<string> => {
    const admin = ok(await invitar(tx, { actor: null, email: 'admin@sintetico.test', rol: 'ADMINISTRADOR' }))
    await admitirLogin(externa('sub-admin', 'admin@sintetico.test'), OIDC, tx)
    const baja = ok(await invitar(tx, { actor: admin.usuarioId, email: 'baja@gmail-sintetico.test', rol: 'OPERADOR' }))
    await admitirLogin(externa('sub-baja', 'baja@gmail-sintetico.test'), OIDC, tx)
    ok(await darDeBaja(tx, { actor: admin.usuarioId, usuarioId: baja.usuarioId }))
    const sinRol = ok(await invitar(tx, { actor: admin.usuarioId, email: 'sinrol@gmail-sintetico.test', rol: 'OPERADOR' }))
    await admitirLogin(externa('sub-sinrol', 'sinrol@gmail-sintetico.test'), OIDC, tx)
    await tx`update app_user set role = null where id = ${sinRol.usuarioId}`
    const vencida = ok(await invitar(tx, { actor: admin.usuarioId, email: 'vencida@gmail-sintetico.test', rol: 'OPERADOR' }))
    await tx`update user_invitation set expires_at = now() - interval '1 day' where user_id = ${vencida.usuarioId}`
    const [ultimo] = await tx<{ id: string }[]>`select coalesce(max(id), 0)::text as id from audit_event`
    return ultimo?.id ?? '0'
  }

  it('al volver de Google, no invitada, de baja, sin rol y sin credencial reciben el mismo NOT_ADMITTED y ninguna sesión', async () => {
    const r = await descartable(async (tx) => {
      const desde = await sembrar(tx)
      const resultados = {
        noInvitada: await admitirLogin(externa('sub-nadie', 'nadie@gmail-sintetico.test'), OIDC, tx),
        baja: await admitirLogin(externa('sub-baja', 'baja@gmail-sintetico.test'), OIDC, tx),
        sinRol: await admitirLogin(externa('sub-sinrol', 'sinrol@gmail-sintetico.test'), OIDC, tx),
        sinCredencial: await admitirLogin(externa('sub-vencida', 'vencida@gmail-sintetico.test'), OIDC, tx),
      }
      return {
        resultados,
        ingresar: await motivosDe(tx, 'acceso.ingresar', desde),
        consultar: await motivosDe(tx, 'acceso.consultar', desde),
        vinculadaVencida: await credenciales(tx, 'sub-vencida'),
      }
    })
    // El callback (`apps/web/.../callback/route.ts`) arma la redirección sólo con este
    // resultado, y emite la cookie de sesión sólo si `admitido`: un resultado idéntico es
    // la misma redirección (`/login?motivo=NOT_ADMITTED`), el mismo texto del login y
    // ninguna cookie de sesión.
    const NEGATIVA = { admitido: false, motivo: 'NOT_ADMITTED' }
    assert.deepEqual(r.resultados, { noInvitada: NEGATIVA, baja: NEGATIVA, sinRol: NEGATIVA, sinCredencial: NEGATIVA })
    assert.equal(r.vinculadaVencida, 0)
    // El motivo, sólo en la auditoría, sin actor, sin objeto y sin payload.
    assert.deepEqual(
      r.ingresar.filter((e) => e.outcome === 'denied'),
      [
        { outcome: 'denied', reason_code: 'NO_INVITADO', actor_user_id: null, object_id: null },
        { outcome: 'denied', reason_code: 'DADO_DE_BAJA', actor_user_id: null, object_id: null },
        { outcome: 'denied', reason_code: 'NO_INVITADO', actor_user_id: null, object_id: null },
      ],
    )
    // Sin rol, la credencial existe y `ingresar` la reconoce; la base no la admite y eso
    // queda como cualquier otra negativa de la base.
    assert.deepEqual(r.consultar, [{ outcome: 'denied', reason_code: 'SIN_ACCESO', actor_user_id: null, object_id: null }])
  })

  it('con la sesión ya abierta, sin credencial, de baja y sin rol reciben la misma respuesta que una cuenta no admitida', async () => {
    const r = await descartable(async (tx) => {
      const desde = await sembrar(tx)
      const respuestas = {
        noInvitada: await externa_(await pedir(tx, externa('sub-nadie', 'nadie@gmail-sintetico.test'))),
        baja: await externa_(await pedir(tx, externa('sub-baja', 'baja@gmail-sintetico.test'))),
        sinRol: await externa_(await pedir(tx, externa('sub-sinrol', 'sinrol@gmail-sintetico.test'))),
        sinCredencial: await externa_(await pedir(tx, externa('sub-vencida', 'vencida@gmail-sintetico.test'))),
      }
      return { respuestas, consultar: await motivosDe(tx, 'acceso.consultar', desde) }
    })
    const NEGATIVA = {
      status: 403,
      headers: [['cache-control', 'no-store'], ['x-vs01-denial', 'NOT_ADMITTED']],
      cuerpo: '',
    }
    assert.deepEqual(r.respuestas, { noInvitada: NEGATIVA, baja: NEGATIVA, sinRol: NEGATIVA, sinCredencial: NEGATIVA })
    const negada = (reason_code: string) => ({ outcome: 'denied', reason_code, actor_user_id: null, object_id: null })
    assert.deepEqual(r.consultar, [negada('SIN_CREDENCIAL'), negada('SIN_ACCESO'), negada('SIN_ACCESO'), negada('SIN_CREDENCIAL')])
  })
})
