import {
  ESTADOS_DE_GESTION,
  ESTADOS_DE_TAREA,
  MENSAJE_DE_CONTACTO,
  TIPOS_DE_GESTION,
  contactosDeCliente,
  conversacionesDeCliente,
  esResultadoDeContacto,
  gestiones,
  latestBatch,
  party,
  tareas,
} from '@del-campo/api'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'

import { BotonEnviar } from '@/app/_componentes/BotonEnviar'
import { Cabecera } from '@/app/_componentes/Cabecera'
import { Riesgos } from '@/app/_componentes/Riesgos'
import { fechaDeHoy } from '@/lib/criterios'
import { contacto } from '@/app/comunicacion/etiquetas'
import { fecha, instante } from '@/lib/formato'
import { consultar, requireAdmitted } from '@/lib/sesion'

import { agregar, corregir, quitar } from './acciones'

export const dynamic = 'force-dynamic'

const SECCIONES = ['resumen', 'polizas', 'riesgos', 'gestiones', 'tareas', 'comunicacion'] as const
type Seccion = (typeof SECCIONES)[number]

const esSeccion = (valor: string | undefined): valor is Seccion =>
  valor !== undefined && (SECCIONES as readonly string[]).includes(valor)

/** La ficha de un cliente, persona o empresa, con sus secciones en pestañas como en el prototipo. */
export default async function PartePage({
  params,
  searchParams,
}: {
  readonly params: Promise<{ readonly id: string }>
  readonly searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const principal = await requireAdmitted()
  const { id } = await params
  const parametros = await searchParams
  const crudo = parametros.seccion
  const pedida = Array.isArray(crudo) ? crudo[0] : crudo
  const avisoDeContacto = typeof parametros.c === 'string' && esResultadoDeContacto(parametros.c) ? parametros.c : null
  const asOf = fechaDeHoy()
  const [lote, vista, susGestiones, susTareas, susConversaciones, susContactos] = await consultar(
    Promise.all([
      latestBatch(principal),
      party(principal, id, asOf, `${asOf}T12:00:00Z`),
      gestiones(principal, { onlyMine: false, includeClosed: true, partyId: id }),
      tareas(principal, { onlyMine: false, includeDone: true, partyId: id }),
      conversacionesDeCliente(principal, id),
      contactosDeCliente(principal, id),
    ]),
  )
  if (vista === null) notFound()

  const esEmpresa = vista.kind === 'ORGANIZATION'
  const seccion: Seccion = esSeccion(pedida) && (pedida !== 'riesgos' || esEmpresa) ? pedida : 'resumen'
  const gestionesAbiertas = susGestiones.filter((g) => g.status !== 'CERRADA').length
  const tareasPendientes = susTareas.filter((t) => t.status !== 'HECHA').length

  const pestanas: readonly (readonly [Seccion, string])[] = [
    ['resumen', 'Resumen'],
    ['polizas', `Pólizas (${String(vista.policies.length)})`],
    ...(esEmpresa ? ([['riesgos', 'Riesgos']] as const) : []),
    ['gestiones', `Gestiones (${String(gestionesAbiertas)})`],
    ['tareas', `Tareas (${String(tareasPendientes)})`],
    ['comunicacion', `WhatsApp (${String(susConversaciones.length)})`],
  ]

  return (
    <main className="envoltorio">
      <Cabecera lote={lote} email={principal.email} />

      <nav className="migas" aria-label="Migas de pan">
        <Link href={esEmpresa ? '/clientes' : '/clientes?tipo=personas'}>Clientes</Link>
        <span aria-hidden="true">›</span>
        <span>{vista.displayName}</span>
      </nav>
      <header className="encabezado">
        <div>
          <p className="antetitulo">{esEmpresa ? 'Empresa' : 'Persona'}</p>
          <h1>{vista.displayName}</h1>
          <div className="chips">
            {vista.cuit === null ? null : <span className="chip">CUIT {vista.cuit}</span>}
            {vista.dni === null ? null : <span className="chip">DNI {vista.dni}</span>}
          </div>
        </div>
        <div className="fila">
          <Link className="boton boton--secundario" href={`/tareas/nueva?parte=${id}`}>
            Nueva tarea
          </Link>
          <Link className="boton" href={`/gestiones/nueva?parte=${id}`}>
            Nueva gestión
          </Link>
        </div>
      </header>

      <nav className="pestanas" aria-label="Secciones de la ficha">
        {pestanas.map(([clave, texto]) => (
          <Link
            key={clave}
            href={clave === 'resumen' ? `/parte/${id}` : `/parte/${id}?seccion=${clave}`}
            aria-current={clave === seccion ? 'page' : undefined}
          >
            {texto}
          </Link>
        ))}
      </nav>

      {seccion === 'resumen' ? (
        <div className="grid-2">
          <div>
          <section className="tarjeta">
            <h2>Datos</h2>
            <dl className="kv">
              <dt>{esEmpresa ? 'Razón social' : 'Nombre'}</dt>
              <dd className="nombre">{vista.displayName}</dd>
              {vista.cuit === null ? null : (
                <>
                  <dt>CUIT</dt>
                  <dd>{vista.cuit}</dd>
                </>
              )}
              {vista.dni === null ? null : (
                <>
                  <dt>DNI</dt>
                  <dd>{vista.dni}</dd>
                </>
              )}
              <dt>Pólizas</dt>
              <dd>
                <Link href={`/parte/${id}?seccion=polizas`}>{vista.policies.length} a la fecha</Link>
              </dd>
              <dt>Gestiones abiertas</dt>
              <dd>
                <Link href={`/parte/${id}?seccion=gestiones`}>{gestionesAbiertas}</Link>
              </dd>
              <dt>Tareas pendientes</dt>
              <dd>
                <Link href={`/parte/${id}?seccion=tareas`}>{tareasPendientes}</Link>
              </dd>
            </dl>
          </section>

          <section className="tarjeta" id="contactos">
            <h2>Teléfonos y mails</h2>
            {avisoDeContacto === null ? null : (
              <p className={avisoDeContacto === 'guardado' || avisoDeContacto === 'quitado' ? 'estado' : 'estado estado--aviso'} role="status">
                {MENSAJE_DE_CONTACTO[avisoDeContacto]}
              </p>
            )}
            {susContactos.length === 0 ? (
              <p className="meta">Ninguno cargado. Con el teléfono cargado, sus conversaciones de WhatsApp aparecen en esta ficha.</p>
            ) : (
              <ul className="lista">
                {susContactos.map((c) => (
                  <li key={c.id} className="contacto">
                    <div>
                      <p className="meta">{c.channel === 'EMAIL' ? 'Mail' : 'Teléfono'}</p>
                      {c.value}
                    </div>
                    <details>
                      <summary>Corregir</summary>
                      <form action={corregir} className="fila">
                        <input type="hidden" name="parte" value={id} />
                        <input type="hidden" name="contacto" value={c.id} />
                        <input
                          name="valor"
                          type={c.channel === 'EMAIL' ? 'email' : 'tel'}
                          defaultValue={c.value}
                          required
                          maxLength={120}
                          aria-label={c.channel === 'EMAIL' ? 'Mail corregido' : 'Teléfono corregido'}
                        />
                        <BotonEnviar className="boton--chico">Guardar</BotonEnviar>
                      </form>
                    </details>
                    <form action={quitar}>
                      <input type="hidden" name="parte" value={id} />
                      <input type="hidden" name="contacto" value={c.id} />
                      <BotonEnviar className="boton--secundario boton--chico">Dar de baja</BotonEnviar>
                    </form>
                  </li>
                ))}
              </ul>
            )}
            <form action={agregar} className="contacto-nuevo">
              <input type="hidden" name="parte" value={id} />
              <div className="campo">
                <label htmlFor="canal">Agregar</label>
                <select id="canal" name="canal" defaultValue="PHONE">
                  <option value="PHONE">Teléfono</option>
                  <option value="EMAIL">Mail</option>
                </select>
              </div>
              <div className="campo">
                <label htmlFor="valor">Número o dirección</label>
                <input id="valor" name="valor" required maxLength={120} placeholder="261 555 0101" />
              </div>
              <BotonEnviar>Agregar</BotonEnviar>
            </form>
          </section>
          </div>

          {/* Navegación organizacional de §63: empresa → contactos y contacto → empresas. */}
          <div>
            {esEmpresa || vista.contacts.length > 0 ? (
              <section className="tarjeta">
                <h2>Contactos</h2>
                {vista.contacts.length === 0 ? (
                  <p className="meta">Ninguno.</p>
                ) : (
                  <ul className="lista">
                    {vista.contacts.map((miembro) => (
                      <li key={miembro.partyId}>
                        <Link href={`/parte/${miembro.partyId}`}>{miembro.displayName}</Link>
                        <p className="meta">
                          {[miembro.roleOrPosition, miembro.isPrimary === true ? 'principal' : null]
                            .filter((dato) => dato !== null)
                            .join(' · ')}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            ) : null}
            {!esEmpresa || vista.organizations.length > 0 ? (
              <section className="tarjeta">
                <h2>Empresas</h2>
                {vista.organizations.length === 0 ? (
                  <p className="meta">Ninguna.</p>
                ) : (
                  <ul className="lista">
                    {vista.organizations.map((miembro) => (
                      <li key={miembro.partyId}>
                        <Link className="nombre" href={`/parte/${miembro.partyId}`}>
                          {miembro.displayName}
                        </Link>
                        {miembro.roleOrPosition === null ? null : <p className="meta">{miembro.roleOrPosition}</p>}
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            ) : null}
          </div>
        </div>
      ) : null}

      {seccion === 'polizas' ? (
        <section className="tarjeta">
          <h2>Pólizas</h2>
          {vista.policies.length === 0 ? (
            <p className="meta">Sin pólizas a la fecha consultada.</p>
          ) : (
            <div className="desborde">
              <table>
                <thead>
                  <tr>
                    <th>Póliza</th>
                    <th>Aseguradora</th>
                    <th>Vigencia</th>
                  </tr>
                </thead>
                <tbody>
                  {vista.policies.map((candidato) => (
                    <tr key={candidato.policyId}>
                      <td>
                        <Link href={`/poliza/${candidato.policyId}`}>{candidato.policyNumber}</Link>
                      </td>
                      <td>{candidato.insurer.name}</td>
                      <td>
                        {candidato.currentVersion === null
                          ? 'Sin versión vigente a la fecha consultada'
                          : `${fecha(candidato.currentVersion.termStartDate)} → ${fecha(candidato.currentVersion.termEndDate)}`}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      ) : null}

      {/* C4-03b: los riesgos de Risk OS, sólo en una empresa, sin esperar a Risk OS. */}
      {seccion === 'riesgos' ? (
        <section className="tarjeta">
          <h2>Riesgos</h2>
          <Suspense fallback={<p className="meta">Consultando Risk OS…</p>}>
            <Riesgos principal={principal} partyId={id} />
          </Suspense>
        </section>
      ) : null}

      {seccion === 'gestiones' ? (
        <section className="tarjeta">
          <h2>Gestiones</h2>
          {susGestiones.length === 0 ? (
            <p className="meta">Este cliente no tiene gestiones.</p>
          ) : (
            <div className="desborde">
              <table>
                <thead>
                  <tr>
                    <th>Gestión</th>
                    <th>Tipo</th>
                    <th>Estado</th>
                    <th>Responsable</th>
                    <th>Vence</th>
                  </tr>
                </thead>
                <tbody>
                  {susGestiones.map((g) => (
                    <tr key={g.id}>
                      <td>
                        <Link href={`/gestiones/${g.id}`}>{g.title}</Link>
                      </td>
                      <td>{TIPOS_DE_GESTION[g.kind]}</td>
                      <td>{ESTADOS_DE_GESTION[g.status]}</td>
                      <td>{g.assignedToMe ? 'vos' : (g.assignedEmail ?? '—')}</td>
                      <td className={g.dueDate !== null && g.dueDate < asOf && g.status !== 'CERRADA' ? 'pendiente' : undefined}>
                        {fecha(g.dueDate)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      ) : null}

      {seccion === 'tareas' ? (
        <section className="tarjeta">
          <h2>Tareas</h2>
          {susTareas.length === 0 ? (
            <p className="meta">Este cliente no tiene tareas.</p>
          ) : (
            <div className="desborde">
              <table>
                <thead>
                  <tr>
                    <th>Tarea</th>
                    <th>Estado</th>
                    <th>Vence</th>
                  </tr>
                </thead>
                <tbody>
                  {susTareas.map((t) => (
                    <tr key={t.id}>
                      <td>
                        <Link href={`/tareas/${t.id}`}>{t.title}</Link>
                      </td>
                      <td className={t.status === 'TRABADA' ? 'pendiente' : undefined}>{ESTADOS_DE_TAREA[t.status]}</td>
                      <td className={t.dueDate !== null && t.dueDate < asOf && t.status !== 'HECHA' ? 'pendiente' : undefined}>
                        {fecha(t.dueDate)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      ) : null}

      {seccion === 'comunicacion' ? (
        <section className="tarjeta">
          <h2>WhatsApp</h2>
          {susConversaciones.length === 0 ? (
            <p className="meta">
              No hay conversaciones de WhatsApp con los teléfonos cargados de este cliente. Las de un teléfono que no está cargado quedan en
              Comunicación, como «Sin identificar».
            </p>
          ) : (
            <div className="desborde">
              <table>
                <thead>
                  <tr>
                    <th>Contacto</th>
                    <th>Último mensaje</th>
                    <th>Respuesta</th>
                  </tr>
                </thead>
                <tbody>
                  {susConversaciones.map((c) => (
                    <tr key={c.id}>
                      <td className="nombre">
                        <Link href={`/comunicacion/${String(c.id)}`}>{contacto(c)}</Link>
                      </td>
                      <td>{instante(c.lastMessageAt)}</td>
                      <td>
                        {c.window.open && c.window.closesAt !== null ? `Hasta ${instante(c.window.closesAt)}` : <span className="meta">Ventana cerrada</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      ) : null}
    </main>
  )
}
