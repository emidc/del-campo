// Medición de la aceptación de RO01 (T-0032): A6, A7, A8, A9 y A12 sobre la base de Risk OS,
// con el manifiesto que el owner arma en su equipo.
//
//   pnpm --filter @del-campo/risk run aceptacion <manifiesto.json> [--hosteada]
//
// El manifiesto dice qué organización es cada empresa (H1 a H5), qué intentos de importación
// hubo (copiados de los informes sin valores) y qué persona es el revisor (R1). Es privado: tiene
// ids de la base, y no se sube al repo. La salida tiene sólo códigos, conteos, fechas, `regla_id`,
// prefijos de huella e ids opacos de riesgo y de revisión (R-19): es la que puede salir del
// equipo del owner. Sale con 0 si las cinco medidas se cumplen, con 1 si alguna no y con 2 si el
// manifiesto, la base o la conexión fallan.
//
// Sin `--hosteada`, lee RISK_DATABASE_URL o delcampo_risk_dev, como los demás scripts (sólo
// delcampo_risk_dev y delcampo_risk_test en localhost). Con `--hosteada`, lee la base de
// RISK_HOSTED_DATABASE_URL en una transacción de sólo lectura: no registra accesos ni escribe
// nada. No carga archivos .env.

import { readFileSync } from 'node:fs'
import { conectar, destinoDe, errorSinDatos, HOSTED_FLAG, type Destino } from '../persistence/database.ts'
import { leerParaAceptacion } from './lectura.ts'
import { leerManifiesto, type Manifiesto, ManifiestoInvalido } from './manifiesto.ts'
import { informeAceptacion, medir } from './medicion.ts'

const DEFAULT_URL = 'postgres://localhost:5432/delcampo_risk_dev'
const USO = `uso: pnpm --filter @del-campo/risk run aceptacion <manifiesto.json> [${HOSTED_FLAG}]`

const die = (message: string): never => {
  process.stderr.write(`✗ ${message}\n`)
  process.exit(2)
}

const d = destinoDe(process.argv.slice(2), process.env, DEFAULT_URL)
if ('error' in d) die(d.error)
const { destino, args } = d as { destino: Destino; args: string[] }
if (args.length !== 1 || (args[0] ?? '').startsWith('--')) die(USO)

const leer = (ruta: string): Manifiesto => {
  try {
    return leerManifiesto(JSON.parse(readFileSync(ruta, 'utf8')))
  } catch (e) {
    // Nunca el contenido del archivo: sólo qué campo falla, o que no se pudo leer.
    return die(e instanceof ManifiestoInvalido ? e.message : 'RO01_MANIFIESTO_ILEGIBLE: no se pudo leer el archivo como JSON')
  }
}
const manifiesto = leer(args[0] ?? '')

const sql = conectar(destino)
try {
  const medicion = medir(manifiesto, await leerParaAceptacion(sql, manifiesto))
  process.stdout.write(`${informeAceptacion(medicion).join('\n')}\n`)
  process.exitCode = medicion.cumplenTodos ? 0 : 1
} catch (e) {
  if (!destino.hosteada) throw e
  process.stderr.write(`✗ ${errorSinDatos(e)}\n`)
  process.exitCode = 2
} finally {
  await sql.end()
}
