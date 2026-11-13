import { latestBatch, tokenMcpDesde } from '@del-campo/api'
import { cookies, headers } from 'next/headers'

import { Cabecera } from '@/app/_componentes/Cabecera'
import { consultar, requireAdmitted } from '@/lib/sesion'

import { generar, revocar } from './acciones'

export const dynamic = 'force-dynamic'

export default async function ConectarPage() {
  const principal = await requireAdmitted()
  const [lote, desde] = await consultar(Promise.all([latestBatch(principal), tokenMcpDesde(principal)]))
  const nuevo = (await cookies()).get('mcp_token_nuevo')?.value ?? null
  const cabeceras = await headers()
  const origen = `${cabeceras.get('x-forwarded-proto') ?? 'https'}://${cabeceras.get('host') ?? ''}`

  return (
    <main className="envoltorio">
      <Cabecera lote={lote} email={principal.email} />
      <h1 style={{ fontSize: '1.3rem', margin: '0 0 0.2rem' }}>Conectar Claude</h1>
      <p className="meta">
        Con esta dirección, Claude puede leer clientes y pólizas de Broker OS con tu usuario. Es personal: no la
        compartas. Si se filtra, generá una nueva y la anterior deja de funcionar.
      </p>

      {nuevo === null ? null : (
        <article className="tarjeta">
          <h3>Tu dirección de conexión</h3>
          <p>
            <code style={{ wordBreak: 'break-all' }}>{`${origen}/api/mcp/${nuevo}`}</code>
          </p>
          <p className="meta">
            Copiala ahora: no se vuelve a mostrar. En Claude, andá a Configuración, Conectores, Agregar conector
            personalizado, y pegala como URL.
          </p>
        </article>
      )}

      <p className="meta">
        {desde === null
          ? 'Todavía no generaste una dirección.'
          : `Tenés una dirección activa desde el ${desde.toLocaleDateString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires' })}.`}
      </p>

      <form action={generar} style={{ display: 'inline' }}>
        <button type="submit">{desde === null ? 'Generar dirección' : 'Generar una nueva'}</button>
      </form>
      {desde === null ? null : (
        <form action={revocar} style={{ display: 'inline', marginLeft: '0.5rem' }}>
          <button type="submit">Desconectar</button>
        </form>
      )}
    </main>
  )
}
