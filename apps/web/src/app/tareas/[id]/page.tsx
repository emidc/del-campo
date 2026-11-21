import type { TaskEvent } from '@del-campo/api'
import {
  ESTADOS_DE_TAREA,
  PRIORIDADES_DE_TAREA,
  SEGUIMIENTOS_DE_TAREA,
  TASK_FOLLOW_UPS,
  TASK_PRIORITIES,
  TASK_STATUSES,
  latestBatch,
  responsablesPosibles,
  tarea,
} from '@del-campo/api'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { BotonEnviar } from '@/app/_componentes/BotonEnviar'
import { Cabecera } from '@/app/_componentes/Cabecera'
import { CampoEditable, EliminarConDialogo } from '@/app/_componentes/Edicion'
import { comentar, editarCampo, eliminar, pasar } from '@/app/tareas/acciones'
import { fecha, fechaHora } from '@/lib/formato'
import { consultar, requireAdmitted } from '@/lib/sesion'

import { AccionesDelEquipo } from './AccionesDelEquipo'

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
    case 'CAMBIO':
    case 'ACCION':
      return evento.body ?? ''
  }
}

const conCuerpo = (evento: TaskEvent): boolean =>
  evento.body !== null && evento.kind !== 'ASIGNACION' && evento.kind !== 'CAMBIO' && evento.kind !== 'ACCION'

