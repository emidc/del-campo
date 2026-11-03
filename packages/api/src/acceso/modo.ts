// Qué método de entrada usa Broker OS (plan de migración de T-0035, §3). Un solo método
// por despliegue: con dos vivos a la vez, la baja habría que hacerla dos veces y la
// revocación dejaría de ser inmediata.

export type ModoAcceso = 'legacy' | 'oidc'

/**
 * `legacy` si la variable no está: desplegar la fase 0 no cambia nada para nadie. Un valor
 * desconocido **lanza**: un error tipográfico en Vercel no puede elegir un modo en silencio.
 */
export const modoAcceso = (valor: string | undefined = process.env.AUTH_MODE): ModoAcceso => {
  const limpio = valor?.trim() ?? ''
  if (limpio === '' || limpio === 'legacy') return 'legacy'
  if (limpio === 'oidc') return 'oidc'
  throw new Error(`AUTH_MODE="${limpio}" no es un modo válido: legacy u oidc`)
}
