import { withSession } from '../../../../lib/guard.ts'
import { threadResponse } from '../../../../lib/handlers.ts'
import { database, sendSetup } from '../../../../lib/server.ts'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export function GET(request: Request, context: { params: Promise<{ id: string }> }): Promise<Response> {
  return withSession(async () => threadResponse(database(), (await context.params).id, sendSetup() !== null))(request)
}
