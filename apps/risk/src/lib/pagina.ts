// La sesión de una página, sin Next.js para probarla (`page-guard.ts` le pone las cookies y el
// redirect). Las páginas de Risk OS leen los datos en el servidor, así que todo lo que muestran
// pasa por `datos`:
//
// - `legacy`: la conexión de la app y la sesión de usuario y contraseña, como antes;
// - `oidc`: cada lectura corre en la transacción restringida de la persona (`correrComo`). Una
//   negativa de la base manda al login, igual que una cookie inválida; un rol sin permiso
//   devuelve el `SinPermiso`, y la página muestra su explicación en lugar de los datos.

import { sesionVigente, SinPermiso, type RolInterno, type Sesion, type Sql, type TransactionSql } from '@del-campo/risk'

import { correrComo } from './acceso.ts'
import { identidadDeSesion } from './guard.ts'
import { COOKIE_IDENTIDAD, configEntrada } from './identidad.ts'
import { modoAcceso } from './modo.ts'
import { configFromEnv, SESSION_COOKIE, verifySession, type Env } from './sesion.ts'

type Db = Sql | TransactionSql

export type Lectura<T> = (db: Db, sesion: Sesion) => Promise<T>

export interface SesionDePagina {
  readonly nombre: string
  /** Sólo en `oidc`; sin rol, la UI muestra todo como antes. */
  readonly rol: RolInterno | undefined
  readonly datos: <T>(lectura: Lectura<T>) => Promise<T | SinPermiso>
}

export interface DepsPagina {
  readonly env: Env
  readonly cookie: (nombre: string) => string | undefined
  readonly db: () => Db
  /** Lo que pasa si la persona deja de tener acceso a mitad de la página: en Next, `redirect('/login')`. */
  readonly alLogin: () => never
}

/** La sesión de la página, o `null` (al login). */
export const sesionDePagina = async (deps: DepsPagina): Promise<SesionDePagina | null> => {
  if (modoAcceso(deps.env.AUTH_MODE) === 'legacy') {
    const result = configFromEnv(deps.env)
    if (!result.ok) return null
    const token = verifySession(result.config.sessionSecret, deps.cookie(SESSION_COOKIE))
    if (token === null) return null
    const db = deps.db()
    const sesion = await sesionVigente(db, token.personaId, token.credencialId)
    if (sesion === null) return null
    return {
      nombre: sesion.nombre,
      rol: undefined,
      datos: async (lectura) => {
        try {
          return await lectura(db, sesion)
        } catch (e) {
          // Sin rol no hay `SinPermiso`; queda por simetría con `oidc`.
          if (e instanceof SinPermiso) return e
          throw e
        }
      },
    }
  }

  const config = configEntrada(deps.env)
  if (config === null) return null
  const identidad = await identidadDeSesion(deps.cookie(COOKIE_IDENTIDAD), config)
  if (identidad === null) return null
  const quien = await correrComo(deps.db(), identidad, (_tx, sesion) => Promise.resolve(sesion))
  if (!quien.ok) return null
  return {
    nombre: quien.valor.nombre,
    rol: quien.valor.rol,
    datos: async (lectura) => {
      const r = await correrComo(deps.db(), identidad, lectura)
      if (r.ok) return r.valor
      if ('denegado' in r) return deps.alLogin()
      return r.sinPermiso
    },
  }
}
