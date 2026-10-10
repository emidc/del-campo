// Solo el owner lo ejecuta contra la base alojada; no carga ningún .env implícitamente.
import { readFileSync } from 'node:fs'
import postgres from 'postgres'
import { parseManifest } from './manifest.ts'
import { readReport } from './read.ts'

try {
  const path = process.argv[2]
  const raw = process.env.CO01_DATABASE_URL
  if (!path || process.argv.length !== 3 || !raw) throw new Error('CO01_INPUT_REQUIRED')
  const manifest = parseManifest(JSON.parse(readFileSync(path, 'utf8')) as unknown)
  const sql = postgres(raw, { max: 1, prepare: false, connect_timeout: 10, onnotice: () => undefined })
  try {
    const report = await readReport(sql, manifest)
    console.log(JSON.stringify(report, null, 2))
    process.exitCode = Object.values(report.criteria).every(Boolean) ? 0 : 2
  } finally {
    await sql.end({ timeout: 5 })
  }
} catch {
  // Drivers y parsers pueden incluir URL, valores o el contenido privado del archivo.
  console.error('CO01_ERROR: revisar el archivo local, la conexión y permisos de lectura. No se generó un informe válido.')
  process.exitCode = 1
}
