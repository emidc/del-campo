// T-0049 — Inicio con indicadores (C6-03a). Cada indicador dice qué cuenta, sobre qué
// conjunto (su denominador) y adónde se va para actuar. No hay ranking entre personas: la
// carga del equipo se muestra en orden alfabético, nunca de mayor a menor.
//
// `resumirInicio` es puro para poder probar cada cuenta contra un recuento independiente;
// `inicio` junta los datos por `conDatos`, así que RLS decide qué gestiones y pólizas cuentan.

import type { RenewalItem, ServiceCaseSummary, TaskSummary, Workload } from '@del-campo/db'
import { getWorkload, listRenewals, listServiceCases, listTasks } from '@del-campo/db'

import { conDatos } from '../acceso/datos.ts'
import { sql } from '../db.ts'
import type { Principal } from '../session/admission.ts'

export interface Indicador {
  readonly id: string
  readonly titulo: string
  readonly valor: number
  /** Qué cuenta y sobre qué conjunto. */
  readonly definicion: string
  /** Dónde se ven los casos que forman el número. */
  readonly href: string
  /** true cuando el número pide atención (distinto de cero en un indicador de alerta). */
  readonly alerta: boolean
}

export interface CargaDeIntegrante {
  readonly email: string
  readonly abiertas: number
  readonly vencidas: number
}

export interface Inicio {
  readonly hoy: string
  readonly indicadores: readonly Indicador[]
  /** Mis gestiones abiertas, las vencidas primero y después por vencimiento. */
  readonly aAtender: readonly ServiceCaseSummary[]
  /** T-0052: mis tareas sin hacer, las vencidas primero y después por vencimiento. */
  readonly misTareas: readonly TaskSummary[]
  /** Por correo, en orden alfabético: sin ranking. */
  readonly equipo: readonly CargaDeIntegrante[]
}

export interface DatosDeInicio {
  readonly hoy: string
  readonly abiertas: readonly ServiceCaseSummary[]
  readonly proximas: readonly RenewalItem[]
  readonly vencidas: readonly RenewalItem[]
  readonly carga: readonly Workload[]
  /** Tareas sin hacer que la persona ve. */
  readonly tareas: readonly TaskSummary[]
}

const sumarDias = (fecha: string, dias: number): string => {
  const d = new Date(`${fecha}T12:00:00Z`)
  d.setUTCDate(d.getUTCDate() + dias)
  return d.toISOString().slice(0, 10)
}

const vencida = (g: { readonly dueDate: string | null }, hoy: string): boolean => g.dueDate !== null && g.dueDate < hoy

const porVencimiento =
  (hoy: string) =>
  (a: { readonly dueDate: string | null }, b: { readonly dueDate: string | null }): number => {
    const va = vencida(a, hoy) ? 0 : 1
    const vb = vencida(b, hoy) ? 0 : 1
    if (va !== vb) return va - vb
    return (a.dueDate ?? '9999-12-31').localeCompare(b.dueDate ?? '9999-12-31')
  }

