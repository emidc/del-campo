import { effectiveStatus, latestBatch, policy, todayInMendoza } from '@del-campo/api'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { AccesoDocumental } from '@/app/_componentes/AccesoDocumental'
import { Cabecera } from '@/app/_componentes/Cabecera'
import { CampoEditable, EliminarConDialogo } from '@/app/_componentes/Edicion'
import { fechaDeHoy } from '@/lib/criterios'
import { estadoDePoliza, estadoDocumental, fecha, importe, importeEditable, tipoDeEndoso } from '@/lib/formato'
import { consultar, requireAdmitted } from '@/lib/sesion'

import { editarCampo, eliminar } from '../acciones'

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
  /**
   * Los datos están en el historial: se toman de la versión vigente o, si no hay (una
   * renovación que todavía no empezó), de la más reciente.
   */
  const actual = detail.history.find((h) => h.id === detail.currentVersion?.id) ?? detail.history[0]
  const hoy = todayInMendoza()
  const estado = actual === undefined ? null : estadoDePoliza(effectiveStatus(actual.status, actual.termEndDate, hoy))
  /** Sólo la versión abierta se edita: las cerradas son historia. */
  const editable = actual?.effectiveTo === null
  const ocultos = (campo: string) => ({ poliza: detail.policyId, campo })

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
            {actual === undefined ? null : (
              <>
                <span className="chip">{estado}</span>
                <span className="chip">
                  {fecha(actual.termStartDate)} → {fecha(actual.termEndDate)}
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
          <EliminarConDialogo
            boton="Eliminar póliza"
            titulo={`¿Eliminar la póliza ${detail.policyNumber}?`}
            accion={eliminar}
            ocultos={{ poliza: detail.policyId }}
          >
            <p>
              Se borran la póliza {detail.policyNumber} de {detail.insurer.name}, su historial de versiones y sus endosos. La
              eliminación es definitiva y no se puede deshacer.
            </p>
          </EliminarConDialogo>
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
            {editable ? (
              <CampoEditable etiqueta="Número de póliza" valor={detail.policyNumber} accion={editarCampo} ocultos={ocultos('numero')}>
                {detail.policyNumber}
              </CampoEditable>
            ) : null}
            <dt>Aseguradora</dt>
            <dd>{detail.insurer.name}</dd>
            {actual === undefined ? null : editable ? (
              <>
                <CampoEditable etiqueta="Inicio de vigencia" tipo="date" valor={actual.termStartDate} accion={editarCampo} ocultos={ocultos('inicio')}>
                  {fecha(actual.termStartDate)}
                </CampoEditable>
                <CampoEditable etiqueta="Fin de vigencia" tipo="date" valor={actual.termEndDate} accion={editarCampo} ocultos={ocultos('fin')}>
                  {fecha(actual.termEndDate)}
                </CampoEditable>
                <dt>Estado</dt>
                <dd>{estado}</dd>
                <CampoEditable etiqueta="Productor" valor={actual.producer ?? ''} accion={editarCampo} ocultos={ocultos('productor')}>
                  {actual.producer ?? '—'}
                </CampoEditable>
                <CampoEditable etiqueta="Tipo de riesgo" valor={actual.productReference ?? ''} accion={editarCampo} ocultos={ocultos('tipoRiesgo')}>
                  {actual.productReference ?? '—'}
                </CampoEditable>
                <CampoEditable etiqueta="Prima" tipo="importe" valor={importeEditable(actual.premium)} accion={editarCampo} ocultos={ocultos('prima')}>
                  {importe(actual.premium, actual.currency)}
                </CampoEditable>
                <CampoEditable etiqueta="Premio" tipo="importe" valor={importeEditable(actual.totalPremium)} accion={editarCampo} ocultos={ocultos('premio')}>
                  {importe(actual.totalPremium, actual.currency)}
                </CampoEditable>
                <CampoEditable
                  etiqueta="Suma asegurada"
                  tipo="importe"
                  valor={importeEditable(actual.sumInsured)}
                  accion={editarCampo}
                  ocultos={ocultos('sumaAsegurada')}
                >
                  {importe(actual.sumInsured, actual.currency)}
                </CampoEditable>
                <CampoEditable etiqueta="Moneda" valor={actual.currency ?? ''} accion={editarCampo} ocultos={ocultos('moneda')}>
                  {actual.currency ?? '—'}
                </CampoEditable>
                <CampoEditable etiqueta="Forma de pago" valor={actual.paymentMethod ?? ''} accion={editarCampo} ocultos={ocultos('formaPago')}>
                  {actual.paymentMethod ?? '—'}
                </CampoEditable>
                <CampoEditable
                  etiqueta="Renovación"
                  tipo="select"
                  valor={actual.renewalMode}
                  opciones={[
                    { valor: 'MANUAL', etiqueta: 'Manual' },
                    { valor: 'AUTOMATIC', etiqueta: 'Automática' },
                  ]}
                  accion={editarCampo}
                  ocultos={ocultos('renovacion')}
                >
                  {actual.renewalMode === 'AUTOMATIC' ? 'Automática' : 'Manual'}
                </CampoEditable>
              </>
            ) : (
              <>
                <dt>Vigencia</dt>
                <dd>
                  {fecha(actual.termStartDate)} → {fecha(actual.termEndDate)}
                </dd>
                <dt>Estado</dt>
                <dd>{estado}</dd>
                <dt>Productor</dt>
                <dd>{actual.producer ?? '—'}</dd>
                <dt>Tipo de riesgo</dt>
                <dd>{actual.productReference ?? '—'}</dd>
                <dt>Prima</dt>
                <dd>{importe(actual.premium, actual.currency)}</dd>
                <dt>Premio</dt>
                <dd>{importe(actual.totalPremium, actual.currency)}</dd>
                <dt>Suma asegurada</dt>
                <dd>{importe(actual.sumInsured, actual.currency)}</dd>
                <dt>Forma de pago</dt>
                <dd>{actual.paymentMethod ?? '—'}</dd>
                <dt>Renovación</dt>
                <dd>{actual.renewalMode === 'AUTOMATIC' ? 'Automática' : 'Manual'}</dd>
              </>
            )}
            {detail.renewedFrom === null ? null : (
              <>
                <dt>Renueva a</dt>
                <dd>
                  <Link href={`/poliza/${detail.renewedFrom.policyId}`}>{detail.renewedFrom.policyNumber}</Link>
                </dd>
              </>
            )}
            {detail.renewedBy === null ? null : (
              <>
                <dt>Renovada por</dt>
                <dd>
                  <Link href={`/poliza/${detail.renewedBy.policyId}`}>{detail.renewedBy.policyNumber}</Link>
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
              <th>Premio</th>
              <th>Renovación</th>
              <th>Endoso</th>
              <th>Tipo de endoso</th>
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
                <td>{estadoDePoliza(entrada.effectiveTo === null ? effectiveStatus(entrada.status, entrada.termEndDate, hoy) : entrada.status)}</td>
                <td>{importe(entrada.premium, entrada.currency)}</td>
                <td>{importe(entrada.totalPremium, entrada.currency)}</td>
                <td>{entrada.renewalMode === 'AUTOMATIC' ? 'Automática' : 'Manual'}</td>
                <td>{entrada.endorsement?.number ?? '—'}</td>
                <td>{tipoDeEndoso(entrada.endorsement?.kind)}</td>
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
