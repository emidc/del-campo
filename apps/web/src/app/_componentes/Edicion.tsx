'use client'

// Edición en la misma fila y confirmaciones de borrado. Cada control llama a una acción
// del servidor que devuelve `{ ok }` o `{ error }`: si falla, la edición sigue abierta con
// el error a la vista; si guarda, la página se vuelve a leer con el valor nuevo.

import type { ReactNode } from 'react'
import { useActionState, useCallback, useEffect, useRef, useState } from 'react'

import { BotonEnviar } from './BotonEnviar'
import { IconoCheck, IconoCruz, IconoLapiz } from './Iconos'
import { LARGO_MAXIMO_DE_NOMBRE, decidirNombre } from './titulo-editable'

export type Resultado =
  | { readonly ok: true }
  | { readonly ok: false; readonly error: string; readonly siguiente?: number }
  | null
export type Accion = (previo: Resultado, form: FormData) => Promise<Resultado>

type Ocultos = Readonly<Record<string, string>>

const CamposOcultos = ({ ocultos }: { readonly ocultos: Ocultos }) => (
  <>
    {Object.entries(ocultos).map(([nombre, valor]) => (
      <input key={nombre} type="hidden" name={nombre} value={valor} />
    ))}
  </>
)

/** El lápiz que aparece al pasar el cursor sobre algo editable. */
export const BotonLapiz = ({ etiqueta, onClick }: { readonly etiqueta: string; readonly onClick: () => void }) => (
  <button type="button" className="boton-icono lapiz" onClick={onClick} aria-label={etiqueta} title={etiqueta}>
    <IconoLapiz />
  </button>
)

/** ✕ y ✓ de una edición en la misma fila. */
export const Confirmar = ({ onCancelar, etiqueta = 'Guardar' }: { readonly onCancelar: () => void; readonly etiqueta?: string }) => (
  <span className="fila-acciones">
    <button type="button" className="boton-icono" onClick={onCancelar} aria-label="Cancelar" title="Cancelar">
      <IconoCruz />
    </button>
    <BotonEnviar className="boton-icono boton-icono--marca" aria-label={etiqueta} title={etiqueta}>
      <IconoCheck />
    </BotonEnviar>
  </span>
)

/** Cierra la edición cuando la acción respondió bien. */
const useAlGuardar = (estado: Resultado, cerrar: () => void): void => {
  const ultimo = useRef<Resultado>(null)
  useEffect(() => {
    if (estado !== ultimo.current && estado?.ok === true) cerrar()
    ultimo.current = estado
  }, [estado, cerrar])
}

export interface Opcion {
  readonly valor: string
  readonly etiqueta: string
}

/**
 * Una fila `<dt>`/`<dd>` de una lista de datos, editable en el lugar. `valor` es lo que se
 * precarga; `children`, lo que se muestra.
 */
export function CampoEditable({
  etiqueta,
  valor,
  tipo = 'text',
  opciones,
  accion,
  ocultos,
  children,
}: {
  readonly etiqueta: string
  readonly valor: string
  readonly tipo?: 'text' | 'date' | 'importe' | 'select' | 'url'
  readonly opciones?: readonly Opcion[]
  readonly accion: Accion
  readonly ocultos: Ocultos
  readonly children: ReactNode
}) {
  const [editando, setEditando] = useState(false)
  const [estado, enviar] = useActionState(accion, null)
  const cerrar = () => { setEditando(false); }
  useAlGuardar(estado, cerrar)

  return (
    <>
      <dt>{etiqueta}</dt>
      <dd className={editando ? 'editable editable--abierto' : 'editable'}>
        {editando ? (
          <form action={enviar} className="edicion-en-fila">
            <CamposOcultos ocultos={ocultos} />
            {tipo === 'select' ? (
              <select name="valor" defaultValue={valor} aria-label={etiqueta} autoFocus>
                {(opciones ?? []).map((o) => (
                  <option key={o.valor} value={o.valor}>
                    {o.etiqueta}
                  </option>
                ))}
              </select>
            ) : (
              <input
                name="valor"
                type={tipo === 'date' ? 'date' : tipo === 'url' ? 'url' : 'text'}
                inputMode={tipo === 'importe' ? 'decimal' : undefined}
                defaultValue={valor}
                aria-label={etiqueta}
                maxLength={tipo === 'url' ? 500 : 160}
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Escape') cerrar()
                }}
              />
            )}
            <Confirmar onCancelar={cerrar} />
            {estado?.ok === false ? (
              <p className="error-en-fila" role="alert">
                {estado.error}
              </p>
            ) : null}
          </form>
        ) : (
          <span className="editable__valor">
            <span>{children}</span>
            <BotonLapiz etiqueta={`Editar ${etiqueta.toLowerCase()}`} onClick={() => { setEditando(true); }} />
          </span>
        )}
      </dd>
    </>
  )
}

