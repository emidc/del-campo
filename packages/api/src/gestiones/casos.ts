// T-0045 — Gestiones manuales (C6-01). Como toda consulta de Broker OS, corren por
// `conDatos`: como `broker_app`, con el principal declarado y RLS decidiendo el alcance.

import type {
  ClaimStage,
  InsurerOption,
  NewServiceCase,
  QuoteAnswer,
  QuoteCurrency,
  QuoteOption,
  QuoteOptionStatus,
  QuoteProgress,
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
  QUOTE_CURRENCIES,
  chooseQuoteOption,
  declineQuoteOption,
  formatQuotePremium,
  listActiveInsurers,
  recordQuoteAnswer,
  requestQuoteOption,
  unchooseQuoteOption,
} from '@del-campo/db'

import { conDatos } from '../acceso/datos.ts'
import { sql } from '../db.ts'
import type { Principal } from '../session/admission.ts'

export type {
  ClaimStage,
  InsurerOption,
  NewServiceCase,
  QuoteAnswer,
  QuoteCurrency,
  QuoteOption,
  QuoteOptionStatus,
  QuoteProgress,
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
export { CLAIM_STAGES, QUOTE_CURRENCIES, SERVICE_CASE_KINDS, SERVICE_CASE_STATUSES, formatQuotePremium }

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

/** T-0051: estados de una propuesta de cotización. */
export const ESTADOS_DE_PROPUESTA: Readonly<Record<QuoteOptionStatus, string>> = {
  PEDIDA: 'Pedida',
  COTIZADA: 'Cotizada',
  DECLINADA: 'No cotiza',
  ELEGIDA: 'Elegida',
}

export const esMonedaDeCotizacion = (valor: unknown): valor is QuoteCurrency =>
  typeof valor === 'string' && (QUOTE_CURRENCIES as readonly string[]).includes(valor)

export const companiasActivas = async (principal: Principal): Promise<InsurerOption[]> =>
  conDatos(sql(), principal, (ejecutor) => listActiveInsurers(ejecutor))

export const pedirCotizacion = async (principal: Principal, id: string, compania: string): Promise<void> =>
  conDatos(sql(), principal, (ejecutor) => requestQuoteOption(ejecutor, id, compania))

export const registrarCotizacion = async (principal: Principal, propuesta: string, respuesta: QuoteAnswer): Promise<void> =>
  conDatos(sql(), principal, (ejecutor) => recordQuoteAnswer(ejecutor, propuesta, respuesta))

export const noCotiza = async (principal: Principal, propuesta: string): Promise<void> =>
  conDatos(sql(), principal, (ejecutor) => declineQuoteOption(ejecutor, propuesta))

export const elegirPropuesta = async (principal: Principal, propuesta: string): Promise<void> =>
  conDatos(sql(), principal, (ejecutor) => chooseQuoteOption(ejecutor, propuesta))

export const deshacerEleccion = async (principal: Principal, propuesta: string): Promise<void> =>
  conDatos(sql(), principal, (ejecutor) => unchooseQuoteOption(ejecutor, propuesta))
