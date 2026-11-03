import { organizaciones, SinPermiso } from '@del-campo/risk'

import { requireSession } from '../lib/page-guard.ts'
import { PaginaSinAcceso } from '../vistas/comun.ts'
import { PaginaOrganizaciones } from '../vistas/inicio.ts'

export const dynamic = 'force-dynamic'

export default async function Inicio() {
  const sesion = await requireSession()
  const os = await sesion.datos((db, s) => organizaciones(db, s))
  if (os instanceof SinPermiso) return PaginaSinAcceso(os.message, sesion.nombre)
  return PaginaOrganizaciones(os, sesion.nombre)
}
