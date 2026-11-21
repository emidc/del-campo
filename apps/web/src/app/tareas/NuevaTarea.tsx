'use client'

// «Nueva tarea» del encabezado de Tareas: el formulario de alta se abre en la misma
// pantalla y el cliente se elige con un buscador. Al crear, la acción abre la ficha.

import { useActionState, useEffect, useRef, useState } from 'react'

import { BotonEnviar } from '@/app/_componentes/BotonEnviar'
import type { ClienteSugerido } from '@/app/tareas/acciones'
import { clientesQueCoinciden, crearDesdeListado } from '@/app/tareas/acciones'

export function NuevaTarea({
  integrantes,
}: {
  /** Los demás integrantes; «Yo» va siempre primero. */
  readonly integrantes: readonly { readonly userId: string; readonly etiqueta: string }[]
}) {
  const dialogo = useRef<HTMLDialogElement>(null)
  const [estado, enviar] = useActionState(crearDesdeListado, null)
  const [texto, setTexto] = useState('')
  const [opciones, setOpciones] = useState<readonly ClienteSugerido[]>([])
  const [elegido, setElegido] = useState<ClienteSugerido | null>(null)

  useEffect(() => {
    if (elegido !== null || texto.trim().length < 2) {
      setOpciones([])
      return
    }
    let vigente = true
    const espera = setTimeout(() => {
      void clientesQueCoinciden(texto).then((resultado) => {
        if (vigente) setOpciones(resultado)
      })
    }, 250)
    return () => {
      vigente = false
      clearTimeout(espera)
    }
  }, [texto, elegido])

  return (
    <>
      <button type="button" className="boton" onClick={() => dialogo.current?.showModal()}>
        Nueva tarea
      </button>
      <dialog ref={dialogo} className="dialogo dialogo--ancho" aria-labelledby="nueva-tarea-titulo">
        <h2 id="nueva-tarea-titulo">Nueva tarea</h2>
        <form action={enviar} className="formulario-alta">
          <input type="hidden" name="parte" value={elegido?.partyId ?? ''} />
          <div className="campo">
            <label htmlFor="nueva-titulo">Título</label>
            <input id="nueva-titulo" name="titulo" required maxLength={200} placeholder="Qué hay que hacer" />
          </div>
          <div className="campo">
            <label htmlFor="nueva-cliente">Cliente</label>
            <input
              id="nueva-cliente"
              type="search"
              value={elegido === null ? texto : elegido.displayName}
              onChange={(e) => {
                setElegido(null)
                setTexto(e.target.value)
              }}
              placeholder="Buscá por nombre, DNI o CUIT"
              aria-autocomplete="list"
              aria-controls="nueva-cliente-sugeridos"
              autoComplete="off"
            />
            {elegido === null && opciones.length > 0 ? (
              <ul id="nueva-cliente-sugeridos" className="sugerencias" role="listbox" aria-label="Clientes">
                {opciones.map((o) => (
                  <li key={o.partyId} role="option" aria-selected={false}>
                    <button type="button" onClick={() => { setElegido(o); }}>
                      <span className="nombre">{o.displayName}</span>
                      {o.detalle === null ? null : <span className="meta"> · {o.detalle}</span>}
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
            {elegido === null && texto.trim().length >= 2 && opciones.length === 0 ? (
              <p className="meta" style={{ margin: 0 }}>
                No hay clientes con ese nombre.
              </p>
            ) : null}
          </div>
          <div className="formulario-alta__par">
            <div className="campo">
              <label htmlFor="nueva-vence">Vence</label>
              <input id="nueva-vence" name="vence" type="date" />
            </div>
            <div className="campo">
              <label htmlFor="nueva-responsable">Responsable</label>
              <select id="nueva-responsable" name="responsable" defaultValue="">
                <option value="">Yo</option>
                {integrantes.map((i) => (
                  <option key={i.userId} value={i.userId}>
                    {i.etiqueta}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="campo">
            <label htmlFor="nueva-comentario">Comentario (opcional)</label>
            <textarea id="nueva-comentario" name="comentario" rows={3} />
          </div>
          {estado?.ok === false ? (
            <p className="estado estado--aviso" role="alert">
              {estado.error}
            </p>
          ) : null}
          <div className="fila fila--fin">
            <button type="button" className="boton boton--secundario" onClick={() => dialogo.current?.close()}>
              Cancelar
            </button>
            <BotonEnviar className="boton">Crear tarea</BotonEnviar>
          </div>
        </form>
      </dialog>
    </>
  )
}
