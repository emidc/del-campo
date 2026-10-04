import type { ReactNode } from 'react'

import './globals.css'

export const metadata = {
  title: 'Communication OS · CO01',
  robots: { index: false, follow: false },
}

export default function RootLayout({ children }: { readonly children: ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  )
}
