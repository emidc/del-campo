import { TOPE_DE_CLIENTES, clientes, latestBatch } from '@del-campo/api'
import Link from 'next/link'

import { Cabecera } from '@/app/_componentes/Cabecera'
import { consultar, requireAdmitted } from '@/lib/sesion'

export const dynamic = 'force-dynamic'

const uno = (valor: string | string[] | undefined): string | undefined => (Array.isArray(valor) ? valor[0] : valor)

/** Clientes: empresas y personas en una lista, con un solo cuadro para filtrar, como en el prototipo. */
export default async function ClientesPage({
  searchParams,
}: {
  readonly searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const principal = await requireAdmitted()
  const parametros = await searchParams
  const tipo = uno(parametros.tipo)
  const texto = (uno(parametros.q) ?? '').trim().slice(0, 100)
  const [lote, empresas, gente] = await consultar(
    Promise.all([
      latestBatch(principal),
      clientes(principal, 'ORGANIZATION', texto),
      clientes(principal, 'PERSON', texto),
    ]),
  )
  // Desde el buscador de la barra no se elige pestaña: se abre la que tenga resultados.
  const personas = tipo === 'personas' || (tipo === undefined && empresas.total === 0 && gente.total > 0)
  const lista = personas ? gente : empresas
  const hacia = (tipo: 'empresas' | 'personas') =>
    `/clientes?${new URLSearchParams({ tipo, ...(texto === '' ? {} : { q: texto }) }).toString()}`

  return (
    <main className="envoltorio">
      <Cabecera lote={lote} email={principal.email} />

      <p className="antetitulo">Clientes</p>
      <h1>{personas ? 'Personas' : 'Empresas'}</h1>

      <nav className="pestanas" aria-label="Tipo de cliente">
        <Link href={hacia('empresas')} aria-current={personas ? undefined : 'page'}>
          Empresas ({empresas.total})
        </Link>
        <Link href={hacia('personas')} aria-current={personas ? 'page' : undefined}>
          Personas ({gente.total})
        </Link>
      </nav>

      <form className="filtro" method="get" action="/clientes" role="search">
        <input type="hidden" name="tipo" value={personas ? 'personas' : 'empresas'} />
        <label className="sr" htmlFor="q">
          Filtrar clientes
        </label>
        <input
          id="q"
          name="q"
          type="search"
          defaultValue={texto}
          placeholder={personas ? 'Filtrar por nombre o DNI' : 'Filtrar por nombre o CUIT'}
          autoComplete="off"
        />
        <button type="submit">Filtrar</button>
        {texto === '' ? null : (
          <Link className="boton boton--secundario" href={`/clientes?tipo=${personas ? 'personas' : 'empresas'}`}>
            Limpiar
          </Link>
        )}
      </form>

      {lista.clients.length === 0 ? (
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
