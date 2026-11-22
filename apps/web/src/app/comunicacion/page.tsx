import { conversaciones, latestBatch } from '@del-campo/api'
import Link from 'next/link'

import { Cabecera } from '@/app/_componentes/Cabecera'
import { Refresco } from '@/app/comunicacion/Refresco'
import { avisosDeEntregas, contacto } from '@/app/comunicacion/etiquetas'
import { instante } from '@/lib/formato'
import { consultar, perfilPropio, requireAdmitted } from '@/lib/sesion'

export const dynamic = 'force-dynamic'

const uno = (valor: string | string[] | undefined): string | undefined => (Array.isArray(valor) ? valor[0] : valor)

/** La bandeja de WhatsApp: una fila por persona que escribió, la más reciente primero. */
export default async function ComunicacionPage({
  searchParams,
}: {
  readonly searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const principal = await requireAdmitted()
  const filtro = uno((await searchParams).f)
  const [lote, bandeja, perfil] = await Promise.all([consultar(latestBatch(principal)), consultar(conversaciones(principal)), perfilPropio()])
  const sinIdentificar = bandeja.conversaciones.filter((c) => c.clientes.length === 0)
  const abiertas = bandeja.conversaciones.filter((c) => c.window.open)
  // T-0072: las que esperan respuesta y cuyo aviso le llega a quien mira.
  const paraMi = bandeja.conversaciones.filter((c) => c.awaitingReply && perfil !== null && c.avisaA?.userId === perfil.userId)
  const lista =
    filtro === 'sin' ? sinIdentificar : filtro === 'abiertas' ? abiertas : filtro === 'mias' ? paraMi : bandeja.conversaciones

  const pestana = (etiqueta: string, activo: boolean, href: string) => (
    <Link key={href} href={href} aria-current={activo ? 'page' : undefined}>
      {etiqueta}
    </Link>
  )

  return (
    <main className="envoltorio">
      <Cabecera lote={lote} email={principal.email} />
      <Refresco />

      <p className="antetitulo">Comunicación</p>
      <h1>WhatsApp ({lista.length})</h1>
      <nav className="pestanas" aria-label="Filtros de conversaciones">
        {pestana(`Todas (${String(bandeja.conversaciones.length)})`, filtro !== 'sin' && filtro !== 'abiertas' && filtro !== 'mias', '/comunicacion')}
        {pestana(`Para mí, sin responder (${String(paraMi.length)})`, filtro === 'mias', '/comunicacion?f=mias')}
        {pestana(`Se puede responder (${String(abiertas.length)})`, filtro === 'abiertas', '/comunicacion?f=abiertas')}
        {pestana(`Sin identificar (${String(sinIdentificar.length)})`, filtro === 'sin', '/comunicacion?f=sin')}
      </nav>
      {avisosDeEntregas(bandeja.entregas).map((aviso) => (
        <p className="estado estado--aviso" key={aviso}>
          {aviso}
        </p>
      ))}

      {lista.length === 0 ? (
        <p className="estado">
          {bandeja.conversaciones.length === 0 ? 'Todavía no llegó ningún mensaje de WhatsApp.' : 'No hay conversaciones para mostrar.'}
        </p>
      ) : (
        <div className="desborde">
          <table>
            <thead>
              <tr>
                <th>Contacto</th>
                <th>Cliente</th>
                <th>Aviso a</th>
                <th>Último mensaje</th>
                <th>Respuesta</th>
              </tr>
            </thead>
            <tbody>
              {lista.map((c) => (
                <tr key={c.id}>
                  <td className="nombre">
                    <Link href={`/comunicacion/${String(c.id)}`}>{contacto(c)}</Link>
                  </td>
                  <td>
                    {c.clientes.length === 0 ? (
                      <span className="meta">Sin identificar</span>
                    ) : (
                      c.clientes.map((cliente, n) => (
                        <span key={cliente.partyId}>
                          {n === 0 ? null : ', '}
                          <Link href={`/parte/${cliente.partyId}`}>{cliente.name}</Link>
                        </span>
                      ))
                    )}
                  </td>
                  <td>
                    {c.avisaA === null ? <span className="meta">Nadie</span> : c.avisaA.name}
                    {c.awaitingReply ? <span className="meta"> · sin responder</span> : null}
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
    </main>
  )
}
