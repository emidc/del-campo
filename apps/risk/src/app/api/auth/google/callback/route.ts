import { identidadDelCallback, pedirAutorizacion } from '@del-campo/identidad'

import { callbackResponse } from '../../../../../lib/entrada.ts'
import { database } from '../../../../../lib/server.ts'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Sin `withSesion`: es donde se obtiene la sesión. La URI que hay que registrar en el cliente
 * OAuth es `RISK_BASE_URL` + `/api/auth/google/callback`. En `legacy`, 404.
 */
export function GET(request: Request): Promise<Response> {
  return callbackResponse(request, process.env, { pedir: pedirAutorizacion, canjear: identidadDelCallback, conexion: () => database() })
}
