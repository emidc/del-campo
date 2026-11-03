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
