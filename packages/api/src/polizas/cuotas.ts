// Cuotas de las pólizas en efectivo: la sección Cuotas de la póliza y la pantalla Pagos.
// Por `conDatos`: como `broker_app`, a nombre de quien mira, con RLS decidiendo.

import type { AmountMode, Installment, PaymentTiming, RenewalItem } from '@del-campo/db'
import {
  MAX_INSTALLMENTS,
  MAX_PAY_DAY,
  defaultPlan,
  editInstallmentPlan,
  hasInstallments,
  listCashPolicies,
  listInstallments,
  parseAmount,
  paysInCash,
  policyInstallments,
  setInstallmentPaid,
} from '@del-campo/db'

import type { Conexion } from '../acceso/base.ts'
import { conDatos } from '../acceso/datos.ts'
import { sql } from '../db.ts'
import type { Principal } from '../session/admission.ts'

import { esUuid } from './edicion.ts'

export type { Installment }
export { DEFAULT_PAY_DAY, MAX_INSTALLMENTS, MAX_PAY_DAY, splitAmount } from '@del-campo/db'

/** La sección Cuotas y la pantalla Pagos son sólo para las pólizas que se pagan en efectivo. */
export const pagaEnEfectivo = paysInCash

/** Si la póliza muestra la sección Cuotas: en efectivo y fuera de Caución, Vida colectivo, Vida obligatorio y Retiro. */
export const tieneCuotas = hasInstallments

export interface CuotasDePoliza {
  readonly cuotas: readonly Installment[]
  /** `false` mientras nadie editó el plan ni marcó un pago: son las propuestas. */
  readonly guardadas: boolean
  /** Alguna cuota guardada cae fuera de la vigencia actual (cambió la vigencia o el plan se pasa). */
  readonly fueraDeVigencia: boolean
}

export const cuotasDePolizaCon = async (conexion: Conexion, principal: Principal, policyId: string): Promise<CuotasDePoliza | null> => {
  if (!esUuid(policyId)) return null
  const r = await conDatos(conexion, principal, (tx) => policyInstallments(tx, policyId))
  return r === null ? null : { cuotas: r.installments, guardadas: r.saved, fueraDeVigencia: r.outsideTerm }
}

export type ResultadoDeCuotas = 'guardado' | 'invalido' | 'inexistente' | 'con_pagadas'

export const MENSAJE_DE_CUOTAS: Readonly<Record<ResultadoDeCuotas, string>> = {
  guardado: 'Guardado.',
  invalido: `No se guardó. La cantidad va de 1 a ${String(MAX_INSTALLMENTS)}, el día de pago de 1 a ${String(MAX_PAY_DAY)} y, con cálculo Manual, el valor como importe (por ejemplo 14.876).`,
  inexistente: 'No se encontró la póliza o la cuota.',
  con_pagadas: 'No se guardó: bajar la cantidad borraría cuotas que ya están pagadas. Desmarcalas primero si corresponde.',
}

export interface DatosDeCuotas {
  readonly cantidad: string
  readonly dia: string
  /** `vencido` (por defecto) o `en_curso`. */
  readonly primerPago: string
  /** `redondeo` (por defecto), `dividir` o `manual`. */
  readonly calculo: string
  /** El valor de cada cuota; sólo cuenta con `manual`. */
  readonly importe: string
}

const CALCULOS: Readonly<Record<string, AmountMode>> = { redondeo: 'ROUNDED', dividir: 'SPLIT', manual: 'MANUAL' }
const PRIMEROS_PAGOS: Readonly<Record<string, PaymentTiming>> = { vencido: 'ARREARS', en_curso: 'CURRENT' }

const entero = (texto: string, min: number, max: number): number | null => {
  const n = /^\d{1,3}$/.test(texto.trim()) ? Number(texto.trim()) : NaN
  return n >= min && n <= max ? n : null
}

