// El borde HTTP de las consultas de datos, escrito contra `Request`/`Response` estándar
// y no contra Next.js. No es purismo: es lo que permite que las pruebas negativas que
// D-0059 exige ataquen **la misma función que corre en producción**, con una `Request`
// fabricada, en vez de una imitación suya escrita para el test.
//
// Los route handlers de `apps/web` son envoltorios de tres líneas sobre esto.

import type { AdmissionDenial, Principal } from './session/admission.ts'
import { denialStatus } from './session/admission.ts'
import type { GuardConfig } from './session/guard.ts'
import { admitRequest } from './session/guard.ts'

/**
 * Cuerpo vacío, siempre. Un mensaje que distinguiera "no tenés acceso" de "esa póliza no
 * existe" le diría a quien no está admitido que la póliza existe.
 */
export const deniedResponse = (reason: AdmissionDenial): Response =>
  new Response(null, {
    status: denialStatus(reason),
    headers: {
      // Para quien opera. No viaja en el cuerpo ni identifica al recurso pedido.
      'x-vs01-denial': reason,
      'cache-control': 'no-store',
    },
  })

export const jsonResponse = (payload: unknown): Response =>
  new Response(JSON.stringify(payload), {
    status: 200,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  })

/**
 * Admisión primero, consulta después. El handler recibe el `Principal` ya admitido y no
 * tiene forma de correr sin él.
 */
export const guarded = async (
  request: Request,
  config: GuardConfig,
  handler: (principal: Principal, request: Request) => Promise<Response>,
): Promise<Response> => {
  const outcome = await admitRequest(request, config)
  if (!outcome.admitted) return deniedResponse(outcome.reason)
  return handler(outcome.principal, request)
}
