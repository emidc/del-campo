import { latestBatch, party } from '@del-campo/api'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { Cabecera } from '@/app/_componentes/Cabecera'
import { fechaDeHoy } from '@/lib/criterios'
import { requireAdmitted } from '@/lib/sesion'

export const dynamic = 'force-dynamic'

export default async function PartePage({
  params,
}: {
  readonly params: Promise<{ readonly id: string }>
}) {
  const principal = await requireAdmitted()
  const { id } = await params
  const asOf = fechaDeHoy()
  const [lote, vista] = await Promise.all([
    latestBatch(principal),
    party(principal, id, asOf, `${asOf}T12:00:00Z`),
  ])
  if (vista === null) notFound()

  return (
    <main className="envoltorio">
      <Cabecera lote={lote} email={principal.email} />

      <p className="meta">
        <Link href="/buscar">← Volver a la búsqueda</Link>
      </p>

      <h1 style={{ fontSize: '1.3rem', margin: '0 0 0.2rem' }}>{vista.displayName}</h1>
      <p className="meta">
        {vista.kind === 'PERSON' ? 'Persona' : 'Organización'}
        {vista.dni === null ? '' : ` · DNI ${vista.dni}`}
        {vista.cuit === null ? '' : ` · CUIT ${vista.cuit}`}
      </p>

      <h2>Pólizas</h2>
      {vista.policies.length === 0 ? (
        <p className="meta">Sin pólizas a la fecha consultada.</p>
      ) : (
        vista.policies.map((candidato) => (
          <article className="tarjeta" key={candidato.policyId}>
            <h3>
              <Link href={`/poliza/${candidato.policyId}`}>
                Póliza {candidato.policyNumber} · {candidato.insurer.name}
              </Link>
            </h3>
            <p className="meta">
              {candidato.currentVersion === null
                ? 'Sin versión vigente a la fecha consultada'
                : `Vigencia ${candidato.currentVersion.termStartDate} → ${candidato.currentVersion.termEndDate}`}
            </p>
          </article>
        ))
      )}

      {/* Navegación organizacional de §63: empresa → contactos y contacto → empresas. */}
      <h2>Organizaciones</h2>
      {vista.organizations.length === 0 ? (
        <p className="meta">Ninguna.</p>
      ) : (
        <ul>
          {vista.organizations.map((miembro) => (
            <li key={miembro.partyId}>
              <Link href={`/parte/${miembro.partyId}`}>{miembro.displayName}</Link>
              {miembro.roleOrPosition === null ? '' : ` · ${miembro.roleOrPosition}`}
            </li>
          ))}
        </ul>
      )}

      <h2>Contactos</h2>
      {vista.contacts.length === 0 ? (
        <p className="meta">Ninguno.</p>
      ) : (
        <ul>
          {vista.contacts.map((miembro) => (
            <li key={miembro.partyId}>
              <Link href={`/parte/${miembro.partyId}`}>{miembro.displayName}</Link>
              {miembro.roleOrPosition === null ? '' : ` · ${miembro.roleOrPosition}`}
              {miembro.isPrimary === true ? ' · principal' : ''}
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}
