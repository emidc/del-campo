// Caso de uso: importar un lote de los tres CSV, todo o nada (T-0029, RO01 §2 «Importación
// validada»; EMI-23 y la parte de importación de EMI-26).
//
//   1. Huella de los tres archivos. Si un lote con la misma huella ya se importó, responde
//      `ya_importado` sin validar ni escribir (H3).
//   2. En una transacción, con las importaciones serializadas: lee lo que ya existe en Risk OS,
//      valida el lote completo con las 71 reglas del contrato y, si hay un rechazo, termina sin
//      escribir nada. Los avisos no bloquean.
//   3. Si alguna celda con valor no tiene columna en el esquema, termina sin escribir nada.
//   4. Escribe todas las filas y registra el lote al final. Si la base rechaza una fila o la
//      conexión se corta, la transacción se revierte entera y el resultado lo dice.
//
// Con una conexión, la transacción es propia; dentro de otra transacción (los tests), es un
// savepoint: en los dos casos una falla no deja ninguna fila.

import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { ARCHIVOS, contratoDe, porArchivo, type Archivo, type ArchivoContrato, type Contrato } from '../domain/contrato.ts'
import { leerCsv } from '../domain/csv.ts'
import type { FallaEscritura, Resultado, ResumenLote } from '../domain/informe.ts'
import { columnasSinDestino, filasParaEscribir } from '../domain/importacion.ts'
import { validarLote, type Hallazgo } from '../domain/validador.ts'
import type { Sql, TransactionSql } from '../persistence/database.ts'
import { bloquearImportaciones, buscarLote, escribirFilas, leerExistentes, registrarLote } from '../persistence/importacion.ts'

/** `contrato/` del contexto: copia byte a byte de `SPIKES/T-0021/v0/fase-15/contrato/` (lo comprueba un test). */
export const CONTRATO_DIR = new URL('../../contrato/', import.meta.url)

export const leerContrato = (dir: URL = CONTRATO_DIR): Contrato => {
  const leer = (a: ArchivoContrato): Uint8Array => readFileSync(new URL(a, dir))
  return contratoDe({
    'columnas-risks.csv': leer('columnas-risks.csv'),
    'columnas-action-plan.csv': leer('columnas-action-plan.csv'),
    'columnas-risk-transfer.csv': leer('columnas-risk-transfer.csv'),
    'reglas-validacion.csv': leer('reglas-validacion.csv'),
  })
}

/** Los tres archivos de un lote, desde una carpeta. */
export const leerArchivosDeLote = (carpeta: string): Record<Archivo, Uint8Array> => porArchivo((a) => readFileSync(join(carpeta, a)))

export interface OpcionesImportacion {
  /** De dónde vienen los archivos (la carpeta), para el registro del lote. */
  readonly origen: string
  readonly importadoPor: string
  /** AAAA-MM-DD: contra esta fecha se miran los vencimientos (RV-TRF-09, RV-ACC-11). */
  readonly fechaCorte: string
}

const sha256 = (b: Uint8Array | string): string => createHash('sha256').update(b).digest('hex')

/** Huella de cada archivo y la del lote: sha256 de las tres, en el orden del contrato. */
export function huellas(contenidos: Readonly<Record<Archivo, Uint8Array>>): { lote: string; archivos: Record<Archivo, string> } {
  const archivos = porArchivo((a) => sha256(contenidos[a]))
  return { lote: sha256(ARCHIVOS.map((a) => `${a} ${archivos[a]}\n`).join('')), archivos }
}

function resumen(contenidos: Readonly<Record<Archivo, Uint8Array>>, huella: string): ResumenLote {
  return {
    huella,
    filas: porArchivo((a) => {
      const l = leerCsv(contenidos[a])
      return l.ok ? l.registros.length : 0
    }),
  }
}

/** Una salida temprana de la transacción que no es una falla: se devuelve tal cual. */
class Fin extends Error {
  readonly resultado: Resultado
  constructor(resultado: Resultado) {
    super(resultado.estado)
    this.name = 'Fin'
    this.resultado = resultado
  }
}

/** Errores de la base o del driver (traen `code`); un error de programación sube como está. */
function falla(e: unknown): FallaEscritura | null {
  if (typeof e !== 'object' || e === null || !('code' in e)) return null
  const x = e as { code?: unknown; table_name?: unknown; constraint_name?: unknown; message?: unknown }
  return {
    tabla: typeof x.table_name === 'string' ? x.table_name : null,
    restriccion: typeof x.constraint_name === 'string' ? x.constraint_name : null,
    codigo: typeof x.code === 'string' ? x.code : null,
    mensaje: typeof x.message === 'string' ? x.message : '',
  }
}

async function enTransaccion<T>(db: Sql | TransactionSql, cuerpo: (tx: TransactionSql) => Promise<T>): Promise<T> {
  if ('savepoint' in db) return (await db.savepoint(cuerpo)) as T
  return (await db.begin(cuerpo)) as T
}

export async function importarLote(
  db: Sql | TransactionSql,
  contrato: Contrato,
  contenidos: Readonly<Record<Archivo, Uint8Array>>,
  opciones: OpcionesImportacion,
): Promise<Resultado> {
  const h = huellas(contenidos)
  const lote = resumen(contenidos, h.lote)
  const previo = await buscarLote(db, h.lote)
  if (previo !== null) return { estado: 'ya_importado', lote, registrado: previo }

  let hallazgos: readonly Hallazgo[] = []
  try {
    return await enTransaccion(db, async (tx) => {
      await bloquearImportaciones(tx)
      // Otra importación del mismo lote pudo terminar mientras esperábamos el bloqueo.
      const ganado = await buscarLote(tx, h.lote)
      if (ganado !== null) throw new Fin({ estado: 'ya_importado', lote, registrado: ganado })

      const existentes = await leerExistentes(tx)
      hallazgos = validarLote(contrato, contenidos, { fechaCorte: opciones.fechaCorte, existentes })
      if (hallazgos.some((x) => x.severidad === 'rechazo')) throw new Fin({ estado: 'rechazado', lote, hallazgos })
      const sinDestino = columnasSinDestino(contenidos)
      if (sinDestino.length > 0) throw new Fin({ estado: 'sin_destino', lote, hallazgos, sinDestino })

      const escritas = await escribirFilas(tx, filasParaEscribir(contenidos, existentes))
      const id = await registrarLote(tx, {
        huella: h.lote,
        huellas: { risks: h.archivos['risks.csv'], action_plan: h.archivos['action-plan.csv'], risk_transfer: h.archivos['risk-transfer.csv'] },
        origen: opciones.origen,
        importadoPor: opciones.importadoPor,
        fechaCorte: opciones.fechaCorte,
        filas: { risks: lote.filas['risks.csv'], action_plan: lote.filas['action-plan.csv'], risk_transfer: lote.filas['risk-transfer.csv'] },
        avisos: hallazgos.length,
        escritas,
      })
      return { estado: 'importado', lote, id, hallazgos, escritas } satisfies Resultado
    })
  } catch (e) {
    // Una salida temprana también revierte: la transacción no escribió nada y no hay nada que conservar.
    if (e instanceof Fin) return e.resultado
    const f = falla(e)
    if (f === null) throw e
    return { estado: 'falla_escritura', lote, hallazgos, falla: f }
  }
}
