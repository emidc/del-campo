// T-0022 / D-0064 — clasificar una URL de Drive como archivo o carpeta, sin red.
//
// D-0064 y D-0057 prohíben comprobar el destino: no se resuelve, no se pide, no se
// sigue un redirect. Lo único disponible es la forma de la URL, y es suficiente para la
// regla que D-0064 fija: de una Policy sólo sirve un archivo, de un cliente sólo una
// carpeta. Cualquier forma que no sea inequívocamente una u otra se omite — omitir es
// el resultado seguro, porque ofrecer una carpeta como documento es precisamente lo que
// D-0057 prohíbe.

export type DriveTarget = 'FILE' | 'FOLDER'

/** Por qué una URL no produjo enlace. Son las categorías que el CLI informa. */
export type DriveRejection = 'VACIA' | 'NO_ES_URL' | 'NO_ES_DRIVE' | 'FORMA_DESCONOCIDA'

export type DriveClassification =
  | { readonly ok: true; readonly target: DriveTarget; readonly url: string }
  | { readonly ok: false; readonly rejection: DriveRejection }

const HOSTS = new Set(['drive.google.com', 'docs.google.com'])

/**
 * Formas de carpeta: `/drive/folders/<id>`, `/drive/u/<n>/folders/<id>` y el legado
 * `/open?id=<id>` **no** se cuenta acá — `open?id=` sirve para ambos tipos en Drive y
 * no distingue, así que es FORMA_DESCONOCIDA y se omite.
 */
const FOLDER_PATH = /^\/drive(?:\/u\/\d+)?\/folders\/[^/]+/

/**
 * Formas de archivo: `/file/d/<id>/...` de Drive y los documentos nativos de Google
 * (`/document/d/`, `/spreadsheets/d/`, `/presentation/d/`) en docs.google.com, que son
 * archivos aunque no vivan bajo `/file/`.
 */
const FILE_PATH = /^\/(?:file|document|spreadsheets|presentation|forms)\/d\/[^/]+/

export const classifyDriveUrl = (raw: string): DriveClassification => {
  const value = raw.trim()
  if (value === '') return { ok: false, rejection: 'VACIA' }

  let parsed: URL
  try {
    parsed = new URL(value)
  } catch {
    return { ok: false, rejection: 'NO_ES_URL' }
  }

  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    return { ok: false, rejection: 'NO_ES_URL' }
  }
  if (!HOSTS.has(parsed.hostname)) return { ok: false, rejection: 'NO_ES_DRIVE' }

  if (FOLDER_PATH.test(parsed.pathname)) return { ok: true, target: 'FOLDER', url: value }
  if (FILE_PATH.test(parsed.pathname)) return { ok: true, target: 'FILE', url: value }

  return { ok: false, rejection: 'FORMA_DESCONOCIDA' }
}
