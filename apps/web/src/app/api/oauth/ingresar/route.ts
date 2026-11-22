import { sessionConfig } from '@del-campo/api'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Quien llega a autorizar un agente sin sesión inicia sesión con Google y vuelve a la
 * pantalla de autorización. Sólo se guarda una ruta de `/oauth/autorizar`.
 */
export function GET(request: NextRequest): NextResponse {
  const volver = request.nextUrl.searchParams.get('volver') ?? ''
  const response = NextResponse.redirect(new URL('/api/auth/google/start', request.url))
  if (volver.startsWith('/oauth/autorizar?')) {
    response.cookies.set({
      name: 'oauth_volver',
      value: volver,
      httpOnly: true,
      sameSite: 'lax',
      secure: sessionConfig().secureCookies,
      path: '/',
      maxAge: 10 * 60,
    })
  }
  return response
}