export const resumirInicio = (datos: DatosDeInicio): Inicio => {
  const { hoy, abiertas, proximas, vencidas } = datos
  const mias = abiertas.filter((g) => g.assignedToMe)
  const sinResponsable = abiertas.filter((g) => g.assignedEmail === null)
  const pendientes = (lista: readonly RenewalItem[]) => lista.filter((r) => r.state === 'PENDIENTE')
  const proximasPendientes = pendientes(proximas)

  const misTareas = datos.tareas.filter((t) => t.assignedToMe)
  const indicadores: Indicador[] = [
    {
      id: 'mis-tareas-vencidas',
      titulo: 'Mis tareas vencidas',
      valor: misTareas.filter((t) => vencida(t, hoy)).length,
      definicion: `De mis ${String(misTareas.length)} tareas sin hacer, las que tienen vencimiento anterior a hoy.`,
      href: '/tareas?mias=1',
      alerta: true,
    },
    {
      id: 'tareas-trabadas',
      titulo: 'Tareas trabadas',
      valor: datos.tareas.filter((t) => t.status === 'TRABADA').length,
      definicion: `De las ${String(datos.tareas.length)} tareas sin hacer que ves, las marcadas como trabadas.`,
      href: '/tareas?estado=TRABADA',
      alerta: true,
    },
    {
      id: 'mias-vencidas',
      titulo: 'Mis gestiones vencidas',
      valor: mias.filter((g) => vencida(g, hoy)).length,
      definicion: `De mis ${String(mias.length)} gestiones abiertas, las que tienen vencimiento anterior a hoy.`,
      href: '/gestiones?mias=1',
      alerta: true,
    },
    {
      id: 'mias-abiertas',
      titulo: 'Mis gestiones abiertas',
      valor: mias.length,
      definicion: 'Gestiones no cerradas con vos como responsable.',
      href: '/gestiones?mias=1',
      alerta: false,
    },
    {
      id: 'sin-responsable',
      titulo: 'Gestiones sin responsable',
      valor: sinResponsable.length,
      definicion: `De las ${String(abiertas.length)} gestiones abiertas que ves, las que nadie tiene asignadas.`,
      href: '/gestiones?responsable=SIN_RESPONSABLE',
      alerta: true,
    },
    {
      id: 'renovaciones-manuales',
      titulo: 'Renovaciones manuales pendientes',
      valor: proximasPendientes.filter((r) => r.renewalMode === 'MANUAL').length,
      definicion: `De las ${String(proximas.length)} pólizas que ves con fin de vigencia en los próximos 30 días, las manuales sin gestión de renovación ni póliza nueva.`,
      href: '/renovaciones?modo=MANUAL&estado=PENDIENTE',
      alerta: true,
    },
    {
      id: 'renovaciones-automaticas',
      titulo: 'Renovaciones automáticas a controlar',
      valor: proximasPendientes.filter((r) => r.renewalMode === 'AUTOMATIC').length,
      definicion: 'Mismas pólizas de los próximos 30 días, las automáticas que todavía no tienen póliza nueva en Broker OS.',
      href: '/renovaciones?modo=AUTOMATIC&estado=PENDIENTE',
      alerta: false,
    },
    {
      id: 'renovaciones-vencidas',
      titulo: 'Vencidas sin renovar',
      valor: pendientes(vencidas).length,
      definicion: `De las ${String(vencidas.length)} pólizas que ves con fin de vigencia en los últimos 60 días, las que no tienen gestión ni póliza nueva. Puede sobrecontar: los datos son del último lote.`,
      href: '/renovaciones?tramo=vencidas&estado=PENDIENTE',
      alerta: true,
    },
  ]

  const aAtender = [...mias].sort(porVencimiento(hoy))

  const equipo = datos.carga
    .filter((c): c is Workload & { email: string } => c.email !== null)
    .map((c) => ({ email: c.email, abiertas: c.open, vencidas: c.overdue }))
    .sort((a, b) => a.email.localeCompare(b.email))

  return { hoy, indicadores, aAtender, misTareas: [...misTareas].sort(porVencimiento(hoy)), equipo }
}

export const inicio = async (principal: Principal, hoy: string): Promise<Inicio> =>
  conDatos(sql(), principal, async (ejecutor) => {
    const abiertas = await listServiceCases(ejecutor)
    const proximas = await listRenewals(ejecutor, { from: hoy, to: sumarDias(hoy, 30) })
    const vencidas = await listRenewals(ejecutor, { from: sumarDias(hoy, -60), to: sumarDias(hoy, -1) })
    const carga = await getWorkload(ejecutor)
    const tareas = await listTasks(ejecutor)
    return resumirInicio({ hoy, abiertas, proximas, vencidas, carga, tareas })
  })
