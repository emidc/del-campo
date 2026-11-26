// Automotores de un cliente y de sus pólizas (0035_automotores.sql). La patente es única en
// todo Broker OS; un automotor es de un solo cliente y puede estar en varias pólizas. Corren
// con el Ejecutor que les dan: desde la app, la transacción restringida de `conDatos`.

import type postgres from 'postgres'

type QueryExecutor = postgres.Sql | postgres.TransactionSql

export interface Vehicle {
  readonly id: string
  readonly partyId: string
  readonly plate: string
  readonly brand: string | null
  readonly model: string | null
  readonly year: number | null
}

export interface VehicleData {
  readonly plate: string
  readonly brand: string | null
  readonly model: string | null
  readonly year: number | null
}

/** La patente como se guarda: mayúsculas, sin espacios, guiones ni puntos. `null` si no sirve. */
export const normalizePlate = (raw: string): string | null => {
  const plate = raw.toUpperCase().replace(/[\s.-]/g, '')
  return /^[A-Z0-9]{2,12}$/.test(plate) ? plate : null
}

const texto = (raw: string, max: number): string | null | undefined => {
  const valor = raw.trim().replace(/\s+/g, ' ')
  if (valor === '') return null
  return valor.length <= max ? valor : undefined
}

/**
 * Los datos de un automotor listos para guardar, o `null` si algo no sirve: la patente es
 * obligatoria; marca, modelo y año, opcionales. El año, de 1900 al año que viene.
 */
export const cleanVehicle = (plate: string, brand: string, model: string, year: string): VehicleData | null => {
  const p = normalizePlate(plate)
  const b = texto(brand, 80)
  const m = texto(model, 120)
  const a = year.trim()
  if (p === null || b === undefined || m === undefined) return null
  if (a === '') return { plate: p, brand: b, model: m, year: null }
  const n = /^\d{4}$/.test(a) ? Number(a) : NaN
  if (!(n >= 1900 && n <= new Date().getFullYear() + 1)) return null
  return { plate: p, brand: b, model: m, year: n }
}

/** Los automotores de un cliente, por patente. */
export const listVehicles = async (sql: QueryExecutor, partyId: string): Promise<Vehicle[]> =>
  sql<Vehicle[]>`select id, party_id as "partyId", plate, brand, model, year from vehicle where party_id = ${partyId} order by plate`

/** Los automotores de una póliza, por patente. */
export const listPolicyVehicles = async (sql: QueryExecutor, policyId: string): Promise<Vehicle[]> =>
  sql<Vehicle[]>`
    select v.id, v.party_id as "partyId", v.plate, v.brand, v.model, v.year
    from policy_vehicle pv join vehicle v on v.id = pv.vehicle_id
    where pv.policy_id = ${policyId}
    order by v.plate`

const patenteTomada = async (sql: QueryExecutor, plate: string, salvo: string | null): Promise<boolean> => {
  const [fila] = await sql<{ n: number }[]>`
    select count(*)::int as n from vehicle where plate = ${plate} and (${salvo}::uuid is null or id <> ${salvo}::uuid)`
  return (fila?.n ?? 0) > 0
}

export type VehicleResult = { readonly kind: 'ok'; readonly id: string } | { readonly kind: 'duplicate' } | { readonly kind: 'not_found' }

/** Agrega un automotor a un cliente. Si la patente ya está en Broker OS, no agrega nada. */
export const addVehicle = async (sql: QueryExecutor, partyId: string, data: VehicleData): Promise<VehicleResult> => {
  if (await patenteTomada(sql, data.plate, null)) return { kind: 'duplicate' }
  const [row] = await sql<{ id: string }[]>`
    insert into vehicle (party_id, plate, brand, model, year, created_by_user_id)
    values (${partyId}, ${data.plate}, ${data.brand}, ${data.model}, ${data.year}, authz.usuario())
    returning id`
  if (row === undefined) throw new Error('el automotor no se guardó')
  return { kind: 'ok', id: row.id }
}

/** Corrige un automotor de ese cliente. La patente nueva no puede estar en otro automotor. */
export const updateVehicle = async (sql: QueryExecutor, partyId: string, id: string, data: VehicleData): Promise<VehicleResult> => {
  if (await patenteTomada(sql, data.plate, id)) return { kind: 'duplicate' }
  const rows = await sql<{ id: string }[]>`
    update vehicle
    set plate = ${data.plate}, brand = ${data.brand}, model = ${data.model}, year = ${data.year},
        updated_by_user_id = authz.usuario(), updated_at = clock_timestamp()
    where id = ${id} and party_id = ${partyId}
    returning id`
  return rows.length === 1 ? { kind: 'ok', id } : { kind: 'not_found' }
}

/** Borra un automotor de ese cliente, y con él sus vínculos con pólizas. `false` si no era suyo. */
export const deleteVehicle = async (sql: QueryExecutor, partyId: string, id: string): Promise<boolean> => {
  const rows = await sql<{ id: string }[]>`delete from vehicle where id = ${id} and party_id = ${partyId} returning id`
  return rows.length === 1
}

/**
 * Suma a la póliza un automotor del cliente indicado (el tomador). `false` si el automotor
 * no es de ese cliente. Si ya estaba en la póliza, no hace nada.
 */
export const linkVehicle = async (sql: QueryExecutor, policyId: string, partyId: string, vehicleId: string): Promise<boolean> => {
  const [propio] = await sql<{ id: string }[]>`select id from vehicle where id = ${vehicleId} and party_id = ${partyId}`
  if (propio === undefined) return false
  await sql`
    insert into policy_vehicle (policy_id, vehicle_id, created_by_user_id)
    values (${policyId}, ${vehicleId}, authz.usuario())
    on conflict do nothing`
  return true
}

/** Quita un automotor de la póliza. El automotor sigue en su cliente. */
export const unlinkVehicle = async (sql: QueryExecutor, policyId: string, vehicleId: string): Promise<boolean> => {
  const rows = await sql<{ id: string }[]>`
    delete from policy_vehicle where policy_id = ${policyId} and vehicle_id = ${vehicleId} returning vehicle_id as id`
  return rows.length === 1
}

const sinAcentos = (valor: string): string =>
  valor
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase()

const TIPOS_CON_AUTOMOTORES = new Set(['automotor', 'motovehiculo', 'flota automotor', 'trailer'])

/** Si una póliza con ese tipo de riesgo lleva la sección Automotores. */
export const riskTypeHasVehicles = (riskType: string | null): boolean => riskType !== null && TIPOS_CON_AUTOMOTORES.has(sinAcentos(riskType))

/** El tomador de la póliza: el de la versión abierta o, si no hay, el de la más reciente. */
export const policyHolder = async (sql: QueryExecutor, policyId: string): Promise<string | null> => {
  const [fila] = await sql<{ holder: string }[]>`
    select holder_party_id as holder from policy_version
    where policy_id = ${policyId}
    order by (effective_to is null) desc, version_number desc
    limit 1`
  return fila?.holder ?? null
}
