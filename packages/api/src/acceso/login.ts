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
//
// `ingresar` mira la credencial y el estado, no el rol: una persona activa y sin rol pasaría
// y recibiría una sesión que no lee nada, y esa sesión la distinguiría hacia afuera de una
// cuenta no invitada. Por eso, antes de admitir, la misma pregunta que hace cada consulta.

import type { Identidad } from '@del-campo/identidad'

import { sql } from '../db.ts'
import type { AdmissionConfig, AdmissionDenial, IdentityClaims } from '../session/admission.ts'
import { evaluateAdmission } from '../session/admission.ts'
import type { Conexion } from './base.ts'
import { ingresar } from './base.ts'
import { AccesoDenegado, conDatos } from './datos.ts'

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
  if (decision.tipo === 'RECHAZA') return { admitido: false, motivo: 'NOT_ADMITTED' }

  try {
    // Sin credencial, de baja o sin rol: `conDatos` lo deja auditado (`acceso.consultar`).
    await conDatos(conexion, outcome.principal, () => Promise.resolve(), 'oidc')
  } catch (error) {
    if (error instanceof AccesoDenegado) return { admitido: false, motivo: 'NOT_ADMITTED' }
    throw error
  }
  return { admitido: true }
}
