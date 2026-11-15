import type { ServiceCaseEvent } from '@del-campo/api'
import {
  CLAIM_STAGES,
  ESTADOS_DE_GESTION,
  ESTADOS_DE_PROPUESTA,
  ESTADOS_DE_TAREA,
  CLAIM_CONTACT_ROLES,
  ROLES_DE_INTERLOCUTOR,
  ETAPAS_DE_SINIESTRO,
  SERVICE_CASE_STATUSES,
  QUOTE_CURRENCIES,
  TIPOS_DE_GESTION,
  companiasActivas,
  formatQuotePremium,
  gestion,
  integrantesAsignables,
  interlocutores,
  latestBatch,
  tareas,
} from '@del-campo/api'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { BotonEnviar } from '@/app/_componentes/BotonEnviar'
import { Cabecera } from '@/app/_componentes/Cabecera'
import {
  agregarRequisitoAEtapa,
  anotar,
  asignar,
  cambiarDeInterlocutor,
  cambiarEstado,
  contactoDeHoy,
  elegir,
  marcar,
  moverEtapa,
  pedirACompania,
  responderCotizacion,
  sumarAlSiniestro,
  tomar,
} from '@/app/gestiones/acciones'
import { fecha, fechaHora } from '@/lib/formato'
import { consultar, requireAdmitted } from '@/lib/sesion'

