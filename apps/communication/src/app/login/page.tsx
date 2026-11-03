import { authConfigFromEnv } from '../../lib/auth.ts'
import { configEntrada } from '../../lib/identidad.ts'
import { modoAcceso } from '../../lib/modo.ts'

export const dynamic = 'force-dynamic'

/**
 * No muestra datos. En `legacy`, el formulario de la credencial compartida (D-0066); en
 * `oidc`, el botón de Google (T-0035). Un rechazo dice siempre lo mismo: el motivo
 * queda en el servidor.
 */
export default async function LoginPage({ searchParams }: { readonly searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams
  if (modoAcceso() === 'oidc') {
    if (configEntrada(process.env) === null) {
      return (
        <main>
          <p className="notice error">La UI no está configurada. Falta la configuración de Google.</p>
        </main>
      )
    }
    return (
      <main>
        <div className="login panel">
          <h1>Communication OS</h1>
          {error === undefined ? null : (
            <p className="notice error">No se pudo entrar con esa cuenta. Si te invitaron, pedile ayuda a un Administrador.</p>
          )}
          <a className="button" href="/api/auth/google/start">
            Entrar con Google
          </a>
        </div>
      </main>
    )
  }
  if (!authConfigFromEnv(process.env).ok) {
    return (
      <main>
        <p className="notice error">La UI no está configurada. Falta la credencial compartida.</p>
      </main>
    )
  }
  return (
    <main>
      <form className="login panel" method="post" action="/api/login">
        <h1>Communication OS</h1>
        {error === undefined ? null : <p className="notice error">Usuario o contraseña incorrectos.</p>}
        <label>
          Usuario
          <input name="user" autoComplete="username" required />
        </label>
        <label>
          Contraseña
          <input name="password" type="password" autoComplete="current-password" required />
        </label>
        <button type="submit">Entrar</button>
      </form>
    </main>
  )
}
