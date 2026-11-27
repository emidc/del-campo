'use client'

// «Nueva tarea» del encabezado de Tareas: el formulario de alta se abre en la misma
// pantalla y el cliente se elige con un buscador. Si todavía no está cargado, «Crear
// prospecto» lo da de alta ahí mismo y lo deja elegido. Al crear, la acción abre la ficha.

import { useActionState, useEffect, useRef, useState, useTransition } from 'react'

import { BotonEnviar } from '@/app/_componentes/BotonEnviar'
import type { ClienteSugerido } from '@/app/tareas/acciones'
import { clientesQueCoinciden, crearDesdeListado, crearProspectoParaTarea } from '@/app/tareas/acciones'

interface Origen {
  readonly valor: string
  readonly etiqueta: string
}

/** El alta rápida del prospecto. No es un `<form>`: va dentro del de la tarea. */
function ProspectoRapido({
  origenes,
  nombreInicial,
  alCrear,
  alCancelar,
}: {
  readonly origenes: readonly Origen[]
  readonly nombreInicial: string
  readonly alCrear: (cliente: ClienteSugerido) => void
  readonly alCancelar: () => void
}) {
  const [tipo, setTipo] = useState<'ORGANIZATION' | 'PERSON'>('ORGANIZATION')
  const [origen, setOrigen] = useState('')
  const [nombre, setNombre] = useState(nombreInicial)
  const [apellido, setApellido] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [enviando, iniciar] = useTransition()
  const empresa = tipo === 'ORGANIZATION'

  const guardar = () => {
    setError(null)
    iniciar(async () => {
      const resultado = await crearProspectoParaTarea({ tipo, origen, nombre, apellido })
      if (resultado.ok) alCrear(resultado.cliente)
      else setError(resultado.error)
    })
  }

  return (
    <fieldset className="campo" style={{ border: '1px solid var(--borde)', borderRadius: 8, padding: 12, margin: 0 }}>
      <legend>Nuevo prospecto</legend>
      <div className="formulario-alta__par">
        <div className="campo">
          <label htmlFor="prospecto-tipo">Tipo</label>
          <select
            id="prospecto-tipo"
            value={tipo}
            onChange={(e) => {
              setTipo(e.target.value === 'PERSON' ? 'PERSON' : 'ORGANIZATION')
            }}
          >
            <option value="ORGANIZATION">Empresa</option>
            <option value="PERSON">Persona</option>
          </select>
        </div>
        <div className="campo">
          <label htmlFor="prospecto-origen">Origen</label>
          <select
            id="prospecto-origen"
            value={origen}
            onChange={(e) => {
              setOrigen(e.target.value)
            }}
          >
            <option value="" disabled>
              Elegir…
            </option>
            {origenes.map((o) => (
              <option key={o.valor} value={o.valor}>
                {o.etiqueta}
              </option>
            ))}
          </select>
        </div>
      </div>
      {empresa ? (
        <div className="campo">
          <label htmlFor="prospecto-razon">Razón social</label>
          <input
            id="prospecto-razon"
            maxLength={160}
            value={nombre}
            onChange={(e) => {
              setNombre(e.target.value)
            }}
          />
        </div>
      ) : (
        <div className="formulario-alta__par">
          <div className="campo">
            <label htmlFor="prospecto-nombre">Nombre</label>
            <input
              id="prospecto-nombre"
              maxLength={80}
              value={nombre}
              onChange={(e) => {
                setNombre(e.target.value)
              }}
            />
          </div>
          <div className="campo">
            <label htmlFor="prospecto-apellido">Apellido</label>
            <input
              id="prospecto-apellido"
              maxLength={80}
              value={apellido}
              onChange={(e) => {
                setApellido(e.target.value)
              }}
            />
          </div>
        </div>
      )}
      {error === null ? null : (
        <p className="estado estado--aviso" role="alert">
          {error}
        </p>
      )}
      <div className="fila fila--fin">
        <button type="button" className="boton boton--secundario" onClick={alCancelar}>
          Cancelar
        </button>
        <button type="button" className="boton" onClick={guardar} disabled={enviando}>
          {enviando ? 'Guardando…' : 'Guardar prospecto'}
        </button>
      </div>
    </fieldset>
  )
}

export function NuevaTarea({
  integrantes,
  origenes,
}: {
  /** Los orígenes de prospecto, para el alta rápida. */
  readonly origenes: readonly Origen[]
  /** Los demás integrantes; «Yo» va siempre primero. */
  readonly integrantes: readonly { readonly userId: string; readonly etiqueta: string }[]
}) {
  const dialogo = useRef<HTMLDialogElement>(null)
  const [estado, enviar] = useActionState(crearDesdeListado, null)
  const [texto, setTexto] = useState('')
  const [opciones, setOpciones] = useState<readonly ClienteSugerido[]>([])
  const [elegido, setElegido] = useState<ClienteSugerido | null>(null)
  const [altaDeProspecto, setAltaDeProspecto] = useState(false)

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
            <div className="fila" style={{ flexWrap: 'nowrap' }}>
              <input
                id="nueva-cliente"
                type="search"
                style={{ flex: 1, minWidth: 0 }}
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
              <button
                type="button"
                className="boton boton--secundario"
                style={{ flex: 'none' }}
                aria-expanded={altaDeProspecto}
                onClick={() => {
                  setAltaDeProspecto((abierto) => !abierto)
                }}
              >
                Crear prospecto
              </button>
            </div>
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
            {elegido === null && texto.trim().length >= 2 && opciones.length === 0 && !altaDeProspecto ? (
              <p className="meta" style={{ margin: 0 }}>
                No hay clientes con ese nombre.
              </p>
            ) : null}
          </div>
          {altaDeProspecto ? (
            <ProspectoRapido
              origenes={origenes}
              nombreInicial={elegido === null ? texto.trim() : ''}
              alCrear={(cliente) => {
                setElegido(cliente)
                setOpciones([])
                setAltaDeProspecto(false)
              }}
              alCancelar={() => {
                setAltaDeProspecto(false)
              }}
            />
          ) : null}
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