export const dynamic = 'force-dynamic'


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
    case 'PROPUESTA':
      return evento.body ?? 'Propuesta'
    case 'INTERLOCUTOR':
      return evento.body ?? 'Interlocutor'
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
  const [lote, g, integrantes, companias, tareasDeLaGestion, contactos] = await consultar(
    Promise.all([
      latestBatch(principal),
      gestion(principal, id),
      integrantesAsignables(principal, id),
      companiasActivas(principal),
      tareas(principal, { serviceCaseId: id, includeDone: true }),
      interlocutores(principal, id),
    ]),
  )
  if (g === null) notFound()
  const cerrada = g.status === 'CERRADA'
  const avisoVisible =
    aviso === null ? null : <p className="estado estado--aviso">{aviso.charAt(0).toUpperCase() + aviso.slice(1)}.</p>
  const pedidas = new Set(g.quoteOptions.map((o) => o.insurerId))
  const sinPedir = companias.filter((c) => !pedidas.has(c.id))

  return (
    <main className="envoltorio">
      <Cabecera lote={lote} email={principal.email} />
      <nav className="migas" aria-label="Migas de pan">
        <Link href="/gestiones">Gestiones</Link>
        <span aria-hidden="true">›</span>
        <span>{g.title}</span>
      </nav>
      <header className="encabezado">
        <div>
          <p className="antetitulo">{TIPOS_DE_GESTION[g.kind]}</p>
          <h1>{g.title}</h1>
          <div className="chips">
            <span className="chip">{ESTADOS_DE_GESTION[g.status]}</span>
            {g.dueDate === null ? null : <span className="chip">Vence {fecha(g.dueDate)}</span>}
          </div>
        </div>
      </header>

      <section className="tarjeta ficha-datos">
        <dl className="kv">
          <dt>Cliente</dt>
          <dd className="nombre">
            <Link href={`/parte/${g.partyId}`}>{g.partyName ?? 'sin nombre'}</Link>
          </dd>
          {g.policyId === null ? null : (
            <>
              <dt>Póliza</dt>
              <dd>
                <Link href={`/poliza/${g.policyId}`}>{g.policyNumber}</Link>
              </dd>
            </>
          )}
          <dt>Responsable</dt>
          <dd>{g.assignedToMe ? 'Vos' : (g.assignedEmail ?? 'Nadie')}</dd>
          {cerrada && g.closedAt !== null ? (
            <>
              <dt>Cerrada</dt>
              <dd>{fechaHora(g.closedAt)}</dd>
            </>
          ) : null}
        </dl>
      </section>
      {cerrada && g.outcome !== null ? <p className="estado">Resultado: {g.outcome}</p> : null}

      {g.claimStage === null ? null : (
        <>
          <h2>Etapas del siniestro</h2>
          {avisoVisible}
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
                          <BotonEnviar className="boton--secundario boton--chico">
                            {r.doneAt === null ? 'Marcar cumplido' : 'Desmarcar'}
                          </BotonEnviar>
                        </form>
                        {r.doneAt === null ? null : (
                          <span className="meta">
                            {' '}
                            · {fechaHora(r.doneAt)} · {r.doneByEmail ?? 'integrante dado de baja'}
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
                      <BotonEnviar className="boton--secundario">
                        Agregar
                      </BotonEnviar>
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
                <BotonEnviar className="boton--secundario">
                  ← Volver una etapa
                </BotonEnviar>
              </form>
            )}
            {g.claimStage === 'CIERRE' ? null : (
              <form action={moverEtapa}>
                <input type="hidden" name="id" value={g.id} />
                <input type="hidden" name="sentido" value="NEXT" />
                <BotonEnviar>Avanzar a la siguiente etapa →</BotonEnviar>
              </form>
            )}
          </div>
        </>
      )}

      {g.claimStage === null ? null : (
        <>
          <h2 id="interlocutores">Interlocutores</h2>
          {contactos.length === 0 ? (
            <p className="meta">Todavía no hay interlocutores.</p>
          ) : (
            <div className="desborde">
              <table data-interlocutores>
                <thead>
                  <tr>
                    <th>Rol</th>
                    <th>Persona</th>
                    <th>Responsable interno</th>
                    <th>Último contacto</th>
                    <th>Pendiente</th>
                  </tr>
                </thead>
                <tbody>
                  {contactos.map((k) => (
                    <tr key={k.id}>
                      <td>{ROLES_DE_INTERLOCUTOR[k.role]}</td>
                      <td>
                        {k.name}
                        {k.contact === null ? null : <span className="meta"> · {k.contact}</span>}
                      </td>
                      <td>{k.assignedToMe ? 'vos' : (k.assignedEmail ?? '—')}</td>
                      <td>{k.lastContactOn ?? 'Sin contacto'}</td>
                      <td className={k.pending === null ? undefined : 'pendiente'}>{k.pending ?? 'Sin intervención'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {contactos.map((k) => (
            <details key={k.id} className="tarjeta" data-interlocutor={k.name}>
              <summary>
                {ROLES_DE_INTERLOCUTOR[k.role]}: {k.name}
              </summary>
              <form action={contactoDeHoy} className="buscador">
                <input type="hidden" name="id" value={g.id} />
                <input type="hidden" name="interlocutor" value={k.id} />
                <div className="campo" style={{ gridColumn: 'span 2' }}>
                  <label htmlFor={`contacto-${k.id}`}>Qué se habló</label>
                  <input id={`contacto-${k.id}`} name="comentario" maxLength={500} />
                </div>
                <div className="acciones">
                  <BotonEnviar>Registrar contacto de hoy</BotonEnviar>
                </div>
              </form>
              <form action={cambiarDeInterlocutor} className="buscador">
                <input type="hidden" name="id" value={g.id} />
                <input type="hidden" name="interlocutor" value={k.id} />
                <div className="campo">
                  <label htmlFor={`pendiente-${k.id}`}>Pendiente (vacío: sin intervención)</label>
                  <input id={`pendiente-${k.id}`} name="pendiente" maxLength={300} defaultValue={k.pending ?? ''} />
                </div>
                <div className="campo">
                  <label htmlFor={`responsable-${k.id}`}>Responsable interno</label>
                  <select id={`responsable-${k.id}`} name="responsable" defaultValue={k.assignedUserId ?? ''}>
                    <option value="">Nadie</option>
                    {integrantes.map((i) => (
                      <option key={i.userId} value={i.userId}>
                        {i.email}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="acciones">
                  <BotonEnviar className="boton--secundario">
                    Guardar
                  </BotonEnviar>
                </div>
              </form>
            </details>
          ))}
          <form action={sumarAlSiniestro} className="buscador" style={{ marginTop: '0.75rem' }}>
            <input type="hidden" name="id" value={g.id} />
            <div className="campo">
              <label htmlFor="interlocutor-rol">Rol</label>
              <select id="interlocutor-rol" name="rol" defaultValue="TALLER">
                {CLAIM_CONTACT_ROLES.map((r) => (
                  <option key={r} value={r}>
                    {ROLES_DE_INTERLOCUTOR[r]}
                  </option>
                ))}
              </select>
            </div>
            <div className="campo">
              <label htmlFor="interlocutor-nombre">Nombre</label>
              <input id="interlocutor-nombre" name="nombre" required maxLength={200} />
            </div>
            <div className="campo">
              <label htmlFor="interlocutor-contacto">Teléfono o correo</label>
              <input id="interlocutor-contacto" name="contacto" maxLength={200} />
            </div>
            <div className="campo">
              <label htmlFor="interlocutor-responsable">Responsable interno</label>
              <select id="interlocutor-responsable" name="responsable" defaultValue="">
                <option value="">Nadie</option>
                {integrantes.map((i) => (
                  <option key={i.userId} value={i.userId}>
                    {i.email}
                  </option>
                ))}
              </select>
            </div>
            <div className="campo" style={{ gridColumn: 'span 2' }}>
              <label htmlFor="interlocutor-pendiente">Pendiente</label>
              <input id="interlocutor-pendiente" name="pendiente" maxLength={300} />
            </div>
            <div className="acciones">
              <BotonEnviar>Sumar interlocutor</BotonEnviar>
            </div>
          </form>
        </>
      )}

      {g.quote === null ? null : (
        <>
          <h2 id="propuestas">Propuestas de las compañías</h2>
          {avisoVisible}
          <p className="meta">
            {g.quote.requested === 0
              ? 'Todavía no se pidió a ninguna compañía.'
              : `Pedida a ${String(g.quote.requested)} · cotizaron ${String(g.quote.quoted)}`}
            {g.quote.chosenInsurer === null ? null : (
              <>
                {' · '}
                <strong>El cliente eligió {g.quote.chosenInsurer}</strong>
              </>
            )}
          </p>
          {g.quoteOptions.map((o) => (
            <article className={o.status === 'ELEGIDA' ? 'tarjeta tarjeta--elegida' : 'tarjeta'} key={o.id}>
              <p style={{ margin: 0, fontWeight: 600 }}>
                {o.insurerName} · {ESTADOS_DE_PROPUESTA[o.status]}
                {o.premium === null ? null : ` · ${formatQuotePremium(o.premium, o.currency)}`}
              </p>
              <p className="meta">
                {o.validUntil === null ? null : `Vale hasta ${o.validUntil} · `}
                Actualizada el {fechaHora(o.updatedAt)}
                {o.note === null ? null : ` · ${o.note}`}
              </p>
              <form action={responderCotizacion} className="buscador" style={{ marginTop: '0.5rem' }}>
                <input type="hidden" name="id" value={g.id} />
                <input type="hidden" name="propuesta" value={o.id} />
                <div className="campo">
                  <label htmlFor={`prima-${o.id}`}>Prima</label>
                  <input
                    id={`prima-${o.id}`}
                    name="prima"
                    inputMode="decimal"
                    placeholder="120.000,50"
                    defaultValue={o.premium?.replace('.', ',') ?? ''}
                  />
                </div>
                <div className="campo">
                  <label htmlFor={`moneda-${o.id}`}>Moneda</label>
                  <select id={`moneda-${o.id}`} name="moneda" defaultValue={o.currency}>
                    {QUOTE_CURRENCIES.map((m) => (
                      <option key={m} value={m}>
                        {m === 'ARS' ? 'Pesos' : 'Dólares'}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="campo">
                  <label htmlFor={`vence-${o.id}`}>Vale hasta</label>
                  <input id={`vence-${o.id}`} name="vence" type="date" defaultValue={o.validUntil ?? ''} />
                </div>
                <div className="campo">
                  <label htmlFor={`nota-${o.id}`}>Nota</label>
                  <input id={`nota-${o.id}`} name="nota" maxLength={500} defaultValue={o.note ?? ''} />
                </div>
                <div className="acciones">
                  <BotonEnviar name="respuesta" value="COTIZO" className="boton--secundario">
                    Guardar cotización
                  </BotonEnviar>
                  {o.status === 'PEDIDA' ? (
                    <BotonEnviar name="respuesta" value="NO_COTIZA" className="boton--secundario">
                      No cotiza
                    </BotonEnviar>
                  ) : null}
                </div>
              </form>
              {o.status === 'COTIZADA' || o.status === 'ELEGIDA' ? (
                <form action={elegir} style={{ marginTop: '0.5rem' }}>
                  <input type="hidden" name="id" value={g.id} />
                  <input type="hidden" name="propuesta" value={o.id} />
                  {o.status === 'ELEGIDA' ? (
                    <BotonEnviar name="deshacer" value="1" className="boton--secundario">
                      Deshacer la elección
                    </BotonEnviar>
                  ) : (
                    <BotonEnviar>El cliente eligió esta</BotonEnviar>
                  )}
                </form>
              ) : null}
            </article>
          ))}
          {sinPedir.length === 0 ? null : (
            <form action={pedirACompania} className="buscador">
              <input type="hidden" name="id" value={g.id} />
              <div className="campo" style={{ gridColumn: 'span 2' }}>
                <label htmlFor="compania">Pedir cotización a</label>
                <select id="compania" name="compania" defaultValue="">
                  <option value="" disabled>
                    Elegí una compañía
                  </option>
                  {sinPedir.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="acciones">
                <BotonEnviar>Pedir</BotonEnviar>
              </div>
            </form>
          )}
        </>
      )}

      <h2>Tareas</h2>
      {tareasDeLaGestion.length === 0 ? <p className="meta">Sin tareas.</p> : (
        <ul style={{ margin: '0 0 0.5rem', paddingLeft: '1.1rem' }}>
          {tareasDeLaGestion.map((t) => (
            <li key={t.id}>
              <Link href={`/tareas/${t.id}`}>{t.title}</Link>
              <span className="meta">
                {' '}
                · {ESTADOS_DE_TAREA[t.status]} · {t.assignedToMe ? 'vos' : (t.assignedEmail ?? 'sin responsable')}
                {t.dueDate === null ? null : ` · vence ${fecha(t.dueDate)}`}
              </span>
            </li>
          ))}
        </ul>
      )}
      <p className="meta">
        <Link href={`/tareas/nueva?gestion=${g.id}`}>Nueva tarea para esta gestión</Link>
      </p>

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
          <BotonEnviar>Asignar</BotonEnviar>
        </div>
      </form>
      {g.assignedToMe ? null : (
        <form action={tomar} style={{ margin: '0.75rem 0' }}>
          <input type="hidden" name="id" value={g.id} />
          <BotonEnviar className="boton--secundario">
            Tomarla yo
          </BotonEnviar>
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
          <BotonEnviar>Guardar estado</BotonEnviar>
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
          <BotonEnviar>Agregar nota</BotonEnviar>
        </div>
      </form>

      <h2>Historia</h2>
      {g.events.map((evento) => (
        <article className="tarjeta" key={evento.id}>
          <p className="meta" style={{ margin: 0 }}>
            {fechaHora(evento.createdAt)} · {evento.authorEmail ?? 'integrante dado de baja'} · {describir(evento)}
          </p>
          {evento.body === null || ['ASIGNACION', 'ETAPA', 'REQUISITO', 'PROPUESTA', 'INTERLOCUTOR'].includes(evento.kind) ? null : <p style={{ margin: '0.35rem 0 0', whiteSpace: 'pre-wrap' }}>{evento.body}</p>}
        </article>
      ))}
    </main>
  )
}
