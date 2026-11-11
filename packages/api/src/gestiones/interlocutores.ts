// T-0053 — Interlocutores del siniestro. Como toda consulta de Broker OS, corren por
// `conDatos`: como `broker_app`, con el principal declarado y RLS decidiendo el alcance.

import type { ClaimContact, ClaimContactRole, NewClaimContact } from '@del-campo/db'
import {
  CLAIM_CONTACT_ROLES,
  CLAIM_CONTACT_ROLE_LABELS,
  addClaimContact,
  listClaimContacts,
  recordClaimContact,
  updateClaimContact,
} from '@del-campo/db'

import { conDatos } from '../acceso/datos.ts'
import { sql } from '../db.ts'
import type { Principal } from '../session/admission.ts'

export type { ClaimContact, ClaimContactRole, NewClaimContact }

export { CLAIM_CONTACT_ROLES }
export const ROLES_DE_INTERLOCUTOR = CLAIM_CONTACT_ROLE_LABELS

export const esRolDeInterlocutor = (valor: unknown): valor is ClaimContactRole =>
  typeof valor === 'string' && (CLAIM_CONTACT_ROLES as readonly string[]).includes(valor)

export const interlocutores = async (principal: Principal, gestion: string): Promise<ClaimContact[]> =>
  conDatos(sql(), principal, (ejecutor) => listClaimContacts(ejecutor, gestion))

export const sumarInterlocutor = async (principal: Principal, gestion: string, nuevo: NewClaimContact): Promise<string> =>
  conDatos(sql(), principal, (ejecutor) => addClaimContact(ejecutor, gestion, nuevo))

export const registrarContacto = async (
  principal: Principal,
  interlocutor: string,
  comentario: string | null,
  pendiente: string | null | undefined,
): Promise<void> => conDatos(sql(), principal, (ejecutor) => recordClaimContact(ejecutor, interlocutor, comentario, pendiente))

export const cambiarInterlocutor = async (
  principal: Principal,
  interlocutor: string,
  cambio: { readonly pending: string | null; readonly assignedUserId: string | null },
): Promise<void> => conDatos(sql(), principal, (ejecutor) => updateClaimContact(ejecutor, interlocutor, cambio))
