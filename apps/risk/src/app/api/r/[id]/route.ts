import { withSesion } from '../../../../lib/guard.ts'
import { detalleResponse } from '../../../../lib/handlers.ts'
import { deps } from '../../../../lib/server.ts'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export const GET = withSesion<{ params: Promise<{ id: string }> }>(
  async (_request, sesion, db, { params }) => detalleResponse(sesion, db, (await params).id), deps)
