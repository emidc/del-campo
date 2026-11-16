// Base de los tests de integración de Comunicación: la misma de Broker (DATABASE_URL, con
// 0021 aplicada). El receptor y el reproceso abren sus propias transacciones, así que
// estos tests no pueden revertir: vacían las tablas de `communication`, que ningún otro
// test deja con datos. La guarda de scripts/guard-db-tests.mjs ya validó que la base es
// local y de prueba.

import postgres from 'postgres'

import type { Sql } from './database.ts'

export const testDatabaseUrl = (): string => {
  const url = process.env.DATABASE_URL
  if (url === undefined || url === '') {
    throw new Error('DATABASE_URL no está configurada: Comunicación requiere PostgreSQL real.')
  }
  return url
}

export const openTestDatabase = (): Promise<Sql> =>
  Promise.resolve(postgres(testDatabaseUrl(), { max: 5, prepare: false, onnotice: () => undefined }))

export const truncateAll = async (sql: Sql): Promise<void> => {
  await sql`
    truncate communication.webhook_delivery, communication.message,
             communication.outbound_status, communication.unsupported_message,
             communication.outbound_attempt
    restart identity`
}
