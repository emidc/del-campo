// Por dónde pasa toda consulta y todo envío de la UI, según AUTH_MODE (T-0035):
//
// - `legacy`: como hasta hoy, con la conexión de la app y la credencial compartida
//   (D-0066). Desplegar esto no cambia nada.
// - `oidc`: dentro de `conPrincipal`, como `communication_app` con el principal
//   declarado. La consulta recibe sólo esa transacción: no hay forma de que lea con la
//   conexión de la app, que es dueña de las tablas y no está sujeta a RLS. Antes de
//   correrla, la app decide si el rol puede hacer esa acción y, si no, la explica; RLS
//   decide las filas (D-0022).
//
// Si la persona no tiene credencial vinculada, fue dada de baja o no tiene rol, nada
// corre y se lanza `AccesoDenegado`, que el guard responde igual que una cookie inválida:
// el motivo queda en `audit_event`, no en la respuesta.

import {
  auditar,
  conPrincipal,
  ingresar,
  puede,
  type AccionCommunication,
  type Conexion,
  type MotivoDenegado,
  type PrincipalCommunication,
  type RolInterno,
  type Sql,
} from '@del-campo/communication'
import { decidirLogin, type Identidad } from '@del-campo/identidad'

/**
 * Quién actúa. Con la credencial compartida (`legacy`) no hay persona: `autor` y `rol`
 * son `null`, y la UI se comporta como antes de T-0035.
 */
export interface Actor {
  readonly autor: string | null
  readonly rol: RolInterno | null
}

export type Operacion<T> = (sql: Conexion, actor: Actor) => Promise<T>

/** Si quien actúa puede hacer la acción. Sin persona (`legacy`), lo de siempre: sí. */
export const actorPuede = (actor: Actor, accion: AccionCommunication): boolean =>
  actor.rol === null || puede(actor.rol, accion)

export type Datos = <T>(accion: AccionCommunication, op: Operacion<T>) => Promise<T>

export class AccesoDenegado extends Error {
  readonly motivo: MotivoDenegado

  constructor(motivo: MotivoDenegado) {
    super(`acceso denegado por la base: ${motivo}`)
    this.name = 'AccesoDenegado'
    this.motivo = motivo
  }
}

/** La persona entra, pero su rol no puede hacer esta acción. Se responde 403 explicado. */
export class SinPermiso extends Error {
  readonly accion: AccionCommunication

  constructor(accion: AccionCommunication) {
    super(`el rol no puede: ${accion}`)
    this.name = 'SinPermiso'
    this.accion = accion
  }
}

/** `legacy`: la conexión tal cual. La conexión se pide recién al usarla. */
export const datosLegacy =
  (conexion: () => Sql): Datos =>
  (_accion, op) =>
    op(conexion(), { autor: null, rol: null })

export const datosOidc =
  (conexion: () => Sql, identidad: Pick<Identidad, 'proveedor' | 'sujeto'>): Datos =>
  async <T>(accion: AccionCommunication, op: Operacion<T>): Promise<T> => {
    const sql = conexion()
    const resultado = await conPrincipal(
      sql,
      identidad,
      async (tx, principal: PrincipalCommunication): Promise<{ readonly permitido: true; readonly valor: T } | { readonly permitido: false }> => {
        if (!puede(principal.rol, accion)) {
          // Dentro de la transacción restringida y a nombre de quien lo intentó.
          await auditar(tx, {
            actor: principal.usuarioId,
            origen: 'app',
            accion,
            tipoObjeto: null,
            idObjeto: null,
            resultado: 'denied',
            motivo: 'ROL_SIN_PERMISO',
          })
          return { permitido: false }
        }
        return { permitido: true, valor: await op(tx, { autor: principal.usuarioId, rol: principal.rol }) }
      },
    )
    if (!resultado.ok) {
      await auditar(sql, {
        actor: null,
        origen: 'app',
        accion: 'acceso.consultar',
        tipoObjeto: null,
        idObjeto: null,
        resultado: 'denied',
        motivo: resultado.motivo,
      })
      throw new AccesoDenegado(resultado.motivo)
    }
    if (!resultado.valor.permitido) throw new SinPermiso(accion)
    return resultado.valor.valor
  }

/**
 * La admisión al volver de Google: credencial ya vinculada o invitación vigente para ese
 * email verificado (D-0072, D-0077). Sólo si admite se emite la cookie, que lleva la
 * identidad y no permisos: cada request vuelve a preguntarle a la base.
 */
export const admitirLogin = async (conexion: Sql, identidad: Identidad, ahora: number = Date.now()): Promise<boolean> => {
  const decision = await ingresar(conexion, identidad, (credencial, invitacion) =>
    decidirLogin(identidad, credencial, invitacion, ahora),
  )
  return decision.tipo !== 'RECHAZA'
}
