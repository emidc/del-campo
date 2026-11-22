'use client'

// El formulario de «Nuevo prospecto»: el tipo elige qué campos se muestran. Sólo el nombre
// es obligatorio; el DNI o el CUIT se pueden completar después en la ficha.

import { useActionState, useState } from 'react'

import { BotonEnviar } from '@/app/_componentes/BotonEnviar'

import { crear } from '../acciones'

export function FormularioDeProspecto({ origenes }: { readonly origenes: readonly { readonly valor: string; readonly etiqueta: string }[] }) {
  const [tipo, setTipo] = useState<'ORGANIZATION' | 'PERSON'>('ORGANIZATION')
  const [estado, enviar] = useActionState(crear, null)
  const empresa = tipo === 'ORGANIZATION'

  return (
    <form action={enviar} className="buscador">
      <div className="campo">
        <label htmlFor="tipo">Tipo de prospecto</label>
        <select
          id="tipo"
          name="tipo"
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
      {empresa ? (
        <>
          <div className="campo" style={{ gridColumn: 'span 2' }}>
            <label htmlFor="razonSocial">Razón social</label>
            <input id="razonSocial" name="razonSocial" required maxLength={160} />
          </div>
          <div className="campo">
            <label htmlFor="cuit">CUIT (opcional)</label>
            <input id="cuit" name="cuit" inputMode="numeric" maxLength={20} placeholder="30-12345678-9" />
          </div>
        </>
      ) : (
        <>
          <div className="campo">
            <label htmlFor="nombre">Nombre</label>
            <input id="nombre" name="nombre" maxLength={80} />
          </div>
          <div className="campo">
            <label htmlFor="apellido">Apellido</label>
            <input id="apellido" name="apellido" maxLength={80} />
          </div>
          <div className="campo">
            <label htmlFor="dni">DNI (opcional)</label>
            <input id="dni" name="dni" inputMode="numeric" maxLength={12} />
          </div>
        </>
      )}
      <div className="campo">
        <label htmlFor="telefono">Teléfono (opcional)</label>
        <input id="telefono" name="telefono" type="tel" maxLength={120} placeholder="261 555 0101" />
      </div>
      <div className="campo">
        <label htmlFor="mail">Mail (opcional)</label>
        <input id="mail" name="mail" type="email" maxLength={120} />
      </div>
      <div className="campo" style={{ gridColumn: '1 / -1' }}>
        <label htmlFor="carpeta">Carpeta de Google Drive (opcional)</label>
        <input id="carpeta" name="carpeta" type="url" maxLength={500} placeholder="https://drive.google.com/drive/folders/…" />
      </div>
      {estado?.ok === false ? (
        <p className="estado estado--aviso" role="alert" style={{ gridColumn: '1 / -1' }}>
          {estado.error}
        </p>
      ) : null}
      <div className="acciones">
        <BotonEnviar>Guardar prospecto</BotonEnviar>
      </div>
    </form>
  )
}
