'use server'

// T-0052 — Acciones de las tareas. Cada una vuelve a pasar por el guard de sesión y por
// `conDatos`: lo que la persona puede escribir lo decide RLS, no el formulario.

import { cambiarEstadoTarea, comentarTarea, crearTarea, esEstadoDeTarea, pasarTarea } from '@del-campo/api'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

import { consultar, requireAdmitted } from '@/lib/sesion'

const texto = (form: FormData, campo: string): string => {
  const valor = form.get(campo)
  return typeof valor === 'string' ? valor.trim() : ''
}

const opcional = (form: FormData, campo: string): string | null => {
  const valor = texto(form, campo)
  return valor === '' ? null : valor
}

const FECHA = /^\d{4}-\d{2}-\d{2}$/

export async function crear(form: FormData): Promise<void> {
  const principal = await requireAdmitted()
  const titulo = texto(form, 'titulo')
  const parte = texto(form, 'parte')
  const vence = opcional(form, 'vence')
  if (titulo === '' || parte === '' || (vence !== null && !FECHA.test(vence))) {
    throw new Error('Faltan datos para crear la tarea: título y cliente.')
  }
  const id = await consultar(
    crearTarea(principal, {
      title: titulo.slice(0, 200),
      partyId: parte,
      policyId: opcional(form, 'poliza'),
      serviceCaseId: opcional(form, 'gestion'),
      dueDate: vence,
      assignedUserId: opcional(form, 'responsable'),
      comment: opcional(form, 'comentario'),
    }),
  )
  revalidatePath('/tareas')
  redirect(`/tareas/${id}`)
}

export async function cambiarEstado(form: FormData): Promise<void> {
  const principal = await requireAdmitted()
  const id = texto(form, 'id')
  const estado = texto(form, 'estado')
  if (!esEstadoDeTarea(estado)) throw new Error('Estado de tarea desconocido.')
  await consultar(cambiarEstadoTarea(principal, id, estado, opcional(form, 'comentario')))
  revalidatePath(`/tareas/${id}`)
  revalidatePath('/tareas')
}

export async function pasar(form: FormData): Promise<void> {
  const principal = await requireAdmitted()
  const id = texto(form, 'id')
  await consultar(pasarTarea(principal, id, opcional(form, 'responsable'), opcional(form, 'comentario')))
  revalidatePath(`/tareas/${id}`)
  revalidatePath('/tareas')
}

export async function comentar(form: FormData): Promise<void> {
  const principal = await requireAdmitted()
  const id = texto(form, 'id')
  const comentario = texto(form, 'comentario')
  if (comentario !== '') await consultar(comentarTarea(principal, id, comentario))
  revalidatePath(`/tareas/${id}`)
}
