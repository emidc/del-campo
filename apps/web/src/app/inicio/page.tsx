import { ESTADOS_DE_GESTION, ESTADOS_DE_TAREA, TIPOS_DE_GESTION, inicio, latestBatch } from '@del-campo/api'
import Link from 'next/link'

import { Cabecera } from '@/app/_componentes/Cabecera'
import { fechaDeHoy } from '@/lib/criterios'
import { consultar, requireAdmitted } from '@/lib/sesion'

export const dynamic = 'force-dynamic'

/** Inicio (C6-03a): indicadores con su definición y su acción, lo mío a atender y la carga del equipo sin ranking. */
export default async function InicioPage() {
  const principal = await requireAdmitted()
  const hoy = fechaDeHoy()
  const [lote, datos] = await consultar(Promise.all([latestBatch(principal), inicio(principal, hoy)]))

  return (
    <main className="envoltorio">
      <Cabecera lote={lote} email={principal.email} />

      <h1 style={{ fontSize: '1.3rem', margin: '0 0 0.4rem' }}>Inicio</h1>
      <p className="meta">Cada número cuenta sólo lo que podés ver. Tocalo para ir a los casos.</p>

      <div className="indicadores">
        {datos.indicadores.map((k) => (
          <Link key={k.id} href={k.href} className={k.alerta && k.valor > 0 ? 'indicador indicador--alerta' : 'indicador'}>
            <span className="indicador__valor">{k.valor}</span>
            <span className="indicador__titulo">{k.titulo}</span>
            <span className="indicador__definicion">{k.definicion}</span>
          </Link>
        ))}
      </div>

      <h2 style={{ fontSize: '1.1rem', margin: '1.5rem 0 0.4rem' }}>A atender</h2>
      {datos.aAtender.length === 0 ? (
        <p className="estado">No tenés gestiones abiertas a tu nombre.</p>
      ) : (
        <div className="desborde">
          <table>
            <thead>
              <tr>
                <th>Gestión</th>
                <th>Tipo</th>
                <th>Cliente</th>
                <th>Estado</th>
                <th>Vence</th>
              </tr>
            </thead>
            <tbody>
              {datos.aAtender.map((g) => (
                <tr key={g.id}>
                  <td>
                    <Link href={`/gestiones/${g.id}`}>{g.title}</Link>
                  </td>
                  <td>{TIPOS_DE_GESTION[g.kind]}</td>
                  <td>{g.partyName ?? 'sin nombre'}</td>
                  <td>{ESTADOS_DE_GESTION[g.status]}</td>
                  <td className={g.dueDate !== null && g.dueDate < hoy ? 'pendiente' : undefined}>{g.dueDate ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <h2 style={{ fontSize: '1.1rem', margin: '1.5rem 0 0.4rem' }}>Mis tareas</h2>
      {datos.misTareas.length === 0 ? (
        <p className="estado">No tenés tareas sin hacer.</p>
      ) : (
        <div className="desborde">
          <table>
            <thead>
              <tr>
                <th>Tarea</th>
                <th>Cliente</th>
                <th>Estado</th>
                <th>Vence</th>
              </tr>
            </thead>
            <tbody>
              {datos.misTareas.map((t) => (
                <tr key={t.id}>
                  <td>
                    <Link href={`/tareas/${t.id}`}>{t.title}</Link>
                  </td>
                  <td>{t.partyName ?? 'sin nombre'}</td>
                  <td className={t.status === 'TRABADA' ? 'pendiente' : undefined}>{ESTADOS_DE_TAREA[t.status]}</td>
                  <td className={t.dueDate !== null && t.dueDate < hoy ? 'pendiente' : undefined}>{t.dueDate ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <h2 style={{ fontSize: '1.1rem', margin: '1.5rem 0 0.4rem' }}>Equipo</h2>
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
