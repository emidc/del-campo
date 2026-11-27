'use client'

// Cuotas de una póliza en efectivo: una columna por cuota con la casilla de pagada, la fecha
// de pago y el importe. «Editar» aparece al pasar el cursor por la sección y permite cambiar
// fechas, importes y la cantidad de cuotas.

import { useState, useTransition } from 'react'

import { fecha, importe, importeEditable } from '@/lib/formato'

import { guardarPlan, marcarPago } from './acciones'

export interface Cuota {
  readonly number: number
  readonly dueDate: string
  readonly amount: string | null
  readonly paid: boolean
}

const MAX = 60

/** El mismo día `dia` (o el último del mes), `n` meses después de `fecha`. */
const mesesDespues = (base: string, n: number, dia: number): string => {
  const total = Number(base.slice(0, 4)) * 12 + Number(base.slice(5, 7)) - 1 + n
  const anio = Math.floor(total / 12)
  const mes = total % 12
  const ultimo = new Date(Date.UTC(anio, mes + 1, 0)).getUTCDate()
  return `${String(anio)}-${String(mes + 1).padStart(2, '0')}-${String(Math.min(dia, ultimo)).padStart(2, '0')}`
}

/** El premio en `n` partes iguales; la última se lleva el redondeo. */
const repartir = (premio: string | null, n: number): string[] => {
  if (premio === null || !Number.isFinite(Number(premio))) return Array.from({ length: n }, () => '')
  const centavos = Math.round(Number(premio) * 100)
  const parte = Math.floor(centavos / n)
  return Array.from({ length: n }, (_, i) => importeEditable(((i === n - 1 ? centavos - parte * (n - 1) : parte) / 100).toFixed(2)))
}

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
}: {
  readonly poliza: string
  readonly numero: string
  readonly cuotas: readonly Cuota[]
  readonly premio: string | null
  readonly moneda: string | null
}) {
  const [editando, setEditando] = useState(false)
  const [filas, setFilas] = useState<{ fecha: string; importe: string }[]>([])
  const [error, setError] = useState<string | null>(null)
  const [guardando, iniciar] = useTransition()

  const abrir = () => {
    setFilas(cuotas.map((c) => ({ fecha: c.dueDate, importe: importeEditable(c.amount) })))
    setError(null)
    setEditando(true)
  }

  /** Cambiar la cantidad suma o quita columnas al final y reparte el premio en partes iguales. */
  const cambiarCantidad = (n: number) => {
    if (!Number.isInteger(n) || n < 1 || n > MAX) return
    const importes = repartir(premio, n)
    setFilas((actuales) =>
      Array.from({ length: n }, (_, i) => {
        const ultima = actuales.at(-1)?.fecha ?? new Date().toISOString().slice(0, 10)
        const fechaDe = actuales[i]?.fecha ?? mesesDespues(ultima, i - actuales.length + 1, Number(ultima.slice(8, 10)))
        return { fecha: fechaDe, importe: importes[i] ?? '' }
      }),
    )
  }

  const guardar = () => {
    iniciar(async () => {
      const r = await guardarPlan(poliza, filas)
      if (r.ok) setEditando(false)
      else setError(r.error)
    })
  }

  return (
    <section className="tarjeta cuotas" id="cuotas">
      <div className="encabezado-tarjeta">
        <h2>Cuotas</h2>
        {editando ? null : (
          <button type="button" className="boton boton--secundario cuotas__editar" onClick={abrir}>
            Editar
          </button>
        )}
      </div>

      {editando ? (
        <div className="cuotas__edicion">
          <label className="cuotas__cantidad">
            Cantidad de cuotas
            <input
              type="number"
              min={1}
              max={MAX}
              step={1}
              value={filas.length}
              onChange={(e) => { cambiarCantidad(Number(e.target.value)) }}
            />
          </label>
          <div className="desborde">
            <table className="tabla-cuotas">
              <thead>
                <tr>
                  <th scope="row">Cuota</th>
                  {filas.map((_, i) => (
                    <th key={i} scope="col">
                      {i + 1}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr>
                  <th scope="row">Día de pago</th>
                  {filas.map((f, i) => (
                    <td key={i}>
                      <input
                        type="date"
                        required
                        value={f.fecha}
                        aria-label={`Día de pago de la cuota ${String(i + 1)}`}
                        onChange={(e) => { const v = e.target.value; setFilas((fs) => fs.map((x, j) => (j === i ? { ...x, fecha: v } : x))) }}
                      />
                    </td>
                  ))}
                </tr>
                <tr>
                  <th scope="row">Importe</th>
                  {filas.map((f, i) => (
                    <td key={i}>
                      <input
                        inputMode="decimal"
                        value={f.importe}
                        aria-label={`Importe de la cuota ${String(i + 1)}`}
                        onChange={(e) => { const v = e.target.value; setFilas((fs) => fs.map((x, j) => (j === i ? { ...x, importe: v } : x))) }}
                      />
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
          {error === null ? null : (
            <p className="error-en-fila" role="alert">
              {error}
            </p>
          )}
          <div className="fila fila--fin">
            <button type="button" className="boton boton--secundario" onClick={() => { setEditando(false) }} disabled={guardando}>
              Cancelar
            </button>
            <button type="button" className="boton" onClick={guardar} disabled={guardando}>
              {guardando ? 'Guardando…' : 'Guardar'}
            </button>
          </div>
        </div>
      ) : (
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
      )}
    </section>
  )
}
