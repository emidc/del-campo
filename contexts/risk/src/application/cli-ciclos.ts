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
// Sin la variable, apunta a delcampo_risk_dev. Como el importador, sólo lee delcampo_risk_dev y
// delcampo_risk_test en localhost (T-0031, ## Data effects).

import { contarCiclos, informeCiclos } from '../domain/ciclos.ts'
import { revisionesParaContar } from '../persistence/actualizacion.ts'
import { connect, notLocalDatabase } from '../persistence/database.ts'

const DEFAULT_URL = 'postgres://localhost:5432/delcampo_risk_dev'
const USO = 'uso: pnpm --filter @del-campo/risk run ciclos --empresas ORG-A,ORG-B,…'

const die = (message: string): never => {
  process.stderr.write(`✗ ${message}\n`)
  process.exit(2)
}

const args = process.argv.slice(2)
if (args.length !== 2 || args[0] !== '--empresas') die(USO)
const empresas = (args[1] ?? '').split(',').map((e) => e.trim()).filter((e) => e !== '')
if (empresas.length === 0) die(`--empresas necesita al menos un código. ${USO}`)

const raw = process.env.RISK_DATABASE_URL ?? DEFAULT_URL
const refusal = notLocalDatabase(raw)
if (refusal !== null) die(`${refusal}. El conteo sólo lee bases locales del contexto.`)

const sql = connect(raw)
try {
  const conteo = contarCiclos(await revisionesParaContar(sql), empresas)
  process.stdout.write(`${informeCiclos(conteo).join('\n')}\n`)
  process.exitCode = conteo.cumpleA7 ? 0 : 1
} finally {
  await sql.end()
}
