import { configEntrada } from '../../lib/identidad.ts'
import { modoAcceso } from '../../lib/modo.ts'
import { configFromEnv } from '../../lib/sesion.ts'
import { PaginaLogin, PaginaLoginGoogle } from '../../vistas/inicio.ts'

export const dynamic = 'force-dynamic'

/** No muestra datos. En `legacy`, usuario y contraseña (D-0069); en `oidc`, el botón de Google (T-0035). */
export default async function LoginPage({ searchParams }: { readonly searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams
  if (modoAcceso() === 'oidc') return PaginaLoginGoogle(configEntrada(process.env) !== null, error !== undefined)
  return PaginaLogin(configFromEnv(process.env).ok, error !== undefined)
}
