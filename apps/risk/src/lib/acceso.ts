// Por dónde pasa toda consulta y toda escritura de la UI, según AUTH_MODE (T-0035):
//
// - `legacy`: como hasta hoy, con la conexión de la app y la sesión de usuario y contraseña
//   (D-0069). La sesión no trae rol y Risk OS se comporta igual que antes. Desplegar esto no
//   cambia nada.
// - `oidc`: dentro de `conPrincipal`, como `risk_persona` con el principal declarado. El
//   handler o la página reciben sólo esa transacción: no hay forma de leer con la conexión de
//   la app. La sesión trae el rol que la base resolvió en este request, y con él los casos de
//   uso aplican la matriz aprobada; RLS decide las filas (D-0022).
//
// Si la persona no tiene credencial vinculada, fue dada de baja o no tiene rol, nada corre: se
// responde igual que sin sesión y el motivo queda en `evento_auditoria`, no en la respuesta.

import {
  auditar, conPrincipal, ingresar, SIN_ORDEN_PREVIO, SinPermiso, TRABAJO_PROPIO,
  type MotivoDenegado, type PrincipalRisk, type Sesion, type Sql, type TransactionSql,
} from '@del-campo/risk'
import { decidirLogin, type Identidad } from '@del-campo/identidad'

type Db = Sql | TransactionSql

/** La sesión que reciben los casos de uso en `oidc`: la persona, con el rol de este request. */
export const sesionDe = (p: PrincipalRisk): Sesion => ({ personaId: p.personaId, nombre: p.nombre, credencialId: p.credencialId, rol: p.rol })

export type Corrida<T> =
  | { readonly ok: true; readonly valor: T }
  | { readonly ok: false; readonly denegado: MotivoDenegado }
  | { readonly ok: false; readonly sinPermiso: SinPermiso }

/** El motivo de auditoría de un `SinPermiso`: cuál de las tres reglas lo negó. */
export const motivoSinPermiso = (e: SinPermiso): string =>
  e.message === SIN_ORDEN_PREVIO ? 'SIN_ORDEN_PREVIO' : e.message === TRABAJO_PROPIO ? 'TRABAJO_PROPIO' : 'ROL_SIN_PERMISO'

/** Deja el evento de una acción que la matriz negó. Sin el objeto: sólo quién, qué y por qué. */
export const auditarSinPermiso = (db: Db, personaId: string, e: SinPermiso): Promise<void> =>
  auditar(db, {
    actor: personaId, origen: 'app', accion: e.accion, tipoObjeto: null, idObjeto: null, resultado: 'denied', motivo: motivoSinPermiso(e),
  })

/**
 * Corre `accion` como la persona de `identidad`. Un `SinPermiso` que sale de `accion` revierte
 * su transacción entera y se audita aparte, con la conexión de la app, a nombre de quien lo
 * intentó. Una negativa de la base también se audita, sin actor.
 */
export const correrComo = async <T>(
  conexion: Db,
  identidad: Pick<Identidad, 'proveedor' | 'sujeto'>,
  accion: (tx: TransactionSql, sesion: Sesion) => Promise<T>,
): Promise<Corrida<T>> => {
  // Quién era, para auditar un `SinPermiso` después de que su transacción se revirtió.
  const quien: { id: string | null } = { id: null }
  try {
    const r = await conPrincipal(conexion, identidad, (tx, principal) => {
      quien.id = principal.personaId
      return accion(tx, sesionDe(principal))
    })
    if (r.ok) return r
    await auditar(conexion, {
      actor: null, origen: 'app', accion: 'acceso.consultar', tipoObjeto: null, idObjeto: null, resultado: 'denied', motivo: r.motivo,
    })
    return { ok: false, denegado: r.motivo }
  } catch (e) {
    if (!(e instanceof SinPermiso) || quien.id === null) throw e
    await auditarSinPermiso(conexion, quien.id, e)
    return { ok: false, sinPermiso: e }
  }
}

/**
 * La admisión al volver de Google: credencial ya vinculada o invitación vigente para ese email
 * verificado (D-0072, D-0077). Sólo si admite se emite la cookie, que lleva la identidad y no
 * permisos: cada request vuelve a preguntarle a la base.
 */
export const admitirLogin = async (conexion: Db, identidad: Identidad, ahora: number = Date.now()): Promise<boolean> => {
  const decision = await ingresar(conexion, identidad, (credencial, invitacion) => decidirLogin(identidad, credencial, invitacion, ahora))
  return decision.tipo !== 'RECHAZA'
}
