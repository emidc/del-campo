// Crear la base local del contexto y aplicar o revertir sus migraciones.
//
//   COMMUNICATION_DATABASE_URL=postgres://localhost:5432/delcampo_communication_test \
//     node src/persistence/cli.ts create | migrate | down
//
// Sin la variable, apunta a delcampo_communication_dev. Solo opera sobre esa base y
// sobre delcampo_communication_test, en localhost (## Data effects de T-0024): una base
// hosteada se migra en la tarea de despliegue, con su propia autorización.

import postgres from 'postgres'

import { connect, notLocalDatabase } from './database.ts'
import { down, migrate, MigrationError } from './migrations.ts'

const DEFAULT_URL = 'postgres://localhost:5432/delcampo_communication_dev'

const die = (message: string): never => {
  process.stderr.write(`✗ ${message}\n`)
  process.exit(1)
}

const raw = process.env.COMMUNICATION_DATABASE_URL ?? DEFAULT_URL
const refusal = notLocalDatabase(raw)
if (refusal !== null) die(`${refusal}. Este runner solo opera sobre bases locales del contexto.`)
const url = new URL(raw)
const name = url.pathname.slice(1)

const createDatabase = async (): Promise<void> => {
  const admin = new URL(url.href)
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

const command = process.argv[2]
if (!['create', 'migrate', 'down'].includes(command ?? '')) {
  die(`comando desconocido: "${command ?? ''}". Se espera create, migrate o down.`)
}

try {
  if (command === 'create') await createDatabase()
  const sql = connect(url.href)
  try {
    if (command === 'down') {
      const reverted = await down(sql)
      process.stdout.write(reverted === null ? `· ${name}: no hay migraciones aplicadas\n` : `✓ ${name}: down ${reverted}\n`)
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
  throw error
}
