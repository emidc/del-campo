import type { BatchStamp } from '@del-campo/api'
import { batchLabel } from '@del-campo/api'
import Link from 'next/link'

import { Navegacion } from './Navegacion'

/**
 * El marco de todas las pantallas: barra superior y menú lateral, como en el prototipo.
 *
 * La fecha del lote sigue a la vista en todas las pantallas con datos, al pie del menú,
 * para que los resultados no aparenten ser datos en vivo de Zoho; cuando la base no declara
 * ningún lote, se dice eso mismo en vez de callar.
 */
export function Cabecera({ lote, email }: { readonly lote: BatchStamp; readonly email: string }) {
  return (
    <>
      <header className="superior">
        <Link className="logo" href="/inicio" aria-label="Broker OS · Del Campo, ir al inicio">
          <span className="logo__d">D</span>
          <span className="logo__texto">
            <b>BROKER OS</b>
            <span>Del Campo · Gestión de riesgos</span>
          </span>
        </Link>
        <Link className="superior__buscar" href="/buscar">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="11" cy="11" r="6.5" />
            <path d="M16 16l4.5 4.5" />
          </svg>
          <span>Buscar clientes, empresas, pólizas…</span>
        </Link>
        <div className="superior__sesion">
          <span className="meta">{email}</span>
          <a className="boton boton--secundario boton--chico" href="/api/auth/logout">
            Salir
          </a>
        </div>
      </header>
      <Navegacion
        pie={
          <span className={lote.known ? 'lote' : 'lote lote--desconocido'}>
            {batchLabel(lote)}
            {lote.manifestPrefix === null ? null : ` · manifiesto ${lote.manifestPrefix}…`}
          </span>
        }
      />
    </>
  )
}
