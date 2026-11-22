'use client'

// Editar el perfil de un integrante: nombre visible y foto. La imagen elegida se recorta
// al centro y se achica a 256 × 256 en el navegador antes de mandarla.

import { useActionState, useEffect, useRef, useState, useTransition } from 'react'

import type { Resultado } from '@/app/_componentes/Edicion'

import { guardarPerfil } from './acciones'

const LADO = 256

const achicar = async (archivo: File): Promise<Blob> => {
  const imagen = await createImageBitmap(archivo)
  const corte = Math.min(imagen.width, imagen.height)
  const lienzo = document.createElement('canvas')
  lienzo.width = LADO
  lienzo.height = LADO
  const contexto = lienzo.getContext('2d')
  if (contexto === null) throw new Error('sin canvas')
  contexto.drawImage(imagen, (imagen.width - corte) / 2, (imagen.height - corte) / 2, corte, corte, 0, 0, LADO, LADO)
  return new Promise((resolver, rechazar) => {
    lienzo.toBlob((blob) => { if (blob === null) rechazar(new Error('sin imagen')); else resolver(blob) }, 'image/jpeg', 0.85)
  })
}

export function EditarPerfil({
  usuario,
  email,
  nombre,
  foto,
}: {
  readonly usuario: string
  readonly email: string
  readonly nombre: string | null
  /** URL de la foto actual, o `null` si no tiene. */
  readonly foto: string | null
}) {
  const dialogo = useRef<HTMLDialogElement>(null)
  const [estado, enviar] = useActionState<Resultado, FormData>(guardarPerfil, null)
  const [, iniciar] = useTransition()
  const [nueva, setNueva] = useState<Blob | null>(null)
  const [vista, setVista] = useState<string | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)
  const ultimo = useRef<Resultado>(null)

  useEffect(() => {
    if (estado !== ultimo.current && estado?.ok === true) dialogo.current?.close()
    ultimo.current = estado
  }, [estado])

  useEffect(() => () => { if (vista !== null) URL.revokeObjectURL(vista) }, [vista])

  const elegir = async (archivo: File | undefined) => {
    setAviso(null)
    if (archivo === undefined) return
    try {
      const blob = await achicar(archivo)
      setNueva(blob)
      setVista(URL.createObjectURL(blob))
    } catch {
      setAviso('No se pudo leer esa imagen. Probá con un JPG o PNG.')
    }
  }

  return (
    <>
      <button type="button" className="boton boton--secundario boton--chico" onClick={() => dialogo.current?.showModal()}>
        Editar perfil
      </button>
      <dialog ref={dialogo} className="dialogo" aria-labelledby={`perfil-${usuario}`}>
        <h2 id={`perfil-${usuario}`}>Perfil de {nombre ?? email}</h2>
        <form
          className="formulario-alta"
          onSubmit={(e) => {
            e.preventDefault()
            const datos = new FormData(e.currentTarget)
            datos.delete('archivo')
            if (nueva !== null) datos.set('foto', new File([nueva], 'foto.jpg', { type: 'image/jpeg' }))
            iniciar(() => { enviar(datos); })
          }}
        >
          <input type="hidden" name="usuario" value={usuario} />
          <div className="perfil-foto">
            {vista ?? foto ? (
              // La foto viene de la app o es la vista previa local.
              <img className="retrato" src={vista ?? foto ?? ''} alt="" width={96} height={96} style={{ width: 96, height: 96 }} />
            ) : (
              <span className="retrato retrato--iniciales" style={{ width: 96, height: 96, fontSize: 36 }} aria-hidden="true">
                {(nombre ?? email).slice(0, 1).toUpperCase()}
              </span>
            )}
            <div className="campo">
              <label htmlFor={`archivo-${usuario}`}>{foto === null ? 'Agregar foto' : 'Cambiar foto'}</label>
              <input id={`archivo-${usuario}`} name="archivo" type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => void elegir(e.target.files?.[0])} />
            </div>
          </div>
          <div className="campo">
            <label htmlFor={`nombre-${usuario}`}>Nombre visible</label>
            <input id={`nombre-${usuario}`} name="nombre" defaultValue={nombre ?? ''} maxLength={80} placeholder={email} />
          </div>
          <p className="meta" style={{ margin: 0 }}>
            Correo: {email}
          </p>
          {aviso === null && estado?.ok !== false ? null : (
            <p className="estado estado--aviso" role="alert">
              {aviso ?? (estado?.ok === false ? estado.error : '')}
            </p>
          )}
          <div className="fila fila--fin">
            <button type="button" className="boton boton--secundario" onClick={() => dialogo.current?.close()}>
              Cancelar
            </button>
            <button type="submit" className="boton">
              Guardar
            </button>
          </div>
        </form>
      </dialog>
    </>
  )
}
