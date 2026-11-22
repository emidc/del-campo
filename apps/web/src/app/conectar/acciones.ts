'use server'

// T-0062 — Generar y revocar el token personal para conectar Claude.

import { credencialesManuales, generarTokenMcp, quitarTokenMcp, sessionConfig } from '@del-campo/api'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

import { consultar, requireAdmitted } from '@/lib/sesion'

/** El token recién generado viaja a la pantalla en una cookie de un solo uso, nunca en la URL. */
const COOKIE = 'mcp_token_nuevo'

export async function generar(): Promise<void> {
  const principal = await requireAdmitted()
  const token = await consultar(generarTokenMcp(principal))
  const jar = await cookies()
  jar.set(COOKIE, token, { httpOnly: true, secure: true, sameSite: 'strict', path: '/conectar', maxAge: 60 })
  redirect('/conectar')
}

export async function revocar(): Promise<void> {
  const principal = await requireAdmitted()
  await consultar(quitarTokenMcp(principal))
  redirect('/conectar')
}

/** Client ID y Client secret para un agente que los pide a mano (Gemini), atados a su redirect URI. */
export async function credencialesOauth(datos: FormData): Promise<void> {
  await requireAdmitted()
  const uri = datos.get('redirect_uri')
  const cred = typeof uri === 'string' ? credencialesManuales(uri.trim(), sessionConfig().secret) : null
  const jar = await cookies()
  jar.set('mcp_oauth_nuevo', JSON.stringify(cred ?? { error: true }), {
    httpOnly: true,
    secure: true,
    sameSite: 'strict',
    path: '/conectar',
    maxAge: 60,
  })
  redirect('/conectar')
}
