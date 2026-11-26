// Automotores de Zoho → `vehicle` y `policy_vehicle` (0035_automotores.sql). Lee el export
// «Automotores»: cada fila es un automotor en una póliza («Póliza.id»).
//
// - La patente se normaliza (mayúsculas, sin espacios, guiones ni puntos) y es única: un
//   automotor que aparece en varias pólizas se carga una vez y se vincula a todas.
// - El automotor queda en el tomador de la póliza más reciente (la de inicio de vigencia
//   más nuevo), con la marca, el modelo y el año de esa fila.
// - Una patente que ya está en Broker OS no se vuelve a cargar ni cambia de cliente: sólo
//   se suman los vínculos con pólizas que falten. Correr de nuevo no duplica.
// - Va a revisión si no tiene patente o es provisoria («NOTIENE», «CHASIS…»), si no tiene
//   póliza o si su póliza no está en Broker OS.
//
// `planificar` es puro: decide qué cargar sin tocar la base. `aplicar` ejecuta el plan.

import { normalizePlate } from '../vehicle.ts'
import type { Ejecutor } from './db.ts'

export interface AutomotorZoho {
  readonly zohoId: string
  readonly patente: string
  readonly marca: string
  readonly modelo: string
  readonly anio: string
  readonly polizaId: string
}

export const COLUMNAS_AUTOMOTOR = {
  id: 'ID de registro',
  patente: 'Patente',
  marca: 'Marca',
  modelo: 'Modelo',
  anio: 'Año',
  poliza: 'Póliza.id',
} as const

/** Una póliza de Broker OS por el «ID de registro» de Zoho de su versión importada. */
export interface PolizaDestino {
  readonly policyId: string
  /** El tomador de su versión abierta o, si no hay, de la más reciente. */
  readonly tomador: string
  /** Inicio de vigencia de esa versión, `AAAA-MM-DD`. */
  readonly inicio: string
}

export type MotivoRevision = 'patente_invalida' | 'patente_provisoria' | 'sin_poliza' | 'poliza_no_encontrada'

export interface Alta {
  readonly plate: string
  readonly partyId: string
  readonly brand: string | null
  readonly model: string | null
  readonly year: number | null
}

export interface Plan {
  readonly altas: Alta[]
  readonly vinculos: { readonly plate: string; readonly policyId: string }[]
  /** Patentes que ya estaban en Broker OS: no se cargan de nuevo. */
  readonly yaCargadas: number
  /** Patentes que aparecen en pólizas de más de un cliente: quedan en el de la más reciente. */
  readonly enVariosClientes: number
  readonly aniosDescartados: number
  readonly revisar: { readonly zohoId: string; readonly patente: string; readonly motivo: MotivoRevision }[]
}

const PROVISORIA = /^(NOTIENE|SINPATENTE|SINDOMINIO|CHASIS|TRAILER|ADEFINIR)/

const texto = (valor: string, max: number): string | null => {
  const limpio = valor.trim().replace(/\s+/g, ' ').slice(0, max).trim()
  return limpio === '' ? null : limpio
}

const anio = (valor: string): number | null => {
  const m = /^\s*((?:19|20)\d{2})\b/.exec(valor)
  const n = m?.[1] === undefined ? NaN : Number(m[1])
  return n >= 1900 && n <= new Date().getFullYear() + 1 ? n : null
}

/**
 * @param polizas `ID de registro` de la póliza en Zoho → póliza de Broker OS.
 * @param existentes patentes que ya están en Broker OS.
 */
export const planificar = (filas: readonly AutomotorZoho[], polizas: ReadonlyMap<string, PolizaDestino>, existentes: ReadonlySet<string>): Plan => {
  const revisar: Plan['revisar'][number][] = []
  const porPatente = new Map<string, { fila: AutomotorZoho; poliza: PolizaDestino }[]>()
  for (const f of filas) {
    const plate = normalizePlate(f.patente)
    if (plate === null || plate.length < 5 || !/\d/.test(plate)) {
      revisar.push({ zohoId: f.zohoId, patente: f.patente, motivo: PROVISORIA.test(plate ?? '') ? 'patente_provisoria' : 'patente_invalida' })
      continue
    }
    if (PROVISORIA.test(plate)) {
      revisar.push({ zohoId: f.zohoId, patente: f.patente, motivo: 'patente_provisoria' })
      continue
    }
    if (f.polizaId.trim() === '') {
      revisar.push({ zohoId: f.zohoId, patente: f.patente, motivo: 'sin_poliza' })
      continue
    }
    const poliza = polizas.get(f.polizaId.trim())
    if (poliza === undefined) {
      revisar.push({ zohoId: f.zohoId, patente: f.patente, motivo: 'poliza_no_encontrada' })
      continue
    }
    const lista = porPatente.get(plate) ?? []
    lista.push({ fila: f, poliza })
    porPatente.set(plate, lista)
  }

  const altas: Alta[] = []
  const vinculos: Plan['vinculos'][number][] = []
  let yaCargadas = 0
  let enVariosClientes = 0
  let aniosDescartados = 0
  for (const [plate, apariciones] of porPatente) {
    for (const policyId of new Set(apariciones.map((a) => a.poliza.policyId))) vinculos.push({ plate, policyId })
    if (new Set(apariciones.map((a) => a.poliza.tomador)).size > 1) enVariosClientes++
    if (existentes.has(plate)) {
      yaCargadas++
      continue
    }
    const reciente = apariciones.reduce((a, b) => (b.poliza.inicio > a.poliza.inicio ? b : a))
    const year = anio(reciente.fila.anio)
    if (year === null && reciente.fila.anio.trim() !== '') aniosDescartados++
    altas.push({
      plate,
      partyId: reciente.poliza.tomador,
      brand: texto(reciente.fila.marca, 80),
      model: texto(reciente.fila.modelo, 120),
      year,
    })
  }
  return { altas, vinculos, yaCargadas, enVariosClientes, aniosDescartados, revisar }
}

/** Carga los automotores y los vínculos del plan. Lo que ya está no se toca. */
export const aplicar = async (sql: Ejecutor, plan: Plan): Promise<void> => {
  for (const a of plan.altas) {
    await sql`
      insert into vehicle (party_id, plate, brand, model, year, source)
      values (${a.partyId}, ${a.plate}, ${a.brand}, ${a.model}, ${a.year}, 'Zoho')
      on conflict (plate) do nothing`
  }
  for (const v of plan.vinculos) {
    await sql`
      insert into policy_vehicle (policy_id, vehicle_id)
      select ${v.policyId}, id from vehicle where plate = ${v.plate}
      on conflict do nothing`
  }
}