/** Nombre y apellido de una persona, editables juntos en la misma fila. */
export function NombreEditable({
  nombre,
  apellido,
  accion,
  ocultos,
  children,
}: {
  readonly nombre: string
  readonly apellido: string
  readonly accion: Accion
  readonly ocultos: Ocultos
  readonly children: ReactNode
}) {
  const [editando, setEditando] = useState(false)
  const [estado, enviar] = useActionState(accion, null)
  const cerrar = () => { setEditando(false); }
  useAlGuardar(estado, cerrar)
  return (
    <>
      <dt>Nombre</dt>
      <dd className={editando ? 'editable editable--abierto' : 'editable'}>
        {editando ? (
          <form action={enviar} className="edicion-en-fila">
            <CamposOcultos ocultos={ocultos} />
            <input name="nombre" defaultValue={nombre} aria-label="Nombre" placeholder="Nombre" maxLength={80} autoFocus />
            <input name="apellido" defaultValue={apellido} aria-label="Apellido" placeholder="Apellido" maxLength={80} />
            <Confirmar onCancelar={cerrar} />
            {estado?.ok === false ? (
              <p className="error-en-fila" role="alert">
                {estado.error}
              </p>
            ) : null}
          </form>
        ) : (
          <span className="editable__valor">
            <span className="nombre">{children}</span>
            <BotonLapiz etiqueta="Editar nombre" onClick={() => { setEditando(true); }} />
          </span>
        )}
      </dd>
    </>
  )
}

/**
 * El título (h1) de la ficha de una tarea o gestión, editable en el lugar. El lápiz aparece
 * al pasar el cursor o al llegar con el teclado. Enter o salir del campo guarda, Esc
 * cancela, y un nombre vacío no se acepta.
 */
