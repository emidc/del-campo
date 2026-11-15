import {
  ESTADOS_DE_GESTION,
  ESTADOS_DE_TAREA,
  TIPOS_DE_GESTION,
  gestiones,
  latestBatch,
  party,
  tareas,
} from '@del-campo/api'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'

import { Cabecera } from '@/app/_componentes/Cabecera'
import { Riesgos } from '@/app/_componentes/Riesgos'
import { fechaDeHoy } from '@/lib/criterios'
import { consultar, requireAdmitted } from '@/lib/sesion'

export const dynamic = 'force-dynamic'

const SECCIONES = ['resumen', 'polizas', 'riesgos', 'gestiones', 'tareas'] as const
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
  const crudo = (await searchParams).seccion
  const pedida = Array.isArray(crudo) ? crudo[0] : crudo
  const asOf = fechaDeHoy()
  const [lote, vista, susGestiones, susTareas] = await consultar(
    Promise.all([
      latestBatch(principal),
      party(principal, id, asOf, `${asOf}T12:00:00Z`),
      gestiones(principal, { onlyMine: false, includeClosed: true, partyId: id }),
      tareas(principal, { onlyMine: false, includeDone: true, partyId: id }),
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
  ]

  return (
    <main className="envoltorio">
      <Cabecera lote={lote} email={principal.email} />

      <nav className="migas" aria-label="Migas de pan">
        <Link href="/buscar">Clientes y pólizas</Link>
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
                          : `${candidato.currentVersion.termStartDate} → ${candidato.currentVersion.termEndDate}`}
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
                        {g.dueDate ?? '—'}
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
                        {t.dueDate ?? '—'}
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
