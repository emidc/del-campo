'use client'

// El lápiz de una fila del historial con endoso, y el modal para corregirlo: número,
// documento en Drive y, si la versión sigue abierta, sus condiciones. Las versiones
// cerradas son historia: ahí sólo se corrigen el número y el documento.

import { useState } from 'react'

import { BotonLapiz } from '@/app/_componentes/Edicion'

import { editarEndoso } from '../acciones'
import type { Valores } from '../FormularioDePoliza'
import { Campo, CampoDrive, CamposDelAlta, ModalDeFormulario } from '../FormularioDePoliza'

export function EditarEndoso({
  poliza,
  endoso,
  numero,
  drive,
  rigeDesde,
  condiciones,
}: {
  readonly poliza: string
  readonly endoso: string
  readonly numero: string
  readonly drive: string
  /** Desde cuándo rige, para mostrar; no se edita. */
  readonly rigeDesde: string
  /** Las condiciones de la versión, sólo si sigue abierta. */
  readonly condiciones: Valores | null
}) {
  const [abierto, setAbierto] = useState(false)
  const cerrar = () => { setAbierto(false); }
  return (
    <>
      <BotonLapiz etiqueta={`Editar endoso ${numero}`} onClick={() => { setAbierto(true); }} />
      <ModalDeFormulario titulo={`Editar endoso ${numero}`} abierto={abierto} onCerrar={cerrar} accion={editarEndoso}>
        {() => (
          <>
            {condiciones === null ? (
              <p className="meta">Esta versión ya está cerrada: sus condiciones quedan como historia. Se corrigen el número y el documento.</p>
            ) : null}
            <input type="hidden" name="poliza" value={poliza} />
            <input type="hidden" name="endoso" value={endoso} />
            <input type="hidden" name="condiciones" value={condiciones === null ? '0' : '1'} />
            <div className="formulario-modal">
              <Campo etiqueta="Número de endoso">
                <input name="numero" defaultValue={numero} maxLength={20} required autoFocus />
              </Campo>
              <Campo etiqueta="Rige desde">
                <input type="date" value={rigeDesde} readOnly aria-readonly="true" />
              </Campo>
              {condiciones === null ? null : <CamposDelAlta v={condiciones} />}
              <CampoDrive etiqueta="Endoso en Google Drive" valor={drive} />
            </div>
          </>
        )}
      </ModalDeFormulario>
    </>
  )
}
