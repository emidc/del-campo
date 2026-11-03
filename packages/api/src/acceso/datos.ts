// Por dónde pasa toda consulta de datos de Broker OS, según `AUTH_MODE` (T-0035, plan de
// migración §3):
//
// - `legacy`: como hasta hoy, con la conexión de la app. La admisión ya la hizo el guard
//   de sesión de VS01 (D-0059) y no hay alcance por cliente. Desplegar esto no cambia nada.
// - `oidc`: dentro de `conPrincipal`, como `broker_app` con el principal declarado, y
//   `afirmarRestringida` antes de correr la consulta. La consulta recibe sólo esa
//   transacción: no hay forma de que lea con la conexión privilegiada, que es dueña de
//   las tablas y no está sujeta a RLS. Si la persona no tiene credencial vinculada, fue
//   dada de baja o no tiene rol, la consulta no corre y se lanza `AccesoDenegado`.

import type { Identidad } from '@del-campo/identidad'
import type postgres from 'postgres'

import type { Principal } from '../session/admission.ts'
import type { Conexion } from './base.ts'
import { afirmarRestringida, conPrincipal } from './base.ts'
import type { ModoAcceso } from './modo.ts'
import { modoAcceso } from './modo.ts'

/** Lo que recibe una consulta: la conexión en `legacy`, la transacción restringida en `oidc`. */
export type Ejecutor = postgres.Sql | postgres.TransactionSql

export type MotivoDenegado = 'SIN_CREDENCIAL' | 'SIN_ACCESO'

/** La persona pasó el guard de sesión pero la base no la admite. Una ruta lo traduce a 403. */
export class AccesoDenegado extends Error {
  readonly motivo: MotivoDenegado

  constructor(motivo: MotivoDenegado) {
    super(`acceso denegado por la base: ${motivo}`)
    this.name = 'AccesoDenegado'
    this.motivo = motivo
  }
}

/**
 * La identidad de D-0077 a partir del principal del guard. El guard ya exigió un email
 * verificado; lo que identifica a la persona en la base es el `sub`, no el email.
 */
export const identidadDe = (principal: Principal): Identidad => ({
  proveedor: 'google',
  sujeto: principal.sub,
  email: principal.email,
  emailVerificado: true,
  nombre: principal.displayName,
})

export const conDatos = async <T>(
  conexion: Conexion,
  principal: Principal,
  consulta: (ejecutor: Ejecutor) => Promise<T>,
  modo: ModoAcceso = modoAcceso(),
): Promise<T> => {
  if (modo === 'legacy') return consulta(conexion)

  const resultado = await conPrincipal(conexion, identidadDe(principal), async (tx) => {
    await afirmarRestringida(tx)
    return consulta(tx)
  })
  if (!resultado.ok) throw new AccesoDenegado(resultado.motivo)
  return resultado.valor
}
