// Conexión a la base del contexto. Risk OS es dueño del esquema `risk` y no lee ni escribe
// ningún otro (D-0063). Copia de `contexts/communication/src/persistence/database.ts`: D-0063
// no crea un núcleo compartido en Q4 (T-0028, ## Risks).

import postgres from 'postgres'

export type Sql = postgres.Sql
export type TransactionSql = postgres.TransactionSql

export const SCHEMA = 'risk'

/**
 * `prepare: false` porque en Vercel la conexión pasa por el Transaction pooler de
 * Supabase, que no admite sentencias preparadas con nombre; Risk OS se despliega igual
 * (D-0068). Contra una conexión directa o de sesión no cambia nada.
 */
export const connect = (databaseUrl: string): Sql =>
  postgres(databaseUrl, { max: 5, prepare: false, onnotice: () => undefined })

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '::1', '[::1]'])

/** Las únicas bases que el runner y los tests pueden tocar (T-0028, ## Data effects). */
const LOCAL_DATABASES = /^delcampo_risk_(dev|test)$/

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
    return `la base "${name}" no es delcampo_risk_dev ni delcampo_risk_test`
  }
  return null
}
