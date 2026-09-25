import type { PolicyDocumentAccess } from '@del-campo/api'

const MOTIVO: Record<string, string> = {
  UNVERIFIED: 'sin comprobar',
  AMBIGUOUS: 'ambiguo',
  INACCESSIBLE: 'inaccesible con la cuenta que comprobó',
  NO_REFERENCE: 'sin referencia en el origen',
}

/**
 * Los tres estados de D-0057, cada uno con su propia etiqueta y su propio aspecto:
 *
 *  - **Abrir documento** — archivo de la póliza con asociación revisada;
 *  - **Abrir carpeta del cliente** — alternativa sustentada que **conserva** el pendiente
 *    documental; abrirla no cuenta como haber abierto el documento objetivo;
 *  - **ausencia** — no hay referencia sustentada. Se muestra; no se infiere inexistencia.
 *
 * Nunca se rotula una carpeta como documento, y el pendiente no desaparece porque haya
 * carpeta. Por eso el pendiente se renderiza al lado del enlace y no en su lugar.
 */
export function AccesoDocumental({ acceso }: { readonly acceso: PolicyDocumentAccess }) {
  const pendiente =
    acceso.pending === null ? null : (
      <span className="pendiente">
        Pendiente documental: {MOTIVO[acceso.pending.reason] ?? acceso.pending.reason}
      </span>
    )

  if (acceso.document !== null) {
    return (
      <div className="fila-documental">
        <a className="enlace-documento" href={acceso.document.url} target="_blank" rel="noreferrer">
          Abrir documento
        </a>
        {pendiente}
      </div>
    )
  }

  if (acceso.clientFolder !== null) {
    return (
      <div className="fila-documental">
        <a className="enlace-carpeta" href={acceso.clientFolder.url} target="_blank" rel="noreferrer">
          Abrir carpeta del cliente
        </a>
        <span className="pendiente">
          No es el documento de la póliza
          {acceso.pending === null
            ? ''
            : ` · ${MOTIVO[acceso.pending.reason] ?? acceso.pending.reason}`}
        </span>
      </div>
    )
  }

  return (
    <div className="fila-documental">
      <span className="sin-referencia">Sin referencia documental sustentada</span>
      {pendiente}
    </div>
  )
}
