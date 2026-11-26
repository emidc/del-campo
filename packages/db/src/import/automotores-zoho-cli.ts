// Automotores de Zoho → `vehicle` y `policy_vehicle` (ver automotores-zoho.ts).
//
//   AUTOMOTORES_DATABASE_URL=... node packages/db/src/import/automotores-zoho-cli.ts <Automotores.csv> [--aplicar]
//
// Sin `--aplicar` no escribe nada: muestra qué haría. Con `--aplicar` lo hace en una sola
// transacción. La salida son conteos; la lista para revisar (ID de Zoho, patente y motivo)
// va a un CSV en la carpeta temporal del sistema, nunca al repositorio.

import { writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import postgres from 'postgres'

import { COLUMNAS_AUTOMOTOR, aplicar, planificar } from './automotores-zoho.ts'
import type { AutomotorZoho, PolizaDestino } from './automotores-zoho.ts'
import { leerCsv } from './csv.ts'

const [ruta] = process.argv.slice(2).filter((a) => !a.startsWith('--'))
const aplicarCambios = process.argv.includes('--aplicar')
const url = process.env.AUTOMOTORES_DATABASE_URL

if (ruta === undefined || url === undefined || url === '') {
  process.stderr.write('uso: AUTOMOTORES_DATABASE_URL=... node packages/db/src/import/automotores-zoho-cli.ts <Automotores.csv> [--aplicar]\n')
  process.exit(1)
}

const filas: AutomotorZoho[] = []
for await (const fila of leerCsv(ruta)) {
  for (const columna of Object.values(COLUMNAS_AUTOMOTOR)) {
    if (!(columna in fila)) throw new Error(`${ruta} no tiene la columna «${columna}»`)
  }
  filas.push({
    zohoId: fila[COLUMNAS_AUTOMOTOR.id] ?? '',
    patente: fila[COLUMNAS_AUTOMOTOR.patente] ?? '',
    marca: fila[COLUMNAS_AUTOMOTOR.marca] ?? '',
    modelo: fila[COLUMNAS_AUTOMOTOR.modelo] ?? '',
    anio: fila[COLUMNAS_AUTOMOTOR.anio] ?? '',
    polizaId: fila[COLUMNAS_AUTOMOTOR.poliza] ?? '',
  })
}

const local = /@(localhost|127\.0\.0\.1)[:/]/.test(url) || !url.includes('@')
const sql = postgres(url, { max: 1, ssl: local ? false : 'require', onnotice: () => undefined })

try {
  await sql.begin(async (tx) => {
    const filasPolizas = await tx<{ zoho: string; policy_id: string; tomador: string; inicio: string }[]>`
      select pv.source_event_id as zoho, pv.policy_id, ultima.holder_party_id as tomador, ultima.term_start_date::text as inicio
      from policy_version pv
      join lateral (
        select holder_party_id, term_start_date from policy_version x
        where x.policy_id = pv.policy_id
        order by (x.effective_to is null) desc, x.version_number desc
        limit 1
      ) ultima on true
      where pv.source_event_type = 'Polizas' and pv.source_event_id is not null`
    const polizas = new Map<string, PolizaDestino>(
      filasPolizas.map((p) => [p.zoho, { policyId: p.policy_id, tomador: p.tomador, inicio: p.inicio }]),
    )
    // Sin la migración 0035 todavía no hay tabla: el dry run igual muestra qué cargaría.
    const [{ hay } = { hay: false }] = await tx<{ hay: boolean }[]>`select to_regclass('public.vehicle') is not null as hay`
    if (!hay && aplicarCambios) throw new Error('la base no tiene la migración 0035_automotores: aplicarla antes de cargar')
    const existentes = new Set(hay ? (await tx<{ plate: string }[]>`select plate from vehicle`).map((r) => r.plate) : [])

    const plan = planificar(filas, polizas, existentes)
    const porMotivo = new Map<string, number>()
    for (const r of plan.revisar) porMotivo.set(r.motivo, (porMotivo.get(r.motivo) ?? 0) + 1)

    const salida = join(tmpdir(), `automotores-zoho-revisar-${String(Date.now())}.csv`)
    const celda = (v: string) => `"${v.replace(/"/g, '""')}"`
    writeFileSync(salida, ['zoho_id,patente,motivo', ...plan.revisar.map((r) => [r.zohoId, celda(r.patente), r.motivo].join(','))].join('\n') + '\n')

    const n = String
    process.stdout.write(
      [
        `filas leídas de Zoho: ${n(filas.length)}`,
        `pólizas de Zoho en la base: ${n(polizas.size)}`,
        `automotores nuevos: ${n(plan.altas.length)} en ${n(new Set(plan.altas.map((a) => a.partyId)).size)} clientes`,
        `vínculos automotor–póliza: ${n(plan.vinculos.length)} en ${n(new Set(plan.vinculos.map((v) => v.policyId)).size)} pólizas`,
        `patentes ya cargadas en Broker OS: ${n(plan.yaCargadas)}`,
        `patentes en pólizas de más de un cliente (quedan en el de la más reciente): ${n(plan.enVariosClientes)}`,
        `años que no se entienden (quedan vacíos): ${n(plan.aniosDescartados)}`,
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
    process.stdout.write('✓ automotores cargados.\n')
  })
} finally {
  await sql.end()
}
