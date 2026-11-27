'use client'

// Historia de la tarea: lo más nuevo arriba por defecto, con un botón para invertir el orden.

import { useState } from 'react'

import { TextoConEnlaces } from '@/app/_componentes/TextoConEnlaces'

export interface RenglonDeHistoria {
  readonly id: string
  readonly cuando: string
  readonly autor: string
  readonly titulo: string
  readonly cuerpo: string | null
}

export function Historia({ eventos }: { readonly eventos: readonly RenglonDeHistoria[] }) {
  const [nuevosArriba, setNuevosArriba] = useState(true)
  const lista = nuevosArriba ? [...eventos].reverse() : eventos
  return (
    <>
      <div className="encabezado-tarjeta">
        <h2>Historia</h2>
        <button type="button" className="boton boton--secundario" onClick={() => {
            setNuevosArriba((v) => !v)
          }}>
          {nuevosArriba ? 'Ver más antiguo primero' : 'Ver más nuevo primero'}
        </button>
      </div>
      <ul className="lista">
        {lista.map((evento) => (
          <li key={evento.id}>
            <p className="meta" style={{ margin: 0 }}>
              {evento.cuando} · {evento.autor}
            </p>
            <p style={{ margin: '0.2rem 0 0' }}>{evento.titulo}</p>
            {evento.cuerpo === null ? null : (
              <p style={{ margin: '0.2rem 0 0', whiteSpace: 'pre-wrap' }}>
                <TextoConEnlaces texto={evento.cuerpo} />
              </p>
            )}
          </li>
        ))}
      </ul>
    </>
  )
}
