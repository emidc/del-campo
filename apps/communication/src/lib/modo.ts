// Qué método de entrada usa Communication OS (plan de migración de T-0035, §3). Desde la
// fase 5 queda uno solo: `oidc`. La credencial compartida de D-0066 (`legacy`) se retiró
// del código; la variable sigue existiendo para que un valor viejo no pase en silencio.

export type ModoAcceso = 'oidc'

/**
 * `oidc` si la variable no está o dice `oidc`. `legacy` **lanza**, igual que un valor
 * desconocido: quien lo ponga en Vercel esperando volver atrás obtiene una app que no
 * responde, nunca una que entra por otra regla.
 */
export const modoAcceso = (valor: string | undefined = process.env.AUTH_MODE): ModoAcceso => {
  const limpio = valor?.trim() ?? ''
  if (limpio === '' || limpio === 'oidc') return 'oidc'
  if (limpio === 'legacy') {
    throw new Error('AUTH_MODE="legacy" se retiró en la fase 5 de T-0035: Communication OS sólo admite oidc')
  }
  throw new Error(`AUTH_MODE="${limpio}" no es un modo válido: oidc`)
}
