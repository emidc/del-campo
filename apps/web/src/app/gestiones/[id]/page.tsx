import type { ServiceCaseEvent } from '@del-campo/api'
import { ESTADOS_DE_GESTION, SERVICE_CASE_STATUSES, TIPOS_DE_GESTION, gestion, latestBatch } from '@del-campo/api'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { Cabecera } from '@/app/_componentes/Cabecera'
import { anotar, cambiarEstado, tomar } from '@/app/gestiones/acciones'
import { consultar, requireAdmitted } from '@/lib/sesion'

export const dynamic = 'force-dynamic'

const momento = (marca: string): string => marca.slice(0, 16).replace('T', ' ')

const describir = (evento: ServiceCaseEvent): string => {
  switch (evento.kind) {
    case 'ALTA':
      return 'Creó la gestión'
    case 'NOTA':
      return 'Nota'
    case 'CIERRE':
      return 'Cerró la gestión'
    case 'ESTADO':
      return evento.fromStatus === 'CERRADA'
        ? `Reabrió: ${ESTADOS_DE_GESTION[evento.toStatus ?? 'ABIERTA']}`
        : `Estado: ${evento.fromStatus === null ? '' : `${ESTADOS_DE_GESTION[evento.fromStatus]} → `}${ESTADOS_DE_GESTION[evento.toStatus ?? 'ABIERTA']}`
  }
}

export default async function GestionPage({ params }: { readonly params: Promise<{ readonly id: string }> }) {
  const principal = await requireAdmitted()
  const { id } = await params
  const [lote, g] = await consultar(Promise.all([latestBatch(principal), gestion(principal, id)]))
  if (g === null) notFound()
  const cerrada = g.status === 'CERRADA'

  return (
    <main className="envoltorio">
      <Cabecera lote={lote} email={principal.email} />
      <p className="meta">
        <Link href="/gestiones">← Gestiones</Link>
      </p>

      <h1 style={{ fontSize: '1.3rem', margin: '0 0 0.2rem' }}>{g.title}</h1>
      <p className="meta">
        {TIPOS_DE_GESTION[g.kind]} · <strong>{ESTADOS_DE_GESTION[g.status]}</strong>
        {' · Cliente '}
        <Link href={`/parte/${g.partyId}`}>{g.partyName ?? 'sin nombre'}</Link>
        {g.policyId === null ? null : (
          <>
            {' · Póliza '}
            <Link href={`/poliza/${g.policyId}`}>{g.policyNumber}</Link>
          </>
        )}
      </p>
      <p className="meta">
        Responsable: {g.assignedToMe ? 'vos' : (g.assignedEmail ?? 'nadie')}
        {g.dueDate === null ? null : ` · Vence ${g.dueDate}`}
        {cerrada && g.closedAt !== null ? ` · Cerrada el ${momento(g.closedAt)}` : null}
      </p>
      {cerrada && g.outcome !== null ? <p className="estado">Resultado: {g.outcome}</p> : null}

      {g.assignedToMe ? null : (
        <form action={tomar} style={{ margin: '0.75rem 0' }}>
          <input type="hidden" name="id" value={g.id} />
          <button type="submit" className="boton--secundario">
            Tomar la gestión
          </button>
        </form>
      )}

      <h2>Cambiar estado</h2>
      <form action={cambiarEstado} className="buscador">
        <input type="hidden" name="id" value={g.id} />
        <div className="campo">
          <label htmlFor="estado">Nuevo estado</label>
          <select id="estado" name="estado" defaultValue={g.status}>
            {SERVICE_CASE_STATUSES.map((estado) => (
              <option key={estado} value={estado}>
                {ESTADOS_DE_GESTION[estado]}
              </option>
            ))}
          </select>
        </div>
        <div className="campo" style={{ gridColumn: 'span 2' }}>
          <label htmlFor="comentario">Comentario (al cerrar, el resultado)</label>
          <input id="comentario" name="comentario" maxLength={2000} />
        </div>
        <div className="acciones">
          <button type="submit">Guardar estado</button>
        </div>
      </form>

      <h2>Agregar nota</h2>
      <form action={anotar} className="buscador">
        <input type="hidden" name="id" value={g.id} />
        <div className="campo" style={{ gridColumn: '1 / -1' }}>
          <label htmlFor="nota">Nota</label>
          <textarea id="nota" name="nota" rows={3} required />
        </div>
        <div className="acciones">
          <button type="submit">Agregar nota</button>
        </div>
      </form>

      <h2>Historia</h2>
      {g.events.map((evento) => (
        <article className="tarjeta" key={evento.id}>
          <p className="meta" style={{ margin: 0 }}>
            {momento(evento.createdAt)} · {evento.authorEmail ?? 'integrante dado de baja'} · {describir(evento)}
          </p>
          {evento.body === null ? null : <p style={{ margin: '0.35rem 0 0', whiteSpace: 'pre-wrap' }}>{evento.body}</p>}
        </article>
      ))}
    </main>
  )
}
