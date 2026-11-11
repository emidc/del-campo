import type { TaskSummary } from '@del-campo/api'
import { ESTADOS_DE_TAREA, TASK_STATUSES, esEstadoDeTarea, latestBatch, tareas } from '@del-campo/api'
import Link from 'next/link'

import { Cabecera } from '@/app/_componentes/Cabecera'
import { fechaDeHoy } from '@/lib/criterios'
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

  const filtro = (etiqueta: string, activo: boolean, href: string) =>
    activo ? <strong>{etiqueta}</strong> : <Link href={href}>{etiqueta}</Link>

  return (
    <main className="envoltorio">
      <Cabecera lote={lote} email={principal.email} />

      <h1 style={{ fontSize: '1.3rem', margin: '0 0 0.4rem' }}>Tareas</h1>
      <p className="meta">
        {filtro('Todas las que ves', !mias && !hechas && estado === undefined, '/tareas')}
        {' · '}
        {filtro('Las mías', mias && estado === undefined, '/tareas?mias=1')}
        {TASK_STATUSES.filter((e) => e !== 'HECHA').map((e) => (
          <span key={e}>
            {' · '}
            {filtro(ESTADOS_DE_TAREA[e], estado === e, `/tareas?estado=${e}`)}
          </span>
        ))}
        {' · '}
        {filtro('Incluir hechas', hechas, '/tareas?hechas=1')}
      </p>
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
                    {t.dueDate ?? '—'}
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
