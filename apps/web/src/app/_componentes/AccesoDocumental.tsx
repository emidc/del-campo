import type { PolicyDocumentAccess } from '@del-campo/api'

import { describirAcceso } from './acceso-documental'

/**
 * Los estados documentales de D-0057, más el nivel «según Zoho» de D-0064, cada uno con
 * su propia etiqueta y su propio aspecto:
 *
 *  - **Abrir documento** — archivo de la póliza con asociación revisada por una persona;
 *  - **Abrir documento (según Zoho)** — enlace que el lote informa y **nadie comprobó**;
 *  - **Abrir carpeta del cliente** / **(según Zoho)** — alternativa que **conserva** el
 *    pendiente documental; abrirla no cuenta como haber abierto el documento objetivo;
 *  - **ausencia** — no hay referencia. Se muestra; no se infiere inexistencia.
 *
 * El nivel sin comprobar se marca en el texto del enlace y con un sello aparte, no sólo
 * con color: la distinción tiene que sobrevivir a quien no distingue colores y a una
 * captura en blanco y negro. Qué rótulo corresponde lo decide `describirAcceso`, que
 * está testeada; acá sólo se dibuja.
 */
export function AccesoDocumental({ acceso }: { readonly acceso: PolicyDocumentAccess }) {
  const descripcion = describirAcceso(acceso)

  if (descripcion.forma === 'AUSENCIA') {
    return (
      <div className="fila-documental">
        <span className="sin-referencia">Sin referencia documental sustentada</span>
        {descripcion.pendiente === null ? null : (
          <span className="pendiente">Pendiente documental: {descripcion.pendiente}</span>
        )}
      </div>
    )
  }

  const { enlace } = descripcion
  return (
    <div className="fila-documental">
      <a className={enlace.clase} href={enlace.url} target="_blank" rel="noreferrer">
        {enlace.texto}
      </a>
      {enlace.sinComprobar ? <span className="sin-comprobar">Sin comprobar</span> : null}
      {descripcion.forma === 'CARPETA' ? (
        <span className="pendiente">{descripcion.aclaracion}</span>
      ) : descripcion.pendiente === null ? null : (
        <span className="pendiente">Pendiente documental: {descripcion.pendiente}</span>
      )}
    </div>
  )
}
