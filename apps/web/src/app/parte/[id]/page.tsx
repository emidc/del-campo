import {
  ESTADOS_DE_GESTION,
  ESTADOS_DE_TAREA,
  ORIGENES_DE_PROSPECTO,
  PROSPECT_ORIGINS,
  TIPOS_DE_GESTION,
  bloqueosDeContacto,
  contactosDeCliente,
  conversacionesDeCliente,
  describirBloqueos,
  estadoDeProspecto,
  gestiones,
  integrantesDelEquipo,
  notasDeCliente,
  latestBatch,
  party,
  responsableDeMensajes,
  tareas,
} from '@del-campo/api'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'

import { Cabecera } from '@/app/_componentes/Cabecera'
import { CampoEditable, EliminarConDialogo, NombreEditable } from '@/app/_componentes/Edicion'
import { Retrato, etiquetasDeIntegrantes } from '@/app/_componentes/Retrato'
import { fechaDeHoy } from '@/lib/criterios'
import { contacto } from '@/app/comunicacion/etiquetas'
import { fecha, instante } from '@/lib/formato'
import { consultar, requireAdmitted } from '@/lib/sesion'

import {
  eliminar,
  guardarCarpeta,
  guardarCuit,
  guardarDni,
  guardarNombre,
  guardarOrigen,
  guardarRazonSocial,
  guardarResponsableDeMensajes,
} from './acciones'
import type { NotaDeFicha } from './Notas'
import { NuevaNota, TarjetaDeNota } from './Notas'
import { SeccionRiesgos } from './SeccionRiesgos'
import { esSubseccion } from './riesgos'
import { AsociarContacto, AsociarEmpresa, ConvertirEnCliente, FilaDeContacto, NuevoContacto, QuitarDeEmpresa } from './Contactos'

export const dynamic = 'force-dynamic'

