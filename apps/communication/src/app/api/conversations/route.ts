import { withSession } from '../../../lib/guard.ts'
import { listConversationsResponse } from '../../../lib/handlers.ts'
import { database } from '../../../lib/server.ts'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export const GET = withSession(() => listConversationsResponse(database()))
