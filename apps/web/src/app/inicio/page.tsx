import { ESTADOS_DE_GESTION, TIPOS_DE_GESTION, inicio, latestBatch } from '@del-campo/api'
import Link from 'next/link'

import { Cabecera } from '@/app/_componentes/Cabecera'
import { fechaDeHoy } from '@/lib/criterios'
import { fecha, fechaLarga } from '@/lib/formato'
import { consultar, requireAdmitted } from '@/lib/sesion'

export const dynamic = 'force-dynamic'

/** Cuántos renglones muestra cada tarjeta; el resto se ve en su pantalla. */
const TOPE = 8

/** Por qué un renglón pide atención: vencido, vence hoy o cuándo vence. */
const motivo = (vence: string | null, hoy: string): { readonly texto: string; readonly urgente: boolean } => {
  if (vence === null) return { texto: 'Sin fecha', urgente: false }
  if (vence < hoy) return { texto: `Venció el ${fecha(vence)}`, urgente: true }
  if (vence === hoy) return { texto: 'Vence hoy', urgente: true }
  return { texto: `Vence el ${fecha(vence)}`, urgente: false }
}

/** Inicio (C6-03a): indicadores con su definición y su acción, lo mío a atender y la carga del equipo sin ranking. */
export default async function InicioPage() {
  const principal = await requireAdmitted()
  const hoy = fechaDeHoy()
  const [lote, datos] = await consultar(Promise.all([latestBatch(principal), inicio(principal, hoy)]))

  const primero = principal.displayName?.trim().split(/\s+/)[0]
  const nombre = primero === undefined || primero === '' ? null : primero

  return (
    <main className="envoltorio">
      <Cabecera lote={lote} email={principal.email} />

      <p className="antetitulo">Inicio</p>
      <h1>{nombre === null ? 'Buen día' : `Buen día, ${nombre}`}</h1>
      <p className="meta">{fechaLarga(hoy)}</p>

      <div className="grid-2 grid-2--par">
        <section className="tarjeta">
          <h2>Mis tareas ({datos.misTareas.length})</h2>
          {datos.misTareas.length === 0 ? (
            <p className="meta">No tenés tareas sin hacer.</p>
          ) : (
            <ul className="lista">
              {datos.misTareas.slice(0, TOPE).map((t) => {
                const cuando = motivo(t.dueDate, hoy)
                const trabada = t.status === 'TRABADA'
                return (
                  <li key={t.id}>
                    <Link href={`/tareas/${t.id}`} className="nombre">
                      {t.title}
                    </Link>
                    <p className="meta">
                      <span className={trabada || cuando.urgente ? 'pendiente' : undefined}>
                        {trabada ? `Bloqueada · ${cuando.texto}` : cuando.texto}
                      </span>
                      {' · '}
                      {t.partyName ?? 'sin nombre'}
                    </p>
                  </li>
                )
              })}
            </ul>
          )}
          <p className="meta">
            <Link href="/tareas?mias=1">Ver todas mis tareas</Link>
          </p>
        </section>

        <section className="tarjeta">
          <h2>A atender ({datos.aAtender.length})</h2>
          {datos.aAtender.length === 0 ? (
            <p className="meta">No tenés gestiones abiertas a tu nombre.</p>
          ) : (
            <ul className="lista">
              {datos.aAtender.slice(0, TOPE).map((g) => {
                const cuando = motivo(g.dueDate, hoy)
                return (
                  <li key={g.id}>
                    <Link href={`/gestiones/${g.id}`} className="nombre">
                      {g.title}
                    </Link>
                    <p className="meta">
                      {TIPOS_DE_GESTION[g.kind]} · {ESTADOS_DE_GESTION[g.status]} ·{' '}
                      <span className={cuando.urgente ? 'pendiente' : undefined}>{cuando.texto}</span>
                      {' · '}
                      {g.partyName ?? 'sin nombre'}
                    </p>
                  </li>
                )
              })}
            </ul>
          )}
          <p className="meta">
            <Link href="/gestiones?mias=1">Ver todas mis gestiones</Link>
          </p>
        </section>
      </div>

      <h2 className="sr">Indicadores</h2>
      <div className="indicadores">
        {datos.indicadores.map((k) => (
          <Link key={k.id} href={k.href} className={k.alerta && k.valor > 0 ? 'indicador indicador--alerta' : 'indicador'}>
            <span className="indicador__valor">{k.valor}</span>
            <span className="indicador__titulo">{k.titulo}</span>
            <span className="indicador__definicion">{k.definicion}</span>
          </Link>
        ))}
      </div>

      <h2>Equipo</h2>
      <p className="meta">Gestiones abiertas por responsable, en orden alfabético.</p>
      {datos.equipo.length === 0 ? (
        <p className="estado">Nadie tiene gestiones abiertas asignadas.</p>
      ) : (
        <div className="desborde">
          <table>
            <thead>
              <tr>
                <th>Responsable</th>
                <th>Abiertas</th>
                <th>Vencidas</th>
              </tr>
            </thead>
            <tbody>
              {datos.equipo.map((c) => (
                <tr key={c.email}>
                  <td>{c.email}</td>
                  <td>{c.abiertas}</td>
                  <td className={c.vencidas > 0 ? 'pendiente' : undefined}>{c.vencidas}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  )
}
