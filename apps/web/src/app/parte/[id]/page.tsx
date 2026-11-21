import {
  ESTADOS_DE_GESTION,
  ESTADOS_DE_TAREA,
  TIPOS_DE_GESTION,
  bloqueosDeContacto,
  contactosDeCliente,
  conversacionesDeCliente,
  describirBloqueos,
  gestiones,
  latestBatch,
  party,
  tareas,
} from '@del-campo/api'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'

import { Cabecera } from '@/app/_componentes/Cabecera'
import { CampoEditable, EliminarConDialogo, NombreEditable } from '@/app/_componentes/Edicion'
import { Riesgos } from '@/app/_componentes/Riesgos'
import { fechaDeHoy } from '@/lib/criterios'
import { contacto } from '@/app/comunicacion/etiquetas'
import { fecha, instante } from '@/lib/formato'
import { consultar, requireAdmitted } from '@/lib/sesion'

import { eliminar, guardarDni, guardarNombre } from './acciones'
import { AsociarEmpresa, FilaDeContacto, NuevoContacto } from './Contactos'

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
  const asOf = fechaDeHoy()
  const [lote, vista, susGestiones, susTareas, susConversaciones, susContactos, bloqueos] = await consultar(
    Promise.all([
      latestBatch(principal),
      party(principal, id, asOf, new Date().toISOString()),
      gestiones(principal, { onlyMine: false, includeClosed: true, partyId: id }),
      tareas(principal, { onlyMine: false, includeDone: true, partyId: id }),
      conversacionesDeCliente(principal, id),
      contactosDeCliente(principal, id),
      bloqueosDeContacto(principal, id),
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
          <EliminarConDialogo
            boton="Eliminar contacto"
            titulo={bloqueos.length > 0 ? 'No se puede eliminar este contacto' : `¿Eliminar a ${vista.displayName}?`}
            accion={eliminar}
            ocultos={{ parte: vista.partyId }}
            bloqueo={bloqueos.length > 0 ? `${describirBloqueos(bloqueos)} Para eliminarlo no tiene que tener pólizas, gestiones ni tareas, en ningún estado.` : null}
          >
            <p>
              Se borran {vista.displayName}, sus teléfonos, mails y vínculos con empresas. La eliminación es definitiva y no se puede
              deshacer.
            </p>
          </EliminarConDialogo>
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
              {esEmpresa ? (
                <>
                  <dt>Razón social</dt>
                  <dd className="nombre">{vista.displayName}</dd>
                </>
              ) : (
                <NombreEditable
                  nombre={vista.firstName ?? ''}
                  apellido={vista.lastName ?? ''}
                  accion={guardarNombre}
                  ocultos={{ parte: vista.partyId }}
                >
                  {vista.displayName}
                </NombreEditable>
              )}
              {vista.cuit === null ? null : (
                <>
                  <dt>CUIT</dt>
                  <dd>{vista.cuit}</dd>
                </>
              )}
              {esEmpresa ? null : (
                <CampoEditable etiqueta="DNI" valor={vista.dni ?? ''} accion={guardarDni} ocultos={{ parte: vista.partyId }}>
                  {vista.dni ?? '—'}
                </CampoEditable>
              )}
              <dt>Carpeta de Google Drive</dt>
              <dd>
                {vista.driveFolderUrl === null ? (
                  '—'
                ) : (
                  <a href={vista.driveFolderUrl} target="_blank" rel="noreferrer">
                    Abrir carpeta
                  </a>
                )}
              </dd>
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
            <div className="encabezado-tarjeta">
              <h2>Teléfonos y mails</h2>
              <NuevoContacto parte={vista.partyId} />
            </div>
            {susContactos.length === 0 ? (
              <p className="meta">Ninguno cargado. Con el teléfono cargado, sus conversaciones de WhatsApp aparecen en esta ficha.</p>
            ) : (
              <ul className="lista">
                {susContactos.map((c) => (
                  <FilaDeContacto key={c.id} parte={vista.partyId} contacto={c} />
                ))}
              </ul>
            )}
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
                <div className="encabezado-tarjeta">
                  <h2>Empresas</h2>
                  {esEmpresa ? null : <AsociarEmpresa parte={vista.partyId} />}
                </div>
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
