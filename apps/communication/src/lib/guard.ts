// Guard de los endpoints de la UI, escrito contra `Request`/`Response` estándar para
// probarlo sin Next.js. Cada route handler de datos o de envío pasa por acá; el test de
// estructura de `deny.test.ts` falla si alguno no lo hace (R-28).

import { EXPLICACION, type AccionCommunication } from '@del-campo/communication'
import { evaluarSesion, leerSesion, type Identidad } from '@del-campo/identidad'

import { AccesoDenegado, datosOidc, SinPermiso, type Datos } from './acceso.ts'
import { readCookie } from './auth.ts'
import { COOKIE_IDENTIDAD, configEntrada, type ConfigEntrada } from './identidad.ts'
import { modoAcceso } from './modo.ts'
import { database } from './server.ts'

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

/**
 * La sesión de Google: la identidad de la cookie, o `null`. Una cookie
 * vencida, adulterada o de otra app es lo mismo que no tenerla.
 */
export const identidadDeSesion = async (request: Request, config: ConfigEntrada): Promise<Identidad | null> => {
  const estado = await leerSesion(readCookie(request.headers.get('cookie'), COOKIE_IDENTIDAD), config.sesion)
  const sesion = evaluarSesion(estado)
  return sesion.ok ? sesion.identidad : null
}

export const FORBIDDEN = (accion: AccionCommunication): Response => json({ error: EXPLICACION[accion] }, 403)

/**
 * Envoltorio de un route handler: nada corre sin la credencial. El handler recibe `datos`,
 * por donde pasa toda consulta y todo envío (ver `acceso.ts`): la sesión de Google y, en
 * cada consulta, la admisión en la base. Una negativa de la base responde igual que una
 * cookie inválida; un rol sin permiso, 403 explicado.
 *
 * `modoAcceso` se sigue llamando para que un `AUTH_MODE=legacy` olvidado en Vercel falle
 * en vez de pasar en silencio (fase 5 de T-0035).
 */
export const withSession =
  (handler: (request: Request, datos: Datos) => Promise<Response>, env?: Env) =>
  async (request: Request): Promise<Response> => {
    const entorno = env ?? process.env
    modoAcceso(entorno.AUTH_MODE)
    const config = configEntrada(entorno)
    if (config === null) return NOT_CONFIGURED()
    if (request.method !== 'GET' && request.method !== 'HEAD' && !sameOrigin(request)) return FOREIGN_ORIGIN()
    const identidad = await identidadDeSesion(request, config)
    if (identidad === null) return UNAUTHORIZED()
    try {
      return await handler(request, datosOidc(() => database(entorno), identidad))
    } catch (error) {
      if (error instanceof AccesoDenegado) return UNAUTHORIZED()
      if (error instanceof SinPermiso) return FORBIDDEN(error.accion)
      throw error
    }
  }
