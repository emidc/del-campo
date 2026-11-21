'use client'

// Acciones de seguimiento de una renovación: botones chicos con ícono y su nombre al
// pasar el cursor o al enfocarlos, y los modales de Renovar póliza y Registrar
// refacturación. Los modales guardan en una sola transacción; si algo falla, siguen
// abiertos con el error y no queda nada a medias.

import type { InsurerOption, RenewalItem } from '@del-campo/api'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { ReactNode } from 'react'
import { useActionState, useEffect, useRef, useState } from 'react'

import { BotonEnviar } from '@/app/_componentes/BotonEnviar'
import type { Resultado } from '@/app/_componentes/Edicion'
import { IconoGestion, IconoRefacturar, IconoRenovar, IconoTarea } from '@/app/_componentes/Iconos'
import { importeEditable } from '@/lib/formato'

import { registrarRefacturacion, renovar } from '../poliza/acciones'

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

const Campo = ({ etiqueta, children }: { readonly etiqueta: string; readonly children: ReactNode }) => (
  <label className="campo">
    <span>{etiqueta}</span>
    {children}
  </label>
)

interface Valores {
  readonly inicio: string
  readonly fin: string
  readonly prima: string
  readonly premio: string
  readonly suma: string
  readonly moneda: string
  readonly productor: string
  readonly riesgo: string
  readonly pago: string
  readonly renovacion: string
}

/** Los campos del alta de una póliza, comunes a renovar y refacturar. */
const CamposDelAlta = ({ v }: { readonly v: Valores }) => (
  <>
    <Campo etiqueta="Inicio de vigencia">
      <input name="inicio" type="date" defaultValue={v.inicio} required />
    </Campo>
    <Campo etiqueta="Fin de vigencia">
      <input name="fin" type="date" defaultValue={v.fin} required />
    </Campo>
    <Campo etiqueta="Productor">
      <input name="productor" defaultValue={v.productor} maxLength={120} />
    </Campo>
    <Campo etiqueta="Tipo de riesgo">
      <input name="riesgo" defaultValue={v.riesgo} maxLength={120} />
    </Campo>
    <Campo etiqueta="Prima">
      <input name="prima" inputMode="decimal" defaultValue={v.prima} />
    </Campo>
    <Campo etiqueta="Premio">
      <input name="premio" inputMode="decimal" defaultValue={v.premio} />
    </Campo>
    <Campo etiqueta="Suma asegurada">
      <input name="suma" inputMode="decimal" defaultValue={v.suma} />
    </Campo>
    <Campo etiqueta="Moneda">
      <input name="moneda" defaultValue={v.moneda} maxLength={10} />
    </Campo>
    <Campo etiqueta="Forma de pago">
      <input name="pago" defaultValue={v.pago} maxLength={120} />
    </Campo>
    <Campo etiqueta="Renovación">
      <select name="renovacion" defaultValue={v.renovacion}>
        <option value="MANUAL">Manual</option>
        <option value="AUTOMATIC">Automática</option>
      </select>
    </Campo>
  </>
)

/** Un modal con formulario. Cancelar cierra y descarta lo cargado; guardar bien, también. */
function Modal({
  titulo,
  abierto,
  onCerrar,
  accion,
  children,
}: {
  readonly titulo: string
  readonly abierto: boolean
  readonly onCerrar: () => void
  readonly accion: (previo: Resultado, form: FormData) => Promise<Resultado>
  readonly children: (estado: Resultado) => ReactNode
}) {
  const dialogo = useRef<HTMLDialogElement>(null)
  const [estado, enviar] = useActionState(accion, null)
  const router = useRouter()
  const ultimo = useRef<Resultado>(null)
  useEffect(() => {
    if (abierto) dialogo.current?.showModal()
    else dialogo.current?.close()
  }, [abierto])
  useEffect(() => {
    if (estado !== ultimo.current && estado?.ok === true) {
      onCerrar()
      router.refresh()
    }
    ultimo.current = estado
  }, [estado, onCerrar, router])
  return (
    <dialog ref={dialogo} className="dialogo dialogo--ancho" onClose={onCerrar} aria-label={titulo}>
      {abierto ? (
        <form action={enviar}>
          <h2>{titulo}</h2>
          {children(estado)}
          {estado?.ok === false ? (
            <p className="estado estado--aviso" role="alert">
              {estado.error}
            </p>
          ) : null}
          <div className="fila fila--fin">
            <button type="button" className="boton boton--secundario" onClick={onCerrar}>
              Cancelar
            </button>
            <BotonEnviar className="boton">Guardar</BotonEnviar>
          </div>
        </form>
      ) : null}
    </dialog>
  )
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
              <input type="hidden" name="endoso" value={String(numero)} />
              <div className="formulario-modal">
                <Campo etiqueta="Número de endoso">
                  <input value={String(numero)} readOnly aria-readonly="true" />
                </Campo>
                <Campo etiqueta="Rige desde">
                  <input name="desde" type="date" defaultValue={hoy} required />
                </Campo>
                <CamposDelAlta v={actuales} />
              </div>
            </>
          )
        }}
      </Modal>
    </div>
  )
}

/** Un desplegable de filtro que navega al elegir, con su ✕ para quitarlo. */
export function Desplegable({
  etiqueta,
  valor,
  opciones,
  limpiar,
}: {
  readonly etiqueta: string
  readonly valor: string
  readonly opciones: readonly { readonly valor: string; readonly etiqueta: string; readonly href: string }[]
  readonly limpiar: string
}) {
  const router = useRouter()
  return (
    <span className="filtro-desplegable">
      <label>
        <span className="sr">{etiqueta}</span>
        <select
          value={valor}
          onChange={(e) => {
            const elegida = opciones.find((o) => o.valor === e.target.value)
            router.push(elegida?.href ?? limpiar)
          }}
        >
          <option value="">{etiqueta}: cualquiera</option>
          {opciones.map((o) => (
            <option key={o.valor} value={o.valor}>
              {o.etiqueta}
            </option>
          ))}
        </select>
      </label>
      {valor === '' ? null : (
        <Link href={limpiar} className="boton-icono" aria-label={`Quitar filtro de ${etiqueta.toLowerCase()}`} title={`Quitar filtro de ${etiqueta.toLowerCase()}`}>
          ✕
        </Link>
      )}
    </span>
  )
}
