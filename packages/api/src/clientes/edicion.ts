// Contactos editables desde la app: nombre y DNI de una persona, asociación a una empresa
// existente y borrado definitivo de un contacto sin vínculos. Por `conDatos`, como
// `broker_app`, a nombre de quien actúa.

import type { DeleteBlocker, OrganizationOption, PartyEditResult, PersonOption } from '@del-campo/db'
import {
  contactBlockers,
  deleteContact,
  getMessageOwner,
  linkOrganization,
  searchOrganizations,
  searchPersons,
  unlinkOrganization,
  updateDriveFolder,
  updateMessageOwner,
  updateOrganizationCuit,
  updateOrganizationName,
  updatePersonDni,
  updatePersonName,
} from '@del-campo/db'

import type { Conexion } from '../acceso/base.ts'
import { conDatos } from '../acceso/datos.ts'
import { sql } from '../db.ts'
import { esUuid } from '../polizas/edicion.ts'
import type { Principal } from '../session/admission.ts'

export type { OrganizationOption, PartyEditResult, PersonOption }

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

export const editarRazonSocialCon = (conexion: Conexion, principal: Principal, partyId: string, nombre: string): Promise<PartyEditResult> =>
  esUuid(partyId) ? conDatos(conexion, principal, (tx) => updateOrganizationName(tx, partyId, nombre)) : Promise.resolve(noEncontrado)

export const editarCuitCon = (conexion: Conexion, principal: Principal, partyId: string, cuit: string): Promise<PartyEditResult> =>
  esUuid(partyId) ? conDatos(conexion, principal, (tx) => updateOrganizationCuit(tx, partyId, cuit)) : Promise.resolve(noEncontrado)

export const editarCarpetaCon = (conexion: Conexion, principal: Principal, partyId: string, url: string): Promise<PartyEditResult> =>
  esUuid(partyId) ? conDatos(conexion, principal, (tx) => updateDriveFolder(tx, partyId, url)) : Promise.resolve(noEncontrado)

export const buscarPersonasCon = (conexion: Conexion, principal: Principal, texto: string): Promise<PersonOption[]> =>
  conDatos(conexion, principal, (tx) => searchPersons(tx, texto))

/** Asocia una persona a la empresa de la ficha: es el mismo vínculo que Persona → Empresas. */
export const asociarPersonaCon = (conexion: Conexion, principal: Principal, empresaId: string, personaId: string): Promise<PartyEditResult> =>
  esUuid(empresaId) && esUuid(personaId)
    ? conDatos(conexion, principal, (tx) => linkOrganization(tx, personaId, empresaId)).then((r) =>
        r.kind === 'not_found' ? { kind: 'invalid' as const, message: 'Elegí un contacto de la lista.' } : r,
      )
    : Promise.resolve({ kind: 'invalid', message: 'Elegí un contacto de la lista.' })

export const quitarDeEmpresaCon = (conexion: Conexion, principal: Principal, empresaId: string, personaId: string): Promise<PartyEditResult> =>
  esUuid(empresaId) && esUuid(personaId) ? conDatos(conexion, principal, (tx) => unlinkOrganization(tx, personaId, empresaId)) : Promise.resolve(noEncontrado)

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
export const editarRazonSocial = (principal: Principal, partyId: string, nombre: string): Promise<PartyEditResult> =>
  editarRazonSocialCon(sql(), principal, partyId, nombre)
export const editarCuit = (principal: Principal, partyId: string, cuit: string): Promise<PartyEditResult> => editarCuitCon(sql(), principal, partyId, cuit)
export const editarCarpeta = (principal: Principal, partyId: string, url: string): Promise<PartyEditResult> => editarCarpetaCon(sql(), principal, partyId, url)
export const buscarPersonas = (principal: Principal, texto: string): Promise<PersonOption[]> => buscarPersonasCon(sql(), principal, texto)
export const asociarPersona = (principal: Principal, empresaId: string, personaId: string): Promise<PartyEditResult> =>
  asociarPersonaCon(sql(), principal, empresaId, personaId)
export const quitarDeEmpresa = (principal: Principal, empresaId: string, personaId: string): Promise<PartyEditResult> =>
  quitarDeEmpresaCon(sql(), principal, empresaId, personaId)

/** T-0072 — Quién recibe los avisos de WhatsApp del cliente. `null`: nadie asignado (Victoria). */
export const editarResponsableDeMensajesCon = (
  conexion: Conexion,
  principal: Principal,
  partyId: string,
  userId: string | null,
): Promise<PartyEditResult> =>
  !esUuid(partyId)
    ? Promise.resolve(noEncontrado)
    : userId !== null && !esUuid(userId)
      ? Promise.resolve({ kind: 'invalid', message: 'Elegí a alguien del equipo.' })
      : conDatos(conexion, principal, (tx) => updateMessageOwner(tx, partyId, userId))

export const responsableDeMensajesCon = (conexion: Conexion, principal: Principal, partyId: string): Promise<string | null> =>
  esUuid(partyId) ? conDatos(conexion, principal, (tx) => getMessageOwner(tx, partyId)) : Promise.resolve(null)

export const editarResponsableDeMensajes = (principal: Principal, partyId: string, userId: string | null): Promise<PartyEditResult> =>
  editarResponsableDeMensajesCon(sql(), principal, partyId, userId)
export const responsableDeMensajes = (principal: Principal, partyId: string): Promise<string | null> =>
  responsableDeMensajesCon(sql(), principal, partyId)
