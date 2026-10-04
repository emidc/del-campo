// Guard de los endpoints de la UI, escrito contra `Request`/`Response` estándar para
// probarlo sin Next.js. Cada route handler de datos o de envío pasa por acá; el test de
// estructura de `deny.test.ts` falla si alguno no lo hace (R-28).

import { authConfigFromEnv, readCookie, SESSION_COOKIE, verifySession, type AuthConfig } from './auth.ts'

export type Env = Readonly<Record<string, string | undefined>>

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

/**
 * Un POST tiene que venir de esta misma app: `Origin` igual al origen del request.
 * Complementa `SameSite=Strict`; sin `Origin`, se niega.
 */
export const sameOrigin = (request: Request): boolean => {
  const origin = request.headers.get('origin')
  return origin !== null && origin === new URL(request.url).origin
}

export type GuardOutcome = { readonly ok: true; readonly auth: AuthConfig } | { readonly ok: false; readonly response: Response }

export const guardRequest = (request: Request, env: Env = process.env, now: Date = new Date()): GuardOutcome => {
  const result = authConfigFromEnv(env)
  if (!result.ok) return { ok: false, response: NOT_CONFIGURED() }
  if (request.method !== 'GET' && request.method !== 'HEAD' && !sameOrigin(request)) {
    return { ok: false, response: FOREIGN_ORIGIN() }
  }
  const cookie = readCookie(request.headers.get('cookie'), SESSION_COOKIE)
  if (!verifySession(result.config, cookie, now)) return { ok: false, response: UNAUTHORIZED() }
  return { ok: true, auth: result.config }
}

/** Envoltorio de un route handler: nada corre sin la credencial. */
export const withSession =
  (handler: (request: Request) => Promise<Response>, env?: Env) =>
  async (request: Request): Promise<Response> => {
    const outcome = guardRequest(request, env ?? process.env)
    if (!outcome.ok) return outcome.response
    return handler(request)
  }
