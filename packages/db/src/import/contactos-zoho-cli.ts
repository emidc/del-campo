// Teléfonos y mails de Zoho → `contact_point` (ver contactos-zoho.ts).
//
//   CONTACTOS_DATABASE_URL=... node packages/db/src/import/contactos-zoho-cli.ts <contactos.csv> <cuentas.csv> [--aplicar]
//
// Sin `--aplicar` no escribe nada: muestra qué haría. Con `--aplicar` lo hace en una sola
// transacción. La salida son conteos; la lista para revisar (ID de Zoho, columna y motivo,
// sin el valor) va a un CSV en la carpeta temporal del sistema, nunca al repositorio.
//
// Si la base no tiene el vínculo cliente↔ID de Zoho (`party_source_link`), se puede leer
// de otra base con los mismos clientes: CONTACTOS_VINCULOS_URL. Sólo se usan los vínculos
// cuyo cliente existe en la base que se carga.

import { writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import postgres from 'postgres'

import { aplicar, planificar } from './contactos-zoho.ts'
import type { Canal, Entidad, Existente, ValorZoho } from './contactos-zoho.ts'
import { leerCsv } from './csv.ts'
import { CAMPOS_CONTACTO, CAMPOS_CUENTA } from './zoho-fields.ts'

const [rutaContactos, rutaCuentas] = process.argv.slice(2).filter((a) => !a.startsWith('--'))
const aplicarCambios = process.argv.includes('--aplicar')
const url = process.env.CONTACTOS_DATABASE_URL

if (rutaContactos === undefined || rutaCuentas === undefined || url === undefined || url === '') {
  process.stderr.write('uso: CONTACTOS_DATABASE_URL=... node packages/db/src/import/contactos-zoho-cli.ts <contactos.csv> <cuentas.csv> [--aplicar]\n')
  process.exit(1)
}

const COLUMNAS: readonly { entidad: Entidad; canal: Canal; columna: string }[] = [
  { entidad: 'Contactos', canal: 'EMAIL', columna: CAMPOS_CONTACTO.correoElectronico },
  { entidad: 'Contactos', canal: 'EMAIL', columna: CAMPOS_CONTACTO.correoElectronicoSecundario },
  { entidad: 'Contactos', canal: 'PHONE', columna: CAMPOS_CONTACTO.telefono },
  { entidad: 'Contactos', canal: 'PHONE', columna: CAMPOS_CONTACTO.otroTelefono },
  { entidad: 'Contactos', canal: 'PHONE', columna: CAMPOS_CONTACTO.movil },
  { entidad: 'Cuentas', canal: 'PHONE', columna: CAMPOS_CUENTA.telefono },
]

const valores: ValorZoho[] = []
for (const [entidad, ruta] of [['Contactos', rutaContactos], ['Cuentas', rutaCuentas]] as const) {
  const columnas = COLUMNAS.filter((c) => c.entidad === entidad)
  for await (const fila of leerCsv(ruta)) {
    const zohoId = fila['ID de registro'] ?? ''
    for (const c of columnas) {
      if (!(c.columna in fila)) throw new Error(`${ruta} no tiene la columna «${c.columna}»`)
      const valor = fila[c.columna]?.trim() ?? ''
      if (valor !== '') valores.push({ entidad, zohoId, canal: c.canal, columna: c.columna, valor })
    }
  }
}

const conectarA = (u: string): postgres.Sql => {
  const local = /@(localhost|127\.0\.0\.1)[:/]/.test(u) || !u.includes('@')
  return postgres(u, { max: 1, ssl: local ? false : 'require', onnotice: () => undefined })
}
const sql = conectarA(url)
const urlVinculos = process.env.CONTACTOS_VINCULOS_URL
const sqlVinculos = urlVinculos === undefined || urlVinculos === '' ? sql : conectarA(urlVinculos)

try {
  await sql.begin(async (tx) => {
    const vinculos = await (sqlVinculos === sql ? tx : sqlVinculos)<{ k: string; party_id: string }[]>`
      select source_entity_type || ':' || source_record_id as k, party_id
      from party_source_link
      where source_system = 'Zoho' and source_entity_type in ('Contactos', 'Cuentas')`
    const enLaBase = new Set((await tx<{ id: string }[]>`select id from party`).map((r) => r.id))
    const clientes = new Map(vinculos.filter((r) => enLaBase.has(r.party_id)).map((r) => [r.k, r.party_id]))
    const existentes = await tx<Existente[]>`
      select id, party_id as "partyId", channel, value, normalized_value as "normalizedValue", source
      from contact_point
      where status = 'ACTIVE' and (valid_to is null or valid_to > now())`

    const plan = planificar(valores, clientes, existentes)
    const porMotivo = new Map<string, number>()
    for (const r of plan.revisar) porMotivo.set(`${r.canal} ${r.motivo}`, (porMotivo.get(`${r.canal} ${r.motivo}`) ?? 0) + 1)

    const salida = join(tmpdir(), `contactos-zoho-revisar-${String(Date.now())}.csv`)
    writeFileSync(salida, ['entidad,zoho_id,canal,columna,motivo', ...plan.revisar.map((r) => [r.entidad, r.zohoId, r.canal, `"${r.columna}"`, r.motivo].join(','))].join('\n') + '\n')

    const n = String
    process.stdout.write(
      [
        `valores leídos de Zoho: ${n(valores.length)} (clientes con ID de Zoho en la base: ${n(clientes.size)})`,
        `sin cambios: ${n(plan.sinCambios)}`,
        `a formato +54: ${n(plan.actualizar.length)}`,
        `altas: ${n(plan.altas.length)} (teléfonos ${n(plan.altas.filter((a) => a.channel === 'PHONE').length)}, mails ${n(plan.altas.filter((a) => a.channel === 'EMAIL').length)})`,
        `bajas por repetidos: ${n(plan.bajas.length)}`,
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
    process.stdout.write('✓ cambios aplicados.\n')
  })
} finally {
  await sql.end()
  if (sqlVinculos !== sql) await sqlVinculos.end()
}
