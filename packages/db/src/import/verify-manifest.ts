// T-0013, paso 1 — el lote real se verifica contra el manifiesto de T-0004 antes de que
// cualquier otro paso del importador lo toque. `profile-20260918T212140075873Z.json` es
// el único de los tres `profile-*.json` locales que es manifiesto de los 18 ZIP; los
// otros dos son de la pasada del 17/09 y no se usan acá. → REVIEWS/T-0004-insumos-vs01.md §1
//
// Sólo lee bytes y compara hashes: nunca decodifica ni imprime contenido de las filas.
// La salida de este módulo es siempre agregada (conteos y nombres de archivo), nunca una
// fila del lote.

import { createHash } from 'node:crypto'
import { createReadStream } from 'node:fs'
import { join } from 'node:path'

export interface ManifestFile {
  readonly fileId: string
  readonly rawRelativePath: string
  readonly sha256: string
}

export interface ManifestArchive {
  readonly archiveId: string
  readonly localArchiveName: string
  readonly sha256: string
  readonly files: readonly ManifestFile[]
}

interface RawManifestFile {
  file_id: string
  raw_relative_path: string
  sha256: string
}

interface RawManifestArchive {
  archive_id: string
  local_archive_name: string
  sha256: string
  files: RawManifestFile[]
}

interface RawManifest {
  facts: RawManifestArchive[]
}

/** El manifiesto sólo aporta identidad y hashes: el resto de sus campos no le concierne a esta verificación. */
export const parsearManifiesto = (contenido: string): readonly ManifestArchive[] => {
  const crudo = JSON.parse(contenido) as RawManifest
  return crudo.facts.map((archivo) => ({
    archiveId: archivo.archive_id,
    localArchiveName: archivo.local_archive_name,
    sha256: archivo.sha256,
    files: archivo.files.map((archivoCsv) => ({
      fileId: archivoCsv.file_id,
      rawRelativePath: archivoCsv.raw_relative_path,
      sha256: archivoCsv.sha256,
    })),
  }))
}

export const sha256DeArchivo = async (ruta: string): Promise<string> => {
  const hash = createHash('sha256')
  for await (const trozo of createReadStream(ruta)) {
    hash.update(trozo as Buffer)
  }
  return hash.digest('hex')
}

export interface ResultadoVerificacion {
  readonly archivo: string
  readonly esperado: string
  readonly obtenido: string
  readonly coincide: boolean
}

/**
 * Compara cada ZIP original y cada CSV extraído contra el hash que el manifiesto
 * declara. `directorioLote` es la raíz `data/zoho-export-2026-09-16`. No continúa más
 * allá de calcular y comparar: decidir qué hacer con un mismatch es responsabilidad de
 * quien llama, nunca de este módulo.
 */
export async function* verificarLote(
  manifiesto: readonly ManifestArchive[],
  directorioLote: string,
): AsyncGenerator<ResultadoVerificacion> {
  for (const archivo of manifiesto) {
    const rutaZip = join(directorioLote, 'original-zips', archivo.localArchiveName)
    const obtenidoZip = await sha256DeArchivo(rutaZip)
    yield {
      archivo: archivo.localArchiveName,
      esperado: archivo.sha256,
      obtenido: obtenidoZip,
      coincide: obtenidoZip === archivo.sha256,
    }

    for (const csv of archivo.files) {
      const rutaCsv = join(directorioLote, csv.rawRelativePath)
      const obtenidoCsv = await sha256DeArchivo(rutaCsv)
      yield {
        archivo: csv.rawRelativePath,
        esperado: csv.sha256,
        obtenido: obtenidoCsv,
        coincide: obtenidoCsv === csv.sha256,
      }
    }
  }
}
