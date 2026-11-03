import { pedirAutorizacion } from '@del-campo/identidad'

import { inicioResponse } from '../../../../../lib/entrada.ts'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** Sin `withSesion`: es donde empieza la entrada. En `legacy`, 404 (T-0035). */
export function GET(): Promise<Response> {
  return inicioResponse(process.env, { pedir: pedirAutorizacion })
}
