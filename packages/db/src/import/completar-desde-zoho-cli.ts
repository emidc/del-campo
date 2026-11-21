// Completa pólizas y clientes ya cargados con el export de Zoho (`completar-desde-zoho.ts`).
// Sin `--aplicar` no escribe nada: muestra qué columnas encontró y cuánto completaría.
// Con `--aplicar`, todo va en una sola transacción. La salida son sólo conteos.
//
//   COMPLETAR_DATABASE_URL=<base de destino> \
//   [COMPLETAR_VINCULOS_URL=<base con party_source_link, si el destino no lo tiene>] \
//   node packages/db/src/import/completar-desde-zoho-cli.ts \
//     --polizas <Polizas.csv> --contactos <Contactos.csv> --cuentas <Cuentas.csv> [--aplicar]

import postgres from 'postgres'

import { leerCsv } from './csv.ts'
import { completarCarpetas, completarPolizas, vinculosDeClientes } from './completar-desde-zoho.ts'

const morir = (mensaje: string): never => {
  process.stderr.write(`✗ ${mensaje}\n`)
  process.exit(1)
}

const argumento = (nombre: string): string | undefined => {
  const i = process.argv.indexOf(nombre)
  return i === -1 ? undefined : process.argv[i + 1]
}

const leer = async (ruta: string | undefined): Promise<Record<string, string>[]> => {
  if (ruta === undefined) return []
  const filas: Record<string, string>[] = []
  for await (const fila of leerCsv(ruta)) filas.push(fila)
  return filas
}

const destino = process.env.COMPLETAR_DATABASE_URL ?? morir('falta COMPLETAR_DATABASE_URL (la base a completar)')
const aplicar = process.argv.includes('--aplicar')
const [polizas, contactos, cuentas] = await Promise.all([
  leer(argumento('--polizas')),
  leer(argumento('--contactos')),
  leer(argumento('--cuentas')),
])
if (polizas.length + contactos.length + cuentas.length === 0) morir('pasá al menos --polizas, --contactos o --cuentas con su CSV')

const sql = postgres(destino, { max: 1, prepare: false, onnotice: () => undefined })
const vinculosUrl = process.env.COMPLETAR_VINCULOS_URL
const otra = vinculosUrl === undefined || vinculosUrl === '' ? null : postgres(vinculosUrl, { max: 1, prepare: false })
try {
  const vinculos = await vinculosDeClientes(otra ?? sql)
  const { p, c } = await sql.begin(async (tx) => ({
    p: await completarPolizas(tx, polizas, aplicar),
    c: await completarCarpetas(tx, contactos, cuentas, vinculos, aplicar),
  }))
  const salida = [
    `pólizas leídas: ${String(p.leidas)} (encontradas en la base: ${String(p.encontradas)})`,
    ...(p.columnasFaltantes.length === 0 ? [] : [`columnas que el export no trae: ${p.columnasFaltantes.join(', ')}`]),
    ...Object.entries(p.campos).map(([campo, n]) => `  ${campo}: ${String(n.enZoho)} con valor en Zoho, ${String(n.aCompletar)} a completar`),
    `clientes leídos: ${String(c.leidas)} (con carpeta de Drive: ${String(c.conCarpeta)})`,
    `  carpetas nuevas: ${String(c.nuevas)}, ya tenían: ${String(c.yaTenian)}, sin cliente en la base: ${String(c.sinCliente)}`,
    aplicar ? '✓ cambios aplicados' : 'dry run: no se escribió nada. Para cargar, repetir con --aplicar.',
  ]
  process.stdout.write(`${salida.join('\n')}\n`)
} finally {
  await sql.end()
  await otra?.end()
}
