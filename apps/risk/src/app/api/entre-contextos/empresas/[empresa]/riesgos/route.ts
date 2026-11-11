// Los riesgos de una empresa de Broker OS, para su ficha (C4-03a). Lo llama Broker OS con el
// token de la persona; ver `lib/llamada.ts` y docs/desarrollo/riesgos-en-la-ficha.md §2.

import { riesgosDeEmpresa, VERSION_METODOLOGIA } from '@del-campo/risk'

import { json } from '../../../../../../lib/guard.ts'
import { withLlamada } from '../../../../../../lib/llamada.ts'
import { deps } from '../../../../../../lib/server.ts'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export const GET = withLlamada<{ params: Promise<{ empresa: string }> }>(
  async (_request, sesion, db, { params }) => json(await riesgosDeEmpresa(db, sesion, VERSION_METODOLOGIA, (await params).empresa)), deps)
