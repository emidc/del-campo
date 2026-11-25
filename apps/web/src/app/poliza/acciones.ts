'use server'

// Acciones de póliza: edición por campo y borrado desde la ficha, renovación y
// refacturación desde Renovaciones. Cada una vuelve a pasar por el guard de sesión y por
// `conDatos`; la base decide. Devuelven `{ ok }` o `{ error }` para que el formulario
// quede abierto si algo falla.

import type { PolicyTerms } from '@del-campo/api'
import {
  describirBloqueos,
  editarCampoDePoliza,
  editarEndoso as editarEndosoDePoliza,
  eliminarPoliza,
  esUuid,
  isPolicyField,
  refacturar,
  renovarPoliza,
} from '@del-campo/api'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

import type { Resultado } from '@/app/_componentes/Edicion'
import { consultar, requireAdmitted } from '@/lib/sesion'

const texto = (form: FormData, campo: string): string => {
  const valor = form.get(campo)
  return typeof valor === 'string' ? valor.trim() : ''
}

const FALLO = 'No se pudo guardar. Probá de nuevo en un momento.'

/** Corre la escritura; un error inesperado se muestra en el formulario en vez de romper la página. */
const intentar = async <T>(escritura: Promise<T>): Promise<T | null> => {
  try {
    return await consultar(escritura)
  } catch (error) {
    if (error instanceof Error && 'digest' in error) throw error // redirect y notFound de Next
    console.error('póliza: no se pudo guardar', error)
    return null
  }
}

const error = (mensaje: string): Resultado => ({ ok: false, error: mensaje })

export async function editarCampo(_previo: Resultado, form: FormData): Promise<Resultado> {
  const principal = await requireAdmitted()
  const poliza = texto(form, 'poliza')
  const campo = texto(form, 'campo')
  if (!esUuid(poliza) || !isPolicyField(campo)) return error('Ese campo no se edita.')
  const resultado = await intentar(editarCampoDePoliza(principal, poliza, campo, texto(form, 'valor')))
  if (resultado === null) return error(FALLO)
  if (resultado.kind === 'invalid') return error(resultado.message)
  if (resultado.kind === 'not_found') return error('La póliza no tiene una versión abierta para editar.')
  revalidatePath(`/poliza/${poliza}`)
  return { ok: true }
}

export async function eliminar(_previo: Resultado, form: FormData): Promise<Resultado> {
  const principal = await requireAdmitted()
  const poliza = texto(form, 'poliza')
  if (!esUuid(poliza)) return error('No se encontró la póliza.')
  const bloqueos = await intentar(eliminarPoliza(principal, poliza))
  if (bloqueos === null) return error('No se pudo eliminar. La póliza sigue como estaba.')
  if (bloqueos.length > 0) return error(`No se puede eliminar. ${describirBloqueos(bloqueos)}`)
  revalidatePath('/buscar')
  revalidatePath('/renovaciones')
  redirect('/buscar?eliminada=1')
}

const condiciones = (form: FormData): PolicyTerms => ({
  termStartDate: texto(form, 'inicio'),
  termEndDate: texto(form, 'fin'),
  premium: texto(form, 'prima'),
  totalPremium: texto(form, 'premio'),
  sumInsured: texto(form, 'suma'),
  currency: texto(form, 'moneda'),
  producer: texto(form, 'productor'),
  riskType: texto(form, 'riesgo'),
  paymentMethod: texto(form, 'pago'),
  renewalMode: texto(form, 'renovacion'),
  driveUrl: texto(form, 'drive'),
})

export async function renovar(_previo: Resultado, form: FormData): Promise<Resultado> {
  const principal = await requireAdmitted()
  const anterior = texto(form, 'poliza')
  const resultado = await intentar(
    renovarPoliza(principal, {
      ...condiciones(form),
      previousPolicyId: anterior,
      policyNumber: texto(form, 'numero'),
      insurerId: texto(form, 'compania'),
    }),
  )
  if (resultado === null) return error(`${FALLO} No se creó ninguna póliza.`)
  if (resultado.kind === 'invalid') return error(resultado.message)
  if (resultado.kind === 'not_found') return error('No se encontró la póliza a renovar.')
  revalidatePath('/renovaciones')
  revalidatePath(`/poliza/${anterior}`)
  return { ok: true }
}

export async function registrarRefacturacion(_previo: Resultado, form: FormData): Promise<Resultado> {
  const principal = await requireAdmitted()
  const poliza = texto(form, 'poliza')
  const numero = Number.parseInt(texto(form, 'endoso'), 10)
  const resultado = await intentar(
    refacturar(principal, {
      ...condiciones(form),
      policyId: poliza,
      effectiveFrom: texto(form, 'desde'),
      endorsementNumber: Number.isNaN(numero) ? 0 : numero,
    }),
  )
  if (resultado === null) return error(FALLO)
  if (resultado.kind === 'invalid') return error(resultado.message)
  if (resultado.kind === 'not_found') return error('No se encontró la póliza.')
  if (resultado.kind === 'taken')
    return {
      ok: false,
      error: `El endoso ${String(numero)} ya está registrado en esta póliza. El próximo libre es el ${String(resultado.next)}: revisá y guardá de nuevo.`,
      siguiente: resultado.next,
    }
  revalidatePath('/renovaciones')
  revalidatePath(`/poliza/${poliza}`)
  return { ok: true }
}

export async function editarEndoso(_previo: Resultado, form: FormData): Promise<Resultado> {
  const principal = await requireAdmitted()
  const poliza = texto(form, 'poliza')
  /** Las condiciones viajan sólo si la versión del endoso sigue abierta. */
  const conCondiciones = texto(form, 'condiciones') === '1'
  const resultado = await intentar(
    editarEndosoDePoliza(principal, {
      policyId: poliza,
      endorsementId: texto(form, 'endoso'),
      number: texto(form, 'numero'),
      driveUrl: texto(form, 'drive'),
      ...(conCondiciones ? { terms: condiciones(form) } : {}),
    }),
  )
  if (resultado === null) return error(FALLO)
  if (resultado.kind === 'invalid') return error(resultado.message)
  if (resultado.kind === 'not_found') return error('No se encontró el endoso.')
  revalidatePath(`/poliza/${poliza}`)
  revalidatePath('/renovaciones')
  return { ok: true }
}
