import { withSession } from '../../../../../lib/guard.ts'
import { replyResponse } from '../../../../../lib/handlers.ts'
import { database, log, sendSetup } from '../../../../../lib/server.ts'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export function POST(request: Request, context: { params: Promise<{ id: string }> }): Promise<Response> {
  return withSession(async (req) =>
    replyResponse(req, (await context.params).id, { sql: database(), setup: sendSetup(), log }),
  )(request)
}
