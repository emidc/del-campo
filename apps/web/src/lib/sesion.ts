import type { GuardConfig, Principal } from '@del-campo/api'
import { SESSION_COOKIE, admissionConfig, admitCookie, sessionConfig } from '@del-campo/api'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

/**
 * Este módulo sólo corre en el servidor, y no por convención: importa `next/headers`,
 * que el propio Next.js rechaza en un Client Component. La verificación de sesión que
 * D-0059 exige "del lado del servidor" deja así de depender de que nadie se equivoque.
 *
 * (Se evaluó agregar el paquete `server-only` para hacerlo explícito; no se agregó
 * porque R-05 exige un ADR por dependencia nueva y `next/headers` ya da la misma
 * garantía sin incorporar ninguna.)
 */
export const guardConfig = (): GuardConfig => ({
  admission: admissionConfig(),
  session: sessionConfig(),
})

/**
 * Guard de páginas. Misma regla que la de las consultas de datos —comparten
 * `evaluateAdmission`— y esa equivalencia está probada en
 * `packages/api/src/session/guard-paginas.test.ts`.
 */
export const requireAdmitted = async (): Promise<Principal> => {
  const jar = await cookies()
  const outcome = await admitCookie(jar.get(SESSION_COOKIE)?.value, guardConfig())
  if (!outcome.admitted) redirect(`/login?motivo=${outcome.reason}`)
  return outcome.principal
}
