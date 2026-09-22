// Conexión a Postgres para el importador. Mismo patrón de lectura de `.env` que
// `cli.ts` (T-0010) y `policy-query.integration.test.ts` (T-0016): sin duplicar la
// función, porque cada uno vive en un contexto de import distinto (CLI vs. test) y R-01
// no justifica todavía una tercera dependencia compartida para tres líneas.

import { existsSync, readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'

import postgres from 'postgres'

const RAIZ = resolve(import.meta.dirname, '..', '..', '..', '..')

const leerEnv = (): Record<string, string> => {
  const archivo = join(RAIZ, '.env')
  if (!existsSync(archivo)) return {}
  const pares: Record<string, string> = {}
  for (const linea of readFileSync(archivo, 'utf8').split('\n')) {
    const limpia = linea.trim()
    if (limpia === '' || limpia.startsWith('#')) continue
    const corte = limpia.indexOf('=')
    if (corte === -1) continue
    pares[limpia.slice(0, corte).trim()] = limpia.slice(corte + 1).trim()
  }
  return pares
}

/**
 * `delcampo_t0013_dev` es la única base con la que este importador puede operar: es la
 * condición que D-0053 fija (la base propia de esta tarea) y la que el owner preparó.
 * Rechazar cualquier otro nombre acá, antes de escribir nada, es más seguro que confiar
 * en que quien invoca el CLI configuró bien su `.env`.
 */
export const conectar = (): postgres.Sql => {
  const url = process.env.DATABASE_URL ?? leerEnv().DATABASE_URL
  if (url === undefined || url === '') {
    throw new Error('falta DATABASE_URL. Ver docs/desarrollo/postgres-local.md')
  }
  const nombre = new URL(url).pathname.replace(/^\//, '')
  if (nombre !== 'delcampo_t0013_dev') {
    throw new Error(
      `T-0013 sólo opera contra delcampo_t0013_dev (D-0053). DATABASE_URL apunta a "${nombre}".`,
    )
  }
  return postgres(url, { max: 5 })
}

export const RAIZ_DEL_REPO = RAIZ

/** Lo que de verdad usan los módulos de import: corre queries, dentro o fuera de una transacción. */
export type Ejecutor = postgres.Sql | postgres.TransactionSql
