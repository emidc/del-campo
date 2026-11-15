'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'

/** Trazos de 24×24 para el menú. Son decorativos: el nombre lo da el texto del enlace. */
const ICONOS: Record<string, ReactNode> = {
  inicio: <path d="M4 11l8-7 8 7v8a1 1 0 0 1-1 1h-4v-6h-6v6H5a1 1 0 0 1-1-1z" />,
  clientes: (
    <>
      <circle cx="9" cy="8.5" r="3" />
      <path d="M3.5 19c.6-3 2.7-4.5 5.5-4.5s4.9 1.5 5.5 4.5M16 6a3 3 0 0 1 0 5.5M17.5 14.8c1.6.6 2.6 2 3 4.2" />
    </>
  ),
  buscar: (
    <>
      <circle cx="11" cy="11" r="6.5" />
      <path d="M16 16l4.5 4.5" />
    </>
  ),
  gestiones: (
    <>
      <rect x="3.5" y="7.5" width="17" height="12" rx="1.5" />
      <path d="M9 7.5V5.5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M3.5 12.5h17" />
    </>
  ),
  tareas: (
    <>
      <rect x="4.5" y="4.5" width="15" height="15" rx="2" />
      <path d="M8.5 12l2.5 2.5 4.5-5" />
    </>
  ),
  renovaciones: (
    <>
      <path d="M19.5 12a7.5 7.5 0 1 1-2.2-5.3" />
      <path d="M19.5 4.5v4h-4" />
    </>
  ),
  equipo: (
    <>
      <circle cx="12" cy="8" r="3.2" />
      <path d="M5.5 19.5c.8-3.4 3.3-5 6.5-5s5.7 1.6 6.5 5" />
    </>
  ),
  conectar: (
    <>
      <path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1" />
      <path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" />
    </>
  ),
}

const SECCIONES = [
  { id: 'inicio', texto: 'Inicio', href: '/inicio', rutas: ['/inicio'] },
  { id: 'clientes', texto: 'Clientes', href: '/clientes', rutas: ['/clientes', '/parte'] },
  { id: 'buscar', texto: 'Pólizas', href: '/buscar', rutas: ['/buscar', '/poliza'] },
  { id: 'gestiones', texto: 'Gestiones', href: '/gestiones', rutas: ['/gestiones'] },
  { id: 'tareas', texto: 'Tareas', href: '/tareas', rutas: ['/tareas'] },
  { id: 'renovaciones', texto: 'Renovaciones', href: '/renovaciones', rutas: ['/renovaciones'] },
  { id: 'equipo', texto: 'Equipo', href: '/usuarios', rutas: ['/usuarios'], separador: true },
  { id: 'conectar', texto: 'Conectar Claude', href: '/conectar', rutas: ['/conectar'] },
] as const

/** El menú lateral. Es de cliente sólo para marcar la sección en la que se está. */
export function Navegacion({ pie }: { readonly pie: ReactNode }) {
  const ruta = usePathname()
  return (
    <nav className="lateral" aria-label="Navegación principal">
      {SECCIONES.map((s) => {
        const actual = s.rutas.some((r) => ruta === r || ruta.startsWith(`${r}/`))
        return (
          <Link
            key={s.id}
            href={s.href}
            className={'separador' in s ? 'lateral__separado' : undefined}
            aria-current={actual ? 'page' : undefined}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              {ICONOS[s.id]}
            </svg>
            <span>{s.texto}</span>
          </Link>
        )
      })}
      <div className="lateral__pie">{pie}</div>
    </nav>
  )
}
