import { tareaDeVencimiento } from '@del-campo/api'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** Vencimiento automático de pólizas, a las 00:00 de Mendoza. Fuera de la sesión: exige `CRON_SECRET`. */
export const GET = (request: Request): Promise<Response> => tareaDeVencimiento(request)
