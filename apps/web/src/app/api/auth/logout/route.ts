import { HANDSHAKE_COOKIE, SESSION_COOKIE, oidcConfig } from '@del-campo/api'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Cierra la sesión de Broker OS. No cierra la sesión de Google de la persona: Drive
 * sigue siendo quien determina el acceso documental (D-0040, D-0057).
 */
export function GET(): NextResponse {
  const response = NextResponse.redirect(new URL('/login', oidcConfig().baseUrl))
  response.cookies.delete(SESSION_COOKIE)
  response.cookies.delete(HANDSHAKE_COOKIE)
  return response
}
