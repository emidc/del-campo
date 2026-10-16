import { withSesion } from '../../../../../lib/guard.ts'
import { reordenarResponse } from '../../../../../lib/actualizar.ts'
import { deps } from '../../../../../lib/server.ts'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export const POST = withSesion<{ params: Promise<{ org: string }> }>(
  async (request, sesion, db, { params }) => reordenarResponse(request, sesion, db, (await params).org), deps)
