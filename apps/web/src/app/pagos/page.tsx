import type { Pago } from '@del-campo/api'
import { latestBatch, pagosDelMes, todayInMendoza } from '@del-campo/api'
import Link from 'next/link'

import { Cabecera } from '@/app/_componentes/Cabecera'
import { IconoTarea } from '@/app/_componentes/Iconos'
import { CasillaDePago } from '@/app/_cuotas/Cuotas'
import { fecha, importe } from '@/lib/formato'
import { consultar, requireAdmitted } from '@/lib/sesion'

import { Comentario } from '../renovaciones/Comentario'
import { Filtro } from '../renovaciones/Filtro'
import { etiquetaDeMes, normalizar } from '../renovaciones/filtros'
import { AccionEnlace } from '../renovaciones/Seguimiento'

import type { EstadoDePago, FiltrosDePagos } from './filtros'
import { enlace as enlaceCon, filtrar, hayFiltros, leerFiltros, opcionesDe } from './filtros'

export const dynamic = 'force-dynamic'

const SEGMENTOS: readonly { readonly estado: EstadoDePago | undefined; readonly nombre: string }[] = [
  { estado: undefined, nombre: 'Todas' },
  { estado: 'impagas', nombre: 'Impagas' },
  { estado: 'pagadas', nombre: 'Pagadas' },
]

