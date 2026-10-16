import { organizaciones } from '@del-campo/risk'

import { requireSession } from '../lib/page-guard.ts'
import { database } from '../lib/server.ts'
import { PaginaOrganizaciones } from '../vistas/inicio.ts'

export const dynamic = 'force-dynamic'

export default async function Inicio() {
  const sesion = await requireSession()
  return PaginaOrganizaciones(await organizaciones(database(), sesion), sesion.nombre)
}
