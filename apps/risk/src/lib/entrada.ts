// La entrada con Google del modo `oidc` (T-0035, D-0072, D-0077), sin Next.js para probarla con
// `Request` estándar. Las rutas `api/auth/google/*` son envoltorios de una línea sobre esto.
//
// El canje del código dice **quién** es la persona; la admisión la decide la base después
// (`admitirLogin`): credencial ya vinculada o invitación vigente para ese email verificado. La
// invitación puede nombrar a una persona que ya usa Risk OS con contraseña: entonces se le
// vincula la cuenta de Google y conserva su autoría. Sólo después se emite la cookie. Cualquier
// rechazo vuelve al login con el mismo mensaje: el motivo queda en `evento_auditoria`, no en la URL.

import {
  cookieBorrada, cookieDeSesion, DURACION_HANDSHAKE_SEGUNDOS, identidadDelCallback, leerHandshake, pedirAutorizacion, sellarHandshake,
  sellarSesion, type AtributosCookie,
} from '@del-campo/identidad'
import type { Sql, TransactionSql } from '@del-campo/risk'

import { admitirLogin } from './acceso.ts'
import { COOKIE_HANDSHAKE, configEntrada, PROPOSITO, RUTA_CALLBACK, type ConfigEntrada } from './identidad.ts'
import { modoAcceso } from './modo.ts'
import { readCookie, type Env } from './sesion.ts'

export interface DepsEntrada {
  readonly pedir: typeof pedirAutorizacion
  readonly canjear: typeof identidadDelCallback
  readonly conexion: () => Sql | TransactionSql
  readonly ahora?: () => number
}

export const serializarCookie = (c: AtributosCookie): string =>
  `${c.name}=${c.value}; Path=${c.path}; Max-Age=${String(c.maxAge)}; HttpOnly; SameSite=Lax${c.secure ? '; Secure' : ''}`

const NO_STORE = { 'cache-control': 'no-store' }

const redirigir = (destino: string, cookies: readonly string[] = []): Response => {
  const headers = new Headers({ location: destino, ...NO_STORE })
  for (const cookie of cookies) headers.append('set-cookie', cookie)
  return new Response(null, { status: 303, headers })
}

const respuesta = (body: unknown, status: number): Response =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json; charset=utf-8', ...NO_STORE } })

/** En `legacy` estas rutas no existen: la entrada sigue siendo usuario y contraseña. */
const configOidc = (env: Env): ConfigEntrada | Response => {
  if (modoAcceso(env.AUTH_MODE) !== 'oidc') return respuesta({ error: 'no disponible' }, 404)
  return configEntrada(env) ?? respuesta({ error: 'la UI no está configurada' }, 503)
}

const cookieHandshake = (valor: string, config: ConfigEntrada, maxAge: number): string =>
  serializarCookie({ name: COOKIE_HANDSHAKE, value: valor, httpOnly: true, sameSite: 'lax', secure: config.sesion.segura, path: '/', maxAge })

export const inicioResponse = async (env: Env, deps: Pick<DepsEntrada, 'pedir'>): Promise<Response> => {
  const config = configOidc(env)
  if (config instanceof Response) return config
  const { url, handshake } = await deps.pedir(config.oidc)
  const sellado = await sellarHandshake(handshake, config.sesion.secreto, PROPOSITO)
  return redirigir(url, [cookieHandshake(sellado, config, DURACION_HANDSHAKE_SEGUNDOS)])
}

export const callbackResponse = async (request: Request, env: Env, deps: DepsEntrada): Promise<Response> => {
  const config = configOidc(env)
  if (config instanceof Response) return config

  const borrarHandshake = cookieHandshake('', config, 0)
  const rechazo = (): Response => redirigir(`${config.baseUrl}/login?error=1`, [borrarHandshake])

  const handshake = await leerHandshake(readCookie(request.headers.get('cookie'), COOKIE_HANDSHAKE), config.sesion.secreto, PROPOSITO)
  if (handshake === null) return rechazo()

  // La URL se reconstruye sobre la base configurada y no sobre el header Host, que un cliente
  // controla: el `redirect_uri` que se compara tiene que ser el registrado.
  const actual = new URL(`${RUTA_CALLBACK}${new URL(request.url).search}`, config.baseUrl)

  try {
    const identidad = await deps.canjear(config.oidc, actual, handshake)
    const admitido = await admitirLogin(deps.conexion(), identidad, (deps.ahora ?? Date.now)())
    if (!admitido) return rechazo()
    const sesion = serializarCookie(cookieDeSesion(await sellarSesion(identidad, config.sesion), config.sesion))
    return redirigir(`${config.baseUrl}/`, [borrarHandshake, sesion])
  } catch {
    // Un canje fallido —código reusado, `state` que no coincide, red caída— no distingue su
    // causa hacia afuera.
    return rechazo()
  }
}

/** La cookie de la sesión de Google, borrada, si el modo `oidc` está configurado. */
export const cookiesDeSalida = (env: Env): string[] => {
  const config = configEntrada(env)
  return config === null ? [] : [serializarCookie(cookieBorrada(config.sesion))]
}
