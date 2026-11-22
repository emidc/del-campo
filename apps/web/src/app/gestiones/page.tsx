import type { ServiceCaseSummary } from '@del-campo/api'
import { ESTADOS_DE_GESTION, ETAPAS_DE_SINIESTRO, TIPOS_DE_GESTION, gestiones, integrantesDelEquipo, latestBatch } from '@del-campo/api'
import Link from 'next/link'

import { Cabecera } from '@/app/_componentes/Cabecera'
import { PersonaEnLista } from '@/app/_componentes/Retrato'
import { fechaDeHoy } from '@/lib/criterios'
import { fecha } from '@/lib/formato'
import { consultar, requireAdmitted } from '@/lib/sesion'

export const dynamic = 'force-dynamic'

const uno = (valor: string | string[] | undefined): string | undefined => (Array.isArray(valor) ? valor[0] : valor)

export default async function GestionesPage({
  searchParams,
}: {
  readonly searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const principal = await requireAdmitted()
  const parametros = await searchParams
  const mias = uno(parametros.mias) === '1'
  const cerradas = uno(parametros.cerradas) === '1'
  const parte = uno(parametros.parte)
  const poliza = uno(parametros.poliza)
  const responsable = uno(parametros.responsable)
  // Desde la ficha de un cliente o de una póliza se ven también las cerradas: es su historia.
  const acotada = parte !== undefined || poliza !== undefined
  const [lote, lista, integrantes] = await consultar(
    Promise.all([
      latestBatch(principal),
      gestiones(principal, {
        onlyMine: mias,
        includeClosed: cerradas || acotada,
        ...(parte === undefined ? {} : { partyId: parte }),
        ...(poliza === undefined ? {} : { policyId: poliza }),
        ...(responsable === undefined ? {} : { assignedUserId: responsable }),
      }),
      integrantesDelEquipo(principal),
    ]),
  )
  const hoy = fechaDeHoy()
  // La lista trae el correo del responsable; la foto y el nombre salen del perfil de Equipo.
  const porCorreo = new Map(integrantes.map((i) => [i.email, i]))

  const pestana = (etiqueta: string, activo: boolean, href: string) => (
    <Link href={href} aria-current={activo ? 'page' : undefined}>
      {etiqueta}
    </Link>
  )

  return (
    <main className="envoltorio">
      <Cabecera lote={lote} email={principal.email} />

      <p className="antetitulo">Gestiones</p>
      <h1>Gestiones ({lista.length})</h1>
      <nav className="pestanas" aria-label="Filtros de gestiones">
        {pestana('Abiertas', !mias && !cerradas && !acotada && responsable === undefined, '/gestiones')}
        {pestana('Las mías', mias && !cerradas, '/gestiones?mias=1')}
        {pestana('Con las cerradas', cerradas, '/gestiones?cerradas=1')}
        {pestana('Equipo', false, '/gestiones/equipo')}
      </nav>
      {responsable === undefined ? null : (
        <p className="meta">
          Mostrando las abiertas {responsable === 'SIN_RESPONSABLE' ? 'sin responsable' : 'de un integrante'}.{' '}
          <Link href="/gestiones/equipo">Volver al equipo</Link>
        </p>
      )}
      {acotada ? (
        <p className="meta">
          Mostrando las gestiones {parte === undefined ? 'de una póliza' : 'de un cliente'}, abiertas y cerradas.{' '}
          <Link href={parte === undefined ? `/gestiones/nueva?poliza=${poliza ?? ''}` : `/gestiones/nueva?parte=${parte}`}>
            Nueva gestión
          </Link>
        </p>
      ) : null}
      <p className="meta">
        Para crear una gestión, abrí la ficha del cliente o de la póliza y usá «Nueva gestión».
      </p>

      {lista.length === 0 ? (
        <p className="estado">No hay gestiones para mostrar.</p>
      ) : (
        <div className="desborde">
          <table>
            <thead>
              <tr>
                <th>Gestión</th>
                <th>Tipo</th>
                <th>Cliente</th>
                <th>Póliza</th>
                <th>Estado</th>
                <th>Responsable</th>
                <th>Vence</th>
              </tr>
            </thead>
            <tbody>
              {lista.map((g: ServiceCaseSummary) => (
                <tr key={g.id}>
                  <td>
                    <Link href={`/gestiones/${g.id}`}>{g.title}</Link>
                  </td>
                  <td>{TIPOS_DE_GESTION[g.kind]}</td>
                  <td>
                    <Link href={`/parte/${g.partyId}`}>{g.partyName ?? 'sin nombre'}</Link>
                  </td>
                  <td>{g.policyId === null ? '—' : <Link href={`/poliza/${g.policyId}`}>{g.policyNumber}</Link>}</td>
                  <td>
                    {ESTADOS_DE_GESTION[g.status]}
                    {g.claimStage === null ? null : ` · ${ETAPAS_DE_SINIESTRO[g.claimStage]}`}
                    {g.quote === null
                      ? null
                      : g.quote.chosenInsurer === null
                        ? ` · cotizaron ${String(g.quote.quoted)} de ${String(g.quote.requested)}`
                        : ` · eligió ${g.quote.chosenInsurer}`}
                  </td>
                  <td>
                    {g.assignedEmail === null ? '—' : <PersonaEnLista integrante={porCorreo.get(g.assignedEmail)} reemplazo={g.assignedEmail} />}
                  </td>
                  <td className={g.dueDate !== null && g.dueDate < hoy && g.status !== 'CERRADA' ? 'pendiente' : undefined}>
                    {fecha(g.dueDate)}
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
