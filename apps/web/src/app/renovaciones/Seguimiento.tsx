'use client'

// Acciones de seguimiento de una renovación: botones chicos con ícono y su nombre al
// pasar el cursor o al enfocarlos, y los modales de Renovar póliza, Editar póliza y
// Registrar refacturación (sus piezas están en `poliza/FormularioDePoliza`). Una póliza ya
// renovada muestra el número de la nueva: abre el mismo formulario de Renovar para
// completarla, y lleva un tic cuando el equipo la marcó con la información completa.

import type { InsurerOption, RenewalItem } from '@del-campo/api'
import Link from 'next/link'
import type { ReactNode } from 'react'
import { useState } from 'react'

import { IconoGestion, IconoRefacturar, IconoRenovar, IconoTarea } from '@/app/_componentes/Iconos'
import { importeEditable } from '@/lib/formato'

import { editarPoliza, registrarRefacturacion, renovar } from '../poliza/acciones'
import type { Valores } from '../poliza/FormularioDePoliza'
import { Campo, CampoDrive, CamposDelAlta, ModalDeFormulario as Modal } from '../poliza/FormularioDePoliza'

/** Un enlace con forma de botón chico, ícono y nombre emergente. */
export const AccionEnlace = ({ href, nombre, children }: { readonly href: string; readonly nombre: string; readonly children: ReactNode }) => (
  <Link href={href} className="accion-icono" aria-label={nombre} data-nombre={nombre}>
    {children}
  </Link>
)

const AccionBoton = ({ nombre, onClick, children }: { readonly nombre: string; readonly onClick: () => void; readonly children: ReactNode }) => (
  <button type="button" className="accion-icono" aria-label={nombre} data-nombre={nombre} onClick={onClick}>
    {children}
  </button>
)

const vacio = (valor: string | null): string => valor ?? ''

