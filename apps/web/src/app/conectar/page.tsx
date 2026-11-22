import { latestBatch, tokenMcpDesde } from '@del-campo/api'
import { cookies, headers } from 'next/headers'

import { BotonEnviar } from '@/app/_componentes/BotonEnviar'
import { Cabecera } from '@/app/_componentes/Cabecera'
import { consultar, requireAdmitted } from '@/lib/sesion'

import { credencialesOauth, generar, revocar } from './acciones'

export const dynamic = 'force-dynamic'

type Credenciales = { readonly clientId: string; readonly clientSecret: string } | { readonly error: true }

const leerCredenciales = (valor: string | undefined): Credenciales | null => {
  if (valor === undefined) return null
  try {
    return JSON.parse(valor) as Credenciales
  } catch {
    return null
  }
}

export default async function ConectarPage() {
  const principal = await requireAdmitted()
  const [lote, desde] = await consultar(Promise.all([latestBatch(principal), tokenMcpDesde(principal)]))
  const jar = await cookies()
  const nuevo = jar.get('mcp_token_nuevo')?.value ?? null
  const oauth = leerCredenciales(jar.get('mcp_oauth_nuevo')?.value)
  const cabeceras = await headers()
  const origen = `${cabeceras.get('x-forwarded-proto') ?? 'https'}://${cabeceras.get('host') ?? ''}`

  return (
    <main className="envoltorio">
      <Cabecera lote={lote} email={principal.email} />
      <h1>Conectar MCP</h1>
      <p className="meta">
        MCP es la forma de conectar un asistente de IA (Claude, ChatGPT o Gemini) con Broker OS. Una vez conectado,
        le podés pedir en el chat que consulte clientes, pólizas y riesgos, y que deje trabajo cargado para revisar.
        Usa tu usuario: ve lo mismo que ves vos en Broker OS.
      </p>

      <article className="tarjeta">
        <h3>Para qué sirve</h3>
        <ul>
          <li>
            <b>Preparar una reunión o una visita.</b> «Resumime Antucura: pólizas vigentes, coberturas y riesgos
            abiertos.»
          </li>
          <li>
            <b>Revisar coberturas contra riesgos.</b> «¿Qué riesgos de esta empresa no están cubiertos por sus
            pólizas?»
          </li>
          <li>
            <b>Cargar un relevamiento.</b> Pegás las notas de una inspección y el asistente propone ubicaciones,
            condiciones, hallazgos y conclusiones.
          </li>
          <li>
            <b>Consultar la cartera.</b> «¿Cuántas pólizas vigentes tenemos y cuánta prima suman?»
          </li>
        </ul>
        <p className="meta">
          Lo que el asistente guarda queda como propuesta, firmada con su nombre, para que una persona del equipo lo
          revise en la ficha de la empresa. Los datos vienen del último lote importado de Zoho y pueden no estar al
          día.
        </p>
      </article>

      <article className="tarjeta">
        <h3>Opción 1: con inicio de sesión</h3>
        <p className="meta">
          No hay que generar nada: el asistente te trae a Broker OS para que autorices con tu cuenta. Gemini sólo
          acepta esta opción; Claude y ChatGPT también la admiten. Dirección:
        </p>
        <p>
          <code style={{ wordBreak: 'break-all' }}>{`${origen}/api/mcp`}</code>
        </p>
        <ul className="meta">
          <li>
            Gemini: Personalizar, Aplicaciones conectadas, Custom. Pegá la dirección, abrí Advanced Settings, tocá
            Copy redirect URI y pegalo acá abajo. Copiá el Client ID y el Client secret que aparecen en los campos de
            Gemini y tocá Next.
          </li>
          <li>Claude: Configuración, Conectores, Agregar conector personalizado. Pegá la dirección.</li>
          <li>ChatGPT: con el modo desarrollador activo, Crear aplicación. Pegá la dirección y elegí OAuth.</li>
        </ul>
        <form action={credencialesOauth}>
          <input name="redirect_uri" type="url" required placeholder="Redirect URI de Gemini" style={{ width: '100%' }} />
          <BotonEnviar>Generar Client ID y Client secret</BotonEnviar>
        </form>
        {oauth === null ? null : 'error' in oauth ? (
          <p className="meta">Ese redirect URI no sirve: tiene que empezar con https://.</p>
        ) : (
          <>
            <p className="meta">Client ID</p>
            <p>
              <code style={{ wordBreak: 'break-all' }}>{oauth.clientId}</code>
            </p>
            <p className="meta">Client secret</p>
            <p>
              <code style={{ wordBreak: 'break-all' }}>{oauth.clientSecret}</code>
            </p>
            <p className="meta">
              <b>Copialos ahora: no se vuelven a mostrar.</b>
            </p>
          </>
        )}
        <p className="meta">El acceso se renueva solo y vence a los 30 días sin uso, o antes si te dan de baja del equipo.</p>
      </article>

      <article className="tarjeta">
        <h3>Opción 2: con una dirección personal</h3>
        <p className="meta">
          Una dirección con una clave tuya adentro, para Claude y ChatGPT. Es personal: no la compartas. Si se filtra,
          generá una nueva y la anterior deja de funcionar.
        </p>

        {nuevo === null ? null : (
          <>
            <p>
              <code style={{ wordBreak: 'break-all' }}>{`${origen}/api/mcp/${nuevo}`}</code>
            </p>
            <p className="meta">
              <b>Copiala ahora: no se vuelve a mostrar.</b>
            </p>
          </>
        )}
        <ul className="meta">
          <li>Claude: Configuración, Conectores, Agregar conector personalizado. Pegala como URL.</li>
          <li>
            ChatGPT: Configuración, Aplicaciones, Configuración avanzada, activá el modo desarrollador. Después Crear
            aplicación, pegala como URL del servidor MCP y elegí Sin autenticación.
          </li>
        </ul>

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
      </article>
    </main>
  )
}
