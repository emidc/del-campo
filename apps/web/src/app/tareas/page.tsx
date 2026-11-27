import type { TaskSummary } from '@del-campo/api'
import {
  ESTADOS_DE_TAREA,
  ORIGENES_DE_PROSPECTO,
  PRIORIDADES_DE_TAREA,
  PROSPECT_ORIGINS,
  integrantesDelEquipo, latestBatch, tareas } from '@del-campo/api'
import Link from 'next/link'

import { Cabecera } from '@/app/_componentes/Cabecera'
import { PersonaEnLista, etiquetasDeIntegrantes } from '@/app/_componentes/Retrato'
import { fechaDeHoy } from '@/lib/criterios'
import { fecha } from '@/lib/formato'
import { consultar, requireAdmitted } from '@/lib/sesion'

import { CasillaSemanal } from './CasillaSemanal'
import { NuevaTarea } from './NuevaTarea'
import { TableroSemanal } from './TableroSemanal'

export const dynamic = 'force-dynamic'

const uno = (valor: string | string[] | undefined): string | undefined => (Array.isArray(valor) ? valor[0] : valor)

type Pestana = 'todas' | 'mias' | 'bloqueadas' | 'semana'

export default async function TareasPage({
  searchParams,
}: {
  readonly searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const principal = await requireAdmitted()
  const parametros = await searchParams
  const parte = uno(parametros.parte)
  const pestana: Pestana =
    uno(parametros.semana) === '1'
      ? 'semana'
      : uno(parametros.mias) === '1'
        ? 'mias'
        : uno(parametros.estado) === 'TRABADA'
          ? 'bloqueadas'
          : 'todas'
  // En el tablero, «Mis tareas» es el filtro por defecto; «Todas» muestra las de todo el equipo.
  const semanaDeTodos = pestana === 'semana' && uno(parametros.todas) === '1'
  const [lote, lista, integrantes] = await consultar(
    Promise.all([
      latestBatch(principal),
      tareas(principal, {
        onlyMine: pestana === 'mias' || (pestana === 'semana' && !semanaDeTodos),
        includeDone: pestana === 'todas',
        ...(pestana === 'semana' ? { weekly: true } : {}),
        ...(pestana === 'bloqueadas' ? { status: 'TRABADA' as const } : {}),
        ...(parte === undefined ? {} : { partyId: parte }),
      }),
      integrantesDelEquipo(principal),
    ]),
  )
  const hoy = fechaDeHoy()
  const etiquetas = etiquetasDeIntegrantes(integrantes)
  const porId = new Map(integrantes.map((i) => [i.userId, i]))

  const enlace = (etiqueta: string, activo: boolean, href: string) => (
    <Link key={href} href={href} aria-current={activo ? 'page' : undefined}>
      {etiqueta}
    </Link>
  )

  return (
    <main className={pestana === 'semana' ? 'envoltorio envoltorio--ancho' : 'envoltorio'}>
      <Cabecera lote={lote} email={principal.email} />

      <header className="encabezado">
        <div>
          <p className="antetitulo">Tareas</p>
          <h1>
            {pestana === 'semana' ? 'Tareas de la semana' : 'Tareas'} ({lista.length})
          </h1>
        </div>
        <div className="fila">
          <NuevaTarea
            origenes={PROSPECT_ORIGINS.map((o) => ({ valor: o, etiqueta: ORIGENES_DE_PROSPECTO[o] }))}
            integrantes={integrantes
              .filter((i) => i.email !== principal.email)
              .map((i) => ({ userId: i.userId, etiqueta: etiquetas.get(i) ?? i.name }))}
          />
        </div>
      </header>
      <nav className="pestanas" aria-label="Filtros de tareas">
        {enlace('Todas', pestana === 'todas' && parte === undefined, '/tareas')}
        {enlace('Mis tareas', pestana === 'mias', '/tareas?mias=1')}
        {enlace('Bloqueadas', pestana === 'bloqueadas', '/tareas?estado=TRABADA')}
        {enlace('Tareas de la semana', pestana === 'semana', '/tareas?semana=1')}
      </nav>
      {parte === undefined ? null : <p className="meta">Mostrando las tareas de un cliente.</p>}

      {pestana === 'semana' ? (
        <>
          <nav className="chips" aria-label="Qué tareas de la semana mostrar" style={{ margin: '0 0 14px' }}>
            <Link href="/tareas?semana=1" className={semanaDeTodos ? 'chip' : 'chip chip--activo'} aria-current={semanaDeTodos ? undefined : 'page'}>
              Mis tareas
            </Link>
            <Link href="/tareas?semana=1&todas=1" className={semanaDeTodos ? 'chip chip--activo' : 'chip'} aria-current={semanaDeTodos ? 'page' : undefined}>
              Todas
            </Link>
          </nav>
          {lista.length === 0 ? (
            <p className="estado">
              No hay tareas de la semana. Tildá «Tarea de la semana» en Mis tareas o en la ficha de una tarea.
            </p>
          ) : (
            <TableroSemanal
              key={lista.map((t) => `${t.id}:${t.status}`).join(',')}
              tareas={lista}
              nombres={ESTADOS_DE_TAREA}
              prioridades={PRIORIDADES_DE_TAREA}
              hoy={hoy}
              integrantes={Object.fromEntries(integrantes.map((i) => [i.userId, i]))}
            />
          )}
        </>
      ) : lista.length === 0 ? (
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
                {pestana === 'mias' ? <th>Tarea de la semana</th> : null}
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
                  <td>
                    {t.assignedUserId === null ? (
                      '—'
                    ) : (
                      <PersonaEnLista integrante={porId.get(t.assignedUserId)} reemplazo={t.assignedName ?? 'integrante dado de baja'} />
                    )}
                  </td>
                  <td className={t.dueDate !== null && t.dueDate < hoy && t.status !== 'HECHA' ? 'pendiente' : undefined}>
                    {fecha(t.dueDate)}
                  </td>
                  {pestana === 'mias' ? (
                    <td>
                      <CasillaSemanal key={String(t.weekly)} tarea={t.id} semanal={t.weekly} />
                    </td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  )
}
