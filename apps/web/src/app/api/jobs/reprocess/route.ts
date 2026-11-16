import { tareaDeReproceso } from '@del-campo/api'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** Reproceso de entregas de WhatsApp fallidas o atascadas. Exige `CRON_SECRET`. */
export const GET = (request: Request): Promise<Response> => tareaDeReproceso(request)
