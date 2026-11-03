// Guard de páginas: la misma verificación que `withSesion`, con la cookie que da Next.
// Importa `next/headers`, que sólo existe en el servidor: este módulo nunca va a un Client
// Component. La lógica está en `pagina.ts`.

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

import { sesionDePagina, type SesionDePagina } from './pagina.ts'
import { database } from './server.ts'

export type { SesionDePagina } from './pagina.ts'

/**
 * La sesión de la persona. Sin configuración o sin sesión vigente, a `/login`, que no muestra
 * datos. Toda lectura de la página pasa por `sesion.datos(…)`.
 */
export const requireSession = async (): Promise<SesionDePagina> => {
  const jar = await cookies()
  const sesion = await sesionDePagina({
    env: process.env,
    cookie: (nombre) => jar.get(nombre)?.value,
    db: () => database(),
    alLogin: () => redirect('/login'),
  })
  if (sesion === null) redirect('/login')
  return sesion
}
