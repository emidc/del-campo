// La lógica de los route handlers, sin Next.js, para probarla con `Request` estándar y con la
// conexión que se quiera (los tests le pasan una transacción que se revierte). Cada `route.ts`
// es un envoltorio de una línea sobre esto, siempre detrás de `withSesion` salvo el login y el
// logout.
//
// Cada endpoint de datos entrega la vista de una sola organización (RO01 §3, regla 4), con la
// versión de las funciones que calcularon lo calculado (regla 7). `C_raw` sólo sale en el del
// detalle, junto al vector y las banderas (regla 1, H6).

import {
  iniciarSesion, organizaciones, VERSION_METODOLOGIA, vistaActividad, vistaDetalle, vistaEscenarios, vistaLista, vistaPlan,
  vistaTransferencia, type Sesion,
} from '@del-campo/risk'

import { FOREIGN_ORIGIN, json, NOT_CONFIGURED, NOT_FOUND, sameOrigin, type Db } from './guard.ts'
import { configFromEnv, issueSession, SESSION_COOKIE, sessionCookieHeader, type Env } from './sesion.ts'

/** Un id de organización o de unidad es opaco (D-0067): texto corto, sin controles. */
export const textoOpaco = (v: string): string | null =>
  v.length > 0 && v.length <= 200 && !/[\p{Cc}]/u.test(v) && v.trim() === v ? v : null

/** Un segmento de ruta con un id de organización. */
export const parseOrganizacion = (raw: string): string | null => {
  try {
    return textoOpaco(decodeURIComponent(raw))
  } catch {
    return null
  }
}

export const parseRiesgo = (raw: string): string | null => (/^RSK-[0-9A-HJKMNP-TV-Z]{26}$/.test(raw) ? raw : null)

/** El filtro `?unidad=`: `null` sin filtro, `undefined` si no es válido. */
export const parseUnidad = (u: string | null | undefined): string | null | undefined =>
  u === null || u === undefined || u === '' ? null : (textoOpaco(u) ?? undefined)

const ok = (vista: unknown): Response => (vista === null ? NOT_FOUND() : json(vista))

export type VistaDeOrganizacion = 'lista' | 'escenarios' | 'plan' | 'transferencia' | 'actividad'
export const VISTAS_DE_ORGANIZACION: readonly VistaDeOrganizacion[] = ['lista', 'escenarios', 'plan', 'transferencia', 'actividad']

export const organizacionesResponse = async (sesion: Sesion, db: Db): Promise<Response> => json({ organizaciones: await organizaciones(db, sesion) })

export const vistaDeOrganizacionResponse = async (
  request: Request, sesion: Sesion, db: Db, vista: VistaDeOrganizacion, rawOrg: string,
): Promise<Response> => {
  const org = parseOrganizacion(rawOrg)
  if (org === null) return NOT_FOUND()
  switch (vista) {
    case 'lista': {
      const unidad = parseUnidad(new URL(request.url).searchParams.get('unidad'))
      if (unidad === undefined) return NOT_FOUND()
      return ok(await vistaLista(db, sesion, VERSION_METODOLOGIA, org, unidad))
    }
    case 'escenarios':
      return ok(await vistaEscenarios(db, sesion, VERSION_METODOLOGIA, org))
    case 'plan':
      return ok(await vistaPlan(db, sesion, org))
    case 'transferencia':
      return ok(await vistaTransferencia(db, sesion, VERSION_METODOLOGIA, org))
    case 'actividad':
      return ok(await vistaActividad(db, sesion, org))
  }
}

export const detalleResponse = async (sesion: Sesion, db: Db, rawId: string): Promise<Response> => {
  const id = parseRiesgo(rawId)
  if (id === null) return NOT_FOUND()
  return ok(await vistaDetalle(db, sesion, VERSION_METODOLOGIA, id))
}

const redirectTo = (request: Request, path: string, cookie?: string): Response =>
  new Response(null, {
    status: 303,
    headers: {
      location: new URL(path, request.url).toString(),
      'cache-control': 'no-store',
      ...(cookie === undefined ? {} : { 'set-cookie': cookie }),
    },
  })

/** Formulario de login. Sin configuración, 503: no hay modo abierto. */
export const loginResponse = async (request: Request, env: Env, db: () => Db): Promise<Response> => {
  const result = configFromEnv(env)
  if (!result.ok) return NOT_CONFIGURED()
  if (!sameOrigin(request)) return FOREIGN_ORIGIN()
  let usuario = ''
  let contrasena = ''
  try {
    const form = await request.formData()
    const u = form.get('usuario')
    const p = form.get('contrasena')
    usuario = typeof u === 'string' ? u : ''
    contrasena = typeof p === 'string' ? p : ''
  } catch {
    return redirectTo(request, '/login?error=1')
  }
  if (usuario.length > 64 || contrasena.length > 1024) return redirectTo(request, '/login?error=1')
  const sesion = await iniciarSesion(db(), usuario, contrasena)
  if (sesion === null) return redirectTo(request, '/login?error=1')
  const cookie = issueSession(result.config.sessionSecret, { personaId: sesion.personaId, credencialId: sesion.credencialId })
  return redirectTo(request, '/', sessionCookieHeader(cookie, request.url))
}

export const logoutResponse = (request: Request): Response => {
  if (!sameOrigin(request)) return FOREIGN_ORIGIN()
  return redirectTo(request, '/login', `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0`)
}
