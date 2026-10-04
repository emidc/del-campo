// Conexión a la base del contexto. Communication OS es dueño del esquema
// `communication` y no lee ni escribe ningún otro (D-0063).

import postgres from 'postgres'

export type Sql = postgres.Sql
export type TransactionSql = postgres.TransactionSql

export const SCHEMA = 'communication'

export const connect = (databaseUrl: string): Sql =>
  postgres(databaseUrl, { max: 5, onnotice: () => undefined })

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '::1', '[::1]'])

/** Las únicas bases que el runner y los tests de esta tarea pueden tocar (## Data effects). */
const LOCAL_DATABASES = /^delcampo_communication_(dev|test)$/

/**
 * Motivo por el que una URL no es una base local del contexto, o `null` si lo es. Se
 * decide por lo que dice la URL, antes de conectarse: un destino equivocado no se
 * descubre preguntándole al servidor equivocado.
 */
export const notLocalDatabase = (raw: string): string | null => {
  let url: URL
  try {
    url = new URL(raw)
  } catch {
    return 'la URL de la base no es válida'
  }
  if (!LOCAL_HOSTS.has(url.hostname)) return `el host "${url.hostname}" no es local`
  for (const key of ['host', 'hostaddr']) {
    const v = url.searchParams.get(key)
    if (v !== null && !LOCAL_HOSTS.has(v)) return `el parámetro "${key}" redirige a un host que no es local`
  }
  const name = url.pathname.replace(/^\//, '')
  if (!LOCAL_DATABASES.test(name)) {
    return `la base "${name}" no es delcampo_communication_dev ni delcampo_communication_test`
  }
  return null
}