export default async function PagosPage({
  searchParams,
}: {
  readonly searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const principal = await requireAdmitted()
  const hoy = todayInMendoza()
  const f = leerFiltros(await searchParams)
  const [lote, pagos] = await consultar(Promise.all([latestBatch(principal), pagosDelMes(principal, hoy)]))
  const lista = filtrar(pagos, f)
  const enlace = (cambios: Partial<FiltrosDePagos>) => enlaceCon(f, cambios)

  // Cada desplegable cuenta cuántos quedarían al elegir una opción, con los demás filtros puestos.
  const sin = (cambios: Partial<FiltrosDePagos>) => filtrar(pagos, { ...f, ...cambios })
  const nombreDeCompania = new Map(pagos.map((p) => [p.poliza.insurerId, p.poliza.insurerName]))
  const companias = opcionesDe(sin({ compania: undefined }), (p) => p.poliza.insurerId)
    .map((o) => ({ ...o, nombre: nombreDeCompania.get(o.valor) ?? o.valor }))
    .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))
  const productores = opcionesDe(sin({ productor: undefined }), (p) => p.poliza.producer)
  const riesgos = opcionesDe(sin({ riesgos: [] }), (p) => p.poliza.productReference)
  for (const r of f.riesgos)
    if (!riesgos.some((o) => normalizar(o.valor) === normalizar(r))) riesgos.push({ valor: r, cuenta: 0 })
  const tieneRiesgo = (valor: string) => f.riesgos.some((r) => normalizar(r) === normalizar(valor))
  const alternarRiesgo = (valor: string) =>
    enlace({ riesgos: tieneRiesgo(valor) ? f.riesgos.filter((r) => normalizar(r) !== normalizar(valor)) : [...f.riesgos, valor] })
  const porEstado = sin({ estado: undefined })

  const tarea = (p: Pago) =>
    `/tareas/nueva?${new URLSearchParams({
      poliza: p.poliza.policyId,
      titulo: `Cobrar cuota ${String(p.cuota.number)} de la póliza ${p.poliza.policyNumber}`,
      vence: p.cuota.dueDate,
    }).toString()}`

  return (
    <main className="envoltorio">
      <Cabecera lote={lote} email={principal.email} />

      <p className="antetitulo">Pagos</p>
      <h1>Pagos ({lista.length})</h1>

      <nav className="segmentos" aria-label="Estado del pago">
        {SEGMENTOS.map((s) => {
          const activo = f.estado === s.estado
          return (
            <Link
              key={s.nombre}
              href={enlace({ estado: s.estado })}
              className={activo ? 'segmento segmento--activo' : 'segmento'}
              aria-current={activo ? 'true' : undefined}
            >
              <span>{s.nombre}</span>
              <span className="segmento__cuenta">
                {s.estado === undefined ? porEstado.length : porEstado.filter((p) => p.cuota.paid === (s.estado === 'pagadas')).length}
              </span>
            </Link>
          )
        })}
      </nav>

      <div className="filtros">
        <Filtro
          etiqueta="Compañía"
          vacio="Todas"
          limpiar={enlace({ compania: undefined })}
          opciones={companias.map((o) => ({
            valor: o.valor,
            etiqueta: o.nombre,
            href: enlace({ compania: o.valor }),
            activa: f.compania === o.valor,
            cuenta: o.cuenta,
          }))}
        />
        <Filtro
          etiqueta="Riesgo"
          multiple
          limpiar={enlace({ riesgos: [] })}
          opciones={riesgos.map((o) => ({
            valor: o.valor,
            etiqueta: o.valor,
            href: alternarRiesgo(o.valor),
            activa: tieneRiesgo(o.valor),
            cuenta: o.cuenta,
          }))}
        />
        <Filtro
          etiqueta="Productor"
          limpiar={enlace({ productor: undefined })}
          opciones={productores.map((o) => ({
            valor: o.valor,
            etiqueta: o.valor,
            href: enlace({ productor: o.valor }),
            activa: f.productor === o.valor,
            cuenta: o.cuenta,
          }))}
        />
        {hayFiltros(f) ? (
          <Link href={enlace({ compania: undefined, productor: undefined, riesgos: [] })} className="filtros__limpiar">
            Limpiar filtros
          </Link>
        ) : null}
      </div>
      <p className="meta">
        Cuotas de pólizas en efectivo con fecha de pago en {etiquetaDeMes(hoy.slice(0, 7)).toLowerCase()}, y las de meses anteriores
        que siguen sin pagar. No incluye Caución, Vida colectivo, Vida obligatorio ni Retiro. Las fechas e importes se cambian en
        la sección Cuotas de cada póliza.
      </p>

      {lista.length === 0 ? (
        <p className="estado">No hay pagos para mostrar.</p>
      ) : (
        <div className="desborde">
          <table className="tabla-renovaciones">
            <thead>
              <tr>
                <th>Próximo pago</th>
                <th>Cuota</th>
                <th>Póliza</th>
                <th>Tomador</th>
                <th>Productor</th>
                <th>Riesgo</th>
                <th>Comentario</th>
                <th>Seguimiento</th>
              </tr>
            </thead>
            <tbody>
              {lista.map((p) => (
                <tr key={`${p.poliza.policyId}-${String(p.cuota.number)}`}>
                  <td className={p.atrasada ? 'pendiente' : undefined}>
                    {fecha(p.cuota.dueDate)}
                    {p.atrasada ? (
                      <>
                        {' '}
                        <span className="etiqueta-atrasada">Atrasada</span>
                      </>
                    ) : null}
                  </td>
                  <td>
                    {p.cuota.number} de {p.total}
                    <br />
                    <span className="meta">{importe(p.cuota.amount, p.poliza.currency)}</span>
                  </td>
                  <td>
                    <Link href={`/poliza/${p.poliza.policyId}#cuotas`}>{p.poliza.policyNumber}</Link> · {p.poliza.insurerName}
                  </td>
                  <td>
                    <Link href={`/parte/${p.poliza.holderPartyId}`}>{p.poliza.holderName ?? 'sin nombre'}</Link>
                  </td>
                  <td>{p.poliza.producer ?? '—'}</td>
                  <td>{p.poliza.productReference ?? '—'}</td>
                  <td className="celda-comentario">
                    <Comentario poliza={p.poliza.policyId} numero={p.poliza.policyNumber} inicial={p.poliza.comment} />
                  </td>
                  <td>
                    <div className="acciones-seguimiento">
                      <AccionEnlace href={tarea(p)} nombre="Tarea de seguimiento">
                        <IconoTarea />
                      </AccionEnlace>
                      <label className="casilla-con-texto">
                        <CasillaDePago
                          key={String(p.cuota.paid)}
                          poliza={p.poliza.policyId}
                          numero={p.cuota.number}
                          pagada={p.cuota.paid}
                          etiqueta={`Cuota ${String(p.cuota.number)} de la póliza ${p.poliza.policyNumber} pagada`}
                        />
                        Pagada
                      </label>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  )
}
