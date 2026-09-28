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
  if (!/_dev$|_test$/.test(nombre)) return `la base "${nombre}" no termina en _dev ni _test`
  if (nombre.includes('t0013')) return `la base "${nombre}" es la de T-0013, con datos reales (D-0053)`
  return null
}

const leerEnv = () => {
  const archivo = join(fileURLToPath(new URL('..', import.meta.url)), '.env')
  if (!existsSync(archivo)) return undefined
  for (const linea of readFileSync(archivo, 'utf8').split('\n')) {
    const limpia = linea.trim()
    if (limpia.startsWith('DATABASE_URL=')) return limpia.slice('DATABASE_URL='.length).trim()
  }
  return undefined
}

const motivo = motivoDeRechazo(process.env.DATABASE_URL ?? leerEnv())
if (motivo) {
  console.error(`✗ Pruebas abortadas: ${motivo}. Las pruebas de integración sólo corren contra ` +
    'un Postgres local terminado en _dev o _test. Si exportaste la cadena de Supabase, ' +
    'ejecutá `unset DATABASE_URL`.')
  process.exit(1)
}
