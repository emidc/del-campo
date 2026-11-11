// T-0045 — Gestiones manuales (C6-01). Como toda consulta de Broker OS, corren por
// `conDatos`: como `broker_app`, con el principal declarado y RLS decidiendo el alcance.

import type {
  ClaimStage,
  NewServiceCase,
  ServiceCaseDetail,
  ServiceCaseEvent,
  ServiceCaseFilter,
  ServiceCaseKind,
  ServiceCaseRequirement,
  ServiceCaseStatus,
  ServiceCaseSummary,
  TeamMember,
  Workload,
} from '@del-campo/db'
import {
  CLAIM_STAGES,
  CLAIM_STAGE_LABELS,
  SERVICE_CASE_KINDS,
  SERVICE_CASE_STATUSES,
  addClaimRequirement,
  addServiceCaseNote,
  assignServiceCase,
  changeServiceCaseStatus,
  createServiceCase,
  getServiceCase,
  getWorkload,
  listAssignableMembers,
  listServiceCases,
  moveClaimStage,
  setClaimRequirementDone,
  takeServiceCase,
} from '@del-campo/db'

import { conDatos } from '../acceso/datos.ts'
import { sql } from '../db.ts'
import type { Principal } from '../session/admission.ts'

export type {
  ClaimStage,
  NewServiceCase,
  ServiceCaseDetail,
  ServiceCaseEvent,
  ServiceCaseFilter,
  ServiceCaseKind,
  ServiceCaseRequirement,
  ServiceCaseStatus,
  ServiceCaseSummary,
  TeamMember,
  Workload,
}
export { CLAIM_STAGES, SERVICE_CASE_KINDS, SERVICE_CASE_STATUSES }

/** T-0050: etiquetas de las etapas de un siniestro. */
export const ETAPAS_DE_SINIESTRO = CLAIM_STAGE_LABELS

export const esEtapaDeSiniestro = (valor: unknown): valor is ClaimStage =>
  typeof valor === 'string' && (CLAIM_STAGES as readonly string[]).includes(valor)

export const TIPOS_DE_GESTION: Readonly<Record<ServiceCaseKind, string>> = {
  SINIESTRO: 'Siniestro',
  ENDOSO: 'Endoso',
  COTIZACION: 'Cotización',
  RENOVACION: 'Renovación',
  RECLAMO_COMPANIA: 'Reclamo a la compañía',
  FACTURACION: 'Facturación',
  OTRO: 'Otro',
}

export const ESTADOS_DE_GESTION: Readonly<Record<ServiceCaseStatus, string>> = {
  ABIERTA: 'Abierta',
  EN_CURSO: 'En curso',
  ESPERANDO_COMPANIA: 'Esperando a la compañía',
  ESPERANDO_CLIENTE: 'Esperando al cliente',
  CERRADA: 'Cerrada',
}

export const esTipoDeGestion = (valor: unknown): valor is ServiceCaseKind =>
  typeof valor === 'string' && (SERVICE_CASE_KINDS as readonly string[]).includes(valor)

export const esEstadoDeGestion = (valor: unknown): valor is ServiceCaseStatus =>
  typeof valor === 'string' && (SERVICE_CASE_STATUSES as readonly string[]).includes(valor)

export const gestiones = async (principal: Principal, filtro: ServiceCaseFilter = {}): Promise<ServiceCaseSummary[]> =>
  conDatos(sql(), principal, (ejecutor) => listServiceCases(ejecutor, filtro))

export const gestion = async (principal: Principal, id: string): Promise<ServiceCaseDetail | null> =>
  conDatos(sql(), principal, (ejecutor) => getServiceCase(ejecutor, id))

export const crearGestion = async (principal: Principal, nueva: NewServiceCase): Promise<string> =>
  conDatos(sql(), principal, (ejecutor) => createServiceCase(ejecutor, nueva))

export const anotarGestion = async (principal: Principal, id: string, nota: string): Promise<void> =>
  conDatos(sql(), principal, (ejecutor) => addServiceCaseNote(ejecutor, id, nota))

export const cambiarEstadoGestion = async (
  principal: Principal,
  id: string,
  estado: ServiceCaseStatus,
  comentario: string | null,
): Promise<void> => conDatos(sql(), principal, (ejecutor) => changeServiceCaseStatus(ejecutor, id, estado, comentario))

export const tomarGestion = async (principal: Principal, id: string): Promise<void> =>
  conDatos(sql(), principal, (ejecutor) => takeServiceCase(ejecutor, id))

export const integrantesAsignables = async (principal: Principal, id: string): Promise<TeamMember[]> =>
  conDatos(sql(), principal, (ejecutor) => listAssignableMembers(ejecutor, id))

export const asignarGestion = async (principal: Principal, id: string, usuario: string | null): Promise<void> =>
  conDatos(sql(), principal, (ejecutor) => assignServiceCase(ejecutor, id, usuario))

export const cargaDelEquipo = async (principal: Principal): Promise<Workload[]> =>
  conDatos(sql(), principal, (ejecutor) => getWorkload(ejecutor))

export const moverEtapaSiniestro = async (principal: Principal, id: string, sentido: 'NEXT' | 'BACK'): Promise<void> =>
  conDatos(sql(), principal, (ejecutor) => moveClaimStage(ejecutor, id, sentido))

export const marcarRequisito = async (principal: Principal, requisito: string, cumplido: boolean): Promise<void> =>
  conDatos(sql(), principal, (ejecutor) => setClaimRequirementDone(ejecutor, requisito, cumplido))

export const agregarRequisito = async (principal: Principal, id: string, etapa: ClaimStage, nombre: string): Promise<void> =>
  conDatos(sql(), principal, (ejecutor) => addClaimRequirement(ejecutor, id, etapa, nombre))
