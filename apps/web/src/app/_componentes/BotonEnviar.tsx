'use client'

import type { ButtonHTMLAttributes } from 'react'
import { useFormStatus } from 'react-dom'

/**
 * El botón de enviar de un formulario. Mientras la acción del servidor responde, se
 * deshabilita y muestra el aro de espera, para que nadie mande dos veces lo mismo.
 */
export function BotonEnviar({ className, children, ...resto }: ButtonHTMLAttributes<HTMLButtonElement>) {
  const { pending } = useFormStatus()
  const clases = [className, pending ? 'esperando' : undefined].filter((c) => c !== undefined).join(' ')
  return (
    <button type="submit" {...resto} className={clases === '' ? undefined : clases} disabled={pending} aria-busy={pending}>
      {children}
    </button>
  )
}
