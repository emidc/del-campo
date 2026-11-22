import { metadatosDelRecurso } from '@del-campo/api'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** RFC 9728. Llega por el rewrite de `/.well-known/oauth-protected-resource` (ver next.config.ts). */
export const GET = (request: Request): Response => metadatosDelRecurso(request)
