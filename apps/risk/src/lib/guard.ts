// Guard de los endpoints, escrito contra `Request`/`Response` estándar para probarlo sin
// Next.js. Cada route handler de datos pasa por `withSesion`; el test de estructura de
// `deny.test.ts` falla si alguno no lo hace (R-28).
//
// Orden: configuración, origen (en un POST), firma y vencimiento de la cookie, y recién
// entonces la base, para comprobar que la credencial siga vigente. Una cookie inválida se
// niega sin tocar la base.

import { sesionVigente, type Sesion, type Sql, type TransactionSql } from '@del-campo/risk'

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

export interface Deps {
  readonly env: Env
  /** La conexión; se pide sólo después de validar la cookie. */
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

/** Envoltorio de un route handler: nada corre sin la sesión de una persona. */
export const withSesion =
  <C>(handler: (request: Request, sesion: Sesion, db: Db, context: C) => Promise<Response>, deps: () => Deps) =>
  async (request: Request, context: C): Promise<Response> => {
    const outcome = await guardRequest(request, deps())
    if (!outcome.ok) return outcome.response
    return handler(request, outcome.sesion, outcome.db, context)
  }
