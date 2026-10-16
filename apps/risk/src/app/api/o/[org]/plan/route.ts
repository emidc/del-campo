import { withSesion } from '../../../../../lib/guard.ts'
import { vistaDeOrganizacionResponse } from '../../../../../lib/handlers.ts'
import { deps } from '../../../../../lib/server.ts'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export const GET = withSesion<{ params: Promise<{ org: string }> }>(
  async (request, sesion, db, { params }) => vistaDeOrganizacionResponse(request, sesion, db, 'plan', (await params).org), deps)
