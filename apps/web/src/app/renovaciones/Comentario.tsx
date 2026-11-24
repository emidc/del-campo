'use client'

// El comentario de renovación de una fila: se escribe en la celda y se guarda al salir de
// ella o con Enter (Mayúscula + Enter agrega un renglón). Escape descarta lo escrito.

import { useRef, useState, useTransition } from 'react'

import { comentar } from './acciones'

export function Comentario({ poliza, numero, inicial }: { readonly poliza: string; readonly numero: string; readonly inicial: string | null }) {
  const [guardado, setGuardado] = useState(inicial ?? '')
  const [texto, setTexto] = useState(inicial ?? '')
  const [estado, setEstado] = useState<{ readonly tipo: 'ok' | 'error'; readonly mensaje: string } | null>(null)
  const [guardando, iniciar] = useTransition()
  const campo = useRef<HTMLTextAreaElement>(null)

  const ajustar = (el: HTMLTextAreaElement) => {
    el.style.height = 'auto'
    el.style.height = `${String(el.scrollHeight)}px`
  }

  const guardar = () => {
    if (texto.trim() === guardado.trim()) return
    iniciar(async () => {
      const resultado = await comentar(poliza, texto)
      if (resultado.ok) {
        setGuardado(resultado.texto)
        setTexto(resultado.texto)
        setEstado({ tipo: 'ok', mensaje: 'Guardado' })
      } else setEstado({ tipo: 'error', mensaje: resultado.error })
    })
  }

  return (
    <div className="comentario">
      <textarea
        ref={campo}
        className="comentario__campo"
        rows={1}
        value={texto}
        maxLength={2000}
        placeholder="Agregar comentario…"
        aria-label={`Comentario de la póliza ${numero}`}
        aria-busy={guardando}
        onFocus={(e) => { ajustar(e.currentTarget) }}
        onChange={(e) => {
          setTexto(e.target.value)
          setEstado(null)
          ajustar(e.target)
        }}
        onBlur={guardar}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            e.currentTarget.blur()
          } else if (e.key === 'Escape') {
            setTexto(guardado)
            setEstado(null)
            requestAnimationFrame(() => { campo.current?.blur() })
          }
        }}
      />
      <span className={`comentario__estado${estado?.tipo === 'error' ? ' comentario__estado--error' : ''}`} role="status">
        {guardando ? 'Guardando…' : (estado?.mensaje ?? '')}
      </span>
    </div>
  )
}
