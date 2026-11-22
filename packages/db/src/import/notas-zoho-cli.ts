// Notas de Zoho → `party_note` (ver notas-zoho.ts).
//
//   NOTAS_DATABASE_URL=... node packages/db/src/import/notas-zoho-cli.ts <Notas_Contactos.csv> <Notas_Cuentas.csv> [--aplicar]
//
// Sin `--aplicar` no escribe nada: muestra qué haría. Con `--aplicar` lo hace en una sola
// transacción. La salida son conteos; la lista para revisar (ID de Zoho y motivo, sin el
// texto de la nota) va a un CSV en la carpeta temporal del sistema, nunca al repositorio.

import { writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import postgres from 'postgres'

import { leerCsv } from './csv.ts'
import { COLUMNAS_NOTA, aplicar, planificar } from './notas-zoho.ts'
import type { NotaZoho } from './notas-zoho.ts'

const [rutaContactos, rutaCuentas] = process.argv.slice(2).filter((a) => !a.startsWith('--'))
const aplicarCambios = process.argv.includes('--aplicar')
const url = process.env.NOTAS_DATABASE_URL

if (rutaContactos === undefined || rutaCuentas === undefined || url === undefined || url === '') {
  process.stderr.write('uso: NOTAS_DATABASE_URL=... node packages/db/src/import/notas-zoho-cli.ts <Notas_Contactos.csv> <Notas_Cuentas.csv> [--aplicar]\n')
  process.exit(1)
}

const notas: NotaZoho[] = []
for (const [entidad, ruta] of [['Contactos', rutaContactos], ['Cuentas', rutaCuentas]] as const) {
  for await (const fila of leerCsv(ruta)) {
    for (const columna of Object.values(COLUMNAS_NOTA)) {
      if (!(columna in fila)) throw new Error(`${ruta} no tiene la columna «${columna}»`)
    }
    notas.push({
      entidad,
      zohoId: fila[COLUMNAS_NOTA.id] ?? '',
      principalId: fila[COLUMNAS_NOTA.principal] ?? '',
      titulo: fila[COLUMNAS_NOTA.titulo] ?? '',
      contenido: fila[COLUMNAS_NOTA.contenido] ?? '',
      autor: fila[COLUMNAS_NOTA.autor] ?? '',
      creada: fila[COLUMNAS_NOTA.creada] ?? '',
    })
  }
}

const local = /@(localhost|127\.0\.0\.1)[:/]/.test(url) || !url.includes('@')
const sql = postgres(url, { max: 1, ssl: local ? false : 'require', onnotice: () => undefined })

try {
  await sql.begin(async (tx) => {
    const vinculos = await tx<{ k: string; party_id: string }[]>`
      select l.source_entity_type || ':' || l.source_record_id as k, l.party_id
      from party_source_link l join party p on p.id = l.party_id
      where l.source_system = 'Zoho' and l.source_entity_type in ('Contactos', 'Cuentas')`
    const clientes = new Map(vinculos.map((r) => [r.k, r.party_id]))
    const cargadas = new Set(
      (await tx<{ id: string }[]>`select source_record_id as id from party_note where source = 'Zoho'`).map((r) => r.id),
    )

    const plan = planificar(notas, clientes, cargadas)
    const porMotivo = new Map<string, number>()
    for (const r of plan.revisar) porMotivo.set(`${r.entidad} ${r.motivo}`, (porMotivo.get(`${r.entidad} ${r.motivo}`) ?? 0) + 1)

    const salida = join(tmpdir(), `notas-zoho-revisar-${String(Date.now())}.csv`)
    writeFileSync(salida, ['entidad,zoho_id,motivo', ...plan.revisar.map((r) => [r.entidad, r.zohoId, r.motivo].join(','))].join('\n') + '\n')

    const n = String
    process.stdout.write(
      [
        `notas leídas de Zoho: ${n(notas.length)} (contactos ${n(notas.filter((x) => x.entidad === 'Contactos').length)}, cuentas ${n(notas.filter((x) => x.entidad === 'Cuentas').length)})`,
        `altas: ${n(plan.altas.length)} en ${n(new Set(plan.altas.map((a) => a.partyId)).size)} clientes`,
        `ya cargadas: ${n(plan.yaCargadas)}`,
        `repetidas en el export: ${n(plan.repetidas)}`,
        `a revisar: ${n(plan.revisar.length)}`,
        ...[...porMotivo].sort().map(([m, c]) => `  ${m}: ${String(c)}`),
        `lista para revisar: ${salida}`,
        '',
      ].join('\n'),
    )

    if (!aplicarCambios) {
      process.stdout.write('dry run: no se escribió nada. Para cargar, repetir con --aplicar.\n')
      return
    }
    await aplicar(tx, plan)
    process.stdout.write('✓ notas cargadas.\n')
  })
} finally {
  await sql.end()
}
