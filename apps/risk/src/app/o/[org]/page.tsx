import { VERSION_METODOLOGIA, vistaLista } from '@del-campo/risk'
import { notFound } from 'next/navigation'

import { parseOrganizacion, parseUnidad } from '../../../lib/handlers.ts'
import { requireSession } from '../../../lib/page-guard.ts'
import { database } from '../../../lib/server.ts'
import { avisoDe } from '../../../vistas/comun.ts'
import { PaginaLista } from '../../../vistas/lista.ts'

export const dynamic = 'force-dynamic'

export default async function Lista({ params, searchParams }: {
  readonly params: Promise<{ org: string }>
  readonly searchParams: Promise<{ unidad?: string; ok?: string; error?: string }>
}) {
  const sesion = await requireSession()
  const org = parseOrganizacion((await params).org)
  const q = await searchParams
  const unidad = parseUnidad(q.unidad)
  if (org === null || unidad === undefined) notFound()
  const vista = await vistaLista(database(), sesion, VERSION_METODOLOGIA, org, unidad)
  if (vista === null) notFound()
  return PaginaLista(vista, sesion.nombre, avisoDe(q))
}
