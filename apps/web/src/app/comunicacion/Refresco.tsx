'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

const CADA_MS = 20_000

/**
 * Vuelve a pedir la página cada 20 segundos mientras la pestaña está a la vista, para que
 * los mensajes nuevos aparezcan solos. `router.refresh` no pierde lo que se está escribiendo.
 */
export function Refresco() {
  const router = useRouter()
  useEffect(() => {
    const reloj = setInterval(() => {
      if (document.visibilityState === 'visible') router.refresh()
    }, CADA_MS)
    return () => {
      clearInterval(reloj)
    }
  }, [router])
  return null
}
