// Completar pólizas y clientes con el export de Zoho: sólo llena lo vacío, informa las
// columnas que faltan y una segunda corrida no cambia nada. Datos sintéticos, en una
// transacción revertida. Requiere DATABASE_URL con 0023 aplicada.

import assert from 'node:assert/strict'
import { after, describe, it } from 'node:test'

import postgres from 'postgres'

import { completarCarpetas, completarPolizas } from './completar-desde-zoho.ts'

const databaseUrl = process.env.DATABASE_URL
if (databaseUrl === undefined || databaseUrl === '') throw new Error('DATABASE_URL no está configurada.')
const sql = postgres(databaseUrl, { max: 1, prepare: false, onnotice: () => undefined })
after(async () => {
  await sql.end()
})

class Rollback extends Error {}
const descartable = async (accion: (tx: postgres.TransactionSql) => Promise<void>): Promise<void> => {
  try {
    await sql.begin(async (tx) => {
      await accion(tx)
      throw new Rollback()
    })
  } catch (error) {
    if (!(error instanceof Rollback)) throw error
  }
}

describe('completar desde Zoho', () => {
  it('llena productor, premio, suma, forma de pago y estado sin pisar lo cargado', async () => {
    await descartable(async (tx) => {
      const [{ id: ana } = { id: '' }] = await tx<{ id: string }[]>`insert into party (kind) values ('PERSON') returning id`
      const [{ id: org } = { id: '' }] = await tx<{ id: string }[]>`insert into party (kind) values ('ORGANIZATION') returning id`
      const [{ id: aseg } = { id: '' }] = await tx<{ id: string }[]>`insert into insurer (organization_party_id, canonical_name) values (${org}, 'Sintética') returning id`
      const [{ id: pol } = { id: '' }] = await tx<{ id: string }[]>`insert into policy (insurer_id, policy_number) values (${aseg}, 'Z-1') returning id`
      await tx`
        insert into policy_version (policy_id, version_number, effective_from, holder_party_id, term_start_date, term_end_date, renewal_mode, producer, source_event_type, source_event_id)
        values (${pol}, 1, '2026-01-01', ${ana}, '2026-01-01', '2026-12-31', 'MANUAL', 'Cargado a mano', 'Polizas', 'zoho-sint-1')`
      const filas = [
        { 'ID de registro': 'zoho-sint-1', Estado: 'VIGENTE', Productor: 'De Zoho', Premio: '1500.5', 'Suma asegurada': '100000', 'Forma de pago': 'Tarjeta' },
        { 'ID de registro': 'zoho-no-esta', Estado: 'VIGENTE', Productor: 'X', Premio: '1', 'Suma asegurada': '1', 'Forma de pago': 'X' },
      ]
      const seco = await completarPolizas(tx, filas, false)
      assert.equal(seco.encontradas, 1)
      assert.deepEqual(seco.columnasFaltantes, [])
      assert.deepEqual(seco.campos.producer, { enZoho: 1, aCompletar: 0 })
      assert.deepEqual(seco.campos.totalPremium, { enZoho: 1, aCompletar: 1 })
      await completarPolizas(tx, filas, true)
      const [v] = await tx<{ status: string; producer: string; total_premium: string; sum_insured: string; payment_method: string }[]>`
        select status, producer, total_premium::text, sum_insured::text, payment_method from policy_version where policy_id = ${pol}`
      assert.deepEqual(v, { status: 'ACTIVE', producer: 'Cargado a mano', total_premium: '1500.5', sum_insured: '100000', payment_method: 'Tarjeta' })
      const otra = await completarPolizas(tx, filas, true)
      assert.equal(otra.campos.totalPremium.aCompletar, 0, 'una segunda corrida no cambia nada')

      const sinColumnas = await completarPolizas(tx, [{ 'ID de registro': 'zoho-sint-1', Estado: 'VIGENTE' }], false)
      assert.deepEqual(sinColumnas.columnasFaltantes, ['Productor', 'Premio', 'Suma asegurada', 'Forma de pago'])
    })
  })

  it('agrega la carpeta de Drive del cliente si no tenía', async () => {
    await descartable(async (tx) => {
      const [{ id: ana } = { id: '' }] = await tx<{ id: string }[]>`insert into party (kind) values ('PERSON') returning id`
      const vinculos = new Map([['Contactos:c-1', ana]])
      const contactos = [
        { 'ID de registro': 'c-1', 'Drive URL': 'https://drive.google.com/drive/folders/sintetica123' },
        { 'ID de registro': 'c-2', 'Drive URL': 'https://drive.google.com/drive/folders/otra456' },
      ]
      const r = await completarCarpetas(tx, contactos, [], vinculos, true)
      assert.deepEqual(r, { leidas: 2, conCarpeta: 2, sinCliente: 1, yaTenian: 0, nuevas: 1 })
      const otra = await completarCarpetas(tx, contactos, [], vinculos, true)
      assert.equal(otra.nuevas, 0)
      assert.equal(otra.yaTenian, 1)
    })
  })
})
