import { logoutResponse } from '../../../lib/handlers.ts'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** Sin `withSession`: borrar la cookie no expone nada. Exige el mismo origen. */
export function POST(request: Request): Response {
  return logoutResponse(request)
}
