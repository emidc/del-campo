import { riesgosDeEmpresa, type Principal } from '@del-campo/api'

import { describirRiesgos } from './riesgos'

/**
 * La sección «Riesgos» de una ficha de organización (C4-03b): lee de Risk OS en cada request,
 * como la persona, y no guarda nada. Va dentro de `<Suspense>`: la ficha no espera a Risk OS.
 */
export async function Riesgos({ principal, partyId }: { readonly principal: Principal; readonly partyId: string }) {
  const seccion = describirRiesgos(await riesgosDeEmpresa(principal, partyId))
  if (seccion.forma === 'MENSAJE') return <p className="meta">{seccion.texto}</p>
  return (
    <>
      {seccion.filas.length === 0 ? (
        <p className="meta">Sin riesgos en el ranking.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Posición</th>
              <th>Riesgo</th>
              <th>Unidad</th>
              <th>Banda</th>
            </tr>
          </thead>
          <tbody>
            {seccion.filas.map((r) => (
              <tr key={r.riskId} data-riesgo={r.riskId}>
                <td>
                  {r.posicion}
                  {r.empate ? ' (empate)' : ''}
                  {r.provisional ? ' (provisional)' : ''}
                </td>
                <td>{r.titulo}</td>
                <td>{r.unidad ?? '—'}</td>
                <td>{r.banda ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <p className="meta">
        {seccion.resumen} · {seccion.consultado} · <a href={seccion.enlace}>Abrir en Risk OS</a>
      </p>
    </>
  )
}
