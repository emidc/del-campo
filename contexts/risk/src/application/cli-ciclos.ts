// Conteo de ciclos para A7 de RO01 (T-0031; decisión 7 del owner) contra la base de
// RISK_DATABASE_URL.
//
//   RISK_DATABASE_URL=postgres://localhost:5432/delcampo_risk_dev \
//     pnpm --filter @del-campo/risk run ciclos --empresas ORG-A,ORG-B,ORG-C,ORG-D,ORG-E
//
// `--empresas` son los códigos de las cinco empresas históricas: A7 pide al menos un ciclo en
// cada una. Cuenta las revisiones pendientes que una persona abrió y cerró en Risk OS; las
// abiertas y las que vienen en los CSV no cuentan. La salida tiene sólo códigos de empresa,
// conteos y fechas (R-19): es la que puede salir del equipo del owner con datos reales. Sale con
// 0 si A7 se cumple y con 1 si no.
//
// Con `--detalle` (decisión del owner, 2026-10-17), después del resumen, que no cambia, agrega
// una línea por ciclo que cuenta: empresa, revisión, disparador y referencia, apertura, cierre,
// resultado, evaluación y la persona que cerró. Lleva ids y nombres: es para verificar en el
// equipo del owner, no para compartir.
//
// Sin `--hosteada`, apunta a RISK_DATABASE_URL o a delcampo_risk_dev y, como el importador, sólo
// lee delcampo_risk_dev y delcampo_risk_test en localhost (T-0031, ## Data effects). Con
// `--hosteada`, lee la base de RISK_HOSTED_DATABASE_URL: lo corre el owner (T-0032). El script de
// aceptación (`pnpm --filter @del-campo/risk run aceptacion`) trae este mismo conteo con los
// códigos H1 a H5 en lugar de los ids de organización.

import { ciclosDetallados, contarCiclos, informeCiclos, informeDetalle } from '../domain/ciclos.ts'
import { revisionesParaContar } from '../persistence/actualizacion.ts'
import { conectar, destinoDe, errorSinDatos, HOSTED_FLAG, type Destino } from '../persistence/database.ts'

const DEFAULT_URL = 'postgres://localhost:5432/delcampo_risk_dev'
const USO = `uso: pnpm --filter @del-campo/risk run ciclos --empresas ORG-A,ORG-B,… [--detalle] [${HOSTED_FLAG}]`

const die = (message: string): never => {
  process.stderr.write(`✗ ${message}\n`)
  process.exit(2)
}

const d = destinoDe(process.argv.slice(2), process.env, DEFAULT_URL)
if ('error' in d) die(d.error)
const { destino, args } = d as { destino: Destino; args: string[] }
const detalle = args.includes('--detalle')
const resto = args.filter((a) => a !== '--detalle')
if (resto.length !== 2 || resto[0] !== '--empresas' || args.length - resto.length > 1) die(USO)
const empresas = (resto[1] ?? '').split(',').map((e) => e.trim()).filter((e) => e !== '')
if (empresas.length === 0) die(`--empresas necesita al menos un código. ${USO}`)

const sql = conectar(destino)
try {
  const revisiones = await revisionesParaContar(sql)
  const conteo = contarCiclos(revisiones, empresas)
  process.stdout.write(`${informeCiclos(conteo).join('\n')}\n`)
  if (detalle) process.stdout.write(`\n${informeDetalle(ciclosDetallados(revisiones)).join('\n')}\n`)
  process.exitCode = conteo.cumpleA7 ? 0 : 1
} catch (e) {
  if (!destino.hosteada) throw e
  process.stderr.write(`✗ ${errorSinDatos(e)}\n`)
  process.exitCode = 2
} finally {
  await sql.end()
}
