import { ORIGENES_DE_PROSPECTO, TOPE_DE_CLIENTES, TOPE_DE_PROSPECTOS, clientes, latestBatch, prospectos } from '@del-campo/api'
import Link from 'next/link'

import { Cabecera } from '@/app/_componentes/Cabecera'
import { fecha } from '@/lib/formato'
import { consultar, requireAdmitted } from '@/lib/sesion'

export const dynamic = 'force-dynamic'

const uno = (valor: string | string[] | undefined): string | undefined => (Array.isArray(valor) ? valor[0] : valor)

/**
 * Clientes: empresas y personas en una lista, con un solo cuadro para filtrar, como en el
 * prototipo. La tercera pestaña son los prospectos pendientes, de los dos tipos.
 */
export default async function ClientesPage({
  searchParams,
}: {
  readonly searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const principal = await requireAdmitted()
  const parametros = await searchParams
  const tipo = uno(parametros.tipo)
  const texto = (uno(parametros.q) ?? '').trim().slice(0, 100)
  const [lote, empresas, gente, pendientes] = await consultar(
    Promise.all([
      latestBatch(principal),
      clientes(principal, 'ORGANIZATION', texto),
      clientes(principal, 'PERSON', texto),
      prospectos(principal, texto),
    ]),
  )
  const enProspectos = tipo === 'prospectos'
  // Desde el buscador de la barra no se elige pestaña: se abre la que tenga resultados.
  const personas = tipo === 'personas' || (tipo === undefined && empresas.total === 0 && gente.total > 0)
  const lista = personas ? gente : empresas
  const pestana = enProspectos ? 'prospectos' : personas ? 'personas' : 'empresas'
  const hacia = (tipo: 'empresas' | 'personas' | 'prospectos') =>
    `/clientes?${new URLSearchParams({ tipo, ...(texto === '' ? {} : { q: texto }) }).toString()}`

  return (
    <main className="envoltorio">
      <Cabecera lote={lote} email={principal.email} />

      <p className="antetitulo">Clientes</p>
      <div className="encabezado">
        <h1>{enProspectos ? 'Prospectos' : personas ? 'Personas' : 'Empresas'}</h1>
        {enProspectos ? (
          <Link className="boton" href="/clientes/prospectos/nuevo">
            Nuevo prospecto
          </Link>
        ) : null}
      </div>
      {uno(parametros.eliminado) === '1' ? (
        <p className="estado" role="status">
          El contacto se eliminó definitivamente.
        </p>
      ) : null}

      <nav className="pestanas" aria-label="Tipo de cliente">
        <Link href={hacia('empresas')} aria-current={pestana === 'empresas' ? 'page' : undefined}>
          Empresas ({empresas.total})
        </Link>
        <Link href={hacia('personas')} aria-current={pestana === 'personas' ? 'page' : undefined}>
          Personas ({gente.total})
        </Link>
        <Link href={hacia('prospectos')} aria-current={pestana === 'prospectos' ? 'page' : undefined}>
          Prospectos ({pendientes.total})
        </Link>
      </nav>

      <form className="filtro" method="get" action="/clientes" role="search">
        <input type="hidden" name="tipo" value={pestana} />
        <label className="sr" htmlFor="q">
          Filtrar clientes
        </label>
        <input
          id="q"
          name="q"
          type="search"
          defaultValue={texto}
          placeholder={enProspectos ? 'Filtrar por nombre, DNI o CUIT' : personas ? 'Filtrar por nombre o DNI' : 'Filtrar por nombre o CUIT'}
          autoComplete="off"
        />
        <button type="submit">Filtrar</button>
        {texto === '' ? null : (
          <Link className="boton boton--secundario" href={`/clientes?tipo=${pestana}`}>
            Limpiar
          </Link>
        )}
      </form>

      {enProspectos ? (
        pendientes.prospects.length === 0 ? (
          <p className="estado">
            {texto === '' ? 'No hay prospectos pendientes.' : `Ningún prospecto coincide con «${texto}».`}
          </p>
        ) : (
          <>
            <div className="desborde">
              <table>
                <thead>
                  <tr>
                    <th>Prospecto</th>
                    <th>Tipo</th>
                    <th>DNI o CUIT</th>
                    <th>Origen</th>
                    <th>Cargado</th>
                  </tr>
                </thead>
                <tbody>
                  {pendientes.prospects.map((p) => (
                    <tr key={p.partyId}>
                      <td>
                        <Link className="nombre" href={`/parte/${p.partyId}`}>
                          {p.displayName}
                        </Link>
                      </td>
                      <td>{p.kind === 'ORGANIZATION' ? 'Empresa' : 'Persona'}</td>
                      <td>{p.identifier ?? '—'}</td>
                      <td>{p.origin === null ? '—' : ORIGENES_DE_PROSPECTO[p.origin]}</td>
                      <td>{fecha(p.since)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="conteos">
              {pendientes.total > pendientes.prospects.length
                ? `Se muestran ${String(pendientes.prospects.length)} de ${String(pendientes.total)}. Filtrá para acotar: la lista trae hasta ${String(TOPE_DE_PROSPECTOS)}.`
                : `${String(pendientes.total)} ${pendientes.total === 1 ? 'prospecto' : 'prospectos'}.`}
            </p>
          </>
        )
      ) : lista.clients.length === 0 ? (
        <p className="estado">
          {texto === ''
            ? `No hay ${personas ? 'personas' : 'empresas'} cargadas.`
            : `Ninguna ${personas ? 'persona' : 'empresa'} coincide con «${texto}».`}
        </p>
      ) : (
        <>
          <div className="desborde">
            <table>
              <thead>
                <tr>
                  <th>{personas ? 'Persona' : 'Empresa'}</th>
                  <th>{personas ? 'DNI' : 'CUIT'}</th>
                  {personas ? null : <th>Contactos</th>}
                  <th>Pólizas</th>
                </tr>
              </thead>
              <tbody>
                {lista.clients.map((c) => (
                  <tr key={c.partyId}>
                    <td>
                      <Link className="nombre" href={`/parte/${c.partyId}`}>
                        {c.displayName}
                      </Link>
                    </td>
                    <td>{(personas ? c.dni : c.cuit) ?? '—'}</td>
                    {personas ? null : <td>{c.contacts}</td>}
                    <td>{c.policies}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="conteos">
            {lista.total > lista.clients.length
              ? `Se muestran ${String(lista.clients.length)} de ${String(lista.total)}. Filtrá para acotar: la lista trae hasta ${String(TOPE_DE_CLIENTES)}.`
              : `${String(lista.total)} ${personas ? (lista.total === 1 ? 'persona' : 'personas') : lista.total === 1 ? 'empresa' : 'empresas'}.`}
          </p>
        </>
      )}
    </main>
  )
}
