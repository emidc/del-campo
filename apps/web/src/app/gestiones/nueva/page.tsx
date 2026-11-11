import { SERVICE_CASE_KINDS, TIPOS_DE_GESTION, latestBatch, party, policy } from '@del-campo/api'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { Cabecera } from '@/app/_componentes/Cabecera'
import { crear } from '@/app/gestiones/acciones'
import { fechaDeHoy } from '@/lib/criterios'
import { consultar, requireAdmitted } from '@/lib/sesion'

export const dynamic = 'force-dynamic'

const uno = (valor: string | string[] | undefined): string | undefined => (Array.isArray(valor) ? valor[0] : valor)

/** Se llega desde la ficha de un cliente (`?parte=`) o de una póliza (`?poliza=`). */
export default async function NuevaGestionPage({
  searchParams,
}: {
  readonly searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const principal = await requireAdmitted()
  const parametros = await searchParams
  const asOf = fechaDeHoy()
  const polizaId = uno(parametros.poliza)
  const [lote, vistaPoliza] = await consultar(
    Promise.all([latestBatch(principal), polizaId === undefined ? null : policy(principal, polizaId, asOf)]),
  )
  const parteId = uno(parametros.parte) ?? vistaPoliza?.detail.holder?.partyId
  if (parteId === undefined) notFound()
  const vistaParte = await consultar(party(principal, parteId, asOf, `${asOf}T12:00:00Z`))
  if (vistaParte === null) notFound()

  return (
    <main className="envoltorio">
      <Cabecera lote={lote} email={principal.email} />
      <p className="meta">
        <Link href="/gestiones">← Gestiones</Link>
      </p>

      <h1 style={{ fontSize: '1.3rem', margin: '0 0 0.2rem' }}>Nueva gestión</h1>
      <p className="meta">
        Cliente: <Link href={`/parte/${parteId}`}>{vistaParte.displayName}</Link>
        {vistaPoliza === null ? null : (
          <>
            {' · Póliza '}
            <Link href={`/poliza/${vistaPoliza.detail.policyId}`}>
              {vistaPoliza.detail.policyNumber} · {vistaPoliza.detail.insurer.name}
            </Link>
          </>
        )}
      </p>

      <form action={crear} className="buscador">
        <input type="hidden" name="parte" value={parteId} />
        {vistaPoliza === null ? null : <input type="hidden" name="poliza" value={vistaPoliza.detail.policyId} />}
        <div className="campo">
          <label htmlFor="tipo">Tipo</label>
          <select id="tipo" name="tipo" required defaultValue="">
            <option value="" disabled>
              Elegir…
            </option>
            {SERVICE_CASE_KINDS.map((tipo) => (
              <option key={tipo} value={tipo}>
                {TIPOS_DE_GESTION[tipo]}
              </option>
            ))}
          </select>
        </div>
        <div className="campo" style={{ gridColumn: 'span 2' }}>
          <label htmlFor="titulo">Título</label>
          <input id="titulo" name="titulo" required maxLength={200} placeholder="Qué hay que resolver" />
        </div>
        <div className="campo">
          <label htmlFor="vence">Vence</label>
          <input id="vence" name="vence" type="date" />
        </div>
        <div className="campo" style={{ gridColumn: '1 / -1' }}>
          <label htmlFor="nota">Nota inicial (opcional)</label>
          <textarea id="nota" name="nota" rows={3} />
        </div>
        <div className="acciones">
          <button type="submit">Crear gestión</button>
        </div>
      </form>
    </main>
  )
}
