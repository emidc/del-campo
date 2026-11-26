'use server'

// Acciones de Automotores: en la ficha del cliente (agregar, corregir, eliminar) y en la
// de la póliza (sumar uno del tomador, cargar uno nuevo, quitar). Cada una vuelve a pasar
// por el guard de sesión y por `conDatos`; la base decide.

import type { DatosDeAutomotor, ResultadoDeAutomotor } from '@del-campo/api'
import {
  MENSAJE_DE_AUTOMOTOR,
  agregarAutomotor,
  corregirAutomotor,
  esUuid,
  nuevoAutomotorEnPoliza,
  quitarAutomotor,
  quitarAutomotorDePoliza,
  sumarAutomotorAPoliza,
} from '@del-campo/api'
import { revalidatePath } from 'next/cache'

import type { Resultado } from '@/app/_componentes/Edicion'
import { consultar, requireAdmitted } from '@/lib/sesion'

const texto = (form: FormData, campo: string): string => {
  const valor = form.get(campo)
  return typeof valor === 'string' ? valor.trim() : ''
}

const datos = (form: FormData): DatosDeAutomotor => ({
  patente: texto(form, 'patente'),
  marca: texto(form, 'marca'),
  modelo: texto(form, 'modelo'),
  anio: texto(form, 'anio'),
})

const intentar = async (escritura: Promise<ResultadoDeAutomotor>): Promise<ResultadoDeAutomotor | null> => {
  try {
    return await consultar(escritura)
  } catch (error) {
    if (error instanceof Error && 'digest' in error) throw error // redirect y notFound de Next
    console.error('automotores: no se pudo guardar', error)
    return null
  }
}

const responder = (resultado: ResultadoDeAutomotor | null, rutas: readonly string[]): Resultado => {
  if (resultado === null) return { ok: false, error: 'No se pudo guardar. Probá de nuevo en un momento.' }
  if (resultado === 'guardado' || resultado === 'quitado') {
    for (const ruta of rutas) revalidatePath(ruta)
    return { ok: true }
  }
  return { ok: false, error: MENSAJE_DE_AUTOMOTOR[resultado] }
}

const SIN_CLIENTE: Resultado = { ok: false, error: 'No se encontró el cliente.' }
const SIN_POLIZA: Resultado = { ok: false, error: 'No se encontró la póliza.' }

export async function agregarAlCliente(_previo: Resultado, form: FormData): Promise<Resultado> {
  const principal = await requireAdmitted()
  const parte = texto(form, 'parte')
  if (!esUuid(parte)) return SIN_CLIENTE
  return responder(await intentar(agregarAutomotor(principal, parte, datos(form))), [`/parte/${parte}`])
}

export async function corregirDelCliente(_previo: Resultado, form: FormData): Promise<Resultado> {
  const principal = await requireAdmitted()
  const parte = texto(form, 'parte')
  if (!esUuid(parte)) return SIN_CLIENTE
  return responder(await intentar(corregirAutomotor(principal, parte, texto(form, 'automotor'), datos(form))), [`/parte/${parte}`])
}

/** Eliminar un automotor lo borra del cliente y de sus pólizas. */
export async function eliminarDelCliente(_previo: Resultado, form: FormData): Promise<Resultado> {
  const principal = await requireAdmitted()
  const parte = texto(form, 'parte')
  if (!esUuid(parte)) return SIN_CLIENTE
  return responder(await intentar(quitarAutomotor(principal, parte, texto(form, 'automotor'))), [`/parte/${parte}`])
}

/** Suma a la póliza uno del tomador o, si se eligió «nuevo», lo carga en el tomador y lo suma. */
export async function sumarAPoliza(_previo: Resultado, form: FormData): Promise<Resultado> {
  const principal = await requireAdmitted()
  const poliza = texto(form, 'poliza')
  if (!esUuid(poliza)) return SIN_POLIZA
  const automotor = texto(form, 'automotor')
  if (automotor === '') return { ok: false, error: 'Elegí un automotor del tomador o cargá uno nuevo.' }
  const resultado =
    automotor === 'nuevo'
      ? await intentar(nuevoAutomotorEnPoliza(principal, poliza, datos(form)))
      : await intentar(sumarAutomotorAPoliza(principal, poliza, automotor))
  const tomador = texto(form, 'tomador')
  return responder(resultado, esUuid(tomador) ? [`/poliza/${poliza}`, `/parte/${tomador}`] : [`/poliza/${poliza}`])
}

/** Quita el automotor de la póliza; sigue en el cliente. */
export async function quitarDePoliza(_previo: Resultado, form: FormData): Promise<Resultado> {
  const principal = await requireAdmitted()
  const poliza = texto(form, 'poliza')
  if (!esUuid(poliza)) return SIN_POLIZA
  return responder(await intentar(quitarAutomotorDePoliza(principal, poliza, texto(form, 'automotor'))), [`/poliza/${poliza}`])
}
