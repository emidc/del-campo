import { SESSION_COOKIE, admitCookie, sessionConfig, validarAutorizacion } from '@del-campo/api'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

import { BotonEnviar } from '@/app/_componentes/BotonEnviar'
import { guardConfig } from '@/lib/sesion'

import { responder } from './acciones'

export const dynamic = 'force-dynamic'

/** Un agente (Gemini, por ejemplo) pide entrar a Broker OS con el usuario de quien está en sesión. */
export default async function AutorizarPage({
  searchParams,
}: {
  readonly searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const crudos = await searchParams
  const parametros = Object.fromEntries(
    Object.entries(crudos).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v]),
  ) as Record<string, string | undefined>

  const sesion = await admitCookie((await cookies()).get(SESSION_COOKIE)?.value, guardConfig())
  if (!sesion.admitted) {
    const aca = `/oauth/autorizar?${new URLSearchParams(parametros as Record<string, string>).toString()}`
    redirect(`/api/oauth/ingresar?volver=${encodeURIComponent(aca)}`)
  }

  const validada = await validarAutorizacion(parametros, sessionConfig().secret)
  if (!validada.ok) {
    if (validada.volverA !== null) redirect(validada.volverA)
    return (
      <main className="login">
        <p>{validada.mensaje}</p>
      </main>
    )
  }
  const { pedido } = validada

  return (
    <main className="login">
      <h1>Conectar {pedido.nombreCliente}</h1>
      <p>
        {pedido.nombreCliente} va a poder leer clientes, pólizas y riesgos de Broker OS con tu usuario (
        {sesion.principal.email}) y dejar trabajo de riesgos para que una persona del equipo lo revise.
      </p>
      <form action={responder}>
        {Object.entries({
          client_id: pedido.clientId,
          redirect_uri: pedido.redirectUri,
          state: pedido.state ?? undefined,
          response_type: 'code',
          code_challenge: pedido.codeChallenge ?? undefined,
          code_challenge_method: pedido.codeChallenge === null ? undefined : 'S256',
        }).map(([k, v]) => (v === undefined ? null : <input key={k} type="hidden" name={k} value={v} />))}
        <BotonEnviar name="decision" value="autorizar">
          Autorizar
        </BotonEnviar>{' '}
        <BotonEnviar name="decision" value="cancelar">
          Cancelar
        </BotonEnviar>
      </form>
    </main>
  )
}
