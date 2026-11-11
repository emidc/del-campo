import type { ServiceCaseEvent } from '@del-campo/api'
import {
  CLAIM_STAGES,
  ESTADOS_DE_GESTION,
  ETAPAS_DE_SINIESTRO,
  SERVICE_CASE_STATUSES,
  TIPOS_DE_GESTION,
  gestion,
  integrantesAsignables,
  latestBatch,
} from '@del-campo/api'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { Cabecera } from '@/app/_componentes/Cabecera'
import { agregarRequisitoAEtapa, anotar, asignar, cambiarEstado, marcar, moverEtapa, tomar } from '@/app/gestiones/acciones'
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
    case 'ASIGNACION':
      return `Asignó a ${evento.body ?? 'sin responsable'}`
    case 'ETAPA':
      return `Etapa: ${evento.body ?? ''}`
    case 'REQUISITO':
      return evento.body ?? 'Requisito'
    case 'ESTADO':
      return evento.fromStatus === 'CERRADA'
        ? `Reabrió: ${ESTADOS_DE_GESTION[evento.toStatus ?? 'ABIERTA']}`
        : `Estado: ${evento.fromStatus === null ? '' : `${ESTADOS_DE_GESTION[evento.fromStatus]} → `}${ESTADOS_DE_GESTION[evento.toStatus ?? 'ABIERTA']}`
  }
}

export default async function GestionPage({
  params,
  searchParams,
}: {
  readonly params: Promise<{ readonly id: string }>
  readonly searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const principal = await requireAdmitted()
  const { id } = await params
  const avisoPedido = (await searchParams).aviso
  const aviso = typeof avisoPedido === 'string' ? avisoPedido.slice(0, 300) : null
  const [lote, g, integrantes] = await consultar(
    Promise.all([latestBatch(principal), gestion(principal, id), integrantesAsignables(principal, id)]),
  )
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

      {g.claimStage === null ? null : (
        <>
          <h2>Etapas del siniestro</h2>
          {aviso === null ? null : <p className="estado estado--aviso">{aviso.charAt(0).toUpperCase() + aviso.slice(1)}.</p>}
          <ol className="etapas" aria-label="Etapas del siniestro">
            {CLAIM_STAGES.map((etapa, i) => {
              const actual = CLAIM_STAGES.indexOf(g.claimStage ?? 'DENUNCIA')
              return (
                <li
                  key={etapa}
                  className={i < actual ? 'etapa etapa--hecha' : i === actual ? 'etapa etapa--actual' : 'etapa'}
                  aria-current={i === actual ? 'step' : undefined}
                >
                  {i < actual ? '✓ ' : null}
                  {ETAPAS_DE_SINIESTRO[etapa]}
                </li>
              )
            })}
          </ol>
          {CLAIM_STAGES.map((etapa) => {
            const requisitos = g.requirements.filter((r) => r.stage === etapa)
            const esActual = etapa === g.claimStage
            if (!esActual && requisitos.length === 0) return null
            return (
              <article className="tarjeta" key={etapa} style={esActual ? undefined : { opacity: 0.75 }}>
                <p style={{ margin: 0, fontWeight: 600 }}>
                  {ETAPAS_DE_SINIESTRO[etapa]}
                  {esActual ? ' · etapa actual' : null}
                </p>
                {requisitos.length === 0 ? (
                  <p className="meta" style={{ margin: '0.35rem 0 0' }}>
                    Sin requisitos.
                  </p>
                ) : (
                  <ul style={{ margin: '0.35rem 0 0', paddingLeft: '1.1rem' }}>
                    {requisitos.map((r) => (
                      <li key={r.id}>
                        <form action={marcar} style={{ display: 'inline' }}>
                          <input type="hidden" name="id" value={g.id} />
                          <input type="hidden" name="requisito" value={r.id} />
                          <input type="hidden" name="cumplido" value={r.doneAt === null ? '1' : '0'} />
                          {r.doneAt === null ? <span className="pendiente">Falta</span> : <span>✓</span>} {r.name}{' '}
                          <button type="submit" className="boton--secundario boton--chico">
                            {r.doneAt === null ? 'Marcar cumplido' : 'Desmarcar'}
                          </button>
                        </form>
                        {r.doneAt === null ? null : (
                          <span className="meta">
                            {' '}
                            · {momento(r.doneAt)} · {r.doneByEmail ?? 'integrante dado de baja'}
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
                {esActual ? (
                  <form action={agregarRequisitoAEtapa} className="buscador" style={{ marginTop: '0.6rem' }}>
                    <input type="hidden" name="id" value={g.id} />
                    <input type="hidden" name="etapa" value={etapa} />
                    <div className="campo" style={{ gridColumn: 'span 2' }}>
                      <label htmlFor={`req-${etapa}`}>Agregar requisito a esta etapa</label>
                      <input id={`req-${etapa}`} name="nombre" maxLength={200} required />
                    </div>
                    <div className="acciones">
                      <button type="submit" className="boton--secundario">
                        Agregar
                      </button>
                    </div>
                  </form>
                ) : null}
              </article>
            )
          })}
          <div style={{ display: 'flex', gap: '0.5rem', margin: '0.75rem 0' }}>
            {g.claimStage === 'DENUNCIA' ? null : (
              <form action={moverEtapa}>
                <input type="hidden" name="id" value={g.id} />
                <input type="hidden" name="sentido" value="BACK" />
                <button type="submit" className="boton--secundario">
                  ← Volver una etapa
                </button>
              </form>
            )}
            {g.claimStage === 'CIERRE' ? null : (
              <form action={moverEtapa}>
                <input type="hidden" name="id" value={g.id} />
                <input type="hidden" name="sentido" value="NEXT" />
                <button type="submit">Avanzar a la siguiente etapa →</button>
              </form>
            )}
          </div>
        </>
      )}

      <h2>Responsable</h2>
      <form action={asignar} className="buscador">
        <input type="hidden" name="id" value={g.id} />
        <div className="campo" style={{ gridColumn: 'span 2' }}>
          <label htmlFor="responsable">Asignar a</label>
          <select id="responsable" name="responsable" defaultValue={integrantes.find((i) => i.email === g.assignedEmail)?.userId ?? ''}>
            <option value="">Sin responsable</option>
            {integrantes.map((i) => (
              <option key={i.userId} value={i.userId}>
                {i.email}
              </option>
            ))}
          </select>
        </div>
        <div className="acciones">
          <button type="submit">Asignar</button>
        </div>
      </form>
      {g.assignedToMe ? null : (
        <form action={tomar} style={{ margin: '0.75rem 0' }}>
          <input type="hidden" name="id" value={g.id} />
          <button type="submit" className="boton--secundario">
            Tomarla yo
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
          {evento.body === null || ['ASIGNACION', 'ETAPA', 'REQUISITO'].includes(evento.kind) ? null : <p style={{ margin: '0.35rem 0 0', whiteSpace: 'pre-wrap' }}>{evento.body}</p>}
        </article>
      ))}
    </main>
  )
}
