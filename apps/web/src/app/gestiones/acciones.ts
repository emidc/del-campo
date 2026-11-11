'use server'

// T-0045 — Acciones de las gestiones. Cada una vuelve a pasar por el guard de sesión y
// por `conDatos`: lo que la persona puede escribir lo decide RLS, no el formulario.

import {
  anotarGestion,
  cambiarEstadoGestion,
  crearGestion,
  esEstadoDeGestion,
  esTipoDeGestion,
  tomarGestion,
} from '@del-campo/api'
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
  const tipo = texto(form, 'tipo')
  const titulo = texto(form, 'titulo')
  const parte = texto(form, 'parte')
  const vence = opcional(form, 'vence')
  if (!esTipoDeGestion(tipo) || titulo === '' || parte === '' || (vence !== null && !FECHA.test(vence))) {
    throw new Error('Faltan datos para crear la gestión: tipo, título y cliente.')
  }
  const id = await consultar(
    crearGestion(principal, {
      kind: tipo,
      title: titulo,
      partyId: parte,
      policyId: opcional(form, 'poliza'),
      dueDate: vence,
      note: opcional(form, 'nota'),
    }),
  )
  revalidatePath('/gestiones')
  redirect(`/gestiones/${id}`)
}

export async function anotar(form: FormData): Promise<void> {
  const principal = await requireAdmitted()
  const id = texto(form, 'id')
  const nota = texto(form, 'nota')
  if (nota !== '') await consultar(anotarGestion(principal, id, nota))
  revalidatePath(`/gestiones/${id}`)
}

export async function cambiarEstado(form: FormData): Promise<void> {
  const principal = await requireAdmitted()
  const id = texto(form, 'id')
  const estado = texto(form, 'estado')
  if (!esEstadoDeGestion(estado)) throw new Error('Estado de gestión desconocido.')
  await consultar(cambiarEstadoGestion(principal, id, estado, opcional(form, 'comentario')))
  revalidatePath(`/gestiones/${id}`)
  revalidatePath('/gestiones')
}

export async function tomar(form: FormData): Promise<void> {
  const principal = await requireAdmitted()
  const id = texto(form, 'id')
  await consultar(tomarGestion(principal, id))
  revalidatePath(`/gestiones/${id}`)
  revalidatePath('/gestiones')
}
