import { SinPermiso, VERSION_METODOLOGIA, vistaActividad, vistaTransferencia } from '@del-campo/risk'
import { notFound } from 'next/navigation'

import { parseOrganizacion } from '../../../../lib/handlers.ts'
import { requireSession } from '../../../../lib/page-guard.ts'
import { avisoDe, PaginaSinAcceso, permisosDe } from '../../../../vistas/comun.ts'
import { PaginaTransferencia } from '../../../../vistas/organizacion.ts'

export const dynamic = 'force-dynamic'

export default async function Transferencia({ params, searchParams }: {
  readonly params: Promise<{ org: string }>
  readonly searchParams: Promise<{ ok?: string; error?: string }>
}) {
  const sesion = await requireSession()
  const org = parseOrganizacion((await params).org)
  if (org === null) notFound()
  const vistas = await sesion.datos(async (db, s) => ({
    transferencia: await vistaTransferencia(db, s, VERSION_METODOLOGIA, org),
    actividad: await vistaActividad(db, s, org),
  }))
  if (vistas instanceof SinPermiso) return PaginaSinAcceso(vistas.message, sesion.nombre, org)
  const { transferencia, actividad } = vistas
  if (transferencia === null || actividad === null) notFound()
  return PaginaTransferencia(transferencia, actividad, sesion.nombre, avisoDe(await searchParams), permisosDe(sesion.rol))
}
