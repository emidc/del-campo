// Guarda de las pruebas de integración: sólo corren contra un Postgres local de
// desarrollo o de prueba. Se carga con `node --import` antes de cualquier test.
//
// Motivo: un DATABASE_URL de Supabase exportado en la terminal tiene prioridad sobre el
// `.env` local, y las pruebas de integración aplican y revierten migraciones. Contra una
// base hosteada con datos reales eso sería una escritura no autorizada (R-13, R-19).
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const HOSTS_LOCALES = new Set(['localhost', '127.0.0.1', '::1', '[::1]'])

export function motivoDeRechazo(crudo) {
  if (!crudo) return null
  let url
  try { url = new URL(crudo) } catch { return 'DATABASE_URL no es una URL válida' }
  const nombre = url.pathname.replace(/^\//, '')
  if (!HOSTS_LOCALES.has(url.hostname)) return `el host "${url.hostname}" no es local`
  // `host` y `hostaddr` en el query string redirigen la conexión a otro servidor sin
  // cambiar el hostname de la URL: `postgres@3.4.9` los ignora, pero el camino `psql` de
  // docs/despliegue/vercel-vs01.md §10.3 no. Se rechazan antes de que eso importe.
  for (const clave of ['host', 'hostaddr']) {
    const v = url.searchParams.get(clave)
    if (v !== null && !HOSTS_LOCALES.has(v)) return `el parámetro "${clave}=${v}" redirige a un host que no es local`
  }
  if (!/_dev$|_test$/.test(nombre)) return `la base "${nombre}" no termina en _dev ni _test`
  if (nombre.includes('t0013')) return `la base "${nombre}" es la de T-0013, con datos reales (D-0053)`
  return null
}

// Lee el `.env` con la MISMA semántica que los consumidores (`import/db.ts`, `cli.ts` y
// los tests de integración): la última asignación gana. Leer la primera dejaba pasar un
// `.env` con dos renglones — local primero, remoto después — que la guarda aprobaba y los
// tests usaban para conectarse al remoto. Además, si el archivo declara más de un valor
// distinto, se rechaza: la ambigüedad misma es el modo de falla.
export function valorDeEnv(texto) {
  const valores = []
  for (const linea of texto.split('\n')) {
    const limpia = linea.trim()
    if (limpia === '' || limpia.startsWith('#')) continue
    const corte = limpia.indexOf('=')
    if (corte === -1) continue
    if (limpia.slice(0, corte).trim() !== 'DATABASE_URL') continue
    valores.push(limpia.slice(corte + 1).trim())
  }
  const distintos = new Set(valores)
  if (distintos.size > 1) return { ambiguo: distintos.size }
  return { valor: valores.at(-1) }
}

const leerEnv = () => {
  const archivo = join(fileURLToPath(new URL('..', import.meta.url)), '.env')
  if (!existsSync(archivo)) return {}
  return valorDeEnv(readFileSync(archivo, 'utf8'))
}

// Los tests de cada contexto (D-0063) usan su propia base. La toman de su variable
// (COMMUNICATION_DATABASE_URL, RISK_DATABASE_URL) o, si falta, de DATABASE_URL con otro
// nombre de base (contexts/*/src/persistence/testing.ts). Todas pasan por la misma guarda.
const VARIABLES_DE_CONTEXTOS = ['COMMUNICATION_DATABASE_URL', 'RISK_DATABASE_URL']
const VARIABLES_HOSTEADAS = ['RISK_HOSTED_DATABASE_URL']

export function motivoDelEntorno(env, envDelArchivo) {
  const delEnv = env.DATABASE_URL === undefined ? envDelArchivo() : { valor: env.DATABASE_URL }
  if (delEnv.ambiguo) {
    return `el .env declara ${delEnv.ambiguo} valores distintos de DATABASE_URL y no se puede saber cuál usarían los tests`
  }
  const motivo = motivoDeRechazo(delEnv.valor)
  if (motivo) return motivo
  for (const variable of VARIABLES_DE_CONTEXTOS) {
    const delContexto = motivoDeRechazo(env[variable])
    if (delContexto) return `${variable}: ${delContexto}`
  }
  // La base hosteada de Risk OS (T-0032) tiene su propia variable, que ningún test lee. Si está
  // exportada en esta terminal, alguien está por operar sobre los datos reales: no es momento de
  // correr pruebas que migran y escriben.
  for (const variable of VARIABLES_HOSTEADAS) {
    if (env[variable] !== undefined && env[variable] !== '') return `${variable} está definida en el entorno`
  }
  return null
}

const motivo = motivoDelEntorno(process.env, leerEnv)
if (motivo) {
  console.error(`✗ Pruebas abortadas: ${motivo}. Las pruebas de integración sólo corren contra ` +
    'un Postgres local terminado en _dev o _test. Si exportaste la cadena de Supabase, ' +
    'ejecutá `unset DATABASE_URL` (o `unset RISK_HOSTED_DATABASE_URL`).')
  process.exit(1)
}
