// Automotores de un cliente y de sus pólizas: lo que leen y hacen la ficha del cliente y la
// de la póliza. Por `conDatos`: como `broker_app`, a nombre de quien mira, con RLS
// decidiendo. En la póliza se eligen los automotores del tomador; uno nuevo se suma
// también al tomador.

import type { Vehicle } from '@del-campo/db'
import {
  addVehicle,
  cleanVehicle,
  deleteVehicle,
  linkVehicle,
  listPolicyVehicles,
  listVehicles,
  policyHolder,
  unlinkVehicle,
  updateVehicle,
} from '@del-campo/db'

import type { Conexion } from '../acceso/base.ts'
import { conDatos } from '../acceso/datos.ts'
import { sql } from '../db.ts'
import { esUuid } from '../polizas/edicion.ts'
import type { Principal } from '../session/admission.ts'

export type { Vehicle }
export { riskTypeHasVehicles } from '@del-campo/db'

export interface DatosDeAutomotor {
  readonly patente: string
  readonly marca: string
  readonly modelo: string
  readonly anio: string
}

export type ResultadoDeAutomotor = 'guardado' | 'invalido' | 'repetido' | 'quitado' | 'inexistente' | 'sin_tomador'

/** Lo que se le dice a la persona por cada resultado. */
export const MENSAJE_DE_AUTOMOTOR: Readonly<Record<ResultadoDeAutomotor, string>> = {
  guardado: 'Guardado.',
  invalido: 'No se guardó. La patente va con letras y números (por ejemplo AB123CD) y el año con cuatro cifras.',
  repetido: 'Esa patente ya está cargada en Broker OS.',
  quitado: 'Eliminado.',
  inexistente: 'Ese automotor ya no estaba cargado.',
  sin_tomador: 'La póliza no tiene tomador: no se le pueden sumar automotores.',
}

const limpiar = (d: DatosDeAutomotor) => cleanVehicle(d.patente, d.marca, d.modelo, d.anio)

const deResultado = (r: { readonly kind: 'ok' | 'duplicate' | 'not_found' }): ResultadoDeAutomotor =>
  r.kind === 'ok' ? 'guardado' : r.kind === 'duplicate' ? 'repetido' : 'inexistente'

export const automotoresDeClienteCon = (conexion: Conexion, principal: Principal, partyId: string): Promise<Vehicle[]> =>
  esUuid(partyId) ? conDatos(conexion, principal, (tx) => listVehicles(tx, partyId)) : Promise.resolve([])

export const agregarAutomotorCon = async (conexion: Conexion, principal: Principal, partyId: string, datos: DatosDeAutomotor): Promise<ResultadoDeAutomotor> => {
  const limpio = limpiar(datos)
  if (limpio === null || !esUuid(partyId)) return 'invalido'
  return deResultado(await conDatos(conexion, principal, (tx) => addVehicle(tx, partyId, limpio)))
}

export const corregirAutomotorCon = async (
  conexion: Conexion,
  principal: Principal,
  partyId: string,
  id: string,
  datos: DatosDeAutomotor,
): Promise<ResultadoDeAutomotor> => {
  if (!esUuid(partyId) || !esUuid(id)) return 'inexistente'
  const limpio = limpiar(datos)
  if (limpio === null) return 'invalido'
  return deResultado(await conDatos(conexion, principal, (tx) => updateVehicle(tx, partyId, id, limpio)))
}

/** Borra el automotor del cliente y lo quita de todas sus pólizas. */
export const quitarAutomotorCon = async (conexion: Conexion, principal: Principal, partyId: string, id: string): Promise<ResultadoDeAutomotor> => {
  if (!esUuid(partyId) || !esUuid(id)) return 'inexistente'
  return (await conDatos(conexion, principal, (tx) => deleteVehicle(tx, partyId, id))) ? 'quitado' : 'inexistente'
}

export interface AutomotoresDePoliza {
  /** Los que están en la póliza. */
  readonly enLaPoliza: readonly Vehicle[]
  /** Los del tomador que todavía no están en la póliza. */
  readonly delTomador: readonly Vehicle[]
}

