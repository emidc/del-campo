import { retentionJobResponse, withJobSecret } from '../../../../lib/jobs.ts'
import { database, log } from '../../../../lib/server.ts'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** Retención de D-0065 (T-0026). Fuera de la credencial de la UI: exige `CRON_SECRET`. */
export const GET = withJobSecret(() => retentionJobResponse(database(), log))
