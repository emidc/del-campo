// Importar un lote de los tres CSV contra la base de RISK_DATABASE_URL (T-0029), o contra la
// hosteada con `--hosteada` (T-0032).
//
//   RISK_DATABASE_URL=postgres://localhost:5432/delcampo_risk_dev \
//     pnpm --filter @del-campo/risk run import <carpeta> [--corte AAAA-MM-DD] [--por nombre] [--sin-valores]
//
//   RISK_HOSTED_DATABASE_URL=… \
//     pnpm --filter @del-campo/risk run import <carpeta> --hosteada [--corte AAAA-MM-DD] [--por nombre] [--con-valores]
//
// Hace falta `run`: `pnpm import` es un comando propio de pnpm. Sin `--hosteada`, apunta a
// RISK_DATABASE_URL o a delcampo_risk_dev y, como el runner de migraciones, sólo opera sobre
// delcampo_risk_dev y delcampo_risk_test en localhost, donde aplica antes las migraciones
// pendientes (T-0029, ## Data effects). Con `--hosteada`, la corre el owner desde su equipo con
// los datos reales (R-13, R-19; docs/despliegue/vercel-risk.md): no migra (si falta una
// migración, no importa nada) y el informe es sin valores salvo que pida `--con-valores`, que es
// para leerlo él y nunca se pega en ningún lado.
//
// `--sin-valores` imprime el informe sin mensajes ni celdas (R-19): es el que sale del equipo
// del owner con datos reales. Sale con 0 si el lote quedó importado (ahora o antes) y con 1 si
// no se escribió nada por rechazos, celdas sin destino o una falla de escritura.

import { existsSync } from 'node:fs'
import { userInfo } from 'node:os'
import { join, resolve } from 'node:path'

import { ARCHIVOS } from '../domain/contrato.ts'

import { informe } from '../domain/informe.ts'
import { conectar, destinoDe, errorSinDatos, HOSTED_FLAG, type Destino } from '../persistence/database.ts'
import { migrate, pendientesSinCrear } from '../persistence/migrations.ts'
import { importarLote, leerArchivosDeLote, leerContrato } from './importar.ts'

const DEFAULT_URL = 'postgres://localhost:5432/delcampo_risk_dev'
const USO = `uso: pnpm --filter @del-campo/risk run import <carpeta> [--corte AAAA-MM-DD] [--por nombre] [--sin-valores] | <carpeta> ${HOSTED_FLAG} [--corte AAAA-MM-DD] [--por nombre] [--con-valores]`

const die = (message: string): never => {
  process.stderr.write(`✗ ${message}\n`)
  process.exit(2)
}

const r = destinoDe(process.argv.slice(2), process.env, DEFAULT_URL)
if ('error' in r) die(r.error)
const { destino, args } = r as { destino: Destino; args: string[] }
const opcion = (n: string): string | undefined => {
  const i = args.indexOf(n)
  if (i < 0) return undefined
  const v = args[i + 1]
  if (v === undefined || v.startsWith('--')) die(`${n} necesita un valor. ${USO}`)
  return v
}
const carpeta = args[0]
if (carpeta === undefined || carpeta.startsWith('--')) die(USO)
const conocidas = new Set(['--corte', '--por', destino.hosteada ? '--con-valores' : '--sin-valores'])
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
// En la hosteada, sin valores salvo pedido explícito; en local, con valores salvo pedido explícito.
const modo = destino.hosteada ? (args.includes('--con-valores') ? 'con_valores' : 'sin_valores') : (args.includes('--sin-valores') ? 'sin_valores' : 'con_valores')

// pnpm --filter corre el script desde contexts/risk: una ruta relativa es la de quien lo llamó.
const origen = resolve(process.env.INIT_CWD ?? process.cwd(), carpeta ?? '')
const faltan = ARCHIVOS.filter((a) => !existsSync(join(origen, a)))
if (faltan.length > 0) die(`un lote son los tres archivos; en ${origen} falta ${faltan.join(', ')}`)
const sql = conectar(destino)
try {
  if (destino.hosteada) {
    const pendientes = await pendientesSinCrear(sql)
    if (pendientes.length > 0) die(`${destino.nombre} no tiene aplicadas ${pendientes.join(', ')}: no se importó nada`)
  } else {
    await migrate(sql)
  }
  const resultado = await importarLote(sql, leerContrato(), leerArchivosDeLote(origen), {
    origen,
    importadoPor: opcion('--por') ?? userInfo().username,
    fechaCorte,
  })
  process.stdout.write(`fecha de corte ${fechaCorte}\n${informe(resultado, modo).join('\n')}\n`)
  process.exitCode = resultado.estado === 'importado' || resultado.estado === 'ya_importado' ? 0 : 1
} catch (e) {
  if (!destino.hosteada) throw e
  process.stderr.write(`✗ ${errorSinDatos(e)}; no se importó nada\n`)
  process.exitCode = 1
} finally {
  await sql.end()
}
