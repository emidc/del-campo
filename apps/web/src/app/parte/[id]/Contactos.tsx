'use client'

// Teléfonos y mails, empresas de una persona y contactos de una empresa: se editan en la misma fila, con un lápiz al
// pasar el cursor y un + para agregar.

import { useActionState, useEffect, useRef, useState } from 'react'

import { BotonEnviar } from '@/app/_componentes/BotonEnviar'
import type { Resultado } from '@/app/_componentes/Edicion'
import { BotonLapiz, Confirmar } from '@/app/_componentes/Edicion'
import { IconoCruz, IconoMas, IconoPapelera } from '@/app/_componentes/Iconos'

import {
  agregar,
  asociar,
  asociarContacto,
  convertir,
  corregir,
  empresasQueCoinciden,
  personasQueCoinciden,
  quitar,
  quitarDeLaEmpresa,
} from './acciones'

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

export interface ContactoDeFicha {
  readonly id: string
  readonly channel: 'PHONE' | 'WHATSAPP' | 'EMAIL'
  readonly value: string
}

/** Una fila de teléfono o mail: lápiz para editar; al editar, ✕, ✓ y Eliminar. */
export function FilaDeContacto({ parte, contacto }: { readonly parte: string; readonly contacto: ContactoDeFicha }) {
  const [editando, setEditando] = useState(false)
  const [estado, guardar] = useActionState(corregir, null)
  const [estadoBaja, darDeBaja] = useActionState(quitar, null)
  const cerrar = () => { setEditando(false); }
  useCerrarAlGuardar(estado, cerrar)
  const tipo = contacto.channel === 'EMAIL' ? 'Mail' : 'Teléfono'

  return (
    <li className={editando ? 'contacto editable editable--abierto' : 'contacto editable'}>
      <div>
        <p className="meta">{tipo}</p>
        {editando ? (
          <>
            <form action={guardar} className="edicion-en-fila">
              <input type="hidden" name="parte" value={parte} />
              <input type="hidden" name="contacto" value={contacto.id} />
              <input
                name="valor"
                type={contacto.channel === 'EMAIL' ? 'email' : 'tel'}
                defaultValue={contacto.value}
                required
                maxLength={120}
                aria-label={tipo}
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Escape') cerrar()
                }}
              />
              <Confirmar onCancelar={cerrar} />
              <MensajeDeError estado={estado} />
            </form>
            <form action={darDeBaja} className="fila">
              <input type="hidden" name="parte" value={parte} />
              <input type="hidden" name="contacto" value={contacto.id} />
              <BotonEnviar className="boton--secundario boton--chico boton--peligro-suave">
                <IconoPapelera /> Eliminar {tipo.toLowerCase()}
              </BotonEnviar>
              <MensajeDeError estado={estadoBaja} />
            </form>
          </>
        ) : (
          <span className="editable__valor">
            <span>{contacto.value}</span>
            <BotonLapiz etiqueta={`Editar ${tipo.toLowerCase()} ${contacto.value}`} onClick={() => { setEditando(true); }} />
          </span>
        )}
      </div>
    </li>
  )
}

/** El + que abre una fila nueva para elegir Teléfono o Mail y cargar el valor. */
export function NuevoContacto({ parte }: { readonly parte: string }) {
  const [abierto, setAbierto] = useState(false)
  const [estado, guardar] = useActionState(agregar, null)
  const cerrar = () => { setAbierto(false); }
  useCerrarAlGuardar(estado, cerrar)
  if (!abierto)
    return (
      <button type="button" className="boton-icono boton-icono--agregar" onClick={() => { setAbierto(true); }} aria-label="Agregar teléfono o mail" title="Agregar teléfono o mail">
        <IconoMas />
      </button>
    )
  return (
    <form action={guardar} className="edicion-en-fila contacto-nuevo-fila">
      <input type="hidden" name="parte" value={parte} />
      <select name="canal" defaultValue="PHONE" aria-label="Tipo">
        <option value="PHONE">Teléfono</option>
        <option value="EMAIL">Mail</option>
      </select>
      <input name="valor" required maxLength={120} placeholder="261 555 0101" aria-label="Número o dirección" autoFocus />
      <Confirmar onCancelar={cerrar} etiqueta="Agregar" />
      <MensajeDeError estado={estado} />
    </form>
  )
}

interface OpcionDeBusqueda {
  readonly partyId: string
  readonly displayName: string
  readonly detalle: string | null
}

/**
 * Un + que abre un buscador de clientes guardados que sugiere mientras se escribe. Sólo
 * se puede asociar eligiendo un resultado de la lista.
 */
