import type { TaskEvent } from '@del-campo/api'
import { ESTADOS_DE_TAREA, TASK_STATUSES, latestBatch, responsablesPosibles, tarea } from '@del-campo/api'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { BotonEnviar } from '@/app/_componentes/BotonEnviar'
import { Cabecera } from '@/app/_componentes/Cabecera'
import { cambiarEstado, comentar, pasar } from '@/app/tareas/acciones'
import { fecha, fechaHora } from '@/lib/formato'
import { consultar, requireAdmitted } from '@/lib/sesion'

export const dynamic = 'force-dynamic'

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
      <nav className="migas" aria-label="Migas de pan">
        <Link href="/tareas">Tareas</Link>
        <span aria-hidden="true">›</span>
        <span>{t.title}</span>
      </nav>
      <header className="encabezado">
        <div>
          <p className="antetitulo">Tarea</p>
          <h1>{t.title}</h1>
          <div className="chips">
            <span className="chip">{ESTADOS_DE_TAREA[t.status]}</span>
            {t.dueDate === null ? null : <span className="chip">Vence {fecha(t.dueDate)}</span>}
          </div>
        </div>
      </header>

      <section className="tarjeta ficha-datos">
        <dl className="kv">
          <dt>Cliente</dt>
          <dd className="nombre">
            <Link href={`/parte/${t.partyId}`}>{t.partyName ?? 'sin nombre'}</Link>
          </dd>
          {t.policyId === null ? null : (
            <>
              <dt>Póliza</dt>
              <dd>
                <Link href={`/poliza/${t.policyId}`}>{t.policyNumber}</Link>
              </dd>
            </>
          )}
          {t.serviceCaseId === null ? null : (
            <>
              <dt>Gestión</dt>
              <dd>
                <Link href={`/gestiones/${t.serviceCaseId}`}>{t.serviceCaseTitle}</Link>
              </dd>
            </>
          )}
          <dt>Responsable</dt>
          <dd>{t.assignedToMe ? 'Vos' : (t.assignedEmail ?? 'Nadie')}</dd>
          {t.doneAt === null ? null : (
            <>
              <dt>Hecha</dt>
              <dd>{fechaHora(t.doneAt)}</dd>
            </>
          )}
        </dl>
      </section>

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
          <BotonEnviar>Guardar estado</BotonEnviar>
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
          <BotonEnviar>Pasar</BotonEnviar>
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
          <BotonEnviar>Comentar</BotonEnviar>
        </div>
      </form>

      <h2>Historia</h2>
      {t.events.map((evento) => (
        <article className="tarjeta" key={evento.id}>
          <p className="meta" style={{ margin: 0 }}>
            {fechaHora(evento.createdAt)} · {evento.authorEmail ?? 'integrante dado de baja'} · {describir(evento)}
          </p>
          {evento.body === null || evento.kind === 'ASIGNACION' ? null : (
            <p style={{ margin: '0.35rem 0 0', whiteSpace: 'pre-wrap' }}>{evento.body}</p>
          )}
        </article>
      ))}
    </main>
  )
}
