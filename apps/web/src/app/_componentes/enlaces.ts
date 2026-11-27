// Parte un texto libre en trozos de texto y enlaces, para mostrar como link lo que se
// pegó como URL (http, https o www.) en comentarios y en la historia.

export type Trozo = { readonly tipo: 'texto'; readonly texto: string } | { readonly tipo: 'enlace'; readonly texto: string; readonly href: string }

const URL_EN_TEXTO = /\b(?:https?:\/\/|www\.)[^\s<>"']+/gi
/** Signos que suelen cerrar la oración y no forman parte del enlace. */
const COLA = /[.,;:!?)\]}»”]+$/

export const partirEnlaces = (texto: string): Trozo[] => {
  const trozos: Trozo[] = []
  let desde = 0
  for (const coincidencia of texto.matchAll(URL_EN_TEXTO)) {
    const inicio = coincidencia.index
    let url = coincidencia[0]
    const cola = COLA.exec(url)
    // Un paréntesis de cierre queda si el enlace abre uno (p. ej. páginas de Wikipedia).
    if (cola !== null) {
      let quitar = cola[0]
      if (quitar.startsWith(')') && url.includes('(')) quitar = quitar.slice(1)
      url = url.slice(0, url.length - quitar.length)
    }
    if (url.length === 0 || /^www\.$/i.test(url)) continue
    if (inicio > desde) trozos.push({ tipo: 'texto', texto: texto.slice(desde, inicio) })
    trozos.push({ tipo: 'enlace', texto: url, href: /^www\./i.test(url) ? `https://${url}` : url })
    desde = inicio + url.length
  }
  if (desde < texto.length) trozos.push({ tipo: 'texto', texto: texto.slice(desde) })
  return trozos
}
