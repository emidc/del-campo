'use client'

// El estado de la póliza con la opción de anularla o de deshacer la anulación, que aparece
// al pasar el cursor o al llegar con el teclado. Anular pide confirmación; deshacer no:
// la vuelve a Vigente.

import type { ReactNode } from 'react'
import { useActionState, useEffect, useRef } from 'react'

import { BotonEnviar } from '@/app/_componentes/BotonEnviar'
import type { Accion } from '@/app/_componentes/Edicion'

export function EstadoAnulable({
  poliza,
  numero,
  opcion,
  accion,
  children,
}: {
  readonly poliza: string
  readonly numero: string
  readonly opcion: 'anular' | 'deshacer' | null
  readonly accion: Accion
  readonly children: ReactNode
}) {
  const dialogo = useRef<HTMLDialogElement>(null)
  const [estado, enviar] = useActionState(accion, null)
  useEffect(() => {
    if (estado?.ok === true) dialogo.current?.close()
  }, [estado])

  if (opcion === null) return <>{children}</>
  const error =
    estado?.ok === false ? (
      <p className="error-en-fila" role="alert">
        {estado.error}
      </p>
    ) : null

  return (
    <span className="estado-anulable">
      {children}
      {opcion === 'deshacer' ? (
        <form action={enviar} className="estado-anulable__accion">
          <input type="hidden" name="poliza" value={poliza} />
          <input type="hidden" name="deshacer" value="1" />
          <BotonEnviar className="boton boton--secundario boton--chico" title="Volver a Vigente">
            Deshacer
          </BotonEnviar>
        </form>
      ) : (
        <>
          <button
            type="button"
            className="boton boton--peligro boton--chico estado-anulable__accion"
            onClick={() => dialogo.current?.showModal()}
          >
            Anular
          </button>
          <dialog ref={dialogo} className="dialogo" aria-labelledby={`anular-${poliza}`}>
            <h2 id={`anular-${poliza}`}>¿Anular la póliza {numero}?</h2>
            <form action={enviar}>
              <input type="hidden" name="poliza" value={poliza} />
              <p>La póliza pasa a Anulada. Se puede deshacer desde el estado mientras el fin de vigencia sea futuro, y vuelve a Vigente.</p>
              {error}
              <div className="fila fila--fin">
                <button type="button" className="boton boton--secundario" onClick={() => dialogo.current?.close()}>
                  Cancelar
                </button>
                <BotonEnviar className="boton boton--peligro">Anular póliza</BotonEnviar>
              </div>
            </form>
          </dialog>
        </>
      )}
      {opcion === 'deshacer' ? error : null}
    </span>
  )
}
