// Conexión a la base, leída del entorno en el primer uso y no en el build (R-16, R-18: ningún
// valor está en el repositorio).

import { connect, type Sql } from '@del-campo/risk'

import type { Deps } from './guard.ts'
import type { Env } from './sesion.ts'

let sql: Sql | null = null

/** Una sola conexión por proceso. Sin `RISK_DATABASE_URL`, falla. */
export const database = (env: Env = process.env): Sql => {
  if (sql !== null) return sql
  const url = env.RISK_DATABASE_URL ?? ''
  if (url === '') throw new Error('falta RISK_DATABASE_URL')
  sql = connect(url)
  return sql
}

/** Lo que usan los route handlers en producción: el entorno del proceso y su conexión. */
export const deps = (): Deps => ({ env: process.env, db: () => database() })
