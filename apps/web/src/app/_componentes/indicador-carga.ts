/**
 * Cuándo un clic o un envío lleva a otra pantalla de Broker OS y vale mostrar la barra de
 * carga. Queda aparte del componente para poder probarlo sin navegador.
 */

export interface Destino {
  /** El href del enlace o el action del formulario, ya resuelto contra la página actual. */
  readonly href: string
  /** La dirección de la página actual. */
  readonly actual: string
  /** El target del enlace o formulario, si tiene. */
  readonly target?: string | null
  /** Si el enlace descarga un archivo. */
  readonly descarga?: boolean
}

/** Rutas que no son pantallas: autenticación, archivos, la API de la app. */
const NO_SON_PANTALLAS = ['/api/', '/oauth/']

export function llevaAOtraPantalla({ href, actual, target, descarga = false }: Destino): boolean {
  if (descarga) return false
  if (target !== undefined && target !== null && target !== '' && target !== '_self') return false
  let destino: URL
  let origen: URL
  try {
    origen = new URL(actual)
    destino = new URL(href, origen)
  } catch {
    return false
  }
  if (destino.protocol !== 'http:' && destino.protocol !== 'https:') return false
  if (destino.origin !== origen.origin) return false
  if (NO_SON_PANTALLAS.some((p) => destino.pathname.startsWith(p))) return false
  // Mismo lugar, o sólo cambia el ancla: no hay nada que esperar.
  return destino.pathname !== origen.pathname || destino.search !== origen.search
}

/** Un clic con modificador abre en otra pestaña: esta no espera nada. */
export function esClicSimple(e: {
  readonly button: number
  readonly metaKey: boolean
  readonly ctrlKey: boolean
  readonly shiftKey: boolean
  readonly altKey: boolean
}): boolean {
  return e.button === 0 && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey
}

/** La dirección a la que va un formulario GET con sus campos, como la arma el navegador. */
export function destinoDeFormularioGet(action: string, campos: Iterable<[string, string]>): string {
  const url = new URL(action)
  url.search = new URLSearchParams([...campos]).toString()
  url.hash = ''
  return url.href
}
