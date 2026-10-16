import { configFromEnv } from '../../lib/sesion.ts'
import { PaginaLogin } from '../../vistas/inicio.ts'

export const dynamic = 'force-dynamic'

/** No muestra datos: el formulario, o que la UI no está configurada. */
export default async function LoginPage({ searchParams }: { readonly searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams
  return PaginaLogin(configFromEnv(process.env).ok, error !== undefined)
}
