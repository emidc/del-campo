import { reprocessJobResponse, withJobSecret } from '../../../../lib/jobs.ts'
import { database, log } from '../../../../lib/server.ts'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** Reproceso de entregas `failed` y atascadas (T-0026). Exige `CRON_SECRET`. */
export const GET = withJobSecret(() => reprocessJobResponse(database(), process.env, log))
