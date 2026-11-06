// Por dónde pasa toda consulta de datos de Broker OS (T-0035, plan de migración §3): dentro
// de `conPrincipal`, como `broker_app` con el principal declarado, y `afirmarRestringida`
// antes de correr la consulta. El camino `legacy`, con la conexión de la app, se retiró en
// la fase 5. La consulta recibe sólo esa transacción: no hay forma de que lea con la
// conexión privilegiada, que es dueña de las tablas y no está sujeta a RLS. Si la persona
// no tiene credencial vinculada, fue dada de baja o no tiene rol, la consulta no corre y se
// lanza `AccesoDenegado`.

import type { Identidad } from '@del-campo/identidad'
import type postgres from 'postgres'

import type { Principal } from '../session/admission.ts'
import type { Conexion } from './base.ts'
import { afirmarRestringida, auditar, conPrincipal } from './base.ts'

/** Lo que recibe una consulta: la transacción restringida, como `broker_app`. */
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
): Promise<T> => {
  const resultado = await conPrincipal(conexion, identidadDe(principal), async (tx) => {
    await afirmarRestringida(tx)
    return consulta(tx)
  })
  if (!resultado.ok) {
    // El motivo queda en el servidor, en la auditoría; hacia afuera la respuesta es la
    // misma que para cualquier cuenta no admitida (ver `guarded`).
    await auditar(conexion, {
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
  return resultado.valor
}
