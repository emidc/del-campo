// Filtros de Pagos: pagadas o impagas, compañía, productor y riesgos. Viven en la dirección
// de la página, como en Renovaciones. Sin dependencias de React ni de la base: se prueba solo.

import type { Pago } from '@del-campo/api'

import { normalizar } from '../renovaciones/filtros.ts'

export type EstadoDePago = 'pagadas' | 'impagas'

export interface FiltrosDePagos {
  readonly estado?: EstadoDePago | undefined
  readonly compania?: string | undefined
  readonly productor?: string | undefined
  readonly riesgos: readonly string[]
}

type Parametros = Record<string, string | string[] | undefined>

const uno = (valor: string | string[] | undefined): string | undefined => {
  const v = Array.isArray(valor) ? valor[0] : valor
  return v === undefined || v.trim() === '' ? undefined : v.trim()
}

const varios = (valor: string | string[] | undefined): string[] => {
  const lista = Array.isArray(valor) ? valor : valor === undefined ? [] : [valor]
  return [...new Set(lista.map((v) => v.trim().slice(0, 120)).filter((v) => v !== ''))].slice(0, 30)
}

export const leerFiltros = (parametros: Parametros): FiltrosDePagos => {
  const estado = uno(parametros.estado)
  return {
    estado: estado === 'pagadas' || estado === 'impagas' ? estado : undefined,
    compania: uno(parametros.compania)?.slice(0, 40),
    productor: uno(parametros.productor)?.slice(0, 120),
    riesgos: varios(parametros.riesgo),
  }
}

export const enlace = (filtros: FiltrosDePagos, cambios: Partial<FiltrosDePagos>): string => {
  const f: FiltrosDePagos = { ...filtros, ...cambios }
  const q = new URLSearchParams()
  if (f.estado !== undefined) q.set('estado', f.estado)
  if (f.compania !== undefined) q.set('compania', f.compania)
  if (f.productor !== undefined) q.set('productor', f.productor)
  for (const r of f.riesgos) q.append('riesgo', r)
  const s = q.toString()
  return s === '' ? '/pagos' : `/pagos?${s}`
}

/** Los pagos que pasan los filtros, en el orden en que llegan (por fecha de pago). */
export const filtrar = (pagos: readonly Pago[], f: FiltrosDePagos): Pago[] => {
  const riesgos = new Set(f.riesgos.map(normalizar))
  return pagos.filter(
    ({ poliza: p, cuota: c }) =>
      (f.estado === undefined || c.paid === (f.estado === 'pagadas')) &&
      (f.compania === undefined || p.insurerId === f.compania) &&
      (f.productor === undefined || p.producer === f.productor) &&
      (riesgos.size === 0 || (p.productReference !== null && riesgos.has(normalizar(p.productReference)))),
  )
}

export const hayFiltros = (f: FiltrosDePagos): boolean =>
  f.compania !== undefined || f.productor !== undefined || f.riesgos.length > 0

/** Los valores distintos de un campo de la póliza, con cuántos pagos quedan al elegir cada uno. */
export const opcionesDe = (pagos: readonly Pago[], campo: (p: Pago) => string | null): { valor: string; cuenta: number }[] => {
  const cuentas = new Map<string, number>()
  for (const p of pagos) {
    const v = campo(p)
    if (v !== null && v.trim() !== '') cuentas.set(v, (cuentas.get(v) ?? 0) + 1)
  }
  return [...cuentas.entries()].map(([valor, cuenta]) => ({ valor, cuenta })).sort((a, b) => a.valor.localeCompare(b.valor, 'es'))
}

/** El mes siguiente al de `hoy`, `AAAA-MM`. */
export const proximoMes = (hoy: string): string => {
  const total = Number(hoy.slice(0, 4)) * 12 + Number(hoy.slice(5, 7))
  return `${String(Math.floor(total / 12))}-${String((total % 12) + 1).padStart(2, '0')}`
}
