// Guard de páginas: la misma verificación que `guardRequest`, con la cookie que da Next.
// Importa `next/headers`, que sólo existe en el servidor: este módulo nunca va a un Client
// Component.

import { sesionVigente, type Sesion } from '@del-campo/risk'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

import { database } from './server.ts'
import { configFromEnv, SESSION_COOKIE, verifySession } from './sesion.ts'

/** La sesión de la persona. Sin configuración o sin sesión vigente, a `/login`, que no muestra datos. */
export const requireSession = async (): Promise<Sesion> => {
  const result = configFromEnv(process.env)
  if (!result.ok) redirect('/login')
  const jar = await cookies()
  const token = verifySession(result.config.sessionSecret, jar.get(SESSION_COOKIE)?.value)
  if (token === null) redirect('/login')
  const sesion = await sesionVigente(database(), token.personaId, token.credencialId)
  if (sesion === null) redirect('/login')
  return sesion
}
