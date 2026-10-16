import { VERSION_METODOLOGIA, vistaEscenarios } from '@del-campo/risk'
import { notFound } from 'next/navigation'

import { parseOrganizacion } from '../../../../lib/handlers.ts'
import { requireSession } from '../../../../lib/page-guard.ts'
import { database } from '../../../../lib/server.ts'
import { PaginaEscenarios } from '../../../../vistas/organizacion.ts'

export const dynamic = 'force-dynamic'

export default async function Escenarios({ params }: { readonly params: Promise<{ org: string }> }) {
  const sesion = await requireSession()
  const org = parseOrganizacion((await params).org)
  if (org === null) notFound()
  const vista = await vistaEscenarios(database(), sesion, VERSION_METODOLOGIA, org)
  if (vista === null) notFound()
  return PaginaEscenarios(vista, sesion.nombre)
}