export default async function TareaPage({ params }: { readonly params: Promise<{ readonly id: string }> }) {
  const principal = await requireAdmitted()
  const { id } = await params
  const [lote, t] = await consultar(Promise.all([latestBatch(principal), tarea(principal, id)]))
  if (t === null) notFound()
  const integrantes = await consultar(responsablesPosibles(principal, t.partyId))
  const responsable = integrantes.find((i) => i.email === t.assignedEmail)?.userId ?? ''
  const campo = (nombre: string) => ({ id: t.id, campo: nombre })

  return (
    <main className="envoltorio envoltorio--ancho">
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
            {t.priority === null ? null : <span className="chip">Prioridad {PRIORIDADES_DE_TAREA[t.priority].toLowerCase()}</span>}
            {t.followUp === null ? null : <span className="chip">{SEGUIMIENTOS_DE_TAREA[t.followUp]}</span>}
            {t.dueDate === null ? null : <span className="chip">Vence {fecha(t.dueDate)}</span>}
          </div>
        </div>
        <div className="fila">
          <EliminarConDialogo boton="Eliminar tarea" titulo={`¿Eliminar la tarea «${t.title}»?`} accion={eliminar} ocultos={{ id: t.id }}>
            <p>Se borran la tarea, sus acciones y su historia. La eliminación es definitiva y no se puede deshacer.</p>
          </EliminarConDialogo>
        </div>
      </header>

      <section className="tarjeta ficha-datos">
        <div className="datos-tarea">
          <dl className="kv">
            <CampoEditable
              etiqueta="Estado"
              valor={t.status}
              tipo="select"
              opciones={TASK_STATUSES.map((e) => ({ valor: e, etiqueta: ESTADOS_DE_TAREA[e] }))}
              accion={editarCampo}
              ocultos={campo('estado')}
            >
              {ESTADOS_DE_TAREA[t.status]}
            </CampoEditable>
            <CampoEditable etiqueta="Vencimiento" valor={t.dueDate ?? ''} tipo="date" accion={editarCampo} ocultos={campo('vencimiento')}>
              {t.dueDate === null ? 'Sin fecha' : fecha(t.dueDate)}
            </CampoEditable>
            <CampoEditable
              etiqueta="Prioridad"
              valor={t.priority ?? ''}
              tipo="select"
              opciones={[
                { valor: '', etiqueta: 'Sin prioridad' },
                ...TASK_PRIORITIES.map((p) => ({ valor: p, etiqueta: PRIORIDADES_DE_TAREA[p] })),
              ]}
              accion={editarCampo}
              ocultos={campo('prioridad')}
            >
              {t.priority === null ? '—' : PRIORIDADES_DE_TAREA[t.priority]}
            </CampoEditable>
          </dl>
          <dl className="kv">
            <CampoEditable
              etiqueta="Seguimiento"
              valor={t.followUp ?? ''}
              tipo="select"
              opciones={[
                { valor: '', etiqueta: 'Sin seguimiento' },
                ...TASK_FOLLOW_UPS.map((s) => ({ valor: s, etiqueta: SEGUIMIENTOS_DE_TAREA[s] })),
              ]}
              accion={editarCampo}
              ocultos={campo('seguimiento')}
            >
              {t.followUp === null ? '—' : SEGUIMIENTOS_DE_TAREA[t.followUp]}
            </CampoEditable>
            <CampoEditable
              etiqueta="Responsable"
              valor={responsable}
              tipo="select"
              opciones={[{ valor: '', etiqueta: 'Sin responsable' }, ...integrantes.map((i) => ({ valor: i.userId, etiqueta: i.email }))]}
              accion={editarCampo}
              ocultos={campo('responsable')}
            >
              {t.assignedToMe ? 'Vos' : (t.assignedEmail ?? 'Nadie')}
            </CampoEditable>
            <dt>Cliente</dt>
            <dd className="nombre">
              <Link href={`/parte/${t.partyId}`}>{t.partyName ?? 'sin nombre'}</Link>
            </dd>
          </dl>
          <dl className="kv">
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
            <dt>Creada</dt>
            <dd>{fechaHora(t.createdAt)}</dd>
            {t.doneAt === null ? null : (
              <>
                <dt>Hecha</dt>
                <dd>{fechaHora(t.doneAt)}</dd>
              </>
            )}
          </dl>
        </div>
      </section>

      <div className="grid-2 grid-2--par">
        <div>
          <section className="tarjeta">
            <h2>Acciones del equipo</h2>
            <AccionesDelEquipo tarea={t.id} acciones={t.actions} integrantes={integrantes} />

            <h3>Pasar a otra persona</h3>
            <form action={pasar} className="formulario-compacto">
              <input type="hidden" name="id" value={t.id} />
              <div className="campo">
                <label htmlFor="responsable">Nuevo responsable</label>
                <select id="responsable" name="responsable" defaultValue={responsable}>
                  <option value="">Sin responsable</option>
                  {integrantes.map((i) => (
                    <option key={i.userId} value={i.userId}>
                      {i.email}
                    </option>
                  ))}
                </select>
              </div>
              <div className="campo campo--ancho">
                <label htmlFor="comentario-pase">Comentario (opcional)</label>
                <input id="comentario-pase" name="comentario" maxLength={2000} />
              </div>
              <div className="acciones">
                <BotonEnviar>Pasar</BotonEnviar>
              </div>
            </form>
          </section>

          <section className="tarjeta" style={{ marginTop: 18 }}>
            <h2>Comentar</h2>
            <form action={comentar}>
              <input type="hidden" name="id" value={t.id} />
              <div className="campo">
                <label htmlFor="comentario">Comentario</label>
                <textarea id="comentario" name="comentario" rows={3} required />
              </div>
              <div className="acciones" style={{ marginTop: 10 }}>
                <BotonEnviar>Comentar</BotonEnviar>
              </div>
            </form>
          </section>
        </div>

        <section className="tarjeta">
          <h2>Historia</h2>
          <ul className="lista">
            {t.events.map((evento) => (
              <li key={evento.id}>
                <p className="meta" style={{ margin: 0 }}>
                  {fechaHora(evento.createdAt)} · {evento.authorEmail ?? 'integrante dado de baja'}
                </p>
                <p style={{ margin: '0.2rem 0 0' }}>{describir(evento)}</p>
                {conCuerpo(evento) ? <p style={{ margin: '0.2rem 0 0', whiteSpace: 'pre-wrap' }}>{evento.body}</p> : null}
              </li>
            ))}
          </ul>
        </section>
      </div>
    </main>
  )
}
