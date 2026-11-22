import { metadatosDelServidor } from '@del-campo/api'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** RFC 8414, por el rewrite de `/.well-known/oauth-authorization-server` (ver next.config.ts). */
export const GET = (request: Request): Response => metadatosDelServidor(request)
