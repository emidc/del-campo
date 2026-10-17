// Personas con acceso a la UI de Risk OS (D-0069), contra la base de RISK_DATABASE_URL, o contra
// la hosteada con `--hosteada` (T-0032).
//
//   pnpm --filter @del-campo/risk run persona alta --nombre "Nombre Apellido" --usuario nombre [--hosteada]
//   pnpm --filter @del-campo/risk run persona clave --usuario nombre [--hosteada]
//   pnpm --filter @del-campo/risk run persona baja --usuario nombre [--hosteada]
//
// La contraseña se lee de la entrada estándar (una línea), nunca de un argumento: así no queda
// en el historial de la terminal. Por ejemplo, `openssl rand -base64 24 | tee /dev/tty | pnpm …`.
// Sin `--hosteada`, apunta a RISK_DATABASE_URL o a delcampo_risk_dev y, como el importador, sólo
// opera sobre delcampo_risk_dev y delcampo_risk_test en localhost, donde migra antes. Con
// `--hosteada`, sobre la base de RISK_HOSTED_DATABASE_URL, sin migrar: lo corre el owner desde su
// equipo (R-13, R-16; docs/despliegue/vercel-risk.md).

import { conectar, destinoDe, errorSinDatos, HOSTED_FLAG, type Destino } from '../persistence/database.ts'
import { migrate, pendientesSinCrear } from '../persistence/migrations.ts'
import { cambiarContrasena, darDeAlta, darDeBaja } from './personas.ts'

const DEFAULT_URL = 'postgres://localhost:5432/delcampo_risk_dev'
const USO = `uso: pnpm --filter @del-campo/risk run persona alta --nombre "Nombre" --usuario usuario | clave --usuario usuario | baja --usuario usuario [${HOSTED_FLAG}]`

const die = (message: string): never => {
  process.stderr.write(`✗ ${message}\n`)
  process.exit(2)
}

const d = destinoDe(process.argv.slice(2), process.env, DEFAULT_URL)
if ('error' in d) die(d.error)
const { destino, args } = d as { destino: Destino; args: string[] }
const [comando, ...resto] = args
const permitidas: Readonly<Record<string, readonly string[]>> = { alta: ['--nombre', '--usuario'], clave: ['--usuario'], baja: ['--usuario'] }
const opciones = comando === undefined ? undefined : permitidas[comando]
if (opciones === undefined) die(USO)
const valores = new Map<string, string>()
for (let i = 0; i < resto.length; i += 2) {
  const nombre = resto[i] ?? ''
  const valor = resto[i + 1]
  if (!(opciones ?? []).includes(nombre)) die(`argumento desconocido «${nombre}». ${USO}`)
  if (valor === undefined || valor.startsWith('--')) die(`${nombre} necesita un valor. ${USO}`)
  valores.set(nombre, valor ?? '')
}
for (const o of opciones ?? []) if (!valores.has(o)) die(`falta ${o}. ${USO}`)
const usuario = valores.get('--usuario') ?? ''

const leerContrasena = async (): Promise<string> => {
  const partes: Buffer[] = []
  for await (const parte of process.stdin) partes.push(parte as Buffer)
  return Buffer.concat(partes).toString('utf8').split(/\r?\n/)[0] ?? ''
}

const sql = conectar(destino)
try {
  if (destino.hosteada) {
    const pendientes = await pendientesSinCrear(sql)
    if (pendientes.length > 0) throw new Error(`${destino.nombre} no tiene aplicadas ${pendientes.join(', ')}`)
  } else {
    await migrate(sql)
  }
  if (comando === 'alta') {
    const id = await darDeAlta(sql, valores.get('--nombre') ?? '', usuario, await leerContrasena())
    process.stdout.write(`✓ alta de ${usuario}: ${id}\n`)
  } else if (comando === 'clave') {
    await cambiarContrasena(sql, usuario, await leerContrasena())
    process.stdout.write(`✓ contraseña nueva para ${usuario}; sus sesiones abiertas dejan de valer\n`)
  } else {
    await darDeBaja(sql, usuario)
    process.stdout.write(`✓ baja de ${usuario}; sus sesiones abiertas dejan de valer\n`)
  }
} catch (e) {
  // Los rechazos propios (usuario repetido, contraseña corta) no traen datos; un error del driver
  // contra la hosteada se informa sólo con su código.
  const propio = e instanceof Error && !('code' in e)
  process.stderr.write(`✗ ${destino.hosteada && !propio ? errorSinDatos(e) : e instanceof Error ? e.message : String(e)}\n`)
  process.exitCode = 1
} finally {
  await sql.end()
}