export const automotoresDePolizaCon = (conexion: Conexion, principal: Principal, policyId: string): Promise<AutomotoresDePoliza> =>
  esUuid(policyId)
    ? conDatos(conexion, principal, async (tx) => {
        const enLaPoliza = [...(await listPolicyVehicles(tx, policyId))]
        const tomador = await policyHolder(tx, policyId)
        const ya = new Set(enLaPoliza.map((v) => v.id))
        const delTomador = tomador === null ? [] : (await listVehicles(tx, tomador)).filter((v) => !ya.has(v.id))
        return { enLaPoliza, delTomador }
      })
    : Promise.resolve({ enLaPoliza: [], delTomador: [] })

/** Suma a la póliza un automotor del tomador. */
export const sumarAutomotorAPolizaCon = async (conexion: Conexion, principal: Principal, policyId: string, vehicleId: string): Promise<ResultadoDeAutomotor> => {
  if (!esUuid(policyId) || !esUuid(vehicleId)) return 'inexistente'
  return conDatos(conexion, principal, async (tx) => {
    const tomador = await policyHolder(tx, policyId)
    if (tomador === null) return 'sin_tomador'
    return (await linkVehicle(tx, policyId, tomador, vehicleId)) ? 'guardado' : 'inexistente'
  })
}

/** Carga un automotor nuevo en el tomador y lo suma a la póliza, en la misma transacción. */
export const nuevoAutomotorEnPolizaCon = async (
  conexion: Conexion,
  principal: Principal,
  policyId: string,
  datos: DatosDeAutomotor,
): Promise<ResultadoDeAutomotor> => {
  const limpio = limpiar(datos)
  if (limpio === null || !esUuid(policyId)) return 'invalido'
  return conDatos(conexion, principal, async (tx) => {
    const tomador = await policyHolder(tx, policyId)
    if (tomador === null) return 'sin_tomador'
    const alta = await addVehicle(tx, tomador, limpio)
    if (alta.kind !== 'ok') return deResultado(alta)
    await linkVehicle(tx, policyId, tomador, alta.id)
    return 'guardado'
  })
}

/** Quita el automotor de la póliza; sigue en su cliente. */
export const quitarAutomotorDePolizaCon = async (conexion: Conexion, principal: Principal, policyId: string, vehicleId: string): Promise<ResultadoDeAutomotor> => {
  if (!esUuid(policyId) || !esUuid(vehicleId)) return 'inexistente'
  return (await conDatos(conexion, principal, (tx) => unlinkVehicle(tx, policyId, vehicleId))) ? 'quitado' : 'inexistente'
}

export const automotoresDeCliente = (principal: Principal, partyId: string): Promise<Vehicle[]> => automotoresDeClienteCon(sql(), principal, partyId)
export const agregarAutomotor = (principal: Principal, partyId: string, datos: DatosDeAutomotor): Promise<ResultadoDeAutomotor> =>
  agregarAutomotorCon(sql(), principal, partyId, datos)
export const corregirAutomotor = (principal: Principal, partyId: string, id: string, datos: DatosDeAutomotor): Promise<ResultadoDeAutomotor> =>
  corregirAutomotorCon(sql(), principal, partyId, id, datos)
export const quitarAutomotor = (principal: Principal, partyId: string, id: string): Promise<ResultadoDeAutomotor> =>
  quitarAutomotorCon(sql(), principal, partyId, id)
export const automotoresDePoliza = (principal: Principal, policyId: string): Promise<AutomotoresDePoliza> =>
  automotoresDePolizaCon(sql(), principal, policyId)
export const sumarAutomotorAPoliza = (principal: Principal, policyId: string, vehicleId: string): Promise<ResultadoDeAutomotor> =>
  sumarAutomotorAPolizaCon(sql(), principal, policyId, vehicleId)
export const nuevoAutomotorEnPoliza = (principal: Principal, policyId: string, datos: DatosDeAutomotor): Promise<ResultadoDeAutomotor> =>
  nuevoAutomotorEnPolizaCon(sql(), principal, policyId, datos)
export const quitarAutomotorDePoliza = (principal: Principal, policyId: string, vehicleId: string): Promise<ResultadoDeAutomotor> =>
  quitarAutomotorDePolizaCon(sql(), principal, policyId, vehicleId)
