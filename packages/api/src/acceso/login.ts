// La admisión al volver de Google, en los dos modos (T-0035, plan de migración §3).
//
// - `legacy`: la regla de D-0059 (email verificado, Workspace y lista del owner), sin base.
// - `oidc`: email verificado y después `ingresar`, que exige una credencial ya vinculada o
//   una invitación vigente para ese email y, si la hay, vincula la credencial (D-0077).
//   Cualquier rechazo de la base sale como NOT_ADMITTED, igual que una cuenta fuera de la
//   lista: el motivo específico queda en `audit_event` (`acceso.ingresar`), no en la URL.
//
// Sólo si esto admite se emite la cookie de sesión. La cookie lleva la identidad, no
// permisos: en cada consulta, `conDatos` vuelve a preguntarle a la base.

import type { Identidad } from '@del-campo/identidad'

import { sql } from '../db.ts'
import type { AdmissionConfig, AdmissionDenial, IdentityClaims } from '../session/admission.ts'
import { evaluateAdmission } from '../session/admission.ts'
import type { Conexion } from './base.ts'
import { ingresar } from './base.ts'

export type ResultadoLogin =
  | { readonly admitido: true }
  | { readonly admitido: false; readonly motivo: AdmissionDenial }

export const identidadDeClaims = (claims: IdentityClaims): Identidad => ({
  proveedor: 'google',
  sujeto: claims.sub,
  email: claims.email,
  emailVerificado: claims.emailVerified,
  nombre: claims.displayName,
})

export const admitirLogin = async (
  claims: IdentityClaims,
  config: AdmissionConfig,
  conexion: Conexion = sql(),
  ahora: number = Date.now(),
): Promise<ResultadoLogin> => {
  const outcome = evaluateAdmission({ kind: 'CLAIMS', claims }, config)
  if (!outcome.admitted) return { admitido: false, motivo: outcome.reason }
  if (!('modo' in config)) return { admitido: true }

  const decision = await ingresar(conexion, identidadDeClaims(claims), ahora)
  return decision.tipo === 'RECHAZA' ? { admitido: false, motivo: 'NOT_ADMITTED' } : { admitido: true }
}
