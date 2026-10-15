import { withSesion } from '../../../lib/guard.ts'
import { organizacionesResponse } from '../../../lib/handlers.ts'
import { deps } from '../../../lib/server.ts'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export const GET = withSesion((_request, sesion, db) => organizacionesResponse(sesion, db), deps)
