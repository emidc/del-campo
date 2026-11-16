import { tareaDeRetencion } from '@del-campo/api'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** Retención de Comunicación (D-0065). Fuera de la sesión del equipo: exige `CRON_SECRET`. */
export const GET = (request: Request): Promise<Response> => tareaDeRetencion(request)