export function TituloEditable({
  titulo,
  etiqueta,
  accion,
  ocultos,
}: {
  readonly titulo: string
  /** Para el lector de pantalla: «Nombre de la tarea», «Nombre de la gestión». */
  readonly etiqueta: string
  readonly accion: Accion
  readonly ocultos: Ocultos
}) {
  const [editando, setEditando] = useState(false)
  const [aviso, setAviso] = useState<string | null>(null)
  const [estado, enviar, enviando] = useActionState(accion, null)
  const formulario = useRef<HTMLFormElement>(null)
  const lapiz = useRef<HTMLSpanElement>(null)
  const volverAlLapiz = useRef(false)
  // Cancelar con Esc desmonta el campo: este freno evita que el blur posterior guarde.
  const cancelado = useRef(false)

  // Un error de una edición anterior no se vuelve a mostrar al abrir de nuevo.
  const estadoAlAbrir = useRef<Resultado>(null)

  const cerrar = useCallback(() => {
    cancelado.current = true
    volverAlLapiz.current = true
    setAviso(null)
    setEditando(false)
  }, [])
  useAlGuardar(estado, cerrar)

  useEffect(() => {
    if (!editando && volverAlLapiz.current) {
      volverAlLapiz.current = false
      lapiz.current?.querySelector('button')?.focus()
    }
  }, [editando])

  const abrir = () => {
    cancelado.current = false
    estadoAlAbrir.current = estado
    setAviso(null)
    setEditando(true)
  }

  const error = aviso ?? (estado !== estadoAlAbrir.current && estado?.ok === false ? estado.error : null)

  if (!editando) {
    return (
      <div className="titulo-editable">
        <h1>
          {titulo}
          <span ref={lapiz} className="titulo-editable__lapiz">
            <BotonLapiz etiqueta={`Editar ${etiqueta.toLowerCase()}`} onClick={abrir} />
          </span>
        </h1>
      </div>
    )
  }

  return (
    <form
      ref={formulario}
      action={enviar}
      className="titulo-editable titulo-editable--abierto"
      onSubmit={(e) => {
        const escrito = new FormData(e.currentTarget).get('nombre')
        const decision = decidirNombre(titulo, typeof escrito === 'string' ? escrito : '')
        if (decision.tipo === 'guardar' && !enviando) {
          setAviso(null)
          return
        }
        e.preventDefault()
        if (decision.tipo === 'cerrar') cerrar()
        else if (decision.tipo === 'error') setAviso(decision.mensaje)
      }}
    >
      <CamposOcultos ocultos={ocultos} />
      <input
        name="nombre"
        defaultValue={titulo}
        aria-label={etiqueta}
        aria-invalid={error === null ? undefined : true}
        aria-describedby={error === null ? undefined : 'titulo-editable-error'}
        maxLength={LARGO_MAXIMO_DE_NOMBRE}
        autoFocus
        onFocus={(e) => { e.currentTarget.select() }}
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            e.preventDefault()
            cerrar()
          }
        }}
        onBlur={() => {
          if (!cancelado.current && !enviando) formulario.current?.requestSubmit()
        }}
      />
      {error === null ? null : (
        <p id="titulo-editable-error" className="error-en-fila" role="alert">
          {error}
        </p>
      )}
    </form>
  )
}

/**
 * Un botón que abre un diálogo de confirmación para borrar algo para siempre. Si la
 * acción falla, el diálogo sigue abierto con el error; si borra, la acción redirige.
 */
export function EliminarConDialogo({
  boton,
  titulo,
  children,
  accion,
  ocultos,
  bloqueo,
}: {
  readonly boton: string
  readonly titulo: string
  readonly children: ReactNode
  readonly accion: Accion
  readonly ocultos: Ocultos
  /** Si hay algo que impide borrar, se explica en lugar de ofrecer el borrado. */
  readonly bloqueo?: string | null
}) {
  const dialogo = useRef<HTMLDialogElement>(null)
  const [estado, enviar] = useActionState(accion, null)
  return (
    <>
      <button type="button" className="boton boton--peligro" onClick={() => dialogo.current?.showModal()}>
        {boton}
      </button>
      <dialog ref={dialogo} className="dialogo" aria-labelledby={`${boton}-titulo`}>
        <h2 id={`${boton}-titulo`}>{titulo}</h2>
        {bloqueo === null || bloqueo === undefined ? (
          <form action={enviar}>
            <CamposOcultos ocultos={ocultos} />
            {children}
            {estado?.ok === false ? (
              <p className="estado estado--aviso" role="alert">
                {estado.error}
              </p>
            ) : null}
            <div className="fila fila--fin">
              <button type="button" className="boton boton--secundario" onClick={() => dialogo.current?.close()}>
                Cancelar
              </button>
              <BotonEnviar className="boton boton--peligro">Eliminar definitivamente</BotonEnviar>
            </div>
          </form>
        ) : (
          <>
            <p className="estado estado--aviso" role="alert">
              {bloqueo}
            </p>
            <div className="fila fila--fin">
              <button type="button" className="boton boton--secundario" onClick={() => dialogo.current?.close()}>
                Cerrar
              </button>
            </div>
          </>
        )}
      </dialog>
    </>
  )
}
