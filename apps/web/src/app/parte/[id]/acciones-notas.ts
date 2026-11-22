'use server'

// Acciones de la pestaña Notas de la ficha: escribir, editar, archivar, desarchivar y
// eliminar una nota. Cada una vuelve a pasar por el guard de sesión y por `conDatos`; la
// base decide. Devuelven `{ ok }` o `{ error }` para que el formulario quede abierto si falla.

import type { ResultadoDeNota } from '@del-campo/api'
import { MENSAJE_DE_NOTA, agregarNota, archivarNota, editarNota, eliminarNota } from '@del-campo/api'
import { revalidatePath } from 'next/cache'

import type { Resultado } from '@/app/_componentes/Edicion'
import { consultar, requireAdmitted } from '@/lib/sesion'

const texto = (form: FormData, campo: string): string => {
  const valor = form.get(campo)
  return typeof valor === 'string' ? valor : ''
}

const FALLO: Resultado = { ok: false, error: 'No se pudo guardar. Probá de nuevo en un momento.' }

const responder = async (parte: string, escritura: Promise<ResultadoDeNota>): Promise<Resultado> => {
  let resultado: ResultadoDeNota
  try {
    resultado = await consultar(escritura)
  } catch (error) {
    if (error instanceof Error && 'digest' in error) throw error
    console.error('notas de la ficha: no se pudo guardar', error)
    return FALLO
  }
  if (resultado !== 'guardada') return { ok: false, error: MENSAJE_DE_NOTA[resultado] }
  revalidatePath(`/parte/${parte}`)
  return { ok: true }
}

/** Sin `nota`, escribe una nueva; con `nota`, cambia esa. */
export async function guardarNota(_previo: Resultado, form: FormData): Promise<Resultado> {
  const principal = await requireAdmitted()
  const parte = texto(form, 'parte')
  const nota = texto(form, 'nota')
  return responder(
    parte,
    nota === ''
      ? agregarNota(principal, parte, texto(form, 'titulo'), texto(form, 'texto'))
      : editarNota(principal, parte, nota, texto(form, 'titulo'), texto(form, 'texto')),
  )
}

/** `archivar=1` la archiva; `archivar=0` la vuelve a activa. */
export async function cambiarArchivoDeNota(_previo: Resultado, form: FormData): Promise<Resultado> {
  const principal = await requireAdmitted()
  const parte = texto(form, 'parte')
  return responder(parte, archivarNota(principal, parte, texto(form, 'nota'), texto(form, 'archivar') === '1'))
}

export async function borrarNota(_previo: Resultado, form: FormData): Promise<Resultado> {
  const principal = await requireAdmitted()
  const parte = texto(form, 'parte')
  return responder(parte, eliminarNota(principal, parte, texto(form, 'nota')))
}
