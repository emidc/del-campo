'use client'

// Acciones puntuales de la tarea a cargo de otra persona («Involucrar a alguien»). La
// persona involucrada marca la suya como hecha; el responsable y el estado de la tarea
// no cambian.

import type { TaskAction } from '@del-campo/api'
import { useActionState, useEffect, useRef } from 'react'

import { BotonEnviar } from '@/app/_componentes/BotonEnviar'
import type { Resultado } from '@/app/_componentes/Edicion'
import { involucrar, marcarAccionHecha } from '@/app/tareas/acciones'

const ErrorEnFila = ({ estado }: { readonly estado: Resultado }) =>
  estado?.ok === false ? (
    <p className="error-en-fila" role="alert">
      {estado.error}
    </p>
  ) : null

function MarcarHecha({ tarea, accion }: { readonly tarea: string; readonly accion: string }) {
  const [estado, enviar] = useActionState(marcarAccionHecha, null)
  return (
    <form action={enviar} className="accion-tarea__marcar">
      <input type="hidden" name="id" value={tarea} />
      <input type="hidden" name="accion" value={accion} />
      <BotonEnviar className="boton boton--secundario">Marcar hecha</BotonEnviar>
      <ErrorEnFila estado={estado} />
    </form>
  )
}

export function AccionesDelEquipo({
  tarea,
  acciones,
  integrantes,
}: {
  readonly tarea: string
  readonly acciones: readonly TaskAction[]
  readonly integrantes: readonly { readonly userId: string; readonly email: string }[]
}) {
  const [estado, enviar] = useActionState(involucrar, null)
  const formulario = useRef<HTMLFormElement>(null)
  useEffect(() => {
    if (estado?.ok === true) formulario.current?.reset()
  }, [estado])

  return (
    <>
      {acciones.length === 0 ? (
        <p className="meta">Nadie más está involucrado en esta tarea.</p>
      ) : (
        <ul className="lista">
          {acciones.map((a) => (
            <li key={a.id} className="accion-tarea">
              <div>
                <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{a.description}</p>
                <p className="meta" style={{ margin: 0 }}>
                  {a.assignedToMe ? 'Vos' : (a.assignedEmail ?? 'integrante dado de baja')}
                </p>
              </div>
              <div className="fila">
                <span className={a.status === 'HECHA' ? 'chip chip--hecha' : 'chip'}>{a.status === 'HECHA' ? 'Hecha' : 'Pendiente'}</span>
                {a.status === 'PENDIENTE' && a.assignedToMe ? <MarcarHecha tarea={tarea} accion={a.id} /> : null}
              </div>
            </li>
          ))}
        </ul>
      )}

      <h3>Involucrar a alguien</h3>
      <form ref={formulario} action={enviar} className="formulario-compacto">
        <input type="hidden" name="id" value={tarea} />
        <div className="campo">
          <label htmlFor="persona">Persona</label>
          <select id="persona" name="persona" required defaultValue="">
            <option value="" disabled>
              Elegí un integrante
            </option>
            {integrantes.map((i) => (
              <option key={i.userId} value={i.userId}>
                {i.email}
              </option>
            ))}
          </select>
        </div>
        <div className="campo campo--ancho">
          <label htmlFor="descripcion">Qué tiene que hacer</label>
          <input id="descripcion" name="descripcion" required maxLength={2000} />
        </div>
        <div className="acciones">
          <BotonEnviar>Involucrar</BotonEnviar>
        </div>
        <ErrorEnFila estado={estado} />
      </form>
    </>
  )
}
