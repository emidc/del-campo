import { latestBatch, policy } from '@del-campo/api'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { AccesoDocumental } from '@/app/_componentes/AccesoDocumental'
import { Cabecera } from '@/app/_componentes/Cabecera'
import { fechaDeHoy } from '@/lib/criterios'
import { requireAdmitted } from '@/lib/sesion'

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
  const [lote, vista] = await Promise.all([latestBatch(), policy(principal, id, asOf)])
  if (vista === null) notFound()

  const { detail, access } = vista

  return (
    <main className="envoltorio">
      <Cabecera lote={lote} email={principal.email} />

      <p className="meta">
        <Link href="/buscar">← Volver a la búsqueda</Link>
      </p>

      <h1 style={{ fontSize: '1.3rem', margin: '0 0 0.2rem' }}>
        Póliza {detail.policyNumber} · {detail.insurer.name}
      </h1>
      <p className="meta">
        Tomador:{' '}
        {detail.holder === null ? (
          'sin tomador en la versión vigente'
        ) : (
          <Link href={`/parte/${detail.holder.partyId}`}>{detail.holder.displayName}</Link>
        )}
        {detail.renewedFromPolicyId === null ? null : (
          <>
            {' · renovación de '}
            <Link href={`/poliza/${detail.renewedFromPolicyId}`}>la póliza anterior</Link>
          </>
        )}
      </p>

      <h2>Acceso documental</h2>
      <AccesoDocumental acceso={access} />
      <p className="meta">
        Los enlaces abren Drive con tu propia sesión de Google. Broker OS no consulta Drive
        ni administra sus permisos: si un destino no abre, el acceso se resuelve en Drive.
      </p>

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
                  {entrada.termStartDate} → {entrada.termEndDate}
                </td>
                <td>{entrada.holder.displayName}</td>
                <td>{guion(entrada.status)}</td>
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
                  <td>{documento.reconciliationStatus}</td>
                  <td>{guion(documento.lastSeenAt)}</td>
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
                  <td>{referencia.resolutionStatus}</td>
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
