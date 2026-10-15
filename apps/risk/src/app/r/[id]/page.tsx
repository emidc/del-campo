import { VERSION_METODOLOGIA, vistaDetalle } from '@del-campo/risk'
import { notFound } from 'next/navigation'

import { parseRiesgo } from '../../../lib/handlers.ts'
import { requireSession } from '../../../lib/page-guard.ts'
import { database } from '../../../lib/server.ts'
import { PaginaDetalle } from '../../../vistas/detalle.ts'

export const dynamic = 'force-dynamic'

export default async function Detalle({ params }: { readonly params: Promise<{ id: string }> }) {
  const sesion = await requireSession()
  const id = parseRiesgo((await params).id)
  if (id === null) notFound()
  const vista = await vistaDetalle(database(), sesion, VERSION_METODOLOGIA, id)
  if (vista === null) notFound()
  return PaginaDetalle(vista, sesion.nombre)
}
