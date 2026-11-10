// Lotes sintéticos en disco para las pruebas de T-0037: misma forma que un export real
// (perfil de T-0004, `raw/<id>/0001.csv`, `lote.json`) con contenido inventado. → R-19
//
// No es un archivo de pruebas (no termina en `.test.ts`): lo usan
// `lote-staging.integration.test.ts` y `comparar-lotes.integration.test.ts`.

import { createHash } from 'node:crypto'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { FORMATO_LOTE, MODULOS } from './lote.ts'
import type { Modulo } from './lote.ts'

export type Filas = Readonly<Record<Modulo, readonly (readonly string[])[]>>

export interface OpcionesLote {
  readonly nombre: string
  readonly encabezados: Readonly<Record<Modulo, readonly string[]>>
  readonly filas: Filas
  readonly exportadoEl: Readonly<Record<Modulo, string>>
}

const directorios: string[] = []

/** Borra los lotes escritos por este proceso. Para el `after` de cada archivo de pruebas. */
export const borrarLotesSinteticos = (): void => {
  for (const directorio of directorios.splice(0)) rmSync(directorio, { recursive: true, force: true })
}

const sha256 = (contenido: string | Buffer): string => createHash('sha256').update(contenido).digest('hex')

/** Escribe un lote con perfil de T-0004 y `lote.json`, y devuelve su raíz. */
export const escribirLote = ({ nombre, encabezados, filas, exportadoEl }: OpcionesLote): string => {
  const raiz = mkdtempSync(join(tmpdir(), `t0037-${nombre}-`))
  directorios.push(raiz)
  const archivos = MODULOS.map((modulo) => {
    const contenido = [encabezados[modulo], ...filas[modulo]].map((fila) => fila.join(',')).join('\n') + '\n'
    const id = sha256(`${nombre}:${modulo}:${contenido}`)
    const rawRelativePath = `raw/${id}/0001.csv`
    mkdirSync(join(raiz, 'raw', id), { recursive: true })
    writeFileSync(join(raiz, rawRelativePath), contenido, 'utf8')
    return { modulo, rawRelativePath, sha256: sha256(contenido) }
  })

  mkdirSync(join(raiz, 'profile'))
  writeFileSync(
    join(raiz, 'profile', 'perfil.json'),
    JSON.stringify({
      mode: 'profile',
      facts: [
        {
          archive_id: `ZIP-${nombre}`,
          local_archive_name: `${nombre}.zip`,
          sha256: sha256(`zip:${nombre}`),
          files: archivos.map((archivo) => ({
            file_id: archivo.rawRelativePath.split('/')[1],
            raw_relative_path: archivo.rawRelativePath,
            sha256: archivo.sha256,
          })),
        },
      ],
    }),
  )

  escribirManifiesto(raiz, exportadoEl, archivos)
  return raiz
}

export const escribirManifiesto = (
  raiz: string,
  exportadoEl: Readonly<Record<Modulo, string>>,
  archivos: readonly { modulo: Modulo; rawRelativePath: string }[],
): void => {
  writeFileSync(
    join(raiz, 'lote.json'),
    JSON.stringify({
      formato: FORMATO_LOTE,
      perfil: 'profile/perfil.json',
      modulos: Object.fromEntries(
        archivos.map((archivo) => [archivo.modulo, { csv: archivo.rawRelativePath, exportadoEl: exportadoEl[archivo.modulo] }]),
      ),
    }),
  )
}

export const mismaFecha = (fecha: string): Record<Modulo, string> =>
  Object.fromEntries(MODULOS.map((modulo) => [modulo, fecha])) as Record<Modulo, string>
