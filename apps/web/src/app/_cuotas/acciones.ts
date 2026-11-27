'use server'

// Acciones de Cuotas: guardar el plan editado en la póliza y marcar una cuota como pagada,
// desde la póliza o desde Pagos. Cada una vuelve a pasar por el guard de sesión y por
// `conDatos`; la base decide.

import type { ResultadoDeCuotas } from '@del-campo/api'
import { MENSAJE_DE_CUOTAS, editarCuotas, marcarCuota } from '@del-campo/api'
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

const texto = (form: FormData, campo: string): string => {
  const valor = form.get(campo)
  return typeof valor === 'string' ? valor.trim() : ''
}

/** Desde el modal Editar: cantidad de cuotas, valor de la cuota y día de pago, para todas. */
export async function editarPlan(_previo: ResultadoDeCuota | null, form: FormData): Promise<ResultadoDeCuota> {
  const principal = await requireAdmitted()
  const poliza = texto(form, 'poliza')
  return responder(
    poliza,
    editarCuotas(principal, poliza, {
      cantidad: texto(form, 'cantidad'),
      dia: texto(form, 'dia'),
      primerPago: texto(form, 'primerPago'),
      calculo: texto(form, 'calculo'),
      importe: texto(form, 'importe'),
    }),
  )
}

export async function marcarPago(poliza: string, numero: number, pagada: boolean): Promise<ResultadoDeCuota> {
  const principal = await requireAdmitted()
  return responder(poliza, marcarCuota(principal, poliza, numero, pagada))
}
