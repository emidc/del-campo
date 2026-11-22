import { mcpBrokerOsOauth } from '@del-campo/api'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * El mismo servidor MCP que `/api/mcp/<token>`, para los agentes que inician sesión con
 * OAuth (Gemini lo exige). Sin token responde 401 y dice dónde autorizarse.
 */
const atender = (request: Request): Promise<Response> => mcpBrokerOsOauth(request)

export { atender as DELETE, atender as GET, atender as POST }
