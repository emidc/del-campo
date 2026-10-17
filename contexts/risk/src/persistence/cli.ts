// Crear la base local del contexto, aplicar o revertir sus migraciones y verificar el rol de
// la app.
//
//   RISK_DATABASE_URL=postgres://localhost:5432/delcampo_risk_test \
//     node src/persistence/cli.ts create | migrate | down | verificar
//
//   RISK_HOSTED_DATABASE_URL=… node src/persistence/cli.ts migrate | down | verificar --hosteada
//
// Sin `--hosteada`, apunta a RISK_DATABASE_URL o a delcampo_risk_dev, y sólo opera sobre esa
// base y sobre delcampo_risk_test, en localhost (## Data effects de T-0028). Con `--hosteada`,
// sobre la base de RISK_HOSTED_DATABASE_URL: la corre el owner desde su equipo (R-13, R-16;
// T-0032, docs/despliegue/vercel-risk.md), y ningún mensaje repite la URL. `create` es sólo
// local: la base hosteada la crea el owner en Supabase.

import postgres from 'postgres'

import { conectar, destinoDe, errorSinDatos, HOSTED_FLAG, type Destino } from './database.ts'
import { down, migrate, MigrationError } from './migrations.ts'
import { informeVerificacion, puntosVerificacion, verificar } from './verificacion.ts'

const DEFAULT_URL = 'postgres://localhost:5432/delcampo_risk_dev'
const USO = `uso: node src/persistence/cli.ts create | migrate | down | verificar [${HOSTED_FLAG}]`

const die = (message: string): never => {
  process.stderr.write(`✗ ${message}\n`)
  process.exit(1)
}

const r = destinoDe(process.argv.slice(2), process.env, DEFAULT_URL)
if ('error' in r) die(r.error)
const { destino, args } = r as { destino: Destino; args: string[] }
const command = args[0]
if (args.length !== 1 || !['create', 'migrate', 'down', 'verificar'].includes(command ?? '')) die(USO)
if (command === 'create' && destino.hosteada) die('create es sólo para las bases locales: la base hosteada la crea el owner en Supabase')
const name = destino.nombre

const createDatabase = async (): Promise<void> => {
  const admin = new URL(destino.url)
  admin.pathname = '/postgres'
  const root = postgres(admin.href, { max: 1, onnotice: () => undefined })
  try {
    const exists = await root`select 1 from pg_database where datname = ${name}`
    if (exists.length > 0) {
      process.stdout.write(`· ${name} ya existe\n`)
    } else {
      // El nombre ya pasó por notLocalDatabase: solo letras, guiones bajos y _dev/_test.
      await root.unsafe(`create database "${name}"`)
      process.stdout.write(`✓ base creada: ${name}\n`)
    }
  } finally {
    await root.end()
  }
}

try {
  if (command === 'create') await createDatabase()
  const sql = conectar(destino)
  try {
    if (command === 'down') {
      const reverted = await down(sql)
      process.stdout.write(reverted === null ? `· ${name}: no hay migraciones aplicadas\n` : `✓ ${name}: down ${reverted}\n`)
    } else if (command === 'verificar') {
      const v = await verificar(sql)
      process.stdout.write(`${name}\n${informeVerificacion(v).join('\n')}\n`)
      process.exitCode = puntosVerificacion(v).every((p) => p.cumple) ? 0 : 2
    } else {
      const applied = await migrate(sql)
      if (applied.length === 0) process.stdout.write(`· ${name}: ninguna migración pendiente\n`)
      for (const file of applied) process.stdout.write(`✓ ${name}: ${file}\n`)
    }
  } finally {
    await sql.end()
  }
} catch (error) {
  if (error instanceof MigrationError) die(error.message)
  if (destino.hosteada) die(errorSinDatos(error))
  throw error
}
