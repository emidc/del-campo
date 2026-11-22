'use client'

// T-0061 — Los formularios de un ítem de las listas de riesgos: editar todas sus columnas,
// agregar uno nuevo, comentarlo y darlo de baja o reactivarlo.

import type { RiskListColumn } from '@del-campo/api'
import { useActionState, useEffect, useRef, useState } from 'react'

import { BotonEnviar } from '@/app/_componentes/BotonEnviar'
import type { Resultado } from '@/app/_componentes/Edicion'
import { IconoLapiz, IconoMas } from '@/app/_componentes/Iconos'

import { bajaDeItem, comentarItem, crearItem, editarItem } from './acciones-riesgos'

const useAlGuardar = (estado: Resultado, alGuardar: () => void): void => {
  const ultimo = useRef<Resultado>(null)
  useEffect(() => {
    if (estado !== ultimo.current && estado?.ok === true) alGuardar()
    ultimo.current = estado
  }, [estado, alGuardar])
}

const MensajeDeError = ({ estado }: { readonly estado: Resultado }) =>
  estado?.ok === false ? (
    <p className="error-en-fila" role="alert">
      {estado.error}
    </p>
  ) : null

const Campos = ({ columnas, valores }: { readonly columnas: readonly RiskListColumn[]; readonly valores: Readonly<Record<string, string>> }) => (
  <div className="campos-riesgo">
    {columnas.map((c) => (
      <div key={c.key} className={c.long === true ? 'campo campo--ancho' : 'campo'}>
        <label htmlFor={`campo_${c.key}`}>{c.label}</label>
        {c.long === true ? (
          <textarea id={`campo_${c.key}`} name={`campo_${c.key}`} defaultValue={valores[c.key] ?? ''} rows={3} maxLength={4000} />
        ) : (
          <input id={`campo_${c.key}`} name={`campo_${c.key}`} defaultValue={valores[c.key] ?? ''} maxLength={4000} />
        )}
      </div>
    ))}
  </div>
)

export function EditarItem({
  parte,
  lista,
  item,
  columnas,
  valores,
}: {
  readonly parte: string
  readonly lista: string
  readonly item: string
  readonly columnas: readonly RiskListColumn[]
  readonly valores: Readonly<Record<string, string>>
}) {
  const [abierto, setAbierto] = useState(false)
  const [estado, guardar] = useActionState(editarItem, null)
  useAlGuardar(estado, () => { setAbierto(false) })
  if (!abierto)
    return (
      <button type="button" className="boton boton--secundario boton--chico" onClick={() => { setAbierto(true) }}>
        <IconoLapiz /> Editar
      </button>
    )
  return (
    <form action={guardar} className="formulario-riesgo">
      <input type="hidden" name="parte" value={parte} />
      <input type="hidden" name="lista" value={lista} />
      <input type="hidden" name="item" value={item} />
      <Campos columnas={columnas} valores={valores} />
      <div className="fila">
        <BotonEnviar className="boton boton--chico">Guardar</BotonEnviar>
        <button type="button" className="boton boton--secundario boton--chico" onClick={() => { setAbierto(false) }}>
          Cancelar
        </button>
      </div>
      <MensajeDeError estado={estado} />
    </form>
  )
}

export function NuevoItem({
  parte,
  lista,
  nombre,
  codigoSugerido,
  columnas,
}: {
  readonly parte: string
  readonly lista: string
  readonly nombre: string
  readonly codigoSugerido: string
  readonly columnas: readonly RiskListColumn[]
}) {
  const [abierto, setAbierto] = useState(false)
  const [estado, guardar] = useActionState(crearItem, null)
  useAlGuardar(estado, () => { setAbierto(false) })
  if (!abierto)
    return (
      <button type="button" className="boton boton--chico" onClick={() => { setAbierto(true) }}>
        <IconoMas /> Agregar a {nombre}
      </button>
    )
  return (
    <form action={guardar} className="formulario-riesgo tarjeta">
      <h3>Nuevo ítem en {nombre}</h3>
      <input type="hidden" name="parte" value={parte} />
      <input type="hidden" name="lista" value={lista} />
      <div className="campo">
        <label htmlFor="codigo">Código</label>
        <input id="codigo" name="codigo" defaultValue={codigoSugerido} required maxLength={10} />
      </div>
      <Campos columnas={columnas} valores={{}} />
      <div className="fila">
        <BotonEnviar className="boton boton--chico">Agregar</BotonEnviar>
        <button type="button" className="boton boton--secundario boton--chico" onClick={() => { setAbierto(false) }}>
          Cancelar
        </button>
      </div>
      <MensajeDeError estado={estado} />
    </form>
  )
}

export function ComentarItem({ parte, item }: { readonly parte: string; readonly item: string }) {
  const [estado, guardar] = useActionState(comentarItem, null)
  const formulario = useRef<HTMLFormElement>(null)
  useAlGuardar(estado, () => { formulario.current?.reset() })
  return (
    <form action={guardar} ref={formulario} className="formulario-riesgo">
      <input type="hidden" name="parte" value={parte} />
      <input type="hidden" name="item" value={item} />
      <div className="campo campo--ancho">
        <label htmlFor={`comentario-${item}`}>Comentario</label>
        <textarea id={`comentario-${item}`} name="comentario" rows={2} maxLength={4000} required />
      </div>
      <div className="fila">
        <BotonEnviar className="boton boton--secundario boton--chico">Comentar</BotonEnviar>
      </div>
      <MensajeDeError estado={estado} />
    </form>
  )
}

export function BajaDeItem({ parte, item, dadoDeBaja }: { readonly parte: string; readonly item: string; readonly dadoDeBaja: boolean }) {
  const [estado, guardar] = useActionState(bajaDeItem, null)
  return (
    <form action={guardar}>
      <input type="hidden" name="parte" value={parte} />
      <input type="hidden" name="item" value={item} />
      <input type="hidden" name="baja" value={dadoDeBaja ? 'no' : 'si'} />
      <BotonEnviar className={dadoDeBaja ? 'boton boton--secundario boton--chico' : 'boton boton--secundario boton--chico boton--peligro-suave'}>
        {dadoDeBaja ? 'Reactivar' : 'Dar de baja'}
      </BotonEnviar>
      <MensajeDeError estado={estado} />
    </form>
  )
}
