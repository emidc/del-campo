import Link from 'next/link'

export default function NotFound() {
  return (
    <main className="envoltorio">
      <p className="estado">
        No se encontró ese registro en el lote consultado.{' '}
        <Link href="/buscar">Volver a la búsqueda</Link>.
      </p>
    </main>
  )
}