/** El formulario de la póliza nueva: el mismo para crearla al renovar y para editarla después. */
function FormularioDeLaNueva({
  item,
  companias,
  numero,
  valores,
  drive,
  completa,
  compania = '',
}: {
  readonly item: RenewalItem
  readonly companias: readonly InsurerOption[]
  readonly numero: string
  readonly valores: Valores
  readonly drive: string
  /** Sólo al editar: si ya está marcada con la información completa. */
  readonly completa: boolean | null
  /** Sólo al editar: la compañía de la póliza, que ya no se cambia. */
  readonly compania?: string
}) {
  const editando = completa !== null
  return (
    <div className="formulario-modal">
      <Campo etiqueta={editando ? 'Número de la póliza' : 'Número de la nueva póliza'}>
        <input name="numero" required maxLength={60} defaultValue={numero} autoFocus />
      </Campo>
      <Campo etiqueta="Compañía">
        {editando ? (
          // La compañía de una póliza ya creada no se cambia: se muestra fija.
          <input value={compania} readOnly aria-readonly="true" />
        ) : (
          <select name="compania" defaultValue={item.insurerId} required>
            {companias.some((c) => c.id === item.insurerId) ? null : <option value={item.insurerId}>{item.insurerName}</option>}
            {companias.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        )}
      </Campo>
      <CamposDelAlta v={valores} />
      {editando ? (
        <div className="fila-drive-completa">
          <CampoDrive etiqueta="Póliza en Google Drive" valor={drive} ancho={false} />
          <label className="casilla-con-texto casilla-completa">
            <input type="checkbox" name="completa" value="1" defaultChecked={completa} />
            Información completa
          </label>
        </div>
      ) : (
        <CampoDrive etiqueta="Póliza en Google Drive" valor={drive} />
      )}
    </div>
  )
}

const sumarAnio = (fecha: string): string => {
  const d = new Date(`${fecha}T12:00:00Z`)
  d.setUTCFullYear(d.getUTCFullYear() + 1)
  return d.toISOString().slice(0, 10)
}

export function Seguimiento({
  item,
  companias,
  gestionHref,
  tareaHref,
  gestion,
}: {
  readonly item: RenewalItem
  readonly companias: readonly InsurerOption[]
  readonly gestionHref: string
  readonly tareaHref: string
  /** El enlace a la gestión abierta, si la hay. */
  readonly gestion: ReactNode
}) {
  const [modal, setModal] = useState<'renovar' | 'editar' | 'refacturar' | null>(null)
  const cerrar = () => { setModal(null); }
  const actuales: Valores = {
    inicio: item.termStartDate,
    fin: item.termEndDate,
    prima: importeEditable(item.premium),
    premio: importeEditable(item.totalPremium),
    suma: importeEditable(item.sumInsured),
    moneda: item.currency ?? '',
    productor: item.producer ?? '',
    riesgo: item.productReference ?? '',
    pago: item.paymentMethod ?? '',
    renovacion: item.renewalMode,
  }
  const sucesora = item.successor
  const hoy = new Date().toISOString().slice(0, 10)

  return (
    <div className="acciones-seguimiento">
      {item.successorPolicyId !== null ? (
        <button
          type="button"
          className="enlace-nueva"
          onClick={() => { setModal('editar'); }}
          aria-label={`Editar la póliza nueva ${item.successorPolicyNumber ?? ''}${sucesora?.complete === true ? ', información completa' : ''}`}
        >
          Nueva: {item.successorPolicyNumber}
          {sucesora?.complete === true ? (
            <span className="tic-completa" aria-hidden="true" title="Información completa">
              ✓
            </span>
          ) : null}
        </button>
      ) : null}
      {gestion}
      {item.caseId === null && item.successorPolicyId === null ? (
        <AccionEnlace href={gestionHref} nombre="Crear gestión">
          <IconoGestion />
        </AccionEnlace>
      ) : null}
      {item.successorPolicyId === null ? (
        <>
          <AccionEnlace href={tareaHref} nombre="Tarea de seguimiento">
            <IconoTarea />
          </AccionEnlace>
          <AccionBoton nombre="Renovar póliza" onClick={() => { setModal('renovar'); }}>
            <IconoRenovar />
          </AccionBoton>
        </>
      ) : null}
      {item.successorPolicyId === null ? (
        <AccionBoton nombre="Registrar refacturación" onClick={() => { setModal('refacturar'); }}>
          <IconoRefacturar />
        </AccionBoton>
      ) : null}

      <Modal titulo={`Renovar la póliza ${item.policyNumber}`} abierto={modal === 'renovar'} onCerrar={cerrar} accion={renovar}>
        {() => (
          <>
            <p className="meta">
              Se crea la póliza nueva como Vigente, vinculada a la {item.policyNumber}, y la {item.policyNumber} pasa a Renovada. Tomador:{' '}
              {item.holderName ?? 'el mismo'}.
            </p>
            <input type="hidden" name="poliza" value={item.policyId} />
            <FormularioDeLaNueva
              item={item}
              companias={companias}
              numero=""
              valores={{ ...actuales, inicio: item.termEndDate, fin: sumarAnio(item.termEndDate), prima: '', premio: '', suma: '' }}
              drive=""
              completa={null}
            />
          </>
        )}
      </Modal>

      {item.successorPolicyId !== null && sucesora !== null ? (
        <Modal titulo={`Editar la póliza ${item.successorPolicyNumber ?? ''}`} abierto={modal === 'editar'} onCerrar={cerrar} accion={editarPoliza}>
          {() => (
            <>
              <p className="meta">
                Renueva a la {item.policyNumber}. Tildá «Información completa» cuando esté cargado todo lo que hay de esta póliza.{' '}
                <Link href={`/poliza/${item.successorPolicyId ?? ''}`}>Ver la ficha</Link>
              </p>
              <input type="hidden" name="poliza" value={item.successorPolicyId ?? ''} />
              <FormularioDeLaNueva
                item={item}
                companias={companias}
                numero={item.successorPolicyNumber ?? ''}
                valores={{
                  inicio: sucesora.termStartDate,
                  fin: sucesora.termEndDate,
                  prima: importeEditable(sucesora.premium),
                  premio: importeEditable(sucesora.totalPremium),
                  suma: importeEditable(sucesora.sumInsured),
                  moneda: vacio(sucesora.currency),
                  productor: vacio(sucesora.producer),
                  riesgo: vacio(sucesora.productReference),
                  pago: vacio(sucesora.paymentMethod),
                  renovacion: sucesora.renewalMode,
                }}
                drive={vacio(sucesora.driveUrl)}
                completa={sucesora.complete}
                compania={sucesora.insurerName}
              />
            </>
          )}
        </Modal>
      ) : null}

      <Modal
        titulo={`Registrar refacturación de la póliza ${item.policyNumber}`}
        abierto={modal === 'refacturar'}
        onCerrar={cerrar}
        accion={registrarRefacturacion}
      >
        {(estado) => {
          const numero = estado?.ok === false && estado.siguiente !== undefined ? estado.siguiente : item.nextEndorsementNumber
          return (
            <>
              <p className="meta">Se guarda como una versión nueva de la misma póliza. La versión actual queda en el historial.</p>
              <input type="hidden" name="poliza" value={item.policyId} />
              <div className="formulario-modal">
                <Campo etiqueta="Número de endoso">
                  <input key={numero} name="endoso" type="number" min={1} max={999999999} step={1} defaultValue={String(numero)} required />
                </Campo>
                <Campo etiqueta="Rige desde">
                  <input name="desde" type="date" defaultValue={hoy} required />
                </Campo>
                <CamposDelAlta v={actuales} />
                <CampoDrive etiqueta="Endoso en Google Drive" />
              </div>
            </>
          )
        }}
      </Modal>
    </div>
  )
}
