// Importar un lote de los tres CSV contra la base de RISK_DATABASE_URL (T-0029).
//
//   RISK_DATABASE_URL=postgres://localhost:5432/delcampo_risk_dev \
//     pnpm --filter @del-campo/risk run import <carpeta> [--corte AAAA-MM-DD] [--por nombre] [--sin-valores]
//
// Hace falta `run`: `pnpm import` es un comando propio de pnpm. Sin la variable, apunta a
// delcampo_risk_dev. Como el runner de migraciones, sólo opera sobre delcampo_risk_dev y
// delcampo_risk_test en localhost (T-0029, ## Data effects): la base hosteada y los datos
// reales son de T-0032 y los carga el owner.
//
// `--sin-valores` imprime el informe sin mensajes ni celdas (R-19): es el que sale del equipo
// del owner con datos reales. Sale con 0 si el lote quedó importado (ahora o antes) y con 1 si
// no se escribió nada por rechazos, celdas sin destino o una falla de escritura.

import { existsSync } from 'node:fs'
import { userInfo } from 'node:os'
import { join, resolve } from 'node:path'

import { ARCHIVOS } from '../domain/contrato.ts'

import { informe } from '../domain/informe.ts'
import { connect, notLocalDatabase } from '../persistence/database.ts'
import { migrate } from '../persistence/migrations.ts'
import { importarLote, leerArchivosDeLote, leerContrato } from './importar.ts'

const DEFAULT_URL = 'postgres://localhost:5432/delcampo_risk_dev'
const USO = 'uso: pnpm --filter @del-campo/risk run import <carpeta> [--corte AAAA-MM-DD] [--por nombre] [--sin-valores]'

const die = (message: string): never => {
  process.stderr.write(`✗ ${message}\n`)
  process.exit(2)
}

const args = process.argv.slice(2)
const opcion = (n: string): string | undefined => {
  const i = args.indexOf(n)
  if (i < 0) return undefined
  const v = args[i + 1]
  if (v === undefined || v.startsWith('--')) die(`${n} necesita un valor. ${USO}`)
  return v
}
const carpeta = args[0]
if (carpeta === undefined || carpeta.startsWith('--')) die(USO)
const conocidas = new Set(['--corte', '--por', '--sin-valores'])
const conValor = new Set(['--corte', '--por'])
// Todo lo que sigue a la carpeta es una opción conocida o su valor: un `—sin-valores` mal tipeado
// no puede pasar en silencio y dejar el informe con valores.
for (let i = 1; i < args.length; i++) {
  const a = args[i] ?? ''
  if (!conocidas.has(a)) die(`argumento desconocido «${a}». ${USO}`)
  if (conValor.has(a)) i++
}

// Por defecto, la fecha de hoy en la zona del equipo que importa, no la UTC.
const fechaCorte = opcion('--corte') ?? new Date().toLocaleDateString('sv-SE')
if (!/^\d{4}-\d{2}-\d{2}$/.test(fechaCorte)) die(`--corte: «${fechaCorte}» no es una fecha AAAA-MM-DD`)
const modo = args.includes('--sin-valores') ? 'sin_valores' : 'con_valores'

const raw = process.env.RISK_DATABASE_URL ?? DEFAULT_URL
const refusal = notLocalDatabase(raw)
if (refusal !== null) die(`${refusal}. La importación solo opera sobre bases locales del contexto.`)

// pnpm --filter corre el script desde contexts/risk: una ruta relativa es la de quien lo llamó.
const origen = resolve(process.env.INIT_CWD ?? process.cwd(), carpeta ?? '')
const faltan = ARCHIVOS.filter((a) => !existsSync(join(origen, a)))
if (faltan.length > 0) die(`un lote son los tres archivos; en ${origen} falta ${faltan.join(', ')}`)
const sql = connect(raw)
try {
  await migrate(sql)
  const r = await importarLote(sql, leerContrato(), leerArchivosDeLote(origen), {
    origen,
    importadoPor: opcion('--por') ?? userInfo().username,
    fechaCorte,
  })
  process.stdout.write(`fecha de corte ${fechaCorte}\n${informe(r, modo).join('\n')}\n`)
  process.exitCode = r.estado === 'importado' || r.estado === 'ya_importado' ? 0 : 1
} finally {
  await sql.end()
}
