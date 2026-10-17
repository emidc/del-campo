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

// ── Base hosteada (T-0032, D-0068) ──────────────────────────────────────────
// Las líneas de comandos del contexto operan sobre la base hosteada sólo si se les pide con
// `--hosteada`, y entonces leen la URL de otra variable, `RISK_HOSTED_DATABASE_URL`: un
// `RISK_DATABASE_URL` que quedó exportado en la terminal nunca las lleva a la base con datos
// reales, y los tests (que leen sólo `RISK_DATABASE_URL`) no la ven. Las corre el owner desde su
// equipo (R-13, R-16); ningún agente tiene esa URL. Ningún mensaje la repite, ni su host.

export const HOSTED_URL_ENV = 'RISK_HOSTED_DATABASE_URL'
export const HOSTED_FLAG = '--hosteada'

/** Motivo por el que una URL no sirve como base hosteada, o `null` si sirve. Nunca la repite. */
export const notHostedDatabase = (raw: string): string | null => {
  let url: URL
  try {
    url = new URL(raw)
  } catch {
    return `${HOSTED_URL_ENV} no es una URL válida`
  }
  if (url.protocol !== 'postgres:' && url.protocol !== 'postgresql:') return `${HOSTED_URL_ENV} no es una URL de Postgres`
  if (LOCAL_HOSTS.has(url.hostname)) return `${HOSTED_URL_ENV} apunta a este equipo; para las bases locales, sin ${HOSTED_FLAG}`
  for (const key of ['host', 'hostaddr']) {
    if (url.searchParams.get(key) !== null) return `${HOSTED_URL_ENV} redirige el host con el parámetro "${key}"`
  }
  if (url.username === '') return `${HOSTED_URL_ENV} no tiene usuario`
  return null
}

/** Conexión a la base hosteada: TLS obligatorio y una sola conexión, para una línea de comandos. */
export const connectHosted = (databaseUrl: string): Sql =>
  postgres(databaseUrl, { max: 1, prepare: false, ssl: 'require', connect_timeout: 15, onnotice: () => undefined })

/** Dónde opera una línea de comandos. */
export type Destino =
  | { readonly hosteada: false; readonly url: string; readonly nombre: string }
  | { readonly hosteada: true; readonly url: string; readonly nombre: 'la base hosteada' }

/**
 * El destino de una línea de comandos y sus argumentos sin `--hosteada`. Sin la opción, la base
 * local de `RISK_DATABASE_URL` (o `porDefecto`), con las reglas de `notLocalDatabase`; con ella,
 * la de `RISK_HOSTED_DATABASE_URL`, con las de `notHostedDatabase`.
 */
export const destinoDe = (
  args: readonly string[], env: Readonly<Record<string, string | undefined>>, porDefecto: string,
): { readonly destino: Destino; readonly args: string[] } | { readonly error: string } => {
  const resto = args.filter((a) => a !== HOSTED_FLAG)
  if (resto.length === args.length) {
    const url = env.RISK_DATABASE_URL ?? porDefecto
    const refusal = notLocalDatabase(url)
    if (refusal !== null) return { error: `${refusal}. Sin ${HOSTED_FLAG}, sólo se opera sobre las bases locales del contexto.` }
    return { destino: { hosteada: false, url, nombre: new URL(url).pathname.slice(1) }, args: resto }
  }
  if (args.length - resto.length > 1) return { error: `${HOSTED_FLAG} va una sola vez` }
  const url = env[HOSTED_URL_ENV] ?? ''
  if (url === '') return { error: `con ${HOSTED_FLAG} hace falta ${HOSTED_URL_ENV}` }
  const refusal = notHostedDatabase(url)
  if (refusal !== null) return { error: refusal }
  return { destino: { hosteada: true, url, nombre: 'la base hosteada' }, args: resto }
}

export const conectar = (d: Destino): Sql => (d.hosteada ? connectHosted(d.url) : connect(d.url))

/**
 * El mensaje de un error de la base para una línea de comandos que opera sobre la hosteada: sólo
 * el código, porque el texto del driver puede traer el host, el usuario o el valor de una celda.
 */
export const errorSinDatos = (e: unknown): string => {
  const code = typeof e === 'object' && e !== null && 'code' in e ? String(e.code) : null
  return `falló la operación contra la base${code === null ? '' : ` (código ${code})`}; no se muestra el detalle porque puede traer datos`
}
