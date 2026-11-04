// Conexión a la base, leída del entorno en el primer uso y no en el build (R-16, R-18: ningún
// valor está en el repositorio).

import { connect, type Sql } from '@del-campo/risk'

import type { Deps } from './guard.ts'
import { modoAcceso } from './modo.ts'
import type { Env } from './sesion.ts'

let sql: Sql | null = null

/**
 * La variable con la conexión de cada modo (T-0035, 0009). `legacy` usa la de `risk_app`, que
 * ve todo por `legado_risk_app`; `oidc`, la de `risk_oidc`, que no lee ninguna tabla. Son dos
 * variables para que el modo `oidc` nunca abra la conexión amplia y para que la vuelta atrás
 * siga siendo sólo `AUTH_MODE=legacy`.
 */
export const variableDeConexion = (env: Env): 'RISK_DATABASE_URL' | 'RISK_OIDC_DATABASE_URL' =>
  modoAcceso(env.AUTH_MODE ?? '') === 'oidc' ? 'RISK_OIDC_DATABASE_URL' : 'RISK_DATABASE_URL'

/** Una sola conexión por proceso, la del modo. Sin su variable, falla. */
export const database = (env: Env = process.env): Sql => {
  if (sql !== null) return sql
  const variable = variableDeConexion(env)
  const url = env[variable] ?? ''
  if (url === '') throw new Error(`falta ${variable}`)
  sql = connect(url)
  return sql
}

/** Lo que usan los route handlers en producción: el entorno del proceso y su conexión. */
export const deps = (): Deps => ({ env: process.env, db: () => database() })
