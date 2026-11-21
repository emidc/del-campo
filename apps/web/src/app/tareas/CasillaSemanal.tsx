'use client'

// La casilla «Tarea de la semana»: se guarda al tildar o destildar. Si falla, vuelve al
// valor guardado y muestra el error.

import { useState, useTransition } from 'react'

import { editarCampo } from '@/app/tareas/acciones'

export function CasillaSemanal({
  tarea,
  semanal,
  etiqueta,
}: {
  readonly tarea: string
  readonly semanal: boolean
  /** Texto visible al lado de la casilla; sin él, queda sólo como etiqueta accesible. */
  readonly etiqueta?: string
}) {
  const [marcada, setMarcada] = useState(semanal)
  const [error, setError] = useState<string | null>(null)
  const [enCurso, iniciar] = useTransition()

  const cambiar = (valor: boolean) => {
    setMarcada(valor)
    setError(null)
    iniciar(async () => {
      const form = new FormData()
      form.set('id', tarea)
      form.set('campo', 'semana')
      form.set('valor', valor ? '1' : '')
      const resultado = await editarCampo(null, form)
      if (resultado?.ok === false) {
        setMarcada(!valor)
        setError(resultado.error)
      }
    })
  }

  return (
    <span className="casilla-semanal">
      <label>
        <input
          type="checkbox"
          checked={marcada}
          disabled={enCurso}
          onChange={(e) => { cambiar(e.target.checked); }}
          aria-label={etiqueta === undefined ? 'Tarea de la semana' : undefined}
        />
        {etiqueta === undefined ? null : <span>{etiqueta}</span>}
      </label>
      {error === null ? null : (
        <span className="error-en-fila" role="alert">
          {error}
        </span>
      )}
    </span>
  )
}
