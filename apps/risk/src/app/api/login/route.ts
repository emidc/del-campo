import { loginResponse } from '../../../lib/handlers.ts'
import { database } from '../../../lib/server.ts'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** Usuario y contraseña de una persona (D-0069). Registra el inicio de sesión. */
export const POST = (request: Request): Promise<Response> => loginResponse(request, process.env, () => database())
