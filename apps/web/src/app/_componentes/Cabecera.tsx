import type { BatchStamp } from '@del-campo/api'
import { batchLabel } from '@del-campo/api'
import Link from 'next/link'

/**
 * La fecha del lote se muestra en todas las pantallas con datos. `SLICES/VS01.md` §2 lo
 * exige para que los resultados no aparenten ser datos en vivo de Zoho; cuando la base no
 * declara ningún lote, se dice eso mismo en vez de callar.
 */
export function Cabecera({ lote, email }: { readonly lote: BatchStamp; readonly email: string }) {
  return (
    <header className="cabecera">
      <h1>Broker OS · VS01</h1>
      <nav>
        <Link href="/buscar">Buscar</Link>
        <span className="meta">{email}</span>
        <a href="/api/auth/logout">Salir</a>
      </nav>
      <p className={lote.known ? 'lote' : 'lote lote--desconocido'}>
        {batchLabel(lote)}
        {lote.manifestPrefix === null ? null : ` · manifiesto ${lote.manifestPrefix}…`}
      </p>
    </header>
  )
}
