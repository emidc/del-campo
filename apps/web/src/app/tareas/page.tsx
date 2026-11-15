import type { TaskSummary } from '@del-campo/api'
import { ESTADOS_DE_TAREA, TASK_STATUSES, esEstadoDeTarea, latestBatch, tareas } from '@del-campo/api'
import Link from 'next/link'

import { Cabecera } from '@/app/_componentes/Cabecera'
import { fechaDeHoy } from '@/lib/criterios'
import { fecha } from '@/lib/formato'
import { consultar, requireAdmitted } from '@/lib/sesion'

export const dynamic = 'force-dynamic'

const uno = (valor: string | string[] | undefined): string | undefined => (Array.isArray(valor) ? valor[0] : valor)

export default async function TareasPage({
  searchParams,
}: {
  readonly searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const principal = await requireAdmitted()
  const parametros = await searchParams
  const mias = uno(parametros.mias) === '1'
  const hechas = uno(parametros.hechas) === '1'
  const parte = uno(parametros.parte)
  const estadoPedido = uno(parametros.estado)
  const estado = esEstadoDeTarea(estadoPedido) ? estadoPedido : undefined
  const [lote, lista] = await consultar(
    Promise.all([
      latestBatch(principal),
      tareas(principal, {
        onlyMine: mias,
        includeDone: hechas || parte !== undefined,
        ...(parte === undefined ? {} : { partyId: parte }),
        ...(estado === undefined ? {} : { status: estado }),
      }),
    ]),
  )
  const hoy = fechaDeHoy()

  const pestana = (etiqueta: string, activo: boolean, href: string) => (
    <Link key={href} href={href} aria-current={activo ? 'page' : undefined}>
      {etiqueta}
    </Link>
  )

  return (
    <main className="envoltorio">
      <Cabecera lote={lote} email={principal.email} />

      <p className="antetitulo">Tareas</p>
      <h1>Tareas ({lista.length})</h1>
      <nav className="pestanas" aria-label="Filtros de tareas">
        {pestana('Todas', !mias && !hechas && estado === undefined && parte === undefined, '/tareas')}
        {pestana('Las mías', mias && estado === undefined, '/tareas?mias=1')}
        {TASK_STATUSES.filter((e) => e !== 'HECHA').map((e) => pestana(ESTADOS_DE_TAREA[e], estado === e, `/tareas?estado=${e}`))}
        {pestana('Con las hechas', hechas, '/tareas?hechas=1')}
      </nav>
      {parte === undefined ? (
        <p className="meta">Para crear una tarea, abrí la ficha del cliente, una póliza o una gestión y usá «Nueva tarea».</p>
      ) : (
        <p className="meta">
          Mostrando las tareas de un cliente, hechas incluidas. <Link href={`/tareas/nueva?parte=${parte}`}>Nueva tarea</Link>
        </p>
      )}

      {lista.length === 0 ? (
        <p className="estado">No hay tareas para mostrar.</p>
      ) : (
        <div className="desborde">
          <table>
            <thead>
              <tr>
                <th>Tarea</th>
                <th>Cliente</th>
                <th>Estado</th>
                <th>Responsable</th>
                <th>Vence</th>
              </tr>
            </thead>
            <tbody>
              {lista.map((t: TaskSummary) => (
                <tr key={t.id}>
                  <td>
                    <Link href={`/tareas/${t.id}`}>{t.title}</Link>
                    {t.serviceCaseTitle === null ? null : <span className="meta"> · {t.serviceCaseTitle}</span>}
                  </td>
                  <td>
                    <Link href={`/parte/${t.partyId}`}>{t.partyName ?? 'sin nombre'}</Link>
                  </td>
                  <td className={t.status === 'TRABADA' ? 'pendiente' : undefined}>{ESTADOS_DE_TAREA[t.status]}</td>
                  <td>{t.assignedToMe ? 'vos' : (t.assignedEmail ?? '—')}</td>
                  <td className={t.dueDate !== null && t.dueDate < hoy && t.status !== 'HECHA' ? 'pendiente' : undefined}>
                    {fecha(t.dueDate)}
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
