import {
  HANDSHAKE_COOKIE,
  admissionConfig,
  claimsFromCallback,
  evaluateAdmission,
  oidcConfig,
  readHandshake,
  sealSession,
  sessionConfig,
  sessionCookie,
} from '@del-campo/api'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * La ruta que hay que registrar en el cliente OAuth es exactamente ésta:
 * `/api/auth/google/callback`. → `docs/despliegue/vercel-vs01.md`
 *
 * El canje del código establece **quién** es. La admisión —email verificado, pertenencia
 * al Workspace y lista del owner— se decide después y con código propio, y sólo entonces
 * se emite la cookie de sesión. Una cuenta no admitida vuelve al login sin sesión: el
 * login de Google no es, por sí solo, una autorización.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const config = oidcConfig()
  const session = sessionConfig()

  const handshake = await readHandshake(
    request.cookies.get(HANDSHAKE_COOKIE)?.value,
    session.secret,
  )
  if (handshake === null) {
    return NextResponse.redirect(new URL('/login?motivo=INVALID_TOKEN', config.baseUrl))
  }

  // La URL se reconstruye sobre `baseUrl` y no sobre el header Host, que un cliente
  // controla: el `redirect_uri` que la biblioteca compara tiene que ser el configurado.
  const currentUrl = new URL(`${config.redirectPath}${request.nextUrl.search}`, config.baseUrl)

  let redirectTo = '/buscar'
  let cookieValue: string | null = null

  try {
    const claims = await claimsFromCallback(config, currentUrl, handshake)
    const outcome = evaluateAdmission({ kind: 'CLAIMS', claims }, admissionConfig())
    if (outcome.admitted) {
      cookieValue = await sealSession(claims, session.secret)
    } else {
      redirectTo = `/login?motivo=${outcome.reason}`
    }
  } catch {
    // Un canje fallido —código reusado, `state` que no coincide, red caída— no distingue
    // su causa hacia afuera: sería información sobre el flujo de autenticación.
    redirectTo = '/login?motivo=INVALID_TOKEN'
  }

  const response = NextResponse.redirect(new URL(redirectTo, config.baseUrl))
  response.cookies.delete(HANDSHAKE_COOKIE)
  if (cookieValue !== null) {
    // Los atributos salen de `sessionCookie`, que es lo que los tests describen. Copiarlos
    // inline acá los dejaría fuera del alcance de esos tests: sacarle `httpOnly` a una
    // copia habría dejado la suite en verde.
    response.cookies.set({ ...sessionCookie(cookieValue, session.secureCookies) })
  }
  return response
}
