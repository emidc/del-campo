import { logoutResponse } from '../../../lib/handlers.ts'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export const POST = (request: Request): Response => logoutResponse(request)
