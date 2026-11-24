'use client'

// Crear un prospecto desde una conversación sin identificar. El teléfono no se carga: sale
// de la conversación. El nombre viene precargado con el que muestra WhatsApp.

import { useActionState, useState } from 'react'

import { BotonEnviar } from '@/app/_componentes/BotonEnviar'
import { crearProspecto } from '@/app/comunicacion/acciones'

/** «Cristian Wanke» → nombre «Cristian», apellido «Wanke». */
const partirNombre = (completo: string): { readonly nombre: string; readonly apellido: string } => {
  const partes = completo.trim().split(/\s+/).filter((p) => p !== '')
  return { nombre: partes[0] ?? '', apellido: partes.slice(1).join(' ') }
}

export function NuevoProspecto({
  conversacion,
  nombreDePerfil,
  origenes,
}: {
  readonly conversacion: number
  readonly nombreDePerfil: string
  readonly origenes: readonly { readonly valor: string; readonly etiqueta: string }[]
}) {
  const [tipo, setTipo] = useState<'ORGANIZATION' | 'PERSON'>('PERSON')
  const [estado, enviar] = useActionState(crearProspecto, null)
  const { nombre, apellido } = partirNombre(nombreDePerfil)

  return (
    <form action={enviar} className="buscador">
      <input type="hidden" name="id" value={conversacion} />
      <div className="campo">
        <label htmlFor="tipo">Tipo de prospecto</label>
        <select
          id="tipo"
          name="tipo"
          value={tipo}
          onChange={(e) => {
            setTipo(e.target.value === 'ORGANIZATION' ? 'ORGANIZATION' : 'PERSON')
          }}
        >
          <option value="PERSON">Persona</option>
          <option value="ORGANIZATION">Empresa</option>
        </select>
      </div>
      <div className="campo">
        <label htmlFor="origen">Origen del prospecto</label>
        <select id="origen" name="origen" required defaultValue="">
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
      {tipo === 'ORGANIZATION' ? (
        <div className="campo" style={{ gridColumn: 'span 2' }}>
          <label htmlFor="razonSocial">Razón social</label>
          <input id="razonSocial" name="razonSocial" required maxLength={160} defaultValue={nombreDePerfil} />
        </div>
      ) : (
        <>
          <div className="campo">
            <label htmlFor="nombre">Nombre</label>
            <input id="nombre" name="nombre" maxLength={80} defaultValue={nombre} />
          </div>
          <div className="campo">
            <label htmlFor="apellido">Apellido</label>
            <input id="apellido" name="apellido" maxLength={80} defaultValue={apellido} />
          </div>
        </>
      )}
      {estado?.ok === false ? (
        <p className="estado estado--aviso" role="alert" style={{ gridColumn: '1 / -1' }}>
          {estado.error}
        </p>
      ) : null}
      <div className="acciones">
        <BotonEnviar>Crear prospecto</BotonEnviar>
      </div>
    </form>
  )
}
