// T-0068 — Teléfonos y mails de un cliente: lo que lee y hace la ficha. Como toda consulta
// de Broker OS, corre por `conDatos`: como `broker_app`, a nombre de quien mira, con RLS
// decidiendo. Todo el equipo los ve y los edita.

import type { ContactChannel, ContactPoint } from '@del-campo/db'
import { addContactPoint, cleanContact, deleteContactPoint, endContactPoint, listContactPoints } from '@del-campo/db'

import type { Conexion } from '../acceso/base.ts'
import { conDatos } from '../acceso/datos.ts'
import { sql } from '../db.ts'
import type { Principal } from '../session/admission.ts'

export type { ContactChannel, ContactPoint }

/** Lo que el equipo puede cargar. Los `WHATSAPP` que trae la importación se muestran como teléfono. */
export const CANALES_DE_CONTACTO = ['PHONE', 'EMAIL'] as const
export type CanalDeContacto = (typeof CANALES_DE_CONTACTO)[number]

export const esCanalDeContacto = (valor: unknown): valor is CanalDeContacto =>
  typeof valor === 'string' && (CANALES_DE_CONTACTO as readonly string[]).includes(valor)

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export type ResultadoDeContacto = 'guardado' | 'invalido' | 'repetido' | 'quitado' | 'inexistente'

/** Lo que se le dice a la persona por cada resultado. */
export const MENSAJE_DE_CONTACTO: Readonly<Record<ResultadoDeContacto, string>> = {
  guardado: 'Guardado.',
  invalido: 'No se guardó. Un teléfono va con característica (por ejemplo 261 555 0101) y un mail con la forma nombre@dominio.com.',
  repetido: 'Este cliente ya lo tiene cargado.',
  quitado: 'Eliminado.',
  inexistente: 'Ese teléfono o mail ya no estaba cargado.',
}

export const esResultadoDeContacto = (valor: string): valor is ResultadoDeContacto => Object.hasOwn(MENSAJE_DE_CONTACTO, valor)

export const contactosDeClienteCon = async (conexion: Conexion, principal: Principal, partyId: string): Promise<ContactPoint[]> =>
  UUID.test(partyId) ? conDatos(conexion, principal, (tx) => listContactPoints(tx, partyId)) : []

export const agregarContactoCon = async (
  conexion: Conexion,
  principal: Principal,
  partyId: string,
  canal: CanalDeContacto,
  valor: string,
): Promise<ResultadoDeContacto> => {
  const limpio = cleanContact(canal, valor)
  if (limpio === null || !UUID.test(partyId)) return 'invalido'
  const resultado = await conDatos(conexion, principal, (tx) => addContactPoint(tx, partyId, canal, limpio))
  return resultado.kind === 'ok' ? 'guardado' : 'repetido'
}

export const quitarContactoCon = async (conexion: Conexion, principal: Principal, partyId: string, id: string): Promise<ResultadoDeContacto> => {
  if (!UUID.test(partyId) || !UUID.test(id)) return 'inexistente'
  return (await conDatos(conexion, principal, (tx) => deleteContactPoint(tx, partyId, id))) ? 'quitado' : 'inexistente'
}

/**
 * Corregir es dar de baja el anterior y agregar el nuevo, en la misma transacción: si el
 * nuevo no sirve o ya está cargado, el anterior queda como estaba.
 */
export const corregirContactoCon = async (
  conexion: Conexion,
  principal: Principal,
  partyId: string,
  id: string,
  valor: string,
): Promise<ResultadoDeContacto> => {
  if (!UUID.test(partyId) || !UUID.test(id)) return 'inexistente'
  return conDatos(conexion, principal, async (tx) => {
    const anterior = (await listContactPoints(tx, partyId)).find((c) => c.id === id)
    if (anterior === undefined) return 'inexistente'
    const canal = anterior.channel
    const limpio = cleanContact(canal, valor)
    if (limpio === null) return 'invalido'
    if (limpio.value === anterior.value) return 'guardado'
    await endContactPoint(tx, partyId, id)
    const resultado = await addContactPoint(tx, partyId, canal === 'WHATSAPP' ? 'PHONE' : canal, limpio)
    if (resultado.kind === 'duplicate') throw new ContactoRepetido()
    return 'guardado'
  }).catch((error: unknown) => {
    if (error instanceof ContactoRepetido) return 'repetido'
    throw error
  })
}

/** Corta la transacción de una corrección para que la baja del anterior no quede hecha. */
class ContactoRepetido extends Error {}

export const contactosDeCliente = (principal: Principal, partyId: string): Promise<ContactPoint[]> =>
  contactosDeClienteCon(sql(), principal, partyId)
export const agregarContacto = (principal: Principal, partyId: string, canal: CanalDeContacto, valor: string): Promise<ResultadoDeContacto> =>
  agregarContactoCon(sql(), principal, partyId, canal, valor)
export const quitarContacto = (principal: Principal, partyId: string, id: string): Promise<ResultadoDeContacto> =>
  quitarContactoCon(sql(), principal, partyId, id)
export const corregirContacto = (principal: Principal, partyId: string, id: string, valor: string): Promise<ResultadoDeContacto> =>
  corregirContactoCon(sql(), principal, partyId, id, valor)
