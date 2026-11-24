'use client'

// Un filtro desplegable de Renovaciones: un botón con forma de pill que muestra lo elegido
// y abre una lista de opciones. Cada opción es un enlace, así la barra de carga y el giro
// del filtro funcionan como en cualquier otro enlace. Con `multiple`, cada opción suma o
// quita su valor y la lista queda abierta para seguir eligiendo.

import Link from 'next/link'
import { useEffect, useId, useRef, useState } from 'react'

export interface OpcionDeFiltro {
  readonly valor: string
  readonly etiqueta: string
  readonly href: string
  readonly activa: boolean
  readonly cuenta?: number | undefined
}

export function Filtro({
  etiqueta,
  opciones,
  limpiar,
  multiple = false,
  vacio = 'Todos',
}: {
  readonly etiqueta: string
  readonly opciones: readonly OpcionDeFiltro[]
  /** El enlace que quita el filtro; `null` si el filtro no se puede quitar (el mes). */
  readonly limpiar: string | null
  readonly multiple?: boolean
  readonly vacio?: string
}) {
  const [abierto, setAbierto] = useState(false)
  const raiz = useRef<HTMLDivElement>(null)
  const id = useId()
  const elegidas = opciones.filter((o) => o.activa)
  const [primera] = elegidas
  const resumen =
    primera === undefined ? vacio : elegidas.length === 1 ? primera.etiqueta : `${primera.etiqueta} +${String(elegidas.length - 1)}`
  const activo = elegidas.length > 0 && limpiar !== null

  useEffect(() => {
    if (!abierto) return
    const fuera = (e: PointerEvent) => {
      if (e.target instanceof Node && raiz.current?.contains(e.target) !== true) setAbierto(false)
    }
    const tecla = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      setAbierto(false)
      raiz.current?.querySelector('button')?.focus()
    }
    document.addEventListener('pointerdown', fuera)
    document.addEventListener('keydown', tecla)
    return () => {
      document.removeEventListener('pointerdown', fuera)
      document.removeEventListener('keydown', tecla)
    }
  }, [abierto])

  return (
    <div ref={raiz} className={`filtro${activo ? ' filtro--activo' : ''}${abierto ? ' filtro--abierto' : ''}`}>
      <button
        type="button"
        className="filtro__boton"
        aria-expanded={abierto}
        aria-controls={id}
        onClick={() => { setAbierto((a) => !a) }}
      >
        <span className="filtro__etiqueta">{etiqueta}</span>
        <span className="filtro__valor">{resumen}</span>
        <svg className="filtro__flecha" viewBox="0 0 12 12" aria-hidden="true">
          <path d="M3 4.5 6 7.5 9 4.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {abierto ? (
        <div className="filtro__menu" id={id} role="group" aria-label={etiqueta}>
          {limpiar === null ? null : (
            <Link
              href={limpiar}
              className={`filtro__opcion${elegidas.length === 0 ? ' filtro__opcion--activa' : ''}`}
              aria-current={elegidas.length === 0 ? 'true' : undefined}
              onClick={() => { setAbierto(false) }}
            >
              <span className={multiple ? 'filtro__marca filtro__marca--caja' : 'filtro__marca'} aria-hidden="true" />
              <span className="filtro__texto">{vacio}</span>
            </Link>
          )}
          {opciones.length === 0 ? <p className="filtro__nada">No hay opciones en este mes.</p> : null}
          {opciones.map((o) => (
            <Link
              key={o.valor}
              href={o.href}
              scroll={false}
              className={`filtro__opcion${o.activa ? ' filtro__opcion--activa' : ''}`}
              aria-current={o.activa ? 'true' : undefined}
              onClick={() => { if (!multiple) setAbierto(false) }}
            >
              <span className={multiple ? 'filtro__marca filtro__marca--caja' : 'filtro__marca'} aria-hidden="true" />
              <span className="filtro__texto">{o.etiqueta}</span>
              {o.cuenta === undefined ? null : <span className="filtro__cuenta">{o.cuenta}</span>}
            </Link>
          ))}
        </div>
      ) : null}
    </div>
  )
}
