// Contactos editables desde la app: nombre y DNI de una persona, asociación a una empresa
// existente y borrado definitivo de un contacto sin vínculos. Por `conDatos`, como
// `broker_app`, a nombre de quien actúa.

import type { DeleteBlocker, OrganizationOption, PartyEditResult } from '@del-campo/db'
import {
  contactBlockers,
  deleteContact,
  linkOrganization,
  searchOrganizations,
  updatePersonDni,
  updatePersonName,
} from '@del-campo/db'

import type { Conexion } from '../acceso/base.ts'
import { conDatos } from '../acceso/datos.ts'
import { sql } from '../db.ts'
import { esUuid } from '../polizas/edicion.ts'
import type { Principal } from '../session/admission.ts'

export type { OrganizationOption, PartyEditResult }

const noEncontrado: PartyEditResult = { kind: 'not_found' }

export const editarNombreCon = (conexion: Conexion, principal: Principal, partyId: string, nombre: string, apellido: string): Promise<PartyEditResult> =>
  esUuid(partyId) ? conDatos(conexion, principal, (tx) => updatePersonName(tx, partyId, nombre, apellido)) : Promise.resolve(noEncontrado)

export const editarDniCon = (conexion: Conexion, principal: Principal, partyId: string, dni: string): Promise<PartyEditResult> =>
  esUuid(partyId) ? conDatos(conexion, principal, (tx) => updatePersonDni(tx, partyId, dni)) : Promise.resolve(noEncontrado)

export const buscarEmpresasCon = (conexion: Conexion, principal: Principal, texto: string): Promise<OrganizationOption[]> =>
  conDatos(conexion, principal, (tx) => searchOrganizations(tx, texto))

export const asociarEmpresaCon = (conexion: Conexion, principal: Principal, partyId: string, empresaId: string): Promise<PartyEditResult> =>
  esUuid(partyId) && esUuid(empresaId)
    ? conDatos(conexion, principal, (tx) => linkOrganization(tx, partyId, empresaId))
    : Promise.resolve({ kind: 'invalid', message: 'Elegí una empresa de la lista.' })

export const bloqueosDeContactoCon = (conexion: Conexion, principal: Principal, partyId: string): Promise<DeleteBlocker[]> =>
  esUuid(partyId) ? conDatos(conexion, principal, (tx) => contactBlockers(tx, partyId)) : Promise.resolve([])

export const eliminarContactoCon = (conexion: Conexion, principal: Principal, partyId: string): Promise<DeleteBlocker[]> =>
  conDatos(conexion, principal, (tx) => deleteContact(tx, partyId))

export const editarNombre = (principal: Principal, partyId: string, nombre: string, apellido: string): Promise<PartyEditResult> =>
  editarNombreCon(sql(), principal, partyId, nombre, apellido)
export const editarDni = (principal: Principal, partyId: string, dni: string): Promise<PartyEditResult> => editarDniCon(sql(), principal, partyId, dni)
export const buscarEmpresas = (principal: Principal, texto: string): Promise<OrganizationOption[]> => buscarEmpresasCon(sql(), principal, texto)
export const asociarEmpresa = (principal: Principal, partyId: string, empresaId: string): Promise<PartyEditResult> =>
  asociarEmpresaCon(sql(), principal, partyId, empresaId)
export const bloqueosDeContacto = (principal: Principal, partyId: string): Promise<DeleteBlocker[]> => bloqueosDeContactoCon(sql(), principal, partyId)
export const eliminarContacto = (principal: Principal, partyId: string): Promise<DeleteBlocker[]> => eliminarContactoCon(sql(), principal, partyId)
