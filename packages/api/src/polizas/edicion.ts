// Pólizas editables desde la app: edición por campo, renovación, refacturación, borrado
// definitivo y vencimiento automático. Como toda escritura de Broker OS, corre por
// `conDatos`: como `broker_app`, a nombre de quien actúa, con RLS decidiendo y en una sola
// transacción. El vencimiento corre fuera de la sesión, con la conexión de la app.

import type {
  CancelResult,
  DeleteBlocker,
  EditResult,
  EndorsementEdit,
  PolicyField,
  PolicyTerms,
  RebillingInput,
  RebillingResult,
  RenewResult,
  RenewalInput,
} from '@del-campo/db'
import {
  POLICY_FIELDS,
  cancelOption,
  cancelPolicy,
  deletePolicy,
  effectiveStatus,
  expirePolicies,
  isPolicyField,
  nextEndorsementNumber,
  registerRebilling,
  renewPolicy,
  todayInMendoza,
  undoCancelPolicy,
  updateEndorsement,
  updatePolicyField,
} from '@del-campo/db'

import type { Conexion } from '../acceso/base.ts'
import { conDatos } from '../acceso/datos.ts'
import { jobDenial } from '../comunicacion/entrada.ts'
import { sql } from '../db.ts'
import type { Principal } from '../session/admission.ts'

export type { CancelResult, DeleteBlocker, EditResult, EndorsementEdit, PolicyField, PolicyTerms, RebillingInput, RebillingResult, RenewResult, RenewalInput }
export { POLICY_FIELDS, cancelOption, effectiveStatus, isPolicyField, todayInMendoza }

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
export const esUuid = (valor: string): boolean => UUID.test(valor)

/** Cómo se nombra cada vínculo que impide borrar. */
export const BLOQUEOS: Readonly<Record<DeleteBlocker, string>> = {
  POLIZAS: 'pólizas',
  GESTIONES: 'gestiones',
  TAREAS: 'tareas',
}

/** «Tiene gestiones y tareas vinculadas.» */
export const describirBloqueos = (bloqueos: readonly DeleteBlocker[]): string => {
  const nombres = bloqueos.map((b) => BLOQUEOS[b])
  const lista = nombres.length <= 1 ? (nombres[0] ?? '') : `${nombres.slice(0, -1).join(', ')} y ${nombres.at(-1) ?? ''}`
  return `Tiene ${lista} vinculadas.`
}

export const editarCampoDePolizaCon = (
  conexion: Conexion,
  principal: Principal,
  policyId: string,
  campo: PolicyField,
  valor: string,
): Promise<EditResult> =>
  esUuid(policyId)
    ? conDatos(conexion, principal, (tx) => updatePolicyField(tx, policyId, campo, valor))
    : Promise.resolve({ kind: 'not_found' })

export const renovarPolizaCon = (conexion: Conexion, principal: Principal, datos: RenewalInput): Promise<RenewResult> =>
  esUuid(datos.previousPolicyId) && esUuid(datos.insurerId)
    ? conDatos(conexion, principal, (tx) => renewPolicy(tx, datos))
    : Promise.resolve({ kind: 'invalid', message: 'Elegí la compañía.' })

export const siguienteEndosoCon = (conexion: Conexion, principal: Principal, policyId: string): Promise<number> =>
  esUuid(policyId) ? conDatos(conexion, principal, (tx) => nextEndorsementNumber(tx, policyId)) : Promise.resolve(1)

export const refacturarCon = (conexion: Conexion, principal: Principal, datos: RebillingInput): Promise<RebillingResult> =>
  esUuid(datos.policyId)
    ? conDatos(conexion, principal, (tx) => registerRebilling(tx, datos))
    : Promise.resolve({ kind: 'not_found' })

export const editarEndosoCon = (conexion: Conexion, principal: Principal, datos: EndorsementEdit): Promise<EditResult> =>
  esUuid(datos.policyId) && esUuid(datos.endorsementId)
    ? conDatos(conexion, principal, (tx) => updateEndorsement(tx, datos))
    : Promise.resolve({ kind: 'not_found' })

/** Anula la póliza o deshace la anulación, con la fecha de hoy en Mendoza. */
export const anularPolizaCon = (
  conexion: Conexion,
  principal: Principal,
  policyId: string,
  deshacer: boolean,
  hoy: string = todayInMendoza(),
): Promise<CancelResult> =>
  esUuid(policyId)
    ? conDatos(conexion, principal, (tx) => (deshacer ? undoCancelPolicy(tx, policyId, hoy) : cancelPolicy(tx, policyId, hoy)))
    : Promise.resolve({ kind: 'not_found' })

export const eliminarPolizaCon = (conexion: Conexion, principal: Principal, policyId: string): Promise<DeleteBlocker[]> =>
  conDatos(conexion, principal, (tx) => deletePolicy(tx, policyId))

export const editarCampoDePoliza = (principal: Principal, policyId: string, campo: PolicyField, valor: string): Promise<EditResult> =>
  editarCampoDePolizaCon(sql(), principal, policyId, campo, valor)
export const renovarPoliza = (principal: Principal, datos: RenewalInput): Promise<RenewResult> => renovarPolizaCon(sql(), principal, datos)
export const siguienteEndoso = (principal: Principal, policyId: string): Promise<number> => siguienteEndosoCon(sql(), principal, policyId)
export const refacturar = (principal: Principal, datos: RebillingInput): Promise<RebillingResult> => refacturarCon(sql(), principal, datos)
export const editarEndoso = (principal: Principal, datos: EndorsementEdit): Promise<EditResult> => editarEndosoCon(sql(), principal, datos)
export const anularPoliza = (principal: Principal, policyId: string, deshacer: boolean): Promise<CancelResult> =>
  anularPolizaCon(sql(), principal, policyId, deshacer)
export const eliminarPoliza = (principal: Principal, policyId: string): Promise<DeleteBlocker[]> =>
  eliminarPolizaCon(sql(), principal, policyId)

/**
 * Vencimiento automático. Vercel la llama todos los días a las 03:00 UTC, que son las
 * 00:00 de Mendoza (Argentina no tiene horario de verano). Exige `CRON_SECRET`.
 */
export const tareaDeVencimiento = async (
  request: Request,
  env: Readonly<Record<string, string | undefined>> = process.env,
  conexion: () => Conexion = sql,
  ahora: () => Date = () => new Date(),
): Promise<Response> => {
  const denied = jobDenial(request, env)
  if (denied !== null) return denied
  const hoy = todayInMendoza(ahora())
  const vencidas = await expirePolicies(conexion(), hoy)
  await conexion()`
    insert into audit_event (actor_user_id, origin, action, object_type, object_id, outcome)
    values (null, 'worker', 'policy.expire', null, ${String(vencidas)}, 'ok')`
  return new Response(JSON.stringify({ hoy, vencidas }), { headers: { 'content-type': 'application/json' } })
}
