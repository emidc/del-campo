'use client'

// Teléfonos y mails, y empresas de la ficha: se editan en la misma fila, con un lápiz al
// pasar el cursor y un + para agregar.

import type { OrganizationOption } from '@del-campo/api'
import { useActionState, useEffect, useRef, useState } from 'react'

import { BotonEnviar } from '@/app/_componentes/BotonEnviar'
import type { Resultado } from '@/app/_componentes/Edicion'
import { BotonLapiz, Confirmar } from '@/app/_componentes/Edicion'
import { IconoMas, IconoPapelera } from '@/app/_componentes/Iconos'

import { agregar, asociar, corregir, empresasQueCoinciden, quitar } from './acciones'

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

/**
 * El + del panel Empresas: un buscador de empresas guardadas que sugiere mientras se
 * escribe. Sólo se puede asociar eligiendo un resultado de la lista.
 */
export function AsociarEmpresa({ parte }: { readonly parte: string }) {
  const [abierto, setAbierto] = useState(false)
  const [texto, setTexto] = useState('')
  const [opciones, setOpciones] = useState<readonly OrganizationOption[]>([])
  const [elegida, setElegida] = useState<OrganizationOption | null>(null)
  const [estado, guardar] = useActionState(asociar, null)
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
      void empresasQueCoinciden(texto).then((resultado) => {
        if (vigente) setOpciones(resultado)
      })
    }, 250)
    return () => {
      vigente = false
      clearTimeout(espera)
    }
  }, [texto, abierto, elegida])

  if (!abierto)
    return (
      <button type="button" className="boton-icono boton-icono--agregar" onClick={() => { setAbierto(true); }} aria-label="Asociar una empresa" title="Asociar una empresa">
        <IconoMas />
      </button>
    )
  return (
    <form action={guardar} className="buscador-empresa">
      <input type="hidden" name="parte" value={parte} />
      <input type="hidden" name="empresa" value={elegida?.partyId ?? ''} />
      <div className="edicion-en-fila">
        <input
          type="search"
          value={elegida === null ? texto : elegida.displayName}
          onChange={(e) => {
            setElegida(null)
            setTexto(e.target.value)
          }}
          placeholder="Buscar empresa por nombre o CUIT"
          aria-label="Buscar empresa"
          aria-autocomplete="list"
          aria-controls="empresas-sugeridas"
          autoFocus
        />
        <Confirmar onCancelar={cerrar} etiqueta="Asociar" />
      </div>
      {elegida === null && opciones.length > 0 ? (
        <ul id="empresas-sugeridas" className="sugerencias" role="listbox" aria-label="Empresas guardadas">
          {opciones.map((o) => (
            <li key={o.partyId} role="option" aria-selected={false}>
              <button type="button" onClick={() => { setElegida(o); }}>
                <span className="nombre">{o.displayName}</span>
                {o.cuit === null ? null : <span className="meta"> · CUIT {o.cuit}</span>}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      {elegida === null && texto.trim().length >= 2 && opciones.length === 0 ? (
        <p className="meta">Sin empresas guardadas que coincidan.</p>
      ) : null}
      <MensajeDeError estado={estado} />
    </form>
  )
}