function AsociarConBuscador({
  parte,
  campo,
  accion,
  buscar,
  boton,
  placeholder,
  vacio,
}: {
  readonly parte: string
  /** El nombre del campo con el id elegido. */
  readonly campo: string
  readonly accion: (previo: Resultado, form: FormData) => Promise<Resultado>
  readonly buscar: (texto: string) => Promise<readonly OpcionDeBusqueda[]>
  readonly boton: string
  readonly placeholder: string
  readonly vacio: string
}) {
  const [abierto, setAbierto] = useState(false)
  const [texto, setTexto] = useState('')
  const [opciones, setOpciones] = useState<readonly OpcionDeBusqueda[]>([])
  const [elegida, setElegida] = useState<OpcionDeBusqueda | null>(null)
  const [estado, guardar] = useActionState(accion, null)
  const cerrar = () => {
    setAbierto(false)
    setTexto('')
    setOpciones([])
    setElegida(null)
  }
  useCerrarAlGuardar(estado, cerrar)

  useEffect(() => {
    if (!abierto || elegida !== null || texto.trim().length < 2) {
      setOpciones([])
      return
    }
    let vigente = true
    const espera = setTimeout(() => {
      void buscar(texto).then((resultado) => {
        if (vigente) setOpciones(resultado)
      })
    }, 250)
    return () => {
      vigente = false
      clearTimeout(espera)
    }
  }, [texto, abierto, elegida, buscar])

  if (!abierto)
    return (
      <button type="button" className="boton-icono boton-icono--agregar" onClick={() => { setAbierto(true); }} aria-label={boton} title={boton}>
        <IconoMas />
      </button>
    )
  const lista = `${campo}-sugeridos`
  return (
    <form action={guardar} className="buscador-empresa">
      <input type="hidden" name="parte" value={parte} />
      <input type="hidden" name={campo} value={elegida?.partyId ?? ''} />
      <div className="edicion-en-fila">
        <input
          type="search"
          value={elegida === null ? texto : elegida.displayName}
          onChange={(e) => {
            setElegida(null)
            setTexto(e.target.value)
          }}
          placeholder={placeholder}
          aria-label={placeholder}
          aria-autocomplete="list"
          aria-controls={lista}
          autoFocus
        />
        <Confirmar onCancelar={cerrar} etiqueta="Asociar" />
      </div>
      {elegida === null && opciones.length > 0 ? (
        <ul id={lista} className="sugerencias" role="listbox" aria-label={boton}>
          {opciones.map((o) => (
            <li key={o.partyId} role="option" aria-selected={false}>
              <button type="button" onClick={() => { setElegida(o); }}>
                <span className="nombre">{o.displayName}</span>
                {o.detalle === null ? null : <span className="meta"> · {o.detalle}</span>}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      {elegida === null && texto.trim().length >= 2 && opciones.length === 0 ? <p className="meta">{vacio}</p> : null}
      <MensajeDeError estado={estado} />
    </form>
  )
}

const buscarEmpresas = async (texto: string): Promise<readonly OpcionDeBusqueda[]> =>
  (await empresasQueCoinciden(texto)).map((o) => ({ partyId: o.partyId, displayName: o.displayName, detalle: o.cuit === null ? null : `CUIT ${o.cuit}` }))

const buscarPersonas = async (texto: string): Promise<readonly OpcionDeBusqueda[]> =>
  (await personasQueCoinciden(texto)).map((o) => ({ partyId: o.partyId, displayName: o.displayName, detalle: o.dni === null ? null : `DNI ${o.dni}` }))

/** El + del panel Empresas de una persona: asocia una empresa guardada. */
export function AsociarEmpresa({ parte }: { readonly parte: string }) {
  return (
    <AsociarConBuscador
      parte={parte}
      campo="empresa"
      accion={asociar}
      buscar={buscarEmpresas}
      boton="Asociar una empresa"
      placeholder="Buscar empresa por nombre o CUIT"
      vacio="Sin empresas guardadas que coincidan."
    />
  )
}

/** El + del panel Contactos de una empresa: asocia una persona guardada. */
export function AsociarContacto({ parte }: { readonly parte: string }) {
  return (
    <AsociarConBuscador
      parte={parte}
      campo="persona"
      accion={asociarContacto}
      buscar={buscarPersonas}
      boton="Asociar un contacto"
      placeholder="Buscar contacto por nombre o DNI"
      vacio="Sin contactos guardados que coincidan."
    />
  )
}

/** La ✕ de una fila de Contactos de una empresa: confirma y quita el vínculo. */
export function QuitarDeEmpresa({
  empresa,
  empresaNombre,
  persona,
  personaNombre,
}: {
  readonly empresa: string
  readonly empresaNombre: string
  readonly persona: string
  readonly personaNombre: string
}) {
  const dialogo = useRef<HTMLDialogElement>(null)
  const [estado, enviar] = useActionState(quitarDeLaEmpresa, null)
  useCerrarAlGuardar(estado, () => dialogo.current?.close())
  const titulo = `quitar-${persona}`
  return (
    <>
      <button
        type="button"
        className="boton-icono lapiz"
        onClick={() => dialogo.current?.showModal()}
        aria-label={`Quitar a ${personaNombre} de la empresa`}
        title="Quitar de la empresa"
      >
        <IconoCruz />
      </button>
      <dialog ref={dialogo} className="dialogo" aria-labelledby={titulo}>
        <h2 id={titulo}>¿Quitar a {personaNombre} de {empresaNombre}?</h2>
        <form action={enviar}>
          <input type="hidden" name="parte" value={empresa} />
          <input type="hidden" name="persona" value={persona} />
          <p>Se quita el vínculo con la empresa. La ficha de {personaNombre} sigue en Clientes, con sus demás vínculos.</p>
          <MensajeDeError estado={estado} />
          <div className="fila fila--fin">
            <button type="button" className="boton boton--secundario" onClick={() => dialogo.current?.close()}>
              Cancelar
            </button>
            <BotonEnviar className="boton boton--peligro">Quitar de la empresa</BotonEnviar>
          </div>
        </form>
      </dialog>
    </>
  )
}

/** «Convertir en cliente»: si falta el CUIT o el DNI, lo dice al lado del botón. */
export function ConvertirEnCliente({ parte }: { readonly parte: string }) {
  const [estado, enviar] = useActionState(convertir, null)
  return (
    <form action={enviar} className="convertir">
      <input type="hidden" name="parte" value={parte} />
      <BotonEnviar className="boton">Convertir en cliente</BotonEnviar>
      <MensajeDeError estado={estado} />
    </form>
  )
}
