import { latestBatch, tokenMcpDesde } from '@del-campo/api'
import { cookies, headers } from 'next/headers'

import { BotonEnviar } from '@/app/_componentes/BotonEnviar'
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
      <h1>Conectar Claude o ChatGPT</h1>
      <p className="meta">
        Con esta dirección, Claude o ChatGPT pueden leer clientes y pólizas de Broker OS con tu usuario y dejar
        trabajo de riesgos para revisar. Es personal: no la compartas. Si se filtra, generá una nueva y la anterior
        deja de funcionar. La misma dirección sirve para los dos.
      </p>

      {nuevo === null ? null : (
        <article className="tarjeta">
          <h3>Tu dirección de conexión</h3>
          <p>
            <code style={{ wordBreak: 'break-all' }}>{`${origen}/api/mcp/${nuevo}`}</code>
          </p>
          <p className="meta">Copiala ahora: no se vuelve a mostrar.</p>
          <p className="meta">
            En Claude: Configuración, Conectores, Agregar conector personalizado, y pegala como URL.
          </p>
          <p className="meta">
            En ChatGPT: Configuración, Aplicaciones, Configuración avanzada, activá el modo desarrollador. Después
            Crear aplicación, pegala como URL del servidor MCP, elegí Sin autenticación y confirmá.
          </p>
        </article>
      )}

      <p className="meta">
        {desde === null
          ? 'Todavía no generaste una dirección.'
          : `Tenés una dirección activa desde el ${desde.toLocaleDateString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires' })}.`}
      </p>

      <form action={generar} style={{ display: 'inline' }}>
        <BotonEnviar>{desde === null ? 'Generar dirección' : 'Generar una nueva'}</BotonEnviar>
      </form>
      {desde === null ? null : (
        <form action={revocar} style={{ display: 'inline', marginLeft: '0.5rem' }}>
          <BotonEnviar>Desconectar</BotonEnviar>
        </form>
      )}
    </main>
  )
}