/** Rehace el plan: cantidad de cuotas, día de pago, mes del primer pago y cómo se calcula el valor. */
export const editarCuotasCon = async (
  conexion: Conexion,
  principal: Principal,
  policyId: string,
  datos: DatosDeCuotas,
): Promise<ResultadoDeCuotas> => {
  if (!esUuid(policyId)) return 'inexistente'
  const cantidad = entero(datos.cantidad, 1, MAX_INSTALLMENTS)
  const dia = entero(datos.dia, 1, MAX_PAY_DAY)
  const mode = CALCULOS[datos.calculo]
  const timing = PRIMEROS_PAGOS[datos.primerPago]
  const importe = mode === 'MANUAL' ? parseAmount(datos.importe) : null
  if (cantidad === null || dia === null || mode === undefined || timing === undefined) return 'invalido'
  if (mode === 'MANUAL' && (importe === undefined || importe === null)) return 'invalido'
  const amount = importe ?? null
  const r = await conDatos(conexion, principal, (tx) => editInstallmentPlan(tx, policyId, { count: cantidad, payDay: dia, timing, mode, amount }))
  return r.kind === 'ok' ? 'guardado' : r.kind === 'paid_removed' ? 'con_pagadas' : 'inexistente'
}

/** Marca o desmarca una cuota como pagada. */
export const marcarCuotaCon = async (
  conexion: Conexion,
  principal: Principal,
  policyId: string,
  numero: number,
  pagada: boolean,
): Promise<ResultadoDeCuotas> => {
  if (!esUuid(policyId) || !Number.isInteger(numero) || numero < 1 || numero > MAX_INSTALLMENTS) return 'inexistente'
  return (await conDatos(conexion, principal, (tx) => setInstallmentPaid(tx, policyId, numero, pagada))) ? 'guardado' : 'inexistente'
}

// ── Pagos ─────────────────────────────────────────────────────────────────────

export interface Pago {
  readonly poliza: RenewalItem
  readonly cuota: Installment
  /** Cuántas cuotas tiene la póliza. */
  readonly total: number
  /** No se pagó y su fecha ya pasó. */
  readonly atrasada: boolean
}

/**
 * Las cuotas a cobrar en el mes de `hoy` de las pólizas dadas: las que vencen en el mes
 * (pagadas o no) y las de meses anteriores que siguen sin pagar. Por fecha de pago ascendente.
 */
export const cuotasDelMes = (
  polizas: readonly RenewalItem[],
  guardadas: ReadonlyMap<string, readonly Installment[]>,
  hoy: string,
): Pago[] => {
  const mes = hoy.slice(0, 7)
  const pagos: Pago[] = []
  for (const p of polizas) {
    const cuotas = guardadas.get(p.policyId) ?? defaultPlan(p.termStartDate, p.termEndDate, p.totalPremium)
    for (const c of cuotas) {
      const atrasada = !c.paid && c.dueDate < hoy
      if (c.dueDate.slice(0, 7) === mes || (atrasada && c.dueDate < `${mes}-01`))
        pagos.push({ poliza: p, cuota: c, total: cuotas.length, atrasada })
    }
  }
  return pagos.sort(
    (a, b) =>
      a.cuota.dueDate.localeCompare(b.cuota.dueDate) ||
      a.poliza.policyNumber.localeCompare(b.poliza.policyNumber, 'es') ||
      a.cuota.number - b.cuota.number,
  )
}

/** Pagos del mes de `hoy`: las cuotas de las pólizas que se cobran en efectivo (`listCashPolicies`). */
export const pagosDelMesCon = (conexion: Conexion, principal: Principal, hoy: string): Promise<Pago[]> =>
  conDatos(conexion, principal, async (tx) => {
    const polizas = await listCashPolicies(tx, hoy)
    const guardadas = await listInstallments(tx, polizas.map((p) => p.policyId))
    return cuotasDelMes(polizas, guardadas, hoy)
  })

export const cuotasDePoliza = (principal: Principal, policyId: string): Promise<CuotasDePoliza | null> => cuotasDePolizaCon(sql(), principal, policyId)
export const editarCuotas = (principal: Principal, policyId: string, datos: DatosDeCuotas): Promise<ResultadoDeCuotas> =>
  editarCuotasCon(sql(), principal, policyId, datos)
export const marcarCuota = (principal: Principal, policyId: string, numero: number, pagada: boolean): Promise<ResultadoDeCuotas> =>
  marcarCuotaCon(sql(), principal, policyId, numero, pagada)
export const pagosDelMes = (principal: Principal, hoy: string): Promise<Pago[]> => pagosDelMesCon(sql(), principal, hoy)
