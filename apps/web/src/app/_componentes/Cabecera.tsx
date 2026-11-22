import type { BatchStamp } from '@del-campo/api'
import { batchLabel } from '@del-campo/api'
import Link from 'next/link'

import { perfilPropio } from '@/lib/sesion'

import { Navegacion } from './Navegacion'
import { Retrato } from './Retrato'

export function Logo() {
  return (
    <Link className="logo" href="/inicio" aria-label="Broker OS · Del Campo, ir al inicio">
      <span className="logo__d">D</span>
      <span className="logo__texto">
        <b>BROKER OS</b>
        <span>Del Campo · Gestión de riesgos</span>
      </span>
    </Link>
  )
}

/** El buscador de la barra: lleva a Clientes con el texto como filtro. Funciona sin JavaScript. */
export function AccesoABuscar() {
  return (
    <form className="superior__buscar" method="get" action="/clientes" role="search">
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="11" cy="11" r="6.5" />
        <path d="M16 16l4.5 4.5" />
      </svg>
      <label className="sr" htmlFor="buscar-clientes">
        Buscar clientes
      </label>
      <input
        id="buscar-clientes"
        name="q"
        type="search"
        placeholder="Buscar clientes por nombre, CUIT o DNI…"
        autoComplete="off"
      />
    </form>
  )
}

/**
 * El marco de todas las pantallas: barra superior y menú lateral, como en el prototipo.
 *
 * La fecha del lote sigue a la vista en todas las pantallas con datos, al pie del menú,
 * para que los resultados no aparenten ser datos en vivo de Zoho; cuando la base no declara
 * ningún lote, se dice eso mismo en vez de callar.
 */
export async function Cabecera({ lote, email }: { readonly lote: BatchStamp; readonly email: string }) {
  // El nombre y la foto guardados en Equipo; sin perfil, la barra muestra el correo.
  const perfil = await perfilPropio()
  return (
    <>
      <header className="superior">
        <Logo />
        <AccesoABuscar />
        <div className="superior__sesion">
          {perfil === null ? (
            <span className="meta">{email}</span>
          ) : (
            <span className="persona superior__persona" title={perfil.email}>
              <Retrato usuario={perfil.userId} nombre={perfil.name} conFoto={perfil.hasPhoto} tamano={32} />
              <span className="superior__nombre">{perfil.hasDisplayName ? perfil.name : perfil.email}</span>
            </span>
          )}
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
