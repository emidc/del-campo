import { mcpBrokerOs } from '@del-campo/api'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

interface Contexto {
  readonly params: Promise<{ readonly token: string }>
}

/**
 * Servidor MCP de Broker OS (T-0062). No usa la cookie de sesión: quien llama es un agente
 * con el token personal de alguien del equipo, que va en la URL porque es lo que admiten
 * los conectores personalizados de Claude.
 */
const atender = async (request: Request, { params }: Contexto): Promise<Response> =>
  mcpBrokerOs(request, (await params).token)

export { atender as DELETE, atender as GET, atender as POST }