const SECCIONES = ['resumen', 'polizas', 'riesgos', 'gestiones', 'tareas', 'comunicacion', 'notas'] as const
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
  const unico = (clave: string): string | undefined => {
    const valor = parametros[clave]
    return Array.isArray(valor) ? valor[0] : valor
  }
  const listaPedida = unico('lista')
  const subRiesgos = esSubseccion(listaPedida) ? listaPedida : 'riesgos'
  const itemRiesgo = unico('item') ?? null
  const asOf = fechaDeHoy()
  const [lote, vista, susGestiones, susTareas, susConversaciones, susContactos, bloqueos, prospecto, integrantes, responsableId, susNotas] = await consultar(
    Promise.all([
      latestBatch(principal),
      party(principal, id, asOf, new Date().toISOString()),
      gestiones(principal, { onlyMine: false, includeClosed: true, partyId: id }),
      tareas(principal, { onlyMine: false, includeDone: true, partyId: id }),
      conversacionesDeCliente(principal, id),
      contactosDeCliente(principal, id),
      bloqueosDeContacto(principal, id),
      estadoDeProspecto(principal, id),
      integrantesDelEquipo(principal),
      responsableDeMensajes(principal, id),
      notasDeCliente(principal, id),
    ]),
  )
  if (vista === null) notFound()
  const etiquetasEquipo = etiquetasDeIntegrantes(integrantes)
  const responsable = integrantes.find((i) => i.userId === responsableId)

  const esEmpresa = vista.kind === 'ORGANIZATION'
  const esProspecto = prospecto?.active === true
  const origen = prospecto?.origin ?? null
  const seccion: Seccion = esSeccion(pedida) && (pedida !== 'riesgos' || esEmpresa) ? pedida : 'resumen'
  const gestionesAbiertas = susGestiones.filter((g) => g.status !== 'CERRADA').length
  const tareasPendientes = susTareas.filter((t) => t.status !== 'HECHA').length
  const verArchivadas = unico('archivadas') === '1'
  const notas: NotaDeFicha[] = susNotas.map((n) => ({
    id: n.id,
    titulo: n.title,
    texto: n.body,
    archivada: n.archived,
    meta: [
      n.author ?? 'Sin autor',
      instante(n.createdAt),
      n.source === 'Zoho' ? 'Zoho' : null,
      n.updatedAt === null ? null : `Modificada por ${n.updatedBy ?? 'el equipo'} el ${instante(n.updatedAt)}`,
    ]
      .filter((dato) => dato !== null)
      .join(' · '),
  }))
  const notasActivas = notas.filter((n) => !n.archivada)
  const notasArchivadas = notas.filter((n) => n.archivada)

  const pestanas: readonly (readonly [Seccion, string])[] = [
    ['resumen', 'Resumen'],
    ['polizas', `Pólizas (${String(vista.policies.length)})`],
    ...(esEmpresa ? ([['riesgos', 'Riesgos']] as const) : []),
    ['gestiones', `Gestiones (${String(gestionesAbiertas)})`],
    ['tareas', `Tareas (${String(tareasPendientes)})`],
    ['comunicacion', `WhatsApp (${String(susConversaciones.length)})`],
    ['notas', `Notas (${String(notasActivas.length)})`],
  ]

  return (
    <main className="envoltorio">
      <Cabecera lote={lote} email={principal.email} />

      <nav className="migas" aria-label="Migas de pan">
        {esProspecto ? (
          <Link href="/clientes?tipo=prospectos">Prospectos</Link>
        ) : (
          <Link href={esEmpresa ? '/clientes' : '/clientes?tipo=personas'}>Clientes</Link>
        )}
        <span aria-hidden="true">›</span>
        <span>{vista.displayName}</span>
      </nav>
      <header className="encabezado">
        <div>
          <p className="antetitulo">
            {esProspecto ? 'Prospecto · ' : ''}
            {esEmpresa ? 'Empresa' : 'Persona'}
          </p>
          <h1>{vista.displayName}</h1>
          <div className="chips">
            {vista.cuit === null ? null : <span className="chip">CUIT {vista.cuit}</span>}
            {vista.dni === null ? null : <span className="chip">DNI {vista.dni}</span>}
          </div>
        </div>
        <div className="fila">
          {esProspecto ? <ConvertirEnCliente parte={vista.partyId} /> : null}
          <Link className="boton boton--secundario" href={`/tareas/nueva?parte=${id}`}>
            Nueva tarea
          </Link>
          <Link className="boton" href={`/gestiones/nueva?parte=${id}`}>
            Nueva gestión
          </Link>
          <EliminarConDialogo
            boton={esEmpresa ? 'Eliminar cliente' : 'Eliminar contacto'}
            titulo={
              bloqueos.length > 0
                ? `No se puede eliminar ${esEmpresa ? 'este cliente' : 'este contacto'}`
                : `¿Eliminar a ${vista.displayName}?`
            }
            accion={eliminar}
            ocultos={{ parte: vista.partyId, tipo: esEmpresa ? 'empresa' : 'persona' }}
            bloqueo={bloqueos.length > 0 ? `${describirBloqueos(bloqueos)} Para eliminarlo no tiene que tener pólizas, gestiones ni tareas, en ningún estado.` : null}
          >
            <p>
              {esEmpresa
                ? `Se borran ${vista.displayName}, sus teléfonos, mails y vínculos con contactos. Las fichas de sus contactos siguen en Clientes.`
                : `Se borran ${vista.displayName}, sus teléfonos, mails y vínculos con empresas.`}{' '}
              La eliminación es definitiva y no se puede deshacer.
            </p>
          </EliminarConDialogo>
        </div>
      </header>

      {parametros.convertido === '1' && !esProspecto ? (
        <p className="estado" role="status">
          Ahora es cliente: aparece en {esEmpresa ? 'Empresas' : 'Personas'}.
        </p>
      ) : null}

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
                <CampoEditable
                  etiqueta="Razón social"
                  valor={vista.displayName}
                  accion={guardarRazonSocial}
                  ocultos={{ parte: vista.partyId }}
                >
                  <span className="nombre">{vista.displayName}</span>
                </CampoEditable>
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
              {esEmpresa ? (
                <CampoEditable etiqueta="CUIT" valor={vista.cuit ?? ''} accion={guardarCuit} ocultos={{ parte: vista.partyId }}>
                  {vista.cuit ?? '—'}
                </CampoEditable>
              ) : (
                <CampoEditable etiqueta="DNI" valor={vista.dni ?? ''} accion={guardarDni} ocultos={{ parte: vista.partyId }}>
                  {vista.dni ?? '—'}
                </CampoEditable>
              )}
              <CampoEditable
                etiqueta="Carpeta de Google Drive"
                tipo="url"
                valor={vista.driveFolderUrl ?? ''}
                accion={guardarCarpeta}
                ocultos={{ parte: vista.partyId }}
              >
                {vista.driveFolderUrl === null ? (
                  '—'
                ) : (
                  <a href={vista.driveFolderUrl} target="_blank" rel="noreferrer">
                    Abrir carpeta
                  </a>
                )}
              </CampoEditable>
              {esProspecto ? (
                <CampoEditable
                  etiqueta="Origen"
                  tipo="select"
                  valor={origen ?? ''}
                  opciones={PROSPECT_ORIGINS.map((o) => ({ valor: o, etiqueta: ORIGENES_DE_PROSPECTO[o] }))}
                  accion={guardarOrigen}
                  ocultos={{ parte: vista.partyId }}
                >
                  {origen === null ? '—' : ORIGENES_DE_PROSPECTO[origen]}
                </CampoEditable>
              ) : origen === null ? null : (
                <>
                  <dt>Origen</dt>
                  <dd>{ORIGENES_DE_PROSPECTO[origen]}</dd>
                </>
              )}
              <CampoEditable
                etiqueta="Responsable de mensajes"
                tipo="select"
                valor={responsable?.userId ?? ''}
                opciones={[
                  { valor: '', etiqueta: 'Sin asignar (avisa a Victoria)' },
                  ...integrantes.map((i) => ({ valor: i.userId, etiqueta: etiquetasEquipo.get(i) ?? i.name })),
                ]}
                accion={guardarResponsableDeMensajes}
                ocultos={{ parte: vista.partyId }}
              >
                {responsable === undefined ? (
                  <span className="meta">Sin asignar: los avisos de WhatsApp le llegan a Victoria</span>
                ) : (
                  <span className="persona">
                    <Retrato usuario={responsable.userId} nombre={responsable.name} conFoto={responsable.hasPhoto} />
                    <span>{responsable.name}</span>
                  </span>
                )}
              </CampoEditable>
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
                <div className="encabezado-tarjeta">
                  <h2>Contactos</h2>
                  {esEmpresa ? <AsociarContacto parte={vista.partyId} /> : null}
                </div>
                {vista.contacts.length === 0 ? (
                  <p className="meta">Ninguno.</p>
                ) : (
                  <ul className="lista">
                    {vista.contacts.map((miembro) => (
                      <li key={miembro.partyId} className="editable">
                        <span className="editable__valor">
                          <Link href={`/parte/${miembro.partyId}`}>{miembro.displayName}</Link>
                          {esEmpresa ? (
                            <QuitarDeEmpresa
                              empresa={vista.partyId}
                              empresaNombre={vista.displayName}
                              persona={miembro.partyId}
                              personaNombre={miembro.displayName}
                            />
                          ) : null}
                        </span>
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

      {/* T-0061: las listas de riesgos de la empresa, desde la base de Broker OS. */}
      {seccion === 'riesgos' ? (
        <section className="tarjeta">
          <h2>Riesgos</h2>
          <Suspense fallback={<p className="meta">Cargando riesgos…</p>}>
            <SeccionRiesgos principal={principal} partyId={id} sub={subRiesgos} itemId={itemRiesgo} />
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

      {seccion === 'notas' ? (
        <section className="tarjeta">
          <div className="encabezado-tarjeta">
            <h2>Notas</h2>
            <NuevaNota parte={vista.partyId} />
          </div>
          {notasActivas.length === 0 ? (
            <p className="meta">No hay notas activas.</p>
          ) : (
            <ul className="lista">
              {notasActivas.map((n) => (
                <TarjetaDeNota key={n.id} parte={vista.partyId} nota={n} />
              ))}
            </ul>
          )}
          {notasArchivadas.length === 0 ? null : verArchivadas ? (
            <>
              <div className="encabezado-tarjeta notas-archivadas">
                <h3>Archivadas ({notasArchivadas.length})</h3>
                <Link href={`/parte/${id}?seccion=notas`}>Ocultar notas archivadas</Link>
              </div>
              <ul className="lista">
                {notasArchivadas.map((n) => (
                  <TarjetaDeNota key={n.id} parte={vista.partyId} nota={n} />
                ))}
              </ul>
            </>
          ) : (
            <p className="notas-archivadas">
              <Link href={`/parte/${id}?seccion=notas&archivadas=1`}>Ver notas archivadas ({notasArchivadas.length})</Link>
            </p>
          )}
        </section>
      ) : null}
    </main>
  )
}
