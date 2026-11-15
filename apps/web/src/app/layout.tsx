import type { Metadata } from 'next'
import type { ReactNode } from 'react'

import './globals.css'

export const metadata: Metadata = {
  title: 'Broker OS · Del Campo',
  description: 'Sistema de trabajo de Del Campo Broker. Uso interno.',
  robots: { index: false, follow: false },
}

export default function RootLayout({ children }: { readonly children: ReactNode }) {
  return (
    <html lang="es">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Source+Serif+4:opsz,wght@8..60,500;8..60,600&display=swap"
        />
      </head>
      <body>{children}</body>
    </html>
  )
}
