import { withSession } from '../../../lib/guard.ts'
import { listConversationsResponse } from '../../../lib/handlers.ts'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export const GET = withSession((_request, datos) => listConversationsResponse(datos))
