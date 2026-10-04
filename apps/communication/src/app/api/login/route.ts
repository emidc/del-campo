import { loginResponse } from '../../../lib/handlers.ts'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** Sin `withSession`: es donde se obtiene la credencial. Se niega sin configuración. */
export function POST(request: Request): Promise<Response> {
  return loginResponse(request, process.env)
}
