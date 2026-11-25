import type { RenewalItem, RenewalMode, RenewalState } from '@del-campo/api'
import { ESTADOS_DE_GESTION, ESTADOS_DE_RENOVACION, companiasActivas, latestBatch, renovaciones } from '@del-campo/api'
import Link from 'next/link'

import { Cabecera } from '@/app/_componentes/Cabecera'
import { fechaDeHoy } from '@/lib/criterios'
import { fecha } from '@/lib/formato'
import { consultar, requireAdmitted } from '@/lib/sesion'

import { Comentario } from './Comentario'
import { Filtro } from './Filtro'
import type { Filtros } from './filtros'
import {
  ACTUALES,
  TODOS,
  conjuntos,
  enlace as enlaceCon,
  esConjuntoActivo,
  etiquetaDeMes,
  filtrar,
  hayFiltros,
  leerFiltros,
  mesesDelSelector,
  normalizar,
  opcionesDe,
  paginar,
  rangoDelMes,
} from './filtros'
import { Seguimiento } from './Seguimiento'

export const dynamic = 'force-dynamic'

export default async function RenovacionesPage({
  searchParams,
}: {
  readonly searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const principal = await requireAdmitted()
  const hoy = fechaDeHoy()
  const f = leerFiltros(await searchParams, hoy)
  const { desde, hasta } = rangoDelMes(f.mes, hoy)

  const [lote, delMes, companias] = await consultar(
    Promise.all([latestBatch(principal), renovaciones(principal, { from: desde, to: hasta }), companiasActivas(principal)]),
  )
  const enlace = (cambios: Partial<Filtros>) => enlaceCon(f, cambios, hoy)
  const lista = filtrar(delMes, f)
  const pagina = paginar(lista, f.pagina)

  // Cada desplegable cuenta cuántas quedarían al elegir una opción, con los demás filtros puestos.
  const sin = (cambios: Partial<Filtros>) => filtrar(delMes, { ...f, ...cambios })
  const nombreDeCompania = new Map(delMes.map((r) => [r.insurerId, r.insurerName]))
  const companiasDelMes = opcionesDe(sin({ compania: undefined }), (r) => r.insurerId)
    .map((o) => ({ ...o, nombre: nombreDeCompania.get(o.valor) ?? o.valor }))
    .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))
  const productores = opcionesDe(sin({ productor: undefined }), (r) => r.producer)
  const riesgos = opcionesDe(sin({ riesgos: [] }), (r) => r.productReference)
  // Un riesgo elegido que no aparece en el mes igual se muestra, para poder quitarlo.
  for (const r of f.riesgos)
    if (!riesgos.some((o) => normalizar(o.valor) === normalizar(r))) riesgos.push({ valor: r, cuenta: 0 })
  const pagos = opcionesDe(sin({ pago: undefined }), (r) => r.paymentMethod)
  if (f.pago !== undefined && !pagos.some((o) => normalizar(o.valor) === normalizar(f.pago ?? '')))
    pagos.push({ valor: f.pago, cuenta: 0 })
  const porEstado = sin({ estado: undefined })
  const porModo = sin({ modo: undefined })
  const cuenta = (m: RenewalMode) => {
    const delModo = porModo.filter((r) => r.renewalMode === m)
    return { total: delModo.length, pendientes: delModo.filter((r) => r.state === 'PENDIENTE').length }
  }
  const modos: readonly { readonly modo: RenewalMode | undefined; readonly nombre: string }[] = [
    { modo: undefined, nombre: 'Todas' },
    { modo: 'MANUAL', nombre: 'Manuales' },
    { modo: 'AUTOMATIC', nombre: 'Automáticas' },
  ]

  const tieneRiesgo = (valor: string) => f.riesgos.some((r) => normalizar(r) === normalizar(valor))
  const alternarRiesgo = (valor: string) =>
    enlace({ riesgos: tieneRiesgo(valor) ? f.riesgos.filter((r) => normalizar(r) !== normalizar(valor)) : [...f.riesgos, valor] })

  const nuevaGestion = (r: RenewalItem) =>
    `/gestiones/nueva?${new URLSearchParams({
      poliza: r.policyId,
      tipo: 'RENOVACION',
      titulo: `Renovación ${r.policyNumber}`,
      vence: r.termEndDate,
    }).toString()}`

  const seguimiento = (r: RenewalItem) =>
    `/tareas/nueva?${new URLSearchParams({
      poliza: r.policyId,
      titulo: `Seguimiento de renovación ${r.policyNumber}`,
      vence: r.termEndDate,
    }).toString()}`

  return (
    <main className="envoltorio">
      <Cabecera lote={lote} email={principal.email} />

      <p className="antetitulo">Renovaciones</p>
      <h1>Renovaciones ({lista.length})</h1>

      <div className="conjuntos" aria-label="Filtros guardados">
        {conjuntos(hoy, companias).map((c) => {
          const activo = esConjuntoActivo(f, c)
          return (
            <Link
              key={c.nombre}
              href={activo ? '/renovaciones' : enlaceCon(c.filtros, {}, hoy)}
              className={activo ? 'conjunto conjunto--activo' : 'conjunto'}
              aria-pressed={activo}
              title={activo ? 'Quitar estos filtros' : undefined}
            >
              {c.nombre}
            </Link>
          )
        })}
      </div>

      <nav className="segmentos" aria-label="Modo de renovación">
        {modos.map(({ modo, nombre }) => {
          const activo = f.modo === modo
          const c = modo === undefined ? null : cuenta(modo)
          return (
            <Link
              key={nombre}
              href={enlace({ modo })}
              className={activo ? 'segmento segmento--activo' : 'segmento'}
              aria-current={activo ? 'true' : undefined}
            >
              <span>{nombre}</span>
              {c === null ? (
                <span className="segmento__cuenta">{porModo.length}</span>
              ) : (
                <>
                  <span className="segmento__cuenta">{c.total}</span>
                  <span className="segmento__detalle">{c.pendientes} pendientes</span>
                </>
              )}
            </Link>
          )
        })}
      </nav>

      <div className="filtros">
        <Filtro
          etiqueta="Mes"
          limpiar={null}
          opciones={[
            ...mesesDelSelector(hoy).map((m) => ({
              valor: m,
              etiqueta: etiquetaDeMes(m),
              href: enlace({ mes: m }),
              activa: f.mes === m,
            })),
            { valor: TODOS, etiqueta: 'Todos', href: enlace({ mes: TODOS }), activa: f.mes === TODOS },
            { valor: ACTUALES, etiqueta: 'Actuales', href: enlace({ mes: ACTUALES }), activa: f.mes === ACTUALES },
          ]}
        />
        <Filtro
          etiqueta="Estado"
          limpiar={enlace({ estado: undefined })}
          opciones={(Object.keys(ESTADOS_DE_RENOVACION) as RenewalState[]).map((e) => ({
            valor: e,
            etiqueta: ESTADOS_DE_RENOVACION[e],
            href: enlace({ estado: e }),
            activa: f.estado === e,
            cuenta: porEstado.filter((r) => r.state === e).length,
          }))}
        />
        <Filtro
          etiqueta="Compañía"
          vacio="Todas"
          limpiar={enlace({ compania: undefined })}
          opciones={companiasDelMes.map((o) => ({
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
          etiqueta="Forma de pago"
          vacio="Todas"
          limpiar={enlace({ pago: undefined })}
          opciones={pagos.map((o) => ({
            valor: o.valor,
            etiqueta: o.valor,
            href: enlace({ pago: o.valor }),
            activa: f.pago !== undefined && normalizar(f.pago) === normalizar(o.valor),
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
        {hayFiltros(f, hoy) ? (
          <Link href="/renovaciones" className="filtros__limpiar">
            Limpiar filtros
          </Link>
        ) : null}
      </div>
      <p className="meta">
        {f.mes === ACTUALES
          ? `Pólizas cuya vigencia termina desde el ${fecha(desde)} en adelante.`
          : f.mes === TODOS
          ? `Pólizas cuya vigencia termina entre el ${fecha(desde)} y el ${fecha(hasta)}.`
          : `Pólizas cuya vigencia termina en ${etiquetaDeMes(f.mes).toLowerCase()}.`}{' '}
        Salen de las pólizas importadas: una póliza sin sucesora en Broker OS puede estar renovada en la compañía después
        de la fecha del lote.
      </p>

      {lista.length === 0 ? (
        <p className="estado">No hay renovaciones para mostrar.</p>
      ) : (
        <>
          <div className="desborde">
            <table className="tabla-renovaciones">
              <thead>
                <tr>
                  <th>Fin de vigencia</th>
                  <th>Póliza</th>
                  <th>Tomador</th>
                  <th>Productor</th>
                  <th>Riesgo</th>
                  <th>Comentario</th>
                  <th>Seguimiento</th>
                </tr>
              </thead>
              <tbody>
                {pagina.filas.map((r) => (
                  <tr key={r.policyId}>
                    <td className={r.termEndDate < hoy && r.state === 'PENDIENTE' ? 'pendiente' : undefined}>
                      {fecha(r.termEndDate)}
                    </td>
                    <td>
                      <Link href={`/poliza/${r.policyId}`}>{r.policyNumber}</Link> · {r.insurerName}
                    </td>
                    <td>
                      <Link href={`/parte/${r.holderPartyId}`}>{r.holderName ?? 'sin nombre'}</Link>
                    </td>
                    <td>{r.producer ?? '—'}</td>
                    <td>{r.productReference ?? '—'}</td>
                    <td className="celda-comentario">
                      <Comentario poliza={r.policyId} numero={r.policyNumber} inicial={r.comment} />
                    </td>
                    <td>
                      <Seguimiento
                        item={r}
                        companias={companias}
                        gestionHref={nuevaGestion(r)}
                        tareaHref={seguimiento(r)}
                        gestion={
                          r.caseId !== null && r.successorPolicyId === null ? (
                            <Link href={`/gestiones/${r.caseId}`}>
                              {r.caseStatus === null ? 'Gestión' : ESTADOS_DE_GESTION[r.caseStatus]}
                              {r.caseAssignedEmail === null ? ' · sin responsable' : ` · ${r.caseAssignedEmail}`}
                            </Link>
                          ) : null
                        }
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {pagina.paginas > 1 ? (
            <nav className="paginacion" aria-label="Páginas">
              <span className="paginacion__resumen">
                {pagina.desde}–{pagina.hasta} de {lista.length}
              </span>
              {pagina.pagina > 1 ? (
                <Link href={enlace({ pagina: pagina.pagina - 1 })} className="paginacion__paso">
                  ← Anterior
                </Link>
              ) : null}
              {Array.from({ length: pagina.paginas }, (_, i) => i + 1).map((n) => (
                <Link
                  key={n}
                  href={enlace({ pagina: n })}
                  className={n === pagina.pagina ? 'paginacion__numero paginacion__numero--activo' : 'paginacion__numero'}
                  aria-current={n === pagina.pagina ? 'page' : undefined}
                >
                  {n}
                </Link>
              ))}
              {pagina.pagina < pagina.paginas ? (
                <Link href={enlace({ pagina: pagina.pagina + 1 })} className="paginacion__paso">
                  Siguiente →
                </Link>
              ) : null}
            </nav>
          ) : null}
        </>
      )}
    </main>
  )
}
