'use client'

// Cuotas de una póliza en efectivo: una columna por cuota con la casilla de pagada, la fecha
// de pago y el importe. «Editar» aparece al pasar el cursor por la sección y abre un modal
// con la cantidad de cuotas, el valor y el día de pago, que se aplican a todas.

import { useCallback, useState, useTransition } from 'react'

import { fecha, importe, importeEditable } from '@/lib/formato'

import { Campo, ModalDeFormulario } from '../poliza/FormularioDePoliza'

import { editarPlan, marcarPago } from './acciones'

export interface Cuota {
  readonly number: number
  readonly dueDate: string
  readonly amount: string | null
  readonly paid: boolean
}

const MAX_CUOTAS = 60
const MAX_DIA = 29

/** La casilla de pagada de una cuota. La usan la póliza y Pagos. */
export function CasillaDePago({
  poliza,
  numero,
  pagada,
  etiqueta,
}: {
  readonly poliza: string
  readonly numero: number
  readonly pagada: boolean
  readonly etiqueta: string
}) {
  const [marcada, setMarcada] = useState(pagada)
  const [error, setError] = useState<string | null>(null)
  const [guardando, iniciar] = useTransition()
  return (
    <span className="casilla-de-pago">
      <input
        type="checkbox"
        checked={marcada}
        disabled={guardando}
        aria-label={etiqueta}
        title={marcada ? 'Pagada' : 'Marcar como pagada'}
        onChange={(e) => {
          const nueva = e.target.checked
          setMarcada(nueva)
          setError(null)
          iniciar(async () => {
            const r = await marcarPago(poliza, numero, nueva)
            if (!r.ok) {
              setMarcada(!nueva)
              setError(r.error)
            }
          })
        }}
      />
      {error === null ? null : (
        <span className="error-en-fila" role="alert">
          {error}
        </span>
      )}
    </span>
  )
}

export function Cuotas({
  poliza,
  numero,
  cuotas,
  premio,
  moneda,
  fueraDeVigencia,
}: {
  readonly poliza: string
  readonly numero: string
  readonly cuotas: readonly Cuota[]
  readonly premio: string | null
  readonly moneda: string | null
  /** Alguna cuota cae fuera de la vigencia actual. */
  readonly fueraDeVigencia: boolean
}) {
  const [editando, setEditando] = useState(false)
  const cerrar = useCallback(() => { setEditando(false) }, [])
  const [primera] = cuotas
  const dia = primera === undefined ? 10 : Math.min(MAX_DIA, Number(primera.dueDate.slice(8, 10)))

  return (
    <section className="tarjeta cuotas" id="cuotas">
      <div className="encabezado-tarjeta">
        <h2>Cuotas</h2>
        <button type="button" className="boton boton--secundario cuotas__editar" onClick={() => { setEditando(true) }}>
          Editar
        </button>
      </div>

      {fueraDeVigencia ? (
        <p className="estado estado--aviso">Hay cuotas fuera de la vigencia de la póliza. Revisá el plan con Editar.</p>
      ) : null}
      <div className="desborde">
        <table className="tabla-cuotas">
          <thead>
            <tr>
              <th scope="row">Cuota</th>
              {cuotas.map((c) => (
                <th key={c.number} scope="col">
                  {c.number}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              <th scope="row">Pagada</th>
              {cuotas.map((c) => (
                <td key={`${String(c.number)}-${String(c.paid)}`}>
                  <CasillaDePago poliza={poliza} numero={c.number} pagada={c.paid} etiqueta={`Cuota ${String(c.number)} de la póliza ${numero} pagada`} />
                </td>
              ))}
            </tr>
            <tr>
              <th scope="row">Día de pago</th>
              {cuotas.map((c) => (
                <td key={c.number}>{fecha(c.dueDate)}</td>
              ))}
            </tr>
            <tr>
              <th scope="row">Importe</th>
              {cuotas.map((c) => (
                <td key={c.number}>{importe(c.amount, moneda)}</td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>

      <ModalDeFormulario titulo={`Editar las cuotas de la póliza ${numero}`} abierto={editando} onCerrar={cerrar} accion={editarPlan}>
        {() => <CamposDelPlan poliza={poliza} cantidad={cuotas.length} valor={importeEditable(primera?.amount)} dia={dia} premio={premio} moneda={moneda} />}
      </ModalDeFormulario>
    </section>
  )
}

/** «296.722,05» o «296722.05» como número; `null` si no se entiende. */
const numero = (texto: string): number | null => {
  const t = texto.replace(/\s|\$/g, '')
  if (t === '') return null
  const normal = t.includes(',') ? t.replace(/\./g, '').replace(',', '.') : /^\d{1,3}(\.\d{3})+$/.test(t) ? t.replace(/\./g, '') : t
  const n = Number(normal)
  return Number.isFinite(n) ? n : null
}

/** Los campos del modal, con el total que resulta comparado con el premio. */
function CamposDelPlan({
  poliza,
  cantidad: cantidadInicial,
  valor: valorInicial,
  dia,
  premio,
  moneda,
}: {
  readonly poliza: string
  readonly cantidad: number
  readonly valor: string
  readonly dia: number
  readonly premio: string | null
  readonly moneda: string | null
}) {
  const [cantidad, setCantidad] = useState(String(cantidadInicial))
  const [valor, setValor] = useState(valorInicial)
  const n = Number(cantidad)
  const v = numero(valor)
  const total = Number.isInteger(n) && n > 0 && v !== null ? (n * v).toFixed(2) : null
  return (
    <>
      <p className="meta">
        El valor y el día de pago se aplican a todas las cuotas, desde el inicio de vigencia. Las cuotas pagadas siguen pagadas; no se puede
        bajar la cantidad por debajo de una cuota pagada.
      </p>
      <input type="hidden" name="poliza" value={poliza} />
      <div className="formulario-modal">
        <Campo etiqueta="Cantidad de cuotas">
          <input
            name="cantidad"
            type="number"
            min={1}
            max={MAX_CUOTAS}
            step={1}
            value={cantidad}
            onChange={(e) => { setCantidad(e.target.value) }}
            required
            autoFocus
          />
        </Campo>
        <Campo etiqueta="Valor de la cuota">
          <input name="importe" inputMode="decimal" value={valor} onChange={(e) => { setValor(e.target.value) }} required />
        </Campo>
        <Campo etiqueta="Día de pago (1 a 29)">
          <input name="dia" type="number" min={1} max={MAX_DIA} step={1} defaultValue={String(dia)} required />
        </Campo>
      </div>
      <p className="meta" role="status">
        Total: {importe(total, moneda)} · Premio de la póliza: {importe(premio, moneda)}
      </p>
    </>
  )
}
