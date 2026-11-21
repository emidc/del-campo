import { ORIGENES_DE_PROSPECTO, PROSPECT_ORIGINS, latestBatch } from '@del-campo/api'
import Link from 'next/link'

import { Cabecera } from '@/app/_componentes/Cabecera'
import { consultar, requireAdmitted } from '@/lib/sesion'

import { FormularioDeProspecto } from './Formulario'

export const dynamic = 'force-dynamic'

export default async function NuevoProspectoPage() {
  const principal = await requireAdmitted()
  const lote = await consultar(latestBatch(principal))
  return (
    <main className="envoltorio">
      <Cabecera lote={lote} email={principal.email} />
      <nav className="migas" aria-label="Migas de pan">
        <Link href="/clientes?tipo=prospectos">Prospectos</Link>
        <span aria-hidden="true">›</span>
        <span>Nuevo prospecto</span>
      </nav>
      <h1>Nuevo prospecto</h1>
      <p className="meta">Alcanza con el nombre y el origen. El resto se puede completar después en la ficha.</p>
      <FormularioDeProspecto origenes={PROSPECT_ORIGINS.map((o) => ({ valor: o, etiqueta: ORIGENES_DE_PROSPECTO[o] }))} />
    </main>
  )
}
