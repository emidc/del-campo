const MOTIVO: Record<string, string> = {
  NO_SESSION: 'Iniciá sesión con tu cuenta corporativa para continuar.',
  INVALID_TOKEN: 'Tu sesión no es válida. Iniciá sesión de nuevo.',
  EXPIRED: 'Tu sesión venció. Iniciá sesión de nuevo.',
  EMAIL_UNVERIFIED: 'Esa cuenta no tiene el correo verificado.',
  OUTSIDE_WORKSPACE: 'Esa cuenta no pertenece al Workspace de la correduría.',
  NOT_ADMITTED: 'Esa cuenta no está en la lista de acceso. Pedíselo al owner.',
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
      <h1 style={{ fontSize: '1.1rem' }}>Broker OS · VS01</h1>
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
