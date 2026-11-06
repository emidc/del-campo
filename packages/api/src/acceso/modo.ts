// Qué método de entrada usa Broker OS (plan de migración de T-0035, §3). Desde la fase 5
// queda uno solo: `oidc`. El modo `legacy` (D-0059: Workspace y lista del owner) se retiró
// del código; la variable sigue existiendo para que un valor viejo no pase en silencio.

export type ModoAcceso = 'oidc'

/**
 * `oidc` si la variable no está o dice `oidc`. `legacy` **lanza**, igual que un valor
 * desconocido: quien lo ponga en Vercel esperando volver atrás obtiene una app que no
 * arranca, nunca una que admite por otra regla.
 */
export const modoAcceso = (valor: string | undefined = process.env.AUTH_MODE): ModoAcceso => {
  const limpio = valor?.trim() ?? ''
  if (limpio === '' || limpio === 'oidc') return 'oidc'
  if (limpio === 'legacy') {
    throw new Error('AUTH_MODE="legacy" se retiró en la fase 5 de T-0035: Broker OS sólo admite oidc')
  }
  throw new Error(`AUTH_MODE="${limpio}" no es un modo válido: oidc`)
}
