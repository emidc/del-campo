import { latestBatch, policy } from '@del-campo/api'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { AccesoDocumental } from '@/app/_componentes/AccesoDocumental'
import { Cabecera } from '@/app/_componentes/Cabecera'
import { fechaDeHoy } from '@/lib/criterios'
import { estadoDePoliza, estadoDocumental, fecha } from '@/lib/formato'
import { consultar, requireAdmitted } from '@/lib/sesion'

export const dynamic = 'force-dynamic'

const guion = (valor: string | null): string => (valor === null || valor === '' ? '—' : valor)

export default async function PolizaPage({
  params,
}: {
  readonly params: Promise<{ readonly id: string }>
}) {
  const principal = await requireAdmitted()
  const { id } = await params
  const asOf = fechaDeHoy()
  const [lote, vista] = await consultar(Promise.all([latestBatch(principal), policy(principal, id, asOf)]))
  if (vista === null) notFound()

  const { detail, access } = vista
  const vigente = detail.currentVersion
  /** Prima y modo de renovación están en el historial: se toman de la versión vigente o, si no hay, de la más reciente. */
  const ultima = detail.history.find((h) => h.id === vigente?.id) ?? detail.history[0]

  return (
    <main className="envoltorio">
      <Cabecera lote={lote} email={principal.email} />

      <nav className="migas" aria-label="Migas de pan">
        <Link href="/buscar">Pólizas</Link>
        <span aria-hidden="true">›</span>
        <span>Póliza {detail.policyNumber}</span>
      </nav>
      <header className="encabezado">
        <div>
          <p className="antetitulo">Póliza · {detail.insurer.name}</p>
          <h1>Póliza {detail.policyNumber}</h1>
          <div className="chips">
            {vigente === null ? null : (
              <>
                <span className="chip">{estadoDePoliza(vigente.status)}</span>
                <span className="chip">
                  {fecha(vigente.termStartDate)} → {fecha(vigente.termEndDate)}
                </span>
              </>
            )}
          </div>
        </div>
        <div className="fila">
          <Link className="boton boton--secundario" href={`/tareas/nueva?poliza=${detail.policyId}`}>
            Nueva tarea
          </Link>
          <Link className="boton" href={`/gestiones/nueva?poliza=${detail.policyId}`}>
            Nueva gestión
          </Link>
        </div>
      </header>

      <div className="grid-2">
        <section className="tarjeta">
          <h2>Datos</h2>
          <dl className="kv">
            <dt>Tomador</dt>
            <dd className="nombre">
              {detail.holder === null ? (
                'Sin tomador en la versión vigente'
              ) : (
                <Link href={`/parte/${detail.holder.partyId}`}>{detail.holder.displayName}</Link>
              )}
            </dd>
            <dt>Aseguradora</dt>
            <dd>{detail.insurer.name}</dd>
            {vigente === null ? null : (
              <>
                <dt>Vigencia</dt>
                <dd>
                  {fecha(vigente.termStartDate)} → {fecha(vigente.termEndDate)}
                </dd>
                <dt>Estado</dt>
                <dd>{estadoDePoliza(vigente.status)}</dd>
              </>
            )}
            {ultima === undefined ? null : (
              <>
                <dt>Prima</dt>
                <dd>{ultima.premium === null ? '—' : `${ultima.premium} ${ultima.currency ?? ''}`.trim()}</dd>
                <dt>Renovación</dt>
                <dd>{ultima.renewalMode === 'AUTOMATIC' ? 'Automática' : 'Manual'}</dd>
              </>
            )}
            {detail.renewedFromPolicyId === null ? null : (
              <>
                <dt>Renueva a</dt>
                <dd>
                  <Link href={`/poliza/${detail.renewedFromPolicyId}`}>La póliza anterior</Link>
                </dd>
              </>
            )}
          </dl>
          <p className="meta">
            <Link href={`/gestiones?poliza=${detail.policyId}`}>Gestiones de esta póliza</Link>
          </p>
        </section>

        <section className="tarjeta">
          <h2>Documentos</h2>
          <AccesoDocumental acceso={access} />
          <p className="meta">Los enlaces abren Drive con tu propia sesión de Google. Si un destino no abre, el acceso se resuelve en Drive.</p>
        </section>
      </div>

      <h2>Historial de versiones</h2>
      <div className="desborde">
        <table>
          <thead>
            <tr>
              <th>Versión</th>
              <th>Vigencia del período</th>
              <th>Tomador</th>
              <th>Estado</th>
              <th>Prima</th>
              <th>Renovación</th>
              <th>Endoso</th>
            </tr>
          </thead>
          <tbody>
            {detail.history.map((entrada) => (
              <tr key={entrada.id}>
                <td>{entrada.versionNumber}</td>
                <td>
                  {fecha(entrada.termStartDate)} → {fecha(entrada.termEndDate)}
                </td>
                <td>{entrada.holder.displayName}</td>
                <td>{estadoDePoliza(entrada.status)}</td>
                <td>
                  {entrada.premium === null
                    ? '—'
                    : `${entrada.premium} ${entrada.currency ?? ''}`.trim()}
                </td>
                <td>{entrada.renewalMode === 'AUTOMATIC' ? 'Automática' : 'Manual'}</td>
                <td>
                  {entrada.endorsement === null
                    ? '—'
                    : `${entrada.endorsement.kind}${
                        entrada.endorsement.number === null
                          ? ''
                          : ` ${entrada.endorsement.number}`
                      }`}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2>Vínculos documentales registrados</h2>
      {detail.documents.length === 0 ? (
        <p className="estado">
          No hay vínculos registrados para esta póliza. La póliza se muestra igual: la
          falta de vínculo no la oculta (INV-019).
        </p>
      ) : (
        <div className="desborde">
          <table>
            <thead>
              <tr>
                <th>Tipo</th>
                <th>Clase de documento</th>
                <th>Conciliación</th>
                <th>Visto por última vez</th>
              </tr>
            </thead>
            <tbody>
              {detail.documents.map((documento) => (
                <tr key={documento.id}>
                  <td>{documento.driveItemType === 'FILE' ? 'Archivo' : 'Carpeta'}</td>
                  <td>{guion(documento.documentKind)}</td>
                  <td>{estadoDocumental(documento.reconciliationStatus)}</td>
                  <td>{fecha(documento.lastSeenAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <h2>Referencias del origen sin resolver</h2>
      {detail.documentReferences.length === 0 ? (
        <p className="meta">Ninguna.</p>
      ) : (
        <div className="desborde">
          <table>
            <thead>
              <tr>
                <th>Origen</th>
                <th>Entidad</th>
                <th>Estado</th>
                <th>Motivo</th>
              </tr>
            </thead>
            <tbody>
              {detail.documentReferences.map((referencia) => (
                <tr key={referencia.id}>
                  <td>{referencia.sourceSystem}</td>
                  <td>{referencia.sourceEntityType}</td>
                  <td>{estadoDocumental(referencia.resolutionStatus)}</td>
                  <td>{guion(referencia.unresolvedReason)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  )
}
