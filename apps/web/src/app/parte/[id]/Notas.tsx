'use client'

// Pestaña Notas de la ficha: escribir una nota, editarla, archivarla (queda oculta hasta
// «Ver notas archivadas»), desarchivarla y eliminarla.

import { useActionState, useEffect, useRef, useState } from 'react'

import { BotonEnviar } from '@/app/_componentes/BotonEnviar'
import type { Resultado } from '@/app/_componentes/Edicion'
import { IconoLapiz, IconoMas, IconoPapelera } from '@/app/_componentes/Iconos'

import { borrarNota, cambiarArchivoDeNota, guardarNota } from './acciones-notas'

export interface NotaDeFicha {
  readonly id: string
  readonly titulo: string | null
  readonly texto: string
  readonly archivada: boolean
  /** «Manuel del Campo · 23/08/2019 12:30 · Zoho», ya armado. */
  readonly meta: string
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

/** Título y texto de una nota, para escribirla o editarla. */
function FormularioDeNota({ parte, nota, onCancelar }: { readonly parte: string; readonly nota?: NotaDeFicha; readonly onCancelar: () => void }) {
  const [estado, guardar] = useActionState(guardarNota, null)
  useCerrarAlGuardar(estado, onCancelar)
  const clave = nota?.id ?? 'nueva'
  return (
    <form action={guardar} className="nota-formulario">
      <input type="hidden" name="parte" value={parte} />
      {nota === undefined ? null : <input type="hidden" name="nota" value={nota.id} />}
      <div className="campo">
        <label htmlFor={`titulo-${clave}`}>Título (opcional)</label>
        <input id={`titulo-${clave}`} name="titulo" maxLength={200} defaultValue={nota?.titulo ?? ''} />
      </div>
      <div className="campo">
        <label htmlFor={`texto-${clave}`}>Nota</label>
        <textarea id={`texto-${clave}`} name="texto" rows={5} maxLength={20000} defaultValue={nota?.texto ?? ''} autoFocus />
      </div>
      <MensajeDeError estado={estado} />
      <div className="fila fila--fin">
        <button type="button" className="boton boton--secundario boton--chico" onClick={onCancelar}>
          Cancelar
        </button>
        <BotonEnviar className="boton--chico">Guardar</BotonEnviar>
      </div>
    </form>
  )
}

/** El botón «Nueva nota», que abre el formulario arriba de la lista. */
export function NuevaNota({ parte }: { readonly parte: string }) {
  const [abierta, setAbierta] = useState(false)
  if (!abierta)
    return (
      <button type="button" className="boton boton--chico" onClick={() => { setAbierta(true); }}>
        <IconoMas /> Nueva nota
      </button>
    )
  return <FormularioDeNota parte={parte} onCancelar={() => { setAbierta(false); }} />
}

/** Una nota con sus botones: editar, archivar o desarchivar, y eliminar (con confirmación). */
export function TarjetaDeNota({ parte, nota }: { readonly parte: string; readonly nota: NotaDeFicha }) {
  const [editando, setEditando] = useState(false)
  const [confirmando, setConfirmando] = useState(false)
  const [estadoArchivo, archivar] = useActionState(cambiarArchivoDeNota, null)
  const [estadoBorrado, borrar] = useActionState(borrarNota, null)

  if (editando)
    return (
      <li className="nota">
        <FormularioDeNota parte={parte} nota={nota} onCancelar={() => { setEditando(false); }} />
      </li>
    )

  return (
    <li className={nota.archivada ? 'nota nota--archivada' : 'nota'}>
      {nota.titulo === null ? null : <p className="nota__titulo">{nota.titulo}</p>}
      {nota.texto === '' ? null : <p className="nota__texto">{nota.texto}</p>}
      <p className="meta">{nota.meta}</p>
      <div className="fila nota__acciones">
        <button type="button" className="boton boton--secundario boton--chico" onClick={() => { setEditando(true); }}>
          <IconoLapiz /> Editar
        </button>
        <form action={archivar}>
          <input type="hidden" name="parte" value={parte} />
          <input type="hidden" name="nota" value={nota.id} />
          <input type="hidden" name="archivar" value={nota.archivada ? '0' : '1'} />
          <BotonEnviar className="boton--secundario boton--chico">{nota.archivada ? 'Desarchivar' : 'Archivar'}</BotonEnviar>
        </form>
        {confirmando ? (
          <form action={borrar} className="fila">
            <input type="hidden" name="parte" value={parte} />
            <input type="hidden" name="nota" value={nota.id} />
            <span className="meta">¿Eliminarla para siempre?</span>
            <button type="button" className="boton boton--secundario boton--chico" onClick={() => { setConfirmando(false); }}>
              No
            </button>
            <BotonEnviar className="boton--chico boton--peligro">Sí, eliminar</BotonEnviar>
          </form>
        ) : (
          <button type="button" className="boton boton--secundario boton--chico boton--peligro-suave" onClick={() => { setConfirmando(true); }}>
            <IconoPapelera /> Eliminar
          </button>
        )}
      </div>
      <MensajeDeError estado={estadoArchivo} />
      <MensajeDeError estado={estadoBorrado} />
    </li>
  )
}
