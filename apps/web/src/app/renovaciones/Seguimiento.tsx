'use client'

// Acciones de seguimiento de una renovación: botones chicos con ícono y su nombre al
// pasar el cursor o al enfocarlos, y los modales de Renovar póliza y Registrar
// refacturación (sus piezas están en `poliza/FormularioDePoliza`).

import type { InsurerOption, RenewalItem } from '@del-campo/api'
import Link from 'next/link'
import type { ReactNode } from 'react'
import { useState } from 'react'

import { IconoGestion, IconoRefacturar, IconoRenovar, IconoTarea } from '@/app/_componentes/Iconos'
import { importeEditable } from '@/lib/formato'

import { registrarRefacturacion, renovar } from '../poliza/acciones'
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
  const [modal, setModal] = useState<'renovar' | 'refacturar' | null>(null)
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
  const hoy = new Date().toISOString().slice(0, 10)

  return (
    <div className="acciones-seguimiento">
      {item.successorPolicyId !== null ? (
        <Link href={`/poliza/${item.successorPolicyId}`}>Nueva: {item.successorPolicyNumber}</Link>
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
      <AccionBoton nombre="Registrar refacturación" onClick={() => { setModal('refacturar'); }}>
        <IconoRefacturar />
      </AccionBoton>

      <Modal titulo={`Renovar la póliza ${item.policyNumber}`} abierto={modal === 'renovar'} onCerrar={cerrar} accion={renovar}>
        {() => (
          <>
            <p className="meta">
              Se crea la póliza nueva como Vigente, vinculada a la {item.policyNumber}, y la {item.policyNumber} pasa a Renovada. Tomador:{' '}
              {item.holderName ?? 'el mismo'}.
            </p>
            <input type="hidden" name="poliza" value={item.policyId} />
            <div className="formulario-modal">
              <Campo etiqueta="Número de la nueva póliza">
                <input name="numero" required maxLength={60} autoFocus />
              </Campo>
              <Campo etiqueta="Compañía">
                <select name="compania" defaultValue={item.insurerId} required>
                  {companias.some((c) => c.id === item.insurerId) ? null : <option value={item.insurerId}>{item.insurerName}</option>}
                  {companias.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </Campo>
              <CamposDelAlta v={{ ...actuales, inicio: item.termEndDate, fin: sumarAnio(item.termEndDate), prima: '', premio: '', suma: '' }} />
              <CampoDrive etiqueta="Póliza en Google Drive" />
            </div>
          </>
        )}
      </Modal>

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
