import { guarded, jsonResponse, search } from '@del-campo/api'

import { fechaDeHoy, leerCriterios } from '@/lib/criterios'
import { guardConfig } from '@/lib/sesion'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Consulta directa de datos. El envoltorio es intencionalmente mínimo: la admisión, el
 * código de estado y el cuerpo vacío de las respuestas negativas viven en `guarded`
 * (`packages/api/src/http.ts`), que es donde están sus pruebas. Lo que corre acá es lo
 * mismo que esas pruebas ejercitan.
 */
export function GET(request: Request): Promise<Response> {
  return guarded(request, guardConfig(), async (principal, req) => {
    const params = Object.fromEntries(new URL(req.url).searchParams)
    const { criterios } = leerCriterios(params, fechaDeHoy())
    if (criterios === null) {
      return new Response(null, { status: 400, headers: { 'cache-control': 'no-store' } })
    }
    const resultado = await search(principal, criterios)
    return jsonResponse({
      state: resultado.state,
      ambiguous: resultado.ambiguous,
      tally: resultado.tally,
      candidates: resultado.candidates.map((candidato) => ({
        ...candidato,
        access: resultado.documentAccess.get(candidato.policyId) ?? null,
      })),
    })
  })
}
