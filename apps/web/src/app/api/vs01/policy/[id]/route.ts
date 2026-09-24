import { guarded, jsonResponse, policy } from '@del-campo/api'

import { fechaDeHoy } from '@/lib/criterios'
import { guardConfig } from '@/lib/sesion'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export function GET(
  request: Request,
  context: { readonly params: Promise<{ readonly id: string }> },
): Promise<Response> {
  return guarded(request, guardConfig(), async (principal) => {
    const { id } = await context.params
    const vista = await policy(principal, id, fechaDeHoy())
    // El 404 sólo se alcanza con sesión admitida. Sin admisión, `guarded` ya respondió
    // 401/403 con cuerpo vacío, de modo que la existencia de la póliza no se filtra.
    if (vista === null) {
      return new Response(null, { status: 404, headers: { 'cache-control': 'no-store' } })
    }
    return jsonResponse(vista)
  })
}
