import { withSesion } from '../../../../../lib/guard.ts'
import { actualizarRiesgoResponse } from '../../../../../lib/actualizar.ts'
import { deps } from '../../../../../lib/server.ts'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export const POST = withSesion<{ params: Promise<{ id: string }> }>(
  async (request, sesion, db, { params }) => actualizarRiesgoResponse(request, sesion, db, (await params).id), deps)
