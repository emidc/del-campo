// Llamadas de otro contexto a Risk OS con el token de D-0077 (condición 2 de D-0022, T-0035).
//
// Cuando Broker OS llame a Risk OS, viaja la identidad de la persona en un token ES256 de
// 60 s, nunca la cookie ni el ID token de Google. Acá Risk OS:
//
// 1. verifica el token: firma contra el JWKS del emisor, `iss`, `aud` = Risk OS,
//    vencimiento, duración y que el `jti` no se haya usado (`verificarToken`);
// 2. aplica **su propia admisión** con la identidad del token: credencial externa vinculada,
//    rol vigente, y RLS con sus asignaciones (`correrComo`). El token prueba quién es la
//    persona, nunca qué puede: una baja en Risk OS corta la llamada aunque el token sea
//    válido, y el alcance es el de Risk OS, no el del contexto que llama.
//
// Todavía no hay llamadas reales: ningún endpoint usa esto (lo exige `deny.test.ts`) y no se
// publica ninguno de prueba. Cuando exista la primera, el JWKS del emisor y el registro de
// `jti` en la base se configuran con ella.

import { verificarToken, type RechazoToken, type Verificacion } from '@del-campo/identidad'
import { auditar, type Sesion, type Sql, type TransactionSql } from '@del-campo/risk'

import { correrComo, type Corrida } from './acceso.ts'

type Db = Sql | TransactionSql

/** Identifica a Risk OS como destino, en `aud`. */
export const AUDIENCIA_RISK = 'risk-os'

export type Llamada<T> = Corrida<T> | { readonly ok: false; readonly token: RechazoToken }

/**
 * Admite una llamada de otro contexto y corre `accion` como la persona del token, con la
 * matriz y el alcance de Risk OS. Un token rechazado no toca los datos y queda auditado con
 * su motivo, sin el token.
 */
export const admitirLlamada = async <T>(
  conexion: Db,
  token: string,
  verificacion: Verificacion,
  accion: (tx: TransactionSql, sesion: Sesion) => Promise<T>,
): Promise<Llamada<T>> => {
  if (verificacion.audiencia !== AUDIENCIA_RISK) throw new Error(`la audiencia de Risk OS es ${AUDIENCIA_RISK}`)
  const r = await verificarToken(token, verificacion)
  if (!r.ok) {
    await auditar(conexion, {
      actor: null, origen: 'app', accion: 'acceso.token', tipoObjeto: null, idObjeto: null, resultado: 'denied', motivo: r.motivo,
    })
    return { ok: false, token: r.motivo }
  }
  return correrComo(conexion, { proveedor: r.proveedor, sujeto: r.sujeto }, accion)
}
