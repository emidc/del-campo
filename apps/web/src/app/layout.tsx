import type { Metadata } from 'next'
import type { ReactNode } from 'react'

import './globals.css'

export const metadata: Metadata = {
  title: 'Broker OS — VS01',
  description: 'Búsqueda interna de pólizas y acceso documental. Uso interno.',
  robots: { index: false, follow: false },
}

export default function RootLayout({ children }: { readonly children: ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  )
}
