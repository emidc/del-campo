// T-0048 — Renovaciones (C6-02b). Vista derivada de las pólizas vigentes; corre por
// `conDatos`, como `broker_app`, con RLS decidiendo qué pólizas ve la persona.

import type { RenewalFilter, RenewalItem, RenewalMode, RenewalState } from '@del-campo/db'
import { listRenewals } from '@del-campo/db'

import { conDatos } from '../acceso/datos.ts'
import { sql } from '../db.ts'
import type { Principal } from '../session/admission.ts'

export type { RenewalFilter, RenewalItem, RenewalMode, RenewalState }

export const MODOS_DE_RENOVACION: Readonly<Record<RenewalMode, string>> = {
  AUTOMATIC: 'Automática',
  MANUAL: 'Manual',
}

export const ESTADOS_DE_RENOVACION: Readonly<Record<RenewalState, string>> = {
  PENDIENTE: 'Pendiente',
  CON_GESTION: 'Con gestión',
  RENOVADA: 'Renovada',
}

export const esModoDeRenovacion = (valor: unknown): valor is RenewalMode =>
  valor === 'AUTOMATIC' || valor === 'MANUAL'

export const esEstadoDeRenovacion = (valor: unknown): valor is RenewalState =>
  valor === 'PENDIENTE' || valor === 'CON_GESTION' || valor === 'RENOVADA'

export const renovaciones = async (principal: Principal, filtro: RenewalFilter): Promise<RenewalItem[]> =>
  conDatos(sql(), principal, (ejecutor) => listRenewals(ejecutor, filtro))
