import { cargaDelEquipo, latestBatch } from '@del-campo/api'
import Link from 'next/link'

import { Cabecera } from '@/app/_componentes/Cabecera'
import { consultar, requireAdmitted } from '@/lib/sesion'

export const dynamic = 'force-dynamic'

/** Gestiones abiertas por responsable, sobre las que la persona ve (T-0046). */
export default async function EquipoPage() {
  const principal = await requireAdmitted()
  const [lote, carga] = await consultar(Promise.all([latestBatch(principal), cargaDelEquipo(principal)]))

  return (
    <main className="envoltorio">
      <Cabecera lote={lote} email={principal.email} />
      <p className="meta">
        <Link href="/gestiones">← Gestiones</Link>
      </p>

      <h1 style={{ fontSize: '1.3rem', margin: '0 0 0.4rem' }}>Carga del equipo</h1>
      <p className="meta">Gestiones abiertas por responsable. Vencidas: con fecha de vencimiento anterior a hoy.</p>

      {carga.length === 0 ? (
        <p className="estado">No hay gestiones abiertas.</p>
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
              {carga.map((fila) => (
                <tr key={fila.userId ?? 'sin'}>
                  <td>
                    <Link href={`/gestiones?responsable=${fila.userId ?? 'SIN_RESPONSABLE'}`}>
                      {fila.userId === null ? 'Sin responsable' : (fila.email ?? 'integrante dado de baja')}
                    </Link>
                  </td>
                  <td>{fila.open}</td>
                  <td className={fila.overdue > 0 ? 'pendiente' : undefined}>{fila.overdue}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  )
}
