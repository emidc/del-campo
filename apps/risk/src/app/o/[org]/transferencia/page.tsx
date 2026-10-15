import { VERSION_METODOLOGIA, vistaActividad, vistaTransferencia } from '@del-campo/risk'
import { notFound } from 'next/navigation'

import { parseOrganizacion } from '../../../../lib/handlers.ts'
import { requireSession } from '../../../../lib/page-guard.ts'
import { database } from '../../../../lib/server.ts'
import { PaginaTransferencia } from '../../../../vistas/organizacion.ts'

export const dynamic = 'force-dynamic'

export default async function Transferencia({ params }: { readonly params: Promise<{ org: string }> }) {
  const sesion = await requireSession()
  const org = parseOrganizacion((await params).org)
  if (org === null) notFound()
  const db = database()
  const transferencia = await vistaTransferencia(db, sesion, VERSION_METODOLOGIA, org)
  const actividad = await vistaActividad(db, sesion, org)
  if (transferencia === null || actividad === null) notFound()
  return PaginaTransferencia(transferencia, actividad, sesion.nombre)
}
