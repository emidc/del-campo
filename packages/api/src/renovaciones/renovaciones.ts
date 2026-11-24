// T-0048 — Renovaciones (C6-02b). Vista derivada de las pólizas vigentes; corre por
// `conDatos`, como `broker_app`, con RLS decidiendo qué pólizas ve la persona.

import type { RenewalFilter, RenewalItem, RenewalMode, RenewalState } from '@del-campo/db'
import { cleanRenewalComment, listRenewals, saveRenewalComment } from '@del-campo/db'

import type { Conexion } from '../acceso/base.ts'
import { conDatos } from '../acceso/datos.ts'
import { sql } from '../db.ts'
import { esUuid } from '../polizas/edicion.ts'
import type { Principal } from '../session/admission.ts'

export type { RenewalFilter, RenewalItem, RenewalMode, RenewalState }

export const ESTADOS_DE_RENOVACION: Readonly<Record<RenewalState, string>> = {
  PENDIENTE: 'Pendiente',
  CON_GESTION: 'Con gestión',
  RENOVADA: 'Renovada',
}

export const renovaciones = async (principal: Principal, filtro: RenewalFilter): Promise<RenewalItem[]> =>
  conDatos(sql(), principal, (ejecutor) => listRenewals(ejecutor, filtro))

export type ResultadoDeComentario = 'guardado' | 'largo' | 'inexistente'

/** Escribe el comentario de renovación de una póliza; vacío lo borra. */
export const comentarRenovacionCon = async (
  conexion: Conexion,
  principal: Principal,
  policyId: string,
  texto: string,
): Promise<ResultadoDeComentario> => {
  if (!esUuid(policyId)) return 'inexistente'
  const limpio = cleanRenewalComment(texto)
  if (limpio === null) return 'largo'
  return (await conDatos(conexion, principal, (tx) => saveRenewalComment(tx, policyId, limpio))) ? 'guardado' : 'inexistente'
}

export const comentarRenovacion = (principal: Principal, policyId: string, texto: string): Promise<ResultadoDeComentario> =>
  comentarRenovacionCon(sql(), principal, policyId, texto)
