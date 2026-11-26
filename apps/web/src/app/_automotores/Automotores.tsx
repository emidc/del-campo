'use client'

// Automotores en la ficha del cliente (como Teléfonos y mails: lápiz para editar en la
// misma fila y + para agregar) y en la de la póliza (+ para sumar uno del tomador o
// cargar uno nuevo, ✕ para quitarlo de la póliza).

import type { KeyboardEvent } from 'react'
import { useActionState, useEffect, useRef, useState } from 'react'

import { BotonEnviar } from '@/app/_componentes/BotonEnviar'
import type { Resultado } from '@/app/_componentes/Edicion'
import { BotonLapiz, Confirmar } from '@/app/_componentes/Edicion'
import { IconoCruz, IconoMas, IconoPapelera } from '@/app/_componentes/Iconos'

import { agregarAlCliente, corregirDelCliente, eliminarDelCliente, quitarDePoliza, sumarAPoliza } from './acciones'

export interface AutomotorDeFicha {
  readonly id: string
  readonly plate: string
  readonly brand: string | null
  readonly model: string | null
  readonly year: number | null
}

const useCerrarAlGuardar = (estado: Resultado, cerrar: () => void): void => {
  const ultimo = useRef<Resultado>(null)
  useEffect(() => {
    if (estado !== ultimo.current && estado?.ok === true) cerrar()
    ultimo.current = estado
  }, [estado, cerrar])
}

const MensajeDeError = ({ estado }: { readonly estado: Resultado }) =>
  estado?.ok === false ? (
    <p className="error-en-fila" role="alert">
      {estado.error}
    </p>
  ) : null

/** «Marca Modelo · Año», o `null` si no tiene ninguno. */
export const descripcion = (a: AutomotorDeFicha): string | null => {
  const partes = [[a.brand, a.model].filter((x) => x !== null).join(' '), a.year === null ? '' : String(a.year)].filter((x) => x !== '')
  return partes.length === 0 ? null : partes.join(' · ')
}

/** Patente, marca, modelo y año. Sólo la patente es obligatoria. */
const Campos = ({ valores, onEscape }: { readonly valores?: AutomotorDeFicha; readonly onEscape: () => void }) => {
  const escape = (e: KeyboardEvent) => {
    if (e.key === 'Escape') onEscape()
  }
  return (
    <>
      <input name="patente" defaultValue={valores?.plate ?? ''} required maxLength={16} placeholder="Patente" aria-label="Patente" autoFocus onKeyDown={escape} />
      <input name="marca" defaultValue={valores?.brand ?? ''} maxLength={80} placeholder="Marca" aria-label="Marca" onKeyDown={escape} />
      <input name="modelo" defaultValue={valores?.model ?? ''} maxLength={120} placeholder="Modelo" aria-label="Modelo" onKeyDown={escape} />
      <input
        name="anio"
        defaultValue={valores?.year ?? ''}
        inputMode="numeric"
        pattern="\d{4}"
        maxLength={4}
        placeholder="Año"
        aria-label="Año"
        className="automotor-anio"
        onKeyDown={escape}
      />
    </>
  )
}

const Vista = ({ automotor }: { readonly automotor: AutomotorDeFicha }) => {
  const detalle = descripcion(automotor)
  return (
    <span>
      <span className="automotor-patente">{automotor.plate}</span>
      {detalle === null ? null : <span className="meta"> · {detalle}</span>}
    </span>
  )
}

/** Una fila de la ficha del cliente: lápiz para editar; al editar, ✕, ✓ y Eliminar. */
export function FilaDeAutomotor({ parte, automotor }: { readonly parte: string; readonly automotor: AutomotorDeFicha }) {
  const [editando, setEditando] = useState(false)
  const [estado, guardar] = useActionState(corregirDelCliente, null)
  const [estadoBaja, eliminar] = useActionState(eliminarDelCliente, null)
  const cerrar = () => {
    setEditando(false)
  }
  useCerrarAlGuardar(estado, cerrar)

  return (
    <li className={editando ? 'contacto editable editable--abierto' : 'contacto editable'}>
      <div>
        {editando ? (
          <>
            <form action={guardar} className="edicion-en-fila">
              <input type="hidden" name="parte" value={parte} />
              <input type="hidden" name="automotor" value={automotor.id} />
              <Campos valores={automotor} onEscape={cerrar} />
              <Confirmar onCancelar={cerrar} />
              <MensajeDeError estado={estado} />
            </form>
            <form action={eliminar} className="fila">
              <input type="hidden" name="parte" value={parte} />
              <input type="hidden" name="automotor" value={automotor.id} />
              <BotonEnviar className="boton--secundario boton--chico boton--peligro-suave">
                <IconoPapelera /> Eliminar automotor
              </BotonEnviar>
              <MensajeDeError estado={estadoBaja} />
            </form>
          </>
        ) : (
          <span className="editable__valor">
            <Vista automotor={automotor} />
            <BotonLapiz
              etiqueta={`Editar automotor ${automotor.plate}`}
              onClick={() => {
                setEditando(true)
              }}
            />
          </span>
        )}
      </div>
    </li>
  )
}

