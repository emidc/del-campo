import {
  HANDSHAKE_COOKIE,
  HANDSHAKE_TTL_SECONDS,
  buildAuthorizationRequest,
  oidcConfig,
  sealHandshake,
  sessionConfig,
} from '@del-campo/api'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(): Promise<NextResponse> {
  const config = oidcConfig()
  const session = sessionConfig()
  const { url, handshake } = await buildAuthorizationRequest(config)

  const response = NextResponse.redirect(url)
  response.cookies.set({
    name: HANDSHAKE_COOKIE,
    value: await sealHandshake(handshake, session.secret),
    httpOnly: true,
    sameSite: 'lax',
    secure: session.secureCookies,
    path: '/',
    maxAge: HANDSHAKE_TTL_SECONDS,
  })
  return response
}
