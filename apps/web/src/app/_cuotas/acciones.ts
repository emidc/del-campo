'use server'

// Acciones de Cuotas: guardar el plan editado en la póliza y marcar una cuota como pagada,
// desde la póliza o desde Pagos. Cada una vuelve a pasar por el guard de sesión y por
// `conDatos`; la base decide.

import type { DatosDeCuota, ResultadoDeCuotas } from '@del-campo/api'
import { MENSAJE_DE_CUOTAS, guardarCuotas, marcarCuota } from '@del-campo/api'
import { revalidatePath } from 'next/cache'

import { consultar, requireAdmitted } from '@/lib/sesion'

export type ResultadoDeCuota = { readonly ok: true } | { readonly ok: false; readonly error: string }

const responder = async (poliza: string, escritura: Promise<ResultadoDeCuotas>): Promise<ResultadoDeCuota> => {
  try {
    const resultado = await consultar(escritura)
    if (resultado !== 'guardado') return { ok: false, error: MENSAJE_DE_CUOTAS[resultado] }
    revalidatePath(`/poliza/${poliza}`)
    revalidatePath('/pagos')
    return { ok: true }
  } catch (error) {
    if (error instanceof Error && 'digest' in error) throw error // redirect y notFound de Next
    console.error('cuotas: no se pudo guardar', error)
    return { ok: false, error: 'No se pudo guardar. Probá de nuevo en un momento.' }
  }
}

export async function guardarPlan(poliza: string, cuotas: readonly DatosDeCuota[]): Promise<ResultadoDeCuota> {
  const principal = await requireAdmitted()
  return responder(poliza, guardarCuotas(principal, poliza, cuotas))
}

export async function marcarPago(poliza: string, numero: number, pagada: boolean): Promise<ResultadoDeCuota> {
  const principal = await requireAdmitted()
  return responder(poliza, marcarCuota(principal, poliza, numero, pagada))
}
