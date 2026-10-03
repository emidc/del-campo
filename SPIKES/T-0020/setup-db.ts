// Crea la base del spike si no existe y aplica schema.sql (idempotente).
import postgres from 'postgres'
import { connect, SPIKE_DB } from './db.ts'

const url = process.env.DATABASE_URL
const sql = connect(url) // valida que apunte a la base del spike

const admin = new URL(url ?? '')
admin.pathname = '/postgres'
const root = postgres(admin.toString(), { max: 1, onnotice: () => undefined })
try {
  const exists = await root`select 1 from pg_database where datname = ${SPIKE_DB}`
  if (exists.length === 0) {
    await root.unsafe(`create database ${SPIKE_DB}`)
    console.log(`Base ${SPIKE_DB} creada.`)
  }
} finally {
  await root.end()
}

try {
  await sql.file(new URL('schema.sql', import.meta.url).pathname)
  console.log('Esquema aplicado.')
} finally {
  await sql.end()
}
