// Comunicación vive en la base de Broker OS, en el esquema `communication` (0021). Acá
// sólo están los tipos de conexión que comparte la persistencia.

import type postgres from 'postgres'

export type Sql = postgres.Sql
export type TransactionSql = postgres.TransactionSql
/** Una conexión, o una transacción ya abierta (la de `conDatos`, como `broker_app`). */
export type Conexion = Sql | TransactionSql

/** Corre `accion` en una transacción propia, o en un savepoint si ya hay una abierta. */
export const enTransaccion = <T>(conexion: Conexion, accion: (tx: TransactionSql) => Promise<T>): Promise<T> =>
  ('savepoint' in conexion ? conexion.savepoint(accion) : conexion.begin(accion)) as Promise<T>
