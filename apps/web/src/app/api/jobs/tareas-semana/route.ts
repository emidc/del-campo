import { tareaDeLimpiezaSemanal } from '@del-campo/api'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** Limpieza del tablero semanal, los lunes a las 00:00 de Mendoza. Fuera de la sesión: exige `CRON_SECRET`. */
export const GET = (request: Request): Promise<Response> => tareaDeLimpiezaSemanal(request)
