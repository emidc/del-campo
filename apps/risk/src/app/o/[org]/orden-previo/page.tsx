import { pantallaOrdenPrevio, SinPermiso } from '@del-campo/risk'
import { notFound } from 'next/navigation'

import { parseOrganizacion } from '../../../../lib/handlers.ts'
import { requireSession } from '../../../../lib/page-guard.ts'
import { avisoDe, PaginaSinAcceso, permisosDe } from '../../../../vistas/comun.ts'
import { PaginaOrdenPrevio } from '../../../../vistas/organizacion.ts'

export const dynamic = 'force-dynamic'

// El material ciego no es una vista con resultados: no registra acceso (decisión 6; A8a).
export default async function OrdenPrevio({ params, searchParams }: {
  readonly params: Promise<{ org: string }>
  readonly searchParams: Promise<{ ok?: string; error?: string }>
}) {
  const sesion = await requireSession()
  const org = parseOrganizacion((await params).org)
  if (org === null) notFound()
  const pantalla = await sesion.datos((db, s) => pantallaOrdenPrevio(db, s, org))
  if (pantalla instanceof SinPermiso) return PaginaSinAcceso(pantalla.message, sesion.nombre, org)
  if (pantalla === null) notFound()
  return PaginaOrdenPrevio(pantalla, sesion.nombre, avisoDe(await searchParams), permisosDe(sesion.rol))
}
