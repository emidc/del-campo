// Notas de una parte, como las ve y edita el equipo desde la ficha. Por `conDatos`: como
// `broker_app`, a nombre de quien mira, con RLS decidiendo.

import type { PartyNote } from '@del-campo/db'
import { addPartyNote, cleanNote, deletePartyNote, listPartyNotes, setPartyNoteArchived, updatePartyNote } from '@del-campo/db'

import type { Conexion } from '../acceso/base.ts'
import { conDatos } from '../acceso/datos.ts'
import { sql } from '../db.ts'
import { esUuid } from '../polizas/edicion.ts'
import type { Principal } from '../session/admission.ts'

export type { PartyNote }

export type ResultadoDeNota = 'guardada' | 'vacia' | 'inexistente'

export const MENSAJE_DE_NOTA: Readonly<Record<ResultadoDeNota, string>> = {
  guardada: 'Guardada.',
  vacia: 'Escribí algo en la nota (hasta 20.000 caracteres, y el título hasta 200).',
  inexistente: 'Esa nota ya no está.',
}

export const notasDeClienteCon = (conexion: Conexion, principal: Principal, partyId: string): Promise<PartyNote[]> =>
  esUuid(partyId) ? conDatos(conexion, principal, (tx) => listPartyNotes(tx, partyId)) : Promise.resolve([])

export const agregarNotaCon = async (conexion: Conexion, principal: Principal, partyId: string, titulo: string, texto: string): Promise<ResultadoDeNota> => {
  if (!esUuid(partyId)) return 'inexistente'
  const nota = cleanNote(titulo, texto)
  if (nota === null) return 'vacia'
  await conDatos(conexion, principal, (tx) => addPartyNote(tx, partyId, nota))
  return 'guardada'
}

export const editarNotaCon = async (
  conexion: Conexion,
  principal: Principal,
  partyId: string,
  id: string,
  titulo: string,
  texto: string,
): Promise<ResultadoDeNota> => {
  if (!esUuid(partyId) || !esUuid(id)) return 'inexistente'
  const nota = cleanNote(titulo, texto)
  if (nota === null) return 'vacia'
  return (await conDatos(conexion, principal, (tx) => updatePartyNote(tx, partyId, id, nota))) ? 'guardada' : 'inexistente'
}

/** Archivar la oculta de la lista; desarchivar la vuelve a mostrar como activa. */
export const archivarNotaCon = async (conexion: Conexion, principal: Principal, partyId: string, id: string, archivar: boolean): Promise<ResultadoDeNota> => {
  if (!esUuid(partyId) || !esUuid(id)) return 'inexistente'
  return (await conDatos(conexion, principal, (tx) => setPartyNoteArchived(tx, partyId, id, archivar))) ? 'guardada' : 'inexistente'
}

export const eliminarNotaCon = async (conexion: Conexion, principal: Principal, partyId: string, id: string): Promise<ResultadoDeNota> => {
  if (!esUuid(partyId) || !esUuid(id)) return 'inexistente'
  return (await conDatos(conexion, principal, (tx) => deletePartyNote(tx, partyId, id))) ? 'guardada' : 'inexistente'
}

export const notasDeCliente = (principal: Principal, partyId: string): Promise<PartyNote[]> => notasDeClienteCon(sql(), principal, partyId)
export const agregarNota = (principal: Principal, partyId: string, titulo: string, texto: string): Promise<ResultadoDeNota> =>
  agregarNotaCon(sql(), principal, partyId, titulo, texto)
export const editarNota = (principal: Principal, partyId: string, id: string, titulo: string, texto: string): Promise<ResultadoDeNota> =>
  editarNotaCon(sql(), principal, partyId, id, titulo, texto)
export const archivarNota = (principal: Principal, partyId: string, id: string, archivar: boolean): Promise<ResultadoDeNota> =>
  archivarNotaCon(sql(), principal, partyId, id, archivar)
export const eliminarNota = (principal: Principal, partyId: string, id: string): Promise<ResultadoDeNota> => eliminarNotaCon(sql(), principal, partyId, id)
