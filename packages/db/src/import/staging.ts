// T-0013, paso 3 — carga cada módulo fuente en su tabla de staging, upsert por
// (module, source_record_id) para que correr esto dos veces deje la misma fila, no dos.

import type { Ejecutor } from './db.ts'

import { leerCsv } from './csv.ts'
import { CAMPOS_CONTACTO, CAMPOS_CUENTA, CAMPOS_ENDOSO, CAMPOS_POLIZA } from './zoho-fields.ts'

export interface RutaModulo {
  readonly ruta: string
}

/** Zoho representa "sin valor" como cadena vacía, no como columna ausente. */
const vacioComoNulo = (valor: string | undefined): string | null =>
  valor === undefined || valor === '' ? null : valor

const cargarModulo = async (
  sql: Ejecutor,
  batchId: string,
  tabla: 'staging_policy' | 'staging_endorsement' | 'staging_contact' | 'staging_account',
  ruta: string,
  idDeRegistroHeader: string,
  columnasExtra: (fila: Record<string, string>) => Record<string, string | null>,
): Promise<number> => {
  let contador = 0
  for await (const fila of leerCsv(ruta)) {
    const sourceRecordId = fila[idDeRegistroHeader]
    if (sourceRecordId === undefined || sourceRecordId === '') {
      throw new Error(`${tabla}: fila sin "${idDeRegistroHeader}" en ${ruta}`)
    }
    const extra = columnasExtra(fila)
    const columnas = ['source_record_id', 'batch_id', ...Object.keys(extra), 'raw']
    // `postgres.js` serializa automáticamente el parámetro que cae en un placeholder
    // `::jsonb`: pasar el objeto tal cual, no un `JSON.stringify` propio. Stringificarlo
    // acá y dejar que el driver lo serialice de nuevo produce un jsonb doblemente
    // codificado — un escalar string con el documento entero adentro, no un objeto — sin
    // que ningún tipo ni constraint lo note. La prueba de regresión vive en
    // `staging.integration.test.ts`.
    const valores = [sourceRecordId, batchId, ...Object.values(extra), fila]
    const asignaciones = columnas
      .filter((c) => c !== 'source_record_id')
      .map((c) => `${c} = excluded.${c}`)
      .join(', ')
    const placeholders = columnas.map((columna, i) =>
      columna === 'raw' ? `$${String(i + 1)}::jsonb` : `$${String(i + 1)}`,
    )

    await sql.unsafe(
      `insert into ${tabla} (${columnas.join(', ')}) values (${placeholders.join(', ')}) ` +
        `on conflict (source_record_id) do update set ${asignaciones}`,
      valores,
    )
    contador += 1
  }
  return contador
}

export const cargarPolizas = (sql: Ejecutor, batchId: string, ruta: string): Promise<number> =>
  cargarModulo(sql, batchId, 'staging_policy', ruta, CAMPOS_POLIZA.idDeRegistro, (fila) => ({
    contact_source_id: vacioComoNulo(fila[CAMPOS_POLIZA.contactoId]),
    account_source_id: vacioComoNulo(fila[CAMPOS_POLIZA.cuentaId]),
    insurer_source_id: vacioComoNulo(fila[CAMPOS_POLIZA.companiaId]),
  }))

export const cargarEndosos = (sql: Ejecutor, batchId: string, ruta: string): Promise<number> =>
  cargarModulo(sql, batchId, 'staging_endorsement', ruta, CAMPOS_ENDOSO.idDeRegistro, (fila) => ({
    policy_source_id: vacioComoNulo(fila[CAMPOS_ENDOSO.perteneceAPolizaNId]),
  }))

export const cargarContactos = (sql: Ejecutor, batchId: string, ruta: string): Promise<number> =>
  cargarModulo(sql, batchId, 'staging_contact', ruta, CAMPOS_CONTACTO.idDeRegistro, (fila) => ({
    account_source_id: vacioComoNulo(fila[CAMPOS_CONTACTO.nombreDeCuentaId]),
  }))

export const cargarCuentas = (sql: Ejecutor, batchId: string, ruta: string): Promise<number> =>
  cargarModulo(sql, batchId, 'staging_account', ruta, CAMPOS_CUENTA.idDeRegistro, () => ({}))
