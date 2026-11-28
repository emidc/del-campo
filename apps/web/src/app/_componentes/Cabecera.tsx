import type { BatchStamp } from '@del-campo/api'
import { avisosPendientes, batchLabel } from '@del-campo/api'
import Link from 'next/link'
import { Suspense } from 'react'
import type { ReactNode } from 'react'

import { perfilPropio, requireAdmitted } from '@/lib/sesion'

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

/** El nombre y la foto guardados en Equipo; sin perfil, la barra muestra el correo. */
async function Persona({ email }: { readonly email: string }) {
  const perfil = await perfilPropio()
  if (perfil === null) return <span className="meta">{email}</span>
  return (
    <span className="persona superior__persona" title={perfil.email}>
      <Retrato usuario={perfil.userId} nombre={perfil.name} conFoto={perfil.hasPhoto} tamano={32} />
      <span className="superior__nombre">{perfil.hasDisplayName ? perfil.name : perfil.email}</span>
    </span>
  )
}

/**
 * T-0072: los mensajes sin responder cuyo aviso le llega a quien mira. Si la cuenta
 * falla, la pantalla se ve igual, sin el número.
 */
async function NavegacionConAvisos({ pie }: { readonly pie: ReactNode }) {
  const avisos = await avisosPendientes(await requireAdmitted()).catch(() => 0)
  return <Navegacion avisos={{ comunicacion: avisos }} pie={pie} />
}

/**
 * El marco de todas las pantallas: barra superior y menú lateral, como en el prototipo.
 *
 * La fecha del lote sigue a la vista en todas las pantallas con datos, al pie del menú,
 * para que los resultados no aparenten ser datos en vivo de Zoho; cuando la base no declara
 * ningún lote, se dice eso mismo en vez de callar.
 *
 * El perfil y el número de avisos van cada uno en su `Suspense`: la pantalla se muestra sin
 * esperarlos, las dos consultas corren en paralelo y llegan apenas terminan.
 */
export function Cabecera({ lote, email }: { readonly lote: BatchStamp; readonly email: string }) {
  const pie = (
    <span className={lote.known ? 'lote' : 'lote lote--desconocido'}>
      {batchLabel(lote)}
      {lote.manifestPrefix === null ? null : ` · manifiesto ${lote.manifestPrefix}…`}
    </span>
  )
  return (
    <>
      <header className="superior">
        <Logo />
        <AccesoABuscar />
        <div className="superior__sesion">
          <Suspense fallback={<span className="meta">{email}</span>}>
            <Persona email={email} />
          </Suspense>
          <a className="boton boton--secundario boton--chico" href="/api/auth/logout">
            Salir
          </a>
        </div>
      </header>
      <Suspense fallback={<Navegacion pie={pie} />}>
        <NavegacionConAvisos pie={pie} />
      </Suspense>
    </>
  )
}
