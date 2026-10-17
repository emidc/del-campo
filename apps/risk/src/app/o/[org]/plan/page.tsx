import { vistaPlan } from '@del-campo/risk'
import { notFound } from 'next/navigation'

import { parseOrganizacion } from '../../../../lib/handlers.ts'
import { requireSession } from '../../../../lib/page-guard.ts'
import { database } from '../../../../lib/server.ts'
import { avisoDe } from '../../../../vistas/comun.ts'
import { PaginaPlan } from '../../../../vistas/organizacion.ts'

export const dynamic = 'force-dynamic'

export default async function Plan({ params, searchParams }: {
  readonly params: Promise<{ org: string }>
  readonly searchParams: Promise<{ ok?: string; error?: string }>
}) {
  const sesion = await requireSession()
  const org = parseOrganizacion((await params).org)
  if (org === null) notFound()
  const vista = await vistaPlan(database(), sesion, org)
  if (vista === null) notFound()
  return PaginaPlan(vista, sesion.nombre, avisoDe(await searchParams))
}
