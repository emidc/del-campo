const MOTIVO: Record<string, string> = {
  NO_SESSION: 'Iniciá sesión con tu cuenta de Google para continuar.',
  INVALID_TOKEN: 'Tu sesión no es válida. Iniciá sesión de nuevo.',
  EXPIRED: 'Tu sesión venció. Iniciá sesión de nuevo.',
  EMAIL_UNVERIFIED: 'Esa cuenta no tiene el correo verificado.',
  NOT_ADMITTED: 'No se pudo entrar con esa cuenta. Si te invitaron, pedile ayuda a un Administrador.',
}

export const dynamic = 'force-dynamic'

export default async function LoginPage({
  searchParams,
}: {
  readonly searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  const crudo = params.motivo
  const clave = Array.isArray(crudo) ? crudo[0] : crudo
  // El motivo explica por qué no entró, nunca qué datos hay del otro lado.
  const mensaje = (clave === undefined ? undefined : MOTIVO[clave]) ?? MOTIVO.NO_SESSION

  return (
    <main className="login">
      <div className="logo">
        <span className="logo__d">D</span>
        <span className="logo__texto">
          <b>BROKER OS</b>
          <span>Del Campo · Gestión de riesgos</span>
        </span>
      </div>
      <p>{mensaje}</p>
      <a className="boton" href="/api/auth/google/start">
        Ingresar con Google
      </a>
      <p style={{ marginTop: '1.5rem', fontSize: '0.78rem' }}>
        Uso interno. El acceso se otorga por lista explícita; no hay registro público.
      </p>
    </main>
  )
}
