// T-0037 (I1a) — un lote declarado por su `lote.json` entra a staging como un lote propio.
//
// Qué garantiza:
//  - el lote se identifica por la huella de su perfil de T-0004, así que cargar dos
//    veces el mismo export reutiliza el lote y deja las mismas filas (idempotencia de
//    T-0013), y cargar otro export crea otro lote sin tocar el anterior (H2);
//  - cada CSV que se carga es el que el perfil verifica: se recalcula su SHA-256 antes de
//    leerlo, y un lote ya registrado no acepta otra fecha de export ni otro CSV;
//  - todo corre en la transacción del llamador: un lote a medio cargar no queda.
//
// Salida agregada únicamente: ids de lote y conteos. → D-0053

import { readFileSync } from 'node:fs'

import type { Ejecutor } from './db.ts'
import { huellaDelPerfil, LoteInvalido, modulosVerificados, NOMBRE_ZOHO, rutaDeModulo, rutaDelPerfil } from './lote.ts'
import type { Lote, Modulo, ModuloVerificable } from './lote.ts'
import { cargarContactos, cargarCuentas, cargarEndosos, cargarPolizas } from './staging.ts'
import { parsearManifiesto, sha256DeArchivo } from './verify-manifest.ts'

const CARGADORES: Readonly<Record<Modulo, (sql: Ejecutor, batchId: string, ruta: string) => Promise<number>>> = {
  polizas: cargarPolizas,
  endosos: cargarEndosos,
  contactos: cargarContactos,
  cuentas: cargarCuentas,
}

export interface ResultadoCargaLote {
  readonly batchId: string
  /** `false` cuando el mismo export ya estaba cargado y se reutilizó su lote. */
  readonly nuevo: boolean
  readonly filas: Readonly<Record<Modulo, number>>
}

interface FilaModulo {
  readonly module: string
  readonly csv_relative_path: string
  readonly csv_sha256: string
  readonly exported_on: string
}

/** Los módulos del lote según el perfil, con el SHA-256 de cada CSV recalculado. */
const verificarModulos = async (lote: Lote): Promise<readonly ModuloVerificable[]> => {
  const perfil = parsearManifiesto(readFileSync(rutaDelPerfil(lote), 'utf8'))
  const modulos = modulosVerificados(lote, perfil)
  for (const modulo of modulos) {
    const obtenido = await sha256DeArchivo(rutaDeModulo(lote, modulo.modulo))
    if (obtenido !== modulo.sha256) {
      throw new LoteInvalido(`modulos.${modulo.modulo}.csv: el archivo no coincide con el SHA-256 del perfil`)
    }
  }
  return modulos
}

/** El lote ya registrado con esta huella, o `undefined`. */
export const loteRegistrado = async (sql: Ejecutor, lote: Lote): Promise<string | undefined> => {
  const huella = huellaDelPerfil(lote)
  const [fila] = await sql<{ id: string }[]>`
    select id from staging_import_batch where source_manifest_sha256 = ${huella}
  `
  return fila?.id
}

/**
 * Un lote ya registrado tiene que declarar exactamente lo mismo que el `lote.json` de
 * ahora. Si el owner corrige una fecha de export, eso es un manifiesto distinto del que
 * se cargó: se rechaza en vez de reescribir en silencio lo que el lote decía.
 */
const comprobarQueCoincide = async (
  sql: Ejecutor,
  batchId: string,
  modulos: readonly ModuloVerificable[],
): Promise<void> => {
  const filas = await sql<FilaModulo[]>`
    select module, csv_relative_path, csv_sha256, exported_on::text as exported_on
    from staging_import_batch_module where batch_id = ${batchId}
  `
  const porModulo = new Map(filas.map((fila) => [fila.module, fila]))
  for (const modulo of modulos) {
    const registrado = porModulo.get(NOMBRE_ZOHO[modulo.modulo])
    if (registrado === undefined) {
      throw new LoteInvalido(
        `el export ya está cargado como lote ${batchId} sin el módulo ${modulo.modulo}: no se completa en silencio`,
      )
    }
    if (
      registrado.csv_relative_path !== modulo.csv ||
      registrado.csv_sha256 !== modulo.sha256 ||
      registrado.exported_on !== modulo.exportadoEl
    ) {
      throw new LoteInvalido(
        `el export ya está cargado como lote ${batchId} con otro CSV o fecha de export para ${modulo.modulo}`,
      )
    }
  }
}

/**
 * Carga los cuatro módulos del lote en staging. Debe correr dentro de una transacción
 * del llamador. `notas` es texto de quien importa: no lleva datos del lote.
 */
export const cargarLoteEnStaging = async (sql: Ejecutor, lote: Lote, notas: string): Promise<ResultadoCargaLote> => {
  const modulos = await verificarModulos(lote)
  const huella = huellaDelPerfil(lote)

  let batchId = await loteRegistrado(sql, lote)
  const nuevo = batchId === undefined
  if (batchId === undefined) {
    const [batch] = await sql<{ id: string }[]>`
      insert into staging_import_batch (source_manifest_sha256, notes)
      values (${huella}, ${notas})
      returning id
    `
    if (batch === undefined) throw new Error('no se pudo crear staging_import_batch')
    batchId = batch.id
  } else {
    await comprobarQueCoincide(sql, batchId, modulos)
  }

  const filas = {} as Record<Modulo, number>
  for (const modulo of modulos) {
    const conteo = await CARGADORES[modulo.modulo](sql, batchId, rutaDeModulo(lote, modulo.modulo))
    filas[modulo.modulo] = conteo
    await sql`
      insert into staging_import_batch_module
        (batch_id, module, csv_relative_path, csv_sha256, exported_on, row_count)
      values
        (${batchId}, ${NOMBRE_ZOHO[modulo.modulo]}, ${modulo.csv}, ${modulo.sha256}, ${modulo.exportadoEl}, ${conteo})
      on conflict (batch_id, module) do update set row_count = excluded.row_count
    `
  }

  return { batchId, nuevo, filas }
}
