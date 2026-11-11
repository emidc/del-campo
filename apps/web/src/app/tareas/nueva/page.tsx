import { gestion, latestBatch, party, policy, responsablesPosibles } from '@del-campo/api'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { Cabecera } from '@/app/_componentes/Cabecera'
import { crear } from '@/app/tareas/acciones'
import { fechaDeHoy } from '@/lib/criterios'
import { consultar, requireAdmitted } from '@/lib/sesion'

export const dynamic = 'force-dynamic'

const uno = (valor: string | string[] | undefined): string | undefined => (Array.isArray(valor) ? valor[0] : valor)

/**
 * Se llega desde la ficha de un cliente (`?parte=`), de una póliza (`?poliza=`) o de una
 * gestión (`?gestion=`). Renovaciones agrega `titulo` y `vence` para el seguimiento.
 */
export default async function NuevaTareaPage({
  searchParams,
}: {
  readonly searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const principal = await requireAdmitted()
  const parametros = await searchParams
  const asOf = fechaDeHoy()
  const gestionId = uno(parametros.gestion)
  const tituloInicial = (uno(parametros.titulo) ?? '').slice(0, 200)
  const vencePedido = uno(parametros.vence)
  const venceInicial = vencePedido !== undefined && /^\d{4}-\d{2}-\d{2}$/.test(vencePedido) ? vencePedido : undefined
  const [lote, vistaGestion] = await consultar(
    Promise.all([latestBatch(principal), gestionId === undefined ? null : gestion(principal, gestionId)]),
  )
  if (gestionId !== undefined && vistaGestion === null) notFound()
  const polizaId = uno(parametros.poliza) ?? vistaGestion?.policyId ?? undefined
  const vistaPoliza = polizaId === undefined ? null : await consultar(policy(principal, polizaId, asOf))
  const parteId = vistaGestion?.partyId ?? uno(parametros.parte) ?? vistaPoliza?.detail.holder?.partyId
  if (parteId === undefined) notFound()
  const [vistaParte, integrantes] = await consultar(
    Promise.all([party(principal, parteId, asOf, `${asOf}T12:00:00Z`), responsablesPosibles(principal, parteId)]),
  )
  if (vistaParte === null) notFound()

  return (
    <main className="envoltorio">
      <Cabecera lote={lote} email={principal.email} />
      <p className="meta">
        <Link href="/tareas">← Tareas</Link>
      </p>

      <h1 style={{ fontSize: '1.3rem', margin: '0 0 0.2rem' }}>Nueva tarea</h1>
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
        {vistaGestion === null ? null : (
          <>
            {' · Gestión '}
            <Link href={`/gestiones/${vistaGestion.id}`}>{vistaGestion.title}</Link>
          </>
        )}
      </p>

      <form action={crear} className="buscador">
        <input type="hidden" name="parte" value={parteId} />
        {vistaPoliza === null ? null : <input type="hidden" name="poliza" value={vistaPoliza.detail.policyId} />}
        {vistaGestion === null ? null : <input type="hidden" name="gestion" value={vistaGestion.id} />}
        <div className="campo" style={{ gridColumn: 'span 2' }}>
          <label htmlFor="titulo">Título</label>
          <input id="titulo" name="titulo" required maxLength={200} placeholder="Qué hay que hacer" defaultValue={tituloInicial} />
        </div>
        <div className="campo">
          <label htmlFor="vence">Vence</label>
          <input id="vence" name="vence" type="date" defaultValue={venceInicial} />
        </div>
        <div className="campo">
          <label htmlFor="responsable">Responsable</label>
          <select id="responsable" name="responsable" defaultValue="">
            <option value="">Yo</option>
            {integrantes
              .filter((i) => i.email !== principal.email)
              .map((i) => (
                <option key={i.userId} value={i.userId}>
                  {i.email}
                </option>
              ))}
          </select>
        </div>
        <div className="campo" style={{ gridColumn: '1 / -1' }}>
          <label htmlFor="comentario">Comentario (opcional)</label>
          <textarea id="comentario" name="comentario" rows={3} />
        </div>
        <div className="acciones">
          <button type="submit">Crear tarea</button>
        </div>
      </form>
    </main>
  )
}
