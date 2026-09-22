// Lector de CSV de Zoho, streaming: nunca carga un archivo completo en memoria del
// proceso Node de una sola vez, y mucho menos lo imprime. `csv-parse` (agregada por esta
// tarea) resuelve comillas/comas/saltos de línea embebidos correctamente — un split(',')
// a mano corrompería en silencio cualquier domicilio o descripción con coma adentro,
// exactamente el tipo de dato real que este importador tiene que tratar con cuidado.

import { createReadStream } from 'node:fs'

import { parse } from 'csv-parse'

/** Una fila como objeto header→valor, en el orden en que csv-parse las entrega. */
export async function* leerCsv(ruta: string): AsyncGenerator<Record<string, string>> {
  const parser = createReadStream(ruta).pipe(
    parse({ columns: true, skip_empty_lines: false, relax_column_count: false }),
  )
  for await (const fila of parser as AsyncIterable<Record<string, string>>) {
    yield fila
  }
}
