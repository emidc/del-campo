import type { RenewalItem, RenewalMode, RenewalState } from '@del-campo/api'
import {
  ESTADOS_DE_GESTION,
  ESTADOS_DE_RENOVACION,
  MODOS_DE_RENOVACION,
  esEstadoDeRenovacion,
  esModoDeRenovacion,
  latestBatch,
  renovaciones,
} from '@del-campo/api'
import Link from 'next/link'

import { Cabecera } from '@/app/_componentes/Cabecera'
import { fechaDeHoy } from '@/lib/criterios'
import { consultar, requireAdmitted } from '@/lib/sesion'

export const dynamic = 'force-dynamic'

const uno = (valor: string | string[] | undefined): string | undefined => (Array.isArray(valor) ? valor[0] : valor)

const sumarDias = (fecha: string, dias: number): string => {
  const d = new Date(`${fecha}T12:00:00Z`)
  d.setUTCDate(d.getUTCDate() + dias)
  return d.toISOString().slice(0, 10)
}

// Tramos por fin de vigencia, relativos a hoy. «Vencidas» mira los últimos 60 días.
const TRAMOS = {
  vencidas: { etiqueta: 'Vencidas (últimos 60 días)', desde: -60, hasta: -1 },
  '30': { etiqueta: 'Próximos 30 días', desde: 0, hasta: 30 },
  '60': { etiqueta: '31 a 60 días', desde: 31, hasta: 60 },
  '90': { etiqueta: '61 a 90 días', desde: 61, hasta: 90 },
} as const
type Tramo = keyof typeof TRAMOS
const esTramo = (valor: unknown): valor is Tramo => typeof valor === 'string' && valor in TRAMOS

export default async function RenovacionesPage({
  searchParams,
}: {
  readonly searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const principal = await requireAdmitted()
  const parametros = await searchParams
  const tramoPedido = uno(parametros.tramo)
  const tramo: Tramo = esTramo(tramoPedido) ? tramoPedido : '30'
  const modoPedido = uno(parametros.modo)
  const modo: RenewalMode | undefined = esModoDeRenovacion(modoPedido) ? modoPedido : undefined
  const estadoPedido = uno(parametros.estado)
  const estado: RenewalState | undefined = esEstadoDeRenovacion(estadoPedido) ? estadoPedido : undefined
  const hoy = fechaDeHoy()
  const desde = sumarDias(hoy, TRAMOS[tramo].desde)
  const hasta = sumarDias(hoy, TRAMOS[tramo].hasta)

  const [lote, todas] = await consultar(
    Promise.all([latestBatch(principal), renovaciones(principal, { from: desde, to: hasta })]),
  )
  const lista = todas.filter(
    (r) => (modo === undefined || r.renewalMode === modo) && (estado === undefined || r.state === estado),
  )
  const cuenta = (m: RenewalMode, e?: RenewalState): string =>
    String(todas.filter((r) => r.renewalMode === m && (e === undefined || r.state === e)).length)

  const enlace = (cambios: Record<string, string | undefined>) => {
    const q = new URLSearchParams()
    const valores = { tramo, modo, estado, ...cambios }
    for (const [k, v] of Object.entries(valores)) if (v !== undefined && !(k === 'tramo' && v === '30')) q.set(k, v)
    const s = q.toString()
    return s === '' ? '/renovaciones' : `/renovaciones?${s}`
  }
  const opcion = (etiqueta: string, activo: boolean, href: string) =>
    activo ? <strong>{etiqueta}</strong> : <Link href={href}>{etiqueta}</Link>

  const nuevaGestion = (r: RenewalItem) =>
    `/gestiones/nueva?${new URLSearchParams({
      poliza: r.policyId,
      tipo: 'RENOVACION',
      titulo: `Renovación ${r.policyNumber}`,
      vence: r.termEndDate,
    }).toString()}`

  return (
    <main className="envoltorio">
      <Cabecera lote={lote} email={principal.email} />

      <h1 style={{ fontSize: '1.3rem', margin: '0 0 0.4rem' }}>Renovaciones</h1>
      <p className="meta">
        Pólizas cuya vigencia termina entre {desde} y {hasta}. Salen de las pólizas importadas: una póliza sin
        sucesora en Broker OS puede estar renovada en la compañía después de la fecha del lote.
      </p>
      <p className="meta">
        {(Object.keys(TRAMOS) as Tramo[]).map((t, i) => (
          <span key={t}>
            {i === 0 ? null : ' · '}
            {opcion(TRAMOS[t].etiqueta, t === tramo, enlace({ tramo: t }))}
          </span>
        ))}
      </p>
      <p className="meta">
        {opcion('Todas', modo === undefined, enlace({ modo: undefined }))}
        {' · '}
        {opcion(`Manuales (${cuenta('MANUAL')}, ${cuenta('MANUAL', 'PENDIENTE')} pendientes)`, modo === 'MANUAL', enlace({ modo: 'MANUAL' }))}
        {' · '}
        {opcion(
          `Automáticas (${cuenta('AUTOMATIC')}, ${cuenta('AUTOMATIC', 'PENDIENTE')} pendientes)`,
          modo === 'AUTOMATIC',
          enlace({ modo: 'AUTOMATIC' }),
        )}
      </p>
      <p className="meta">
        {opcion('Cualquier estado', estado === undefined, enlace({ estado: undefined }))}
        {(Object.keys(ESTADOS_DE_RENOVACION) as RenewalState[]).map((e) => (
          <span key={e}>
            {' · '}
            {opcion(ESTADOS_DE_RENOVACION[e], estado === e, enlace({ estado: e }))}
          </span>
        ))}
      </p>

      {lista.length === 0 ? (
        <p className="estado">No hay renovaciones para mostrar.</p>
      ) : (
        <div className="desborde">
          <table>
            <thead>
              <tr>
                <th>Fin de vigencia</th>
                <th>Póliza</th>
                <th>Tomador</th>
                <th>Riesgo</th>
                <th>Modo</th>
                <th>Estado</th>
                <th>Seguimiento</th>
              </tr>
            </thead>
            <tbody>
              {lista.map((r) => (
                <tr key={r.policyId}>
                  <td className={r.termEndDate < hoy && r.state === 'PENDIENTE' ? 'pendiente' : undefined}>
                    {r.termEndDate}
                  </td>
                  <td>
                    <Link href={`/poliza/${r.policyId}`}>{r.policyNumber}</Link> · {r.insurerName}
                  </td>
                  <td>
                    <Link href={`/parte/${r.holderPartyId}`}>{r.holderName ?? 'sin nombre'}</Link>
                  </td>
                  <td>{r.productReference ?? '—'}</td>
                  <td>{MODOS_DE_RENOVACION[r.renewalMode]}</td>
                  <td>{ESTADOS_DE_RENOVACION[r.state]}</td>
                  <td>
                    {r.successorPolicyId !== null ? (
                      <Link href={`/poliza/${r.successorPolicyId}`}>Nueva: {r.successorPolicyNumber}</Link>
                    ) : r.caseId !== null ? (
                      <Link href={`/gestiones/${r.caseId}`}>
                        {r.caseStatus === null ? 'Gestión' : ESTADOS_DE_GESTION[r.caseStatus]}
                        {r.caseAssignedEmail === null ? ' · sin responsable' : ` · ${r.caseAssignedEmail}`}
                      </Link>
                    ) : (
                      <Link href={nuevaGestion(r)}>Crear gestión</Link>
                    )}
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
