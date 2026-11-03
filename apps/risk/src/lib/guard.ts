// Guard de los endpoints, escrito contra `Request`/`Response` estándar para probarlo sin
// Next.js. Cada route handler de datos pasa por `withSesion`; el test de estructura de
// `deny.test.ts` falla si alguno no lo hace (R-28).
//
// Orden: configuración, origen (en un POST), firma y vencimiento de la cookie, y recién
// entonces la base, para comprobar que la credencial siga vigente. Una cookie inválida se
// niega sin tocar la base.
//
// Con AUTH_MODE=oidc (T-0035) la cookie es la de Google y el handler corre entero dentro de la
// transacción restringida de la persona (ver `acceso.ts`).

import { evaluarSesion, leerSesion, type Identidad } from '@del-campo/identidad'
import { sesionVigente, type Sesion, type Sql, type TransactionSql } from '@del-campo/risk'

import { correrComo } from './acceso.ts'
import { COOKIE_IDENTIDAD, configEntrada, type ConfigEntrada } from './identidad.ts'
import { modoAcceso } from './modo.ts'
import { configFromEnv, readCookie, SESSION_COOKIE, verifySession, type Env } from './sesion.ts'

export type Db = Sql | TransactionSql

const NO_STORE = { 'cache-control': 'no-store' }

/** Respuesta JSON sin caché. Las negativas llevan un cuerpo fijo, sin datos. */
export const json = (body: unknown, status = 200, headers: Record<string, string> = {}): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', ...NO_STORE, ...headers },
  })

export const NOT_CONFIGURED = (): Response => json({ error: 'la UI no está configurada' }, 503)
export const UNAUTHORIZED = (): Response => json({ error: 'sin credencial válida' }, 401)
export const FOREIGN_ORIGIN = (): Response => json({ error: 'origen no permitido' }, 403)
export const NOT_FOUND = (): Response => json({ error: 'no existe' }, 404)

/** Un POST tiene que venir de esta misma app: `Origin` igual al origen del request. */
export const sameOrigin = (request: Request): boolean => {
  const origin = request.headers.get('origin')
  return origin !== null && origin === new URL(request.url).origin
}

/** Un rol que no puede: 403 con la explicación, que sólo dice quién sí puede. */
export const FORBIDDEN = (motivo: string): Response => json({ error: motivo }, 403)

export interface Deps {
  readonly env: Env
  /** La conexión; se pide sólo después de validar la cookie. En `oidc` es la de la app. */
  readonly db: () => Db
}

export type GuardOutcome =
  | { readonly ok: true; readonly sesion: Sesion; readonly db: Db }
  | { readonly ok: false; readonly response: Response }

export const guardRequest = async (request: Request, deps: Deps, now: Date = new Date()): Promise<GuardOutcome> => {
  const result = configFromEnv(deps.env)
  if (!result.ok) return { ok: false, response: NOT_CONFIGURED() }
  if (request.method !== 'GET' && request.method !== 'HEAD' && !sameOrigin(request)) {
    return { ok: false, response: FOREIGN_ORIGIN() }
  }
  const token = verifySession(result.config.sessionSecret, readCookie(request.headers.get('cookie'), SESSION_COOKIE), now)
  if (token === null) return { ok: false, response: UNAUTHORIZED() }
  const db = deps.db()
  const sesion = await sesionVigente(db, token.personaId, token.credencialId)
  if (sesion === null) return { ok: false, response: UNAUTHORIZED() }
  return { ok: true, sesion, db }
}

/**
 * La sesión de Google del modo `oidc`: la identidad de la cookie, o `null`. Una cookie vencida,
 * adulterada o de otra app es lo mismo que no tenerla.
 */
export const identidadDeSesion = async (cookie: string | undefined, config: ConfigEntrada): Promise<Identidad | null> => {
  const sesion = evaluarSesion(await leerSesion(cookie, config.sesion))
  return sesion.ok ? sesion.identidad : null
}

/**
 * Envoltorio de un route handler: nada corre sin la sesión de una persona.
 *
 * - `legacy`: usuario y contraseña (D-0069), exactamente como antes.
 * - `oidc`: la sesión de Google y, en cada request, la admisión en la base. El handler recibe
 *   la transacción restringida y la sesión con el rol de este request. Una negativa de la base
 *   responde igual que una cookie inválida; un rol sin permiso, 403 explicado.
 */
export const withSesion =
  <C>(handler: (request: Request, sesion: Sesion, db: Db, context: C) => Promise<Response>, deps: () => Deps) =>
  async (request: Request, context: C): Promise<Response> => {
    const d = deps()
    if (modoAcceso(d.env.AUTH_MODE) === 'legacy') {
      const outcome = await guardRequest(request, d)
      if (!outcome.ok) return outcome.response
      return handler(request, outcome.sesion, outcome.db, context)
    }

    const config = configEntrada(d.env)
    if (config === null) return NOT_CONFIGURED()
    if (request.method !== 'GET' && request.method !== 'HEAD' && !sameOrigin(request)) return FOREIGN_ORIGIN()
    const identidad = await identidadDeSesion(readCookie(request.headers.get('cookie'), COOKIE_IDENTIDAD), config)
    if (identidad === null) return UNAUTHORIZED()
    const r = await correrComo(d.db(), identidad, (tx, sesion) => handler(request, sesion, tx, context))
    if (r.ok) return r.valor
    return 'denegado' in r ? UNAUTHORIZED() : FORBIDDEN(r.sinPermiso.message)
  }
