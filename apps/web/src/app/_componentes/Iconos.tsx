// Íconos de trazo, sin biblioteca. Heredan el color del texto y no se anuncian: el botón
// que los lleva tiene su propio nombre accesible.

import type { ReactNode } from 'react'

const Trazo = ({ children }: { readonly children: ReactNode }) => (
  <svg
    className="icono"
    viewBox="0 0 24 24"
    width="16"
    height="16"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    focusable="false"
  >
    {children}
  </svg>
)

export const IconoLapiz = () => (
  <Trazo>
    <path d="M12 20h9" />
    <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
  </Trazo>
)

export const IconoMas = () => (
  <Trazo>
    <path d="M12 5v14M5 12h14" />
  </Trazo>
)

export const IconoCruz = () => (
  <Trazo>
    <path d="M18 6 6 18M6 6l12 12" />
  </Trazo>
)

export const IconoCheck = () => (
  <Trazo>
    <path d="M20 6 9 17l-5-5" />
  </Trazo>
)

export const IconoPapelera = () => (
  <Trazo>
    <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" />
  </Trazo>
)

/** Crear gestión: una carpeta. */
export const IconoGestion = () => (
  <Trazo>
    <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z" />
    <path d="M12 11v5M9.5 13.5h5" />
  </Trazo>
)

/** Tarea de seguimiento: un reloj. */
export const IconoTarea = () => (
  <Trazo>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 2" />
  </Trazo>
)

/** Renovar póliza: dos flechas en círculo. */
export const IconoRenovar = () => (
  <Trazo>
    <path d="M21 12a9 9 0 0 1-15.5 6.2L3 16" />
    <path d="M3 12A9 9 0 0 1 18.5 5.8L21 8" />
    <path d="M21 3v5h-5M3 21v-5h5" />
  </Trazo>
)

/** Registrar refacturación: un comprobante. */
export const IconoRefacturar = () => (
  <Trazo>
    <path d="M6 2h12v20l-3-2-3 2-3-2-3 2Z" />
    <path d="M9 7h6M9 11h6M9 15h4" />
  </Trazo>
)
