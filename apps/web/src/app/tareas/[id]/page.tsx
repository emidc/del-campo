import type { TaskEvent } from '@del-campo/api'
import { ESTADOS_DE_TAREA, TASK_STATUSES, latestBatch, responsablesPosibles, tarea } from '@del-campo/api'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { Cabecera } from '@/app/_componentes/Cabecera'
import { cambiarEstado, comentar, pasar } from '@/app/tareas/acciones'
import { consultar, requireAdmitted } from '@/lib/sesion'

export const dynamic = 'force-dynamic'

const momento = (marca: string): string => marca.slice(0, 16).replace('T', ' ')

const describir = (evento: TaskEvent): string => {
  switch (evento.kind) {
    case 'ALTA':
      return 'Creó la tarea'
    case 'COMENTARIO':
      return 'Comentario'
    case 'ASIGNACION':
      return `Pasó a ${evento.body ?? 'sin responsable'}`
    case 'ESTADO':
      return `Estado: ${evento.fromStatus === null ? '' : `${ESTADOS_DE_TAREA[evento.fromStatus]} → `}${ESTADOS_DE_TAREA[evento.toStatus ?? 'PENDIENTE']}`
  }
}

export default async function TareaPage({ params }: { readonly params: Promise<{ readonly id: string }> }) {
  const principal = await requireAdmitted()
  const { id } = await params
  const [lote, t] = await consultar(Promise.all([latestBatch(principal), tarea(principal, id)]))
  if (t === null) notFound()
  const integrantes = await consultar(responsablesPosibles(principal, t.partyId))

  return (
    <main className="envoltorio">
      <Cabecera lote={lote} email={principal.email} />
      <p className="meta">
        <Link href="/tareas">← Tareas</Link>
      </p>

      <h1 style={{ fontSize: '1.3rem', margin: '0 0 0.2rem' }}>{t.title}</h1>
      <p className="meta">
        <strong>{ESTADOS_DE_TAREA[t.status]}</strong>
        {' · Cliente '}
        <Link href={`/parte/${t.partyId}`}>{t.partyName ?? 'sin nombre'}</Link>
        {t.policyId === null ? null : (
          <>
            {' · Póliza '}
            <Link href={`/poliza/${t.policyId}`}>{t.policyNumber}</Link>
          </>
        )}
        {t.serviceCaseId === null ? null : (
          <>
            {' · Gestión '}
            <Link href={`/gestiones/${t.serviceCaseId}`}>{t.serviceCaseTitle}</Link>
          </>
        )}
      </p>
      <p className="meta">
        Responsable: {t.assignedToMe ? 'vos' : (t.assignedEmail ?? 'nadie')}
        {t.dueDate === null ? null : ` · Vence ${t.dueDate}`}
        {t.doneAt === null ? null : ` · Hecha el ${momento(t.doneAt)}`}
      </p>

      <h2>Estado</h2>
      <form action={cambiarEstado} className="buscador">
        <input type="hidden" name="id" value={t.id} />
        <div className="campo">
          <label htmlFor="estado">Nuevo estado</label>
          <select id="estado" name="estado" defaultValue={t.status}>
            {TASK_STATUSES.map((e) => (
              <option key={e} value={e}>
                {ESTADOS_DE_TAREA[e]}
              </option>
            ))}
          </select>
        </div>
        <div className="campo" style={{ gridColumn: 'span 2' }}>
          <label htmlFor="comentario-estado">Comentario (opcional)</label>
          <input id="comentario-estado" name="comentario" maxLength={2000} />
        </div>
        <div className="acciones">
          <button type="submit">Guardar estado</button>
        </div>
      </form>

      <h2>Pasar a otra persona</h2>
      <form action={pasar} className="buscador">
        <input type="hidden" name="id" value={t.id} />
        <div className="campo">
          <label htmlFor="responsable">Responsable</label>
          <select id="responsable" name="responsable" defaultValue={integrantes.find((i) => i.email === t.assignedEmail)?.userId ?? ''}>
            <option value="">Sin responsable</option>
            {integrantes.map((i) => (
              <option key={i.userId} value={i.userId}>
                {i.email}
              </option>
            ))}
          </select>
        </div>
        <div className="campo" style={{ gridColumn: 'span 2' }}>
          <label htmlFor="comentario-pase">Comentario (opcional)</label>
          <input id="comentario-pase" name="comentario" maxLength={2000} />
        </div>
        <div className="acciones">
          <button type="submit">Pasar</button>
        </div>
      </form>

      <h2>Comentar</h2>
      <form action={comentar} className="buscador">
        <input type="hidden" name="id" value={t.id} />
        <div className="campo" style={{ gridColumn: '1 / -1' }}>
          <label htmlFor="comentario">Comentario</label>
          <textarea id="comentario" name="comentario" rows={3} required />
        </div>
        <div className="acciones">
          <button type="submit">Comentar</button>
        </div>
      </form>

      <h2>Historia</h2>
      {t.events.map((evento) => (
        <article className="tarjeta" key={evento.id}>
          <p className="meta" style={{ margin: 0 }}>
            {momento(evento.createdAt)} · {evento.authorEmail ?? 'integrante dado de baja'} · {describir(evento)}
          </p>
          {evento.body === null || evento.kind === 'ASIGNACION' ? null : (
            <p style={{ margin: '0.35rem 0 0', whiteSpace: 'pre-wrap' }}>{evento.body}</p>
          )}
        </article>
      ))}
    </main>
  )
}
