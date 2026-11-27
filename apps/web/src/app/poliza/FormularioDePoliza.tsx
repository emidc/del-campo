'use client'

// Piezas comunes de los formularios de póliza en un modal: renovar, registrar un endoso y
// editarlo desde la ficha. El modal guarda en una sola transacción; si algo falla, sigue
// abierto con el error y no queda nada a medias.

import { useRouter } from 'next/navigation'
import type { ReactNode } from 'react'
import { useActionState, useEffect, useRef } from 'react'

import { BotonEnviar } from '@/app/_componentes/BotonEnviar'
import type { Resultado } from '@/app/_componentes/Edicion'

export const Campo = ({ etiqueta, ancho = false, children }: { readonly etiqueta: string; readonly ancho?: boolean; readonly children: ReactNode }) => (
  <label className={ancho ? 'campo campo--ancho' : 'campo'}>
    <span>{etiqueta}</span>
    {children}
  </label>
)

/** La URL del documento en Drive: ocupa toda la fila del formulario, salvo con `ancho={false}`. */
export const CampoDrive = ({
  etiqueta,
  valor = '',
  ancho = true,
}: {
  readonly etiqueta: string
  readonly valor?: string
  readonly ancho?: boolean
}) => (
  <Campo etiqueta={etiqueta} ancho={ancho}>
    <input name="drive" type="url" defaultValue={valor} maxLength={500} placeholder="https://drive.google.com/file/d/…" />
  </Campo>
)

export interface Valores {
  readonly inicio: string
  readonly fin: string
  readonly prima: string
  readonly premio: string
  readonly suma: string
  readonly moneda: string
  readonly productor: string
  readonly riesgo: string
  readonly pago: string
  readonly renovacion: string
}

/** Los campos del alta de una póliza, comunes a renovar, refacturar y editar un endoso. */
export const CamposDelAlta = ({ v }: { readonly v: Valores }) => (
  <>
    <Campo etiqueta="Inicio de vigencia">
      <input name="inicio" type="date" defaultValue={v.inicio} required />
    </Campo>
    <Campo etiqueta="Fin de vigencia">
      <input name="fin" type="date" defaultValue={v.fin} required />
    </Campo>
    <Campo etiqueta="Productor">
      <input name="productor" defaultValue={v.productor} maxLength={120} />
    </Campo>
    <Campo etiqueta="Tipo de riesgo">
      <input name="riesgo" defaultValue={v.riesgo} maxLength={120} />
    </Campo>
    <Campo etiqueta="Prima">
      <input name="prima" inputMode="decimal" defaultValue={v.prima} />
    </Campo>
    <Campo etiqueta="Premio">
      <input name="premio" inputMode="decimal" defaultValue={v.premio} />
    </Campo>
    <Campo etiqueta="Suma asegurada">
      <input name="suma" inputMode="decimal" defaultValue={v.suma} />
    </Campo>
    <Campo etiqueta="Moneda">
      <input name="moneda" defaultValue={v.moneda} maxLength={10} />
    </Campo>
    <Campo etiqueta="Forma de pago">
      <input name="pago" defaultValue={v.pago} maxLength={120} />
    </Campo>
    <Campo etiqueta="Renovación">
      <select name="renovacion" defaultValue={v.renovacion}>
        <option value="MANUAL">Manual</option>
        <option value="AUTOMATIC">Automática</option>
      </select>
    </Campo>
  </>
)

/** Un modal con formulario. Cancelar cierra y descarta lo cargado; guardar bien, también. */
export function ModalDeFormulario({
  titulo,
  abierto,
  onCerrar,
  accion,
  children,
}: {
  readonly titulo: string
  readonly abierto: boolean
  readonly onCerrar: () => void
  readonly accion: (previo: Resultado, form: FormData) => Promise<Resultado>
  readonly children: (estado: Resultado) => ReactNode
}) {
  const dialogo = useRef<HTMLDialogElement>(null)
  const [estado, enviar] = useActionState(accion, null)
  const router = useRouter()
  const ultimo = useRef<Resultado>(null)
  useEffect(() => {
    if (abierto) dialogo.current?.showModal()
    else dialogo.current?.close()
  }, [abierto])
  useEffect(() => {
    if (estado !== ultimo.current && estado?.ok === true) {
      onCerrar()
      router.refresh()
    }
    ultimo.current = estado
  }, [estado, onCerrar, router])
  return (
    <dialog ref={dialogo} className="dialogo dialogo--ancho" onClose={onCerrar} aria-label={titulo}>
      {abierto ? (
        <form action={enviar}>
          <h2>{titulo}</h2>
          {children(estado)}
          {estado?.ok === false ? (
            <p className="estado estado--aviso" role="alert">
              {estado.error}
            </p>
          ) : null}
          <div className="fila fila--fin">
            <button type="button" className="boton boton--secundario" onClick={onCerrar}>
              Cancelar
            </button>
            <BotonEnviar className="boton">Guardar</BotonEnviar>
          </div>
        </form>
      ) : null}
    </dialog>
  )
}
