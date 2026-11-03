// Llamadas de otro contexto a Communication OS con el token de D-0077 (condición 2 de
// D-0022, T-0035).
//
// Cuando Broker OS o Risk OS llamen a Communication OS, viaja la identidad de la persona en
// un token ES256 de 60 s, nunca la cookie ni el ID token de Google. Acá Communication OS:
//
// 1. verifica el token: firma contra el JWKS del emisor, `iss`, `aud` = Communication OS,
//    vencimiento, duración y que el `jti` no se haya usado (`verificarToken`);
// 2. aplica **su propia admisión** con la identidad del token: credencial externa
//    vinculada, usuario activo, rol que puede hacer la acción, y RLS (`datosOidc`). El
//    token prueba quién es la persona, nunca qué puede: una baja en Communication OS corta
//    la llamada aunque el token sea válido.
//
// Todavía no hay llamadas reales: ningún endpoint usa esto (lo exige `deny.test.ts`) y no
// se publica ninguno de prueba. Cuando exista la primera, el JWKS del emisor y el registro
// de `jti` en la base se configuran con ella.

import { verificarToken, type RechazoToken, type Verificacion } from '@del-campo/identidad'
import { auditar, type AccionCommunication, type MotivoDenegado, type Sql } from '@del-campo/communication'

import { AccesoDenegado, datosOidc, SinPermiso, type Operacion } from './acceso.ts'

/** Identifica a Communication OS como destino, en `aud`. */
export const AUDIENCIA_COMMUNICATION = 'communication-os'

export type Llamada<T> =
  | { readonly ok: true; readonly valor: T }
  | { readonly ok: false; readonly token: RechazoToken }
  | { readonly ok: false; readonly denegado: MotivoDenegado }
  | { readonly ok: false; readonly sinPermiso: AccionCommunication }

/**
 * Admite una llamada de otro contexto y corre `op` como la persona del token, con la
 * matriz y RLS de Communication OS. Un token rechazado no toca los datos y queda auditado
 * con su motivo, sin el token.
 */
export const admitirLlamada = async <T>(
  conexion: () => Sql,
  token: string,
  verificacion: Verificacion,
  accion: AccionCommunication,
  op: Operacion<T>,
): Promise<Llamada<T>> => {
  if (verificacion.audiencia !== AUDIENCIA_COMMUNICATION) {
    throw new Error(`la audiencia de Communication OS es ${AUDIENCIA_COMMUNICATION}`)
  }
  const r = await verificarToken(token, verificacion)
  if (!r.ok) {
    await auditar(conexion(), {
      actor: null,
      origen: 'app',
      accion: 'acceso.token',
      tipoObjeto: null,
      idObjeto: null,
      resultado: 'denied',
      motivo: r.motivo,
    })
    return { ok: false, token: r.motivo }
  }
  try {
    return { ok: true, valor: await datosOidc(conexion, { proveedor: r.proveedor, sujeto: r.sujeto })(accion, op) }
  } catch (e) {
    if (e instanceof AccesoDenegado) return { ok: false, denegado: e.motivo }
    if (e instanceof SinPermiso) return { ok: false, sinPermiso: e.accion }
    throw e
  }
}
