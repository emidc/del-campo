// Prospectos: alta, listado, origen y conversión en cliente. Por `conDatos`, como
// `broker_app`, a nombre de quien actúa; RLS decide.

import type {
  ConvertResult,
  NewProspect,
  NewProspectResult,
  PartyEditResult,
  ProspectList,
  ProspectOrigin,
  ProspectStatus,
} from '@del-campo/db'
import {
  PROSPECT_ORIGINS,
  convertProspect,
  createProspect,
  getProspectStatus,
  isProspectOrigin,
  listProspects,
  updateProspectOrigin,
} from '@del-campo/db'

import type { Conexion } from '../acceso/base.ts'
import { conDatos } from '../acceso/datos.ts'
import { sql } from '../db.ts'
import { esUuid } from '../polizas/edicion.ts'
import type { Principal } from '../session/admission.ts'

export type { ConvertResult, NewProspect, NewProspectResult, ProspectList, ProspectOrigin, ProspectStatus }
export { PROSPECT_ORIGINS, isProspectOrigin }

export const TOPE_DE_PROSPECTOS = 100

/** Cómo se muestra cada origen. */
export const ORIGENES_DE_PROSPECTO: Readonly<Record<ProspectOrigin, string>> = {
  INSTAGRAM: 'Instagram',
  FACEBOOK: 'Facebook',
  WEB: 'Página Web',
  GOOGLE: 'Google',
  MANUAL: 'Manual',
}

export const crearProspectoCon = (conexion: Conexion, principal: Principal, datos: NewProspect): Promise<NewProspectResult> =>
  conDatos(conexion, principal, (tx) => createProspect(tx, datos))

export const prospectosCon = (conexion: Conexion, principal: Principal, texto: string): Promise<ProspectList> =>
  conDatos(conexion, principal, (tx) => listProspects(tx, texto, TOPE_DE_PROSPECTOS))

export const estadoDeProspectoCon = (conexion: Conexion, principal: Principal, partyId: string): Promise<ProspectStatus | null> =>
  esUuid(partyId) ? conDatos(conexion, principal, (tx) => getProspectStatus(tx, partyId)) : Promise.resolve(null)

export const editarOrigenCon = (conexion: Conexion, principal: Principal, partyId: string, origen: string): Promise<PartyEditResult> =>
  esUuid(partyId) ? conDatos(conexion, principal, (tx) => updateProspectOrigin(tx, partyId, origen)) : Promise.resolve({ kind: 'not_found' })

export const convertirEnClienteCon = (conexion: Conexion, principal: Principal, partyId: string): Promise<ConvertResult> =>
  esUuid(partyId) ? conDatos(conexion, principal, (tx) => convertProspect(tx, partyId)) : Promise.resolve({ kind: 'not_found' })

export const crearProspecto = (principal: Principal, datos: NewProspect): Promise<NewProspectResult> => crearProspectoCon(sql(), principal, datos)
export const prospectos = (principal: Principal, texto: string): Promise<ProspectList> => prospectosCon(sql(), principal, texto)
export const estadoDeProspecto = (principal: Principal, partyId: string): Promise<ProspectStatus | null> =>
  estadoDeProspectoCon(sql(), principal, partyId)
export const editarOrigen = (principal: Principal, partyId: string, origen: string): Promise<PartyEditResult> =>
  editarOrigenCon(sql(), principal, partyId, origen)
export const convertirEnCliente = (principal: Principal, partyId: string): Promise<ConvertResult> => convertirEnClienteCon(sql(), principal, partyId)
