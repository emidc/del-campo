// Guard de páginas: la misma verificación que `guardRequest`, con la cookie que da Next.
// Importa `next/headers`, que Next rechaza en un Client Component: este módulo solo
// corre en el servidor, igual que `apps/web/src/lib/sesion.ts`.

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

import { authConfigFromEnv, SESSION_COOKIE, verifySession } from './auth.ts'

/** Sin configuración o sin sesión válida, a `/login`, que no muestra datos. */
export const requireSession = async (): Promise<void> => {
  const result = authConfigFromEnv(process.env)
  if (!result.ok) redirect('/login')
  const jar = await cookies()
  if (!verifySession(result.config, jar.get(SESSION_COOKIE)?.value)) redirect('/login')
}
