// T-0022 — qué se rotula y con qué aspecto, separado de cómo se dibuja.
//
// La decisión de etiquetado es la que D-0057 y D-0064 restringen: una carpeta nunca se
// rotula como documento, y un enlace de Zoho nunca se rotula como comprobado. Vive en
// una función pura y no dentro del JSX para que esa restricción sea verificable por una
// prueba y no sólo por inspección visual (## Verification de T-0022).

import type { PolicyDocumentAccess } from '@del-campo/api'

const MOTIVO: Record<string, string> = {
  UNVERIFIED: 'sin comprobar',
  AMBIGUOUS: 'ambiguo',
  INACCESSIBLE: 'inaccesible con la cuenta que comprobó',
  NO_REFERENCE: 'sin referencia en el origen',
}

export const textoDeMotivo = (motivo: string): string => MOTIVO[motivo] ?? motivo

export interface DescripcionDeEnlace {
  readonly texto: string
  readonly clase: string
  readonly url: string
  /** `true` sólo para el nivel de D-0064: la pantalla además muestra el sello. */
  readonly sinComprobar: boolean
}

export type DescripcionDeAcceso =
  | {
      readonly forma: 'DOCUMENTO'
      readonly enlace: DescripcionDeEnlace
      readonly pendiente: string | null
    }
  | {
      readonly forma: 'CARPETA'
      readonly enlace: DescripcionDeEnlace
      /** La carpeta no es el documento: la aclaración se muestra siempre, haya pendiente o no. */
      readonly aclaracion: string
    }
  | { readonly forma: 'AUSENCIA'; readonly pendiente: string | null }

export const describirAcceso = (acceso: PolicyDocumentAccess): DescripcionDeAcceso => {
  const pendiente = acceso.pending === null ? null : textoDeMotivo(acceso.pending.reason)

  if (acceso.document !== null) {
    const sinComprobar = acceso.document.level === 'ZOHO_UNVERIFIED'
    return {
      forma: 'DOCUMENTO',
      enlace: {
        texto: sinComprobar ? 'Abrir documento (según Zoho)' : 'Abrir documento',
        clase: sinComprobar ? 'enlace-documento enlace-documento--zoho' : 'enlace-documento',
        url: acceso.document.url,
        sinComprobar,
      },
      pendiente,
    }
  }

  if (acceso.clientFolder !== null) {
    const sinComprobar = acceso.clientFolder.level === 'ZOHO_UNVERIFIED'
    return {
      forma: 'CARPETA',
      enlace: {
        texto: sinComprobar
          ? 'Abrir carpeta del cliente (según Zoho)'
          : 'Abrir carpeta del cliente',
        clase: sinComprobar ? 'enlace-carpeta enlace-carpeta--zoho' : 'enlace-carpeta',
        url: acceso.clientFolder.url,
        sinComprobar,
      },
      aclaracion:
        pendiente === null
          ? 'No es el documento de la póliza'
          : `No es el documento de la póliza · ${pendiente}`,
    }
  }

  return { forma: 'AUSENCIA', pendiente }
}