/** El + de la ficha del cliente: abre una fila para cargar un automotor. */
export function NuevoAutomotor({ parte }: { readonly parte: string }) {
  const [abierto, setAbierto] = useState(false)
  const [estado, guardar] = useActionState(agregarAlCliente, null)
  const cerrar = () => {
    setAbierto(false)
  }
  useCerrarAlGuardar(estado, cerrar)
  if (!abierto)
    return (
      <button
        type="button"
        className="boton-icono boton-icono--agregar"
        onClick={() => {
          setAbierto(true)
        }}
        aria-label="Agregar automotor"
        title="Agregar automotor"
      >
        <IconoMas />
      </button>
    )
  return (
    <form action={guardar} className="edicion-en-fila contacto-nuevo-fila">
      <input type="hidden" name="parte" value={parte} />
      <Campos onEscape={cerrar} />
      <Confirmar onCancelar={cerrar} etiqueta="Agregar" />
      <MensajeDeError estado={estado} />
    </form>
  )
}

/** Una fila de la ficha de la póliza: ✕ la quita de la póliza; sigue en el cliente. */
export function FilaDeAutomotorEnPoliza({ poliza, automotor }: { readonly poliza: string; readonly automotor: AutomotorDeFicha }) {
  const [estado, quitar] = useActionState(quitarDePoliza, null)
  return (
    <li className="contacto editable">
      <div>
        <span className="editable__valor">
          <Vista automotor={automotor} />
          <form action={quitar}>
            <input type="hidden" name="poliza" value={poliza} />
            <input type="hidden" name="automotor" value={automotor.id} />
            <BotonEnviar className="boton-icono lapiz" aria-label={`Quitar ${automotor.plate} de la póliza`} title="Quitar de la póliza">
              <IconoCruz />
            </BotonEnviar>
          </form>
        </span>
        <MensajeDeError estado={estado} />
      </div>
    </li>
  )
}

/** El + de la póliza: elegir un automotor del tomador o cargar uno nuevo, que se suma también al tomador. */
export function SumarAutomotor({
  poliza,
  tomador,
  delTomador,
}: {
  readonly poliza: string
  readonly tomador: string
  readonly delTomador: readonly AutomotorDeFicha[]
}) {
  const [abierto, setAbierto] = useState(false)
  const [elegido, setElegido] = useState('')
  const [estado, guardar] = useActionState(sumarAPoliza, null)
  const cerrar = () => {
    setAbierto(false)
    setElegido('')
  }
  useCerrarAlGuardar(estado, cerrar)
  if (!abierto)
    return (
      <button
        type="button"
        className="boton-icono boton-icono--agregar"
        onClick={() => {
          setAbierto(true)
          setElegido(delTomador.length === 0 ? 'nuevo' : '')
        }}
        aria-label="Sumar automotor"
        title="Sumar automotor"
      >
        <IconoMas />
      </button>
    )
  return (
    <form action={guardar} className="edicion-en-fila contacto-nuevo-fila">
      <input type="hidden" name="poliza" value={poliza} />
      <input type="hidden" name="tomador" value={tomador} />
      <select
        name="automotor"
        value={elegido}
        onChange={(e) => {
          setElegido(e.target.value)
        }}
        aria-label="Automotor"
        className="automotor-elegir"
        autoFocus
      >
        <option value="" disabled>
          Elegir un automotor del tomador
        </option>
        {delTomador.map((a) => (
          <option key={a.id} value={a.id}>
            {[a.plate, descripcion(a)].filter((x) => x !== null).join(' · ')}
          </option>
        ))}
        <option value="nuevo">Nuevo automotor…</option>
      </select>
      {elegido === 'nuevo' ? <Campos onEscape={cerrar} /> : null}
      <Confirmar onCancelar={cerrar} etiqueta="Sumar" />
      <MensajeDeError estado={estado} />
    </form>
  )
}
