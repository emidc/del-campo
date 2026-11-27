import {
  automotoresDePoliza,
  cancelOption,
  cuotasDePoliza,
  effectiveStatus,
  latestBatch,
  policy,
  riskTypeHasVehicles,
  tieneCuotas,
  todayInMendoza,
} from '@del-campo/api'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { Cabecera } from '@/app/_componentes/Cabecera'
import { FilaDeAutomotorEnPoliza, SumarAutomotor } from '@/app/_automotores/Automotores'
import { Cuotas } from '@/app/_cuotas/Cuotas'
import { CampoEditable, EliminarConDialogo } from '@/app/_componentes/Edicion'
import { fechaDeHoy } from '@/lib/criterios'
import { estadoDePoliza, estadoDocumental, fecha, importe, importeEditable, tipoDeEndoso } from '@/lib/formato'
import { consultar, requireAdmitted } from '@/lib/sesion'

import { anular, editarCampo, eliminar } from '../acciones'

import { EditarEndoso } from './EditarEndoso'
import { EstadoAnulable } from './EstadoAnulable'

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
  const [lote, vista, automotores, cuotas] = await consultar(
    Promise.all([latestBatch(principal), policy(principal, id, asOf), automotoresDePoliza(principal, id), cuotasDePoliza(principal, id)]),
  )
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
  /** Anular una Vigente o deshacer una Anulada, sobre el estado: sólo con fin de vigencia futuro. */
  const opcion = actual !== undefined && editable ? cancelOption(actual.status, actual.termEndDate, hoy) : null
  const ocultos = (campo: string) => ({ poliza: detail.policyId, campo })
  /** El documento de la póliza: el que cargó el equipo o, si no hay, el que informó Zoho. */
  const documento =
    detail.driveUrl !== null
      ? { url: detail.driveUrl, segunZoho: false }
      : access.document === null
        ? null
        : { url: access.document.url, segunZoho: access.document.level === 'ZOHO_UNVERIFIED' }

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

      <section className="tarjeta datos-poliza">
        <h2>Datos</h2>
        <div className="datos-tarea datos-tarea--dos">
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
            ) : (
              <>
                <dt>Número de póliza</dt>
                <dd>{detail.policyNumber}</dd>
              </>
            )}
            <dt>Aseguradora</dt>
            <dd>{detail.insurer.name}</dd>
            <CampoEditable etiqueta="Póliza de Google Drive" tipo="url" valor={documento?.url ?? ''} accion={editarCampo} ocultos={ocultos('drive')}>
              {documento === null ? (
                '—'
              ) : (
                <a href={documento.url} target="_blank" rel="noreferrer">
                  {documento.segunZoho ? 'Abrir póliza (según Zoho)' : 'Abrir póliza'}
                </a>
              )}
            </CampoEditable>
            {actual === undefined ? null : editable ? (
              <>
                <CampoEditable etiqueta="Inicio de vigencia" tipo="date" valor={actual.termStartDate} accion={editarCampo} ocultos={ocultos('inicio')}>
                  {fecha(actual.termStartDate)}
                </CampoEditable>
                <CampoEditable etiqueta="Fin de vigencia" tipo="date" valor={actual.termEndDate} accion={editarCampo} ocultos={ocultos('fin')}>
                  {fecha(actual.termEndDate)}
                </CampoEditable>
              </>
            ) : (
              <>
                <dt>Inicio de vigencia</dt>
                <dd>{fecha(actual.termStartDate)}</dd>
                <dt>Fin de vigencia</dt>
                <dd>{fecha(actual.termEndDate)}</dd>
              </>
            )}
            <dt>Estado</dt>
            <dd>
              <EstadoAnulable poliza={detail.policyId} numero={detail.policyNumber} opcion={opcion} accion={anular}>
                {estado ?? '—'}
              </EstadoAnulable>
            </dd>
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
          {actual === undefined ? null : editable ? (
            <dl className="kv">
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
            </dl>
          ) : (
            <dl className="kv">
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
              <dt>Moneda</dt>
              <dd>{actual.currency ?? '—'}</dd>
              <dt>Forma de pago</dt>
              <dd>{actual.paymentMethod ?? '—'}</dd>
              <dt>Renovación</dt>
              <dd>{actual.renewalMode === 'AUTOMATIC' ? 'Automática' : 'Manual'}</dd>
            </dl>
          )}
        </div>
        <p className="meta">
          <Link href={`/gestiones?poliza=${detail.policyId}`}>Gestiones de esta póliza</Link> · Los enlaces abren Drive con tu propia sesión de Google.
        </p>
      </section>

      {actual !== undefined && cuotas !== null && tieneCuotas(actual.paymentMethod, actual.productReference) ? (
        <Cuotas
          key={cuotas.cuotas.map((c) => `${String(c.number)}${c.dueDate}${c.amount ?? ''}${String(c.paid)}`).join('|')}
          poliza={detail.policyId}
          numero={detail.policyNumber}
          cuotas={cuotas.cuotas}
          premio={actual.totalPremium}
          moneda={actual.currency}
          fueraDeVigencia={cuotas.fueraDeVigencia}
        />
      ) : null}

      {riskTypeHasVehicles(actual?.productReference ?? null) ? (
        <section className="tarjeta" id="automotores">
          <div className="encabezado-tarjeta">
            <h2>Automotores</h2>
            {detail.holder === null ? null : (
              <SumarAutomotor poliza={detail.policyId} tomador={detail.holder.partyId} delTomador={automotores.delTomador} />
            )}
          </div>
          {automotores.enLaPoliza.length === 0 ? (
            <p className="meta">Ninguno en esta póliza. Con el + se elige uno del tomador o se carga uno nuevo.</p>
          ) : (
            <ul className="lista">
              {automotores.enLaPoliza.map((a) => (
                <FilaDeAutomotorEnPoliza key={a.id} poliza={detail.policyId} automotor={a} />
              ))}
            </ul>
          )}
        </section>
      ) : null}

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
              <th>Documento</th>
              <th aria-label="Acciones" />
            </tr>
          </thead>
          <tbody>
            {detail.history.map((entrada) => (
              <tr key={entrada.id} className={entrada.endorsement === null ? undefined : 'fila-editable'}>
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
                <td>
                  {entrada.endorsement?.driveUrl == null ? (
                    '—'
                  ) : (
                    <a href={entrada.endorsement.driveUrl} target="_blank" rel="noreferrer">
                      Abrir endoso
                    </a>
                  )}
                </td>
                <td className="celda-lapiz">
                  {entrada.endorsement === null ? null : (
                    <EditarEndoso
                      poliza={detail.policyId}
                      endoso={entrada.endorsement.id}
                      numero={entrada.endorsement.number ?? ''}
                      drive={entrada.endorsement.driveUrl ?? ''}
                      rigeDesde={entrada.endorsement.effectiveFrom ?? entrada.effectiveFrom}
                      condiciones={
                        entrada.effectiveTo !== null
                          ? null
                          : {
                              inicio: entrada.termStartDate,
                              fin: entrada.termEndDate,
                              prima: importeEditable(entrada.premium),
                              premio: importeEditable(entrada.totalPremium),
                              suma: importeEditable(entrada.sumInsured),
                              moneda: entrada.currency ?? '',
                              productor: entrada.producer ?? '',
                              riesgo: entrada.productReference ?? '',
                              pago: entrada.paymentMethod ?? '',
                              renovacion: entrada.renewalMode,
                            }
                      }
                    />
                  )}
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
