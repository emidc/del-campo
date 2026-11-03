// Guard de páginas: la misma verificación que `withSession`, con la cookie que da Next.
// Importa `next/headers`, que Next rechaza en un Client Component: este módulo solo
// corre en el servidor, igual que `apps/web/src/lib/sesion.ts`.
//
// Las páginas no leen datos: los piden los componentes cliente a los endpoints, que pasan
// por `withSession` y, en `oidc`, por la admisión en la base en cada request. Por eso acá
// alcanza con la sesión: una persona dada de baja ve la página vacía y el primer pedido
// la manda al login.

import { evaluarSesion, leerSesion } from '@del-campo/identidad'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

import { authConfigFromEnv, SESSION_COOKIE, verifySession } from './auth.ts'
import { COOKIE_IDENTIDAD, configEntrada } from './identidad.ts'
import { modoAcceso } from './modo.ts'

/** Sin configuración o sin sesión válida, a `/login`, que no muestra datos. */
export const requireSession = async (): Promise<void> => {
  const jar = await cookies()
  if (modoAcceso() === 'oidc') {
    const config = configEntrada(process.env)
    if (config === null) redirect('/login')
    const sesion = evaluarSesion(await leerSesion(jar.get(COOKIE_IDENTIDAD)?.value, config.sesion))
    if (!sesion.ok) redirect('/login')
    return
  }
  const result = authConfigFromEnv(process.env)
  if (!result.ok) redirect('/login')
  if (!verifySession(result.config, jar.get(SESSION_COOKIE)?.value)) redirect('/login')
}
