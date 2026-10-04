import { authConfigFromEnv } from '../../lib/auth.ts'

export const dynamic = 'force-dynamic'

/** No muestra datos: solo el formulario, o que la UI no está configurada. */
export default async function LoginPage({ searchParams }: { readonly searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams
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
