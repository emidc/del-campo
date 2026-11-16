'use server'

// T-0068 — Agregar, corregir y dar de baja teléfonos y mails desde la ficha. Cada acción
// vuelve a pasar por el guard de sesión y por `conDatos`; la base decide.

import { agregarContacto, corregirContacto, esCanalDeContacto, quitarContacto } from '@del-campo/api'
import type { ResultadoDeContacto } from '@del-campo/api'
import { revalidatePath } from 'next/cache'
import { notFound, redirect } from 'next/navigation'

import { consultar, requireAdmitted } from '@/lib/sesion'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const texto = (form: FormData, campo: string): string => {
  const valor = form.get(campo)
  return typeof valor === 'string' ? valor.trim() : ''
}

const volver = (parte: string, resultado: ResultadoDeContacto): never => {
  revalidatePath(`/parte/${parte}`)
  redirect(`/parte/${parte}?c=${resultado}`)
}

const parteDe = (form: FormData): string => {
  const parte = texto(form, 'parte')
  if (!UUID.test(parte)) notFound()
  return parte
}

export async function agregar(form: FormData): Promise<void> {
  const principal = await requireAdmitted()
  const parte = parteDe(form)
  const canal = texto(form, 'canal')
  const resultado = esCanalDeContacto(canal)
    ? await consultar(agregarContacto(principal, parte, canal, texto(form, 'valor')))
    : 'invalido'
  volver(parte, resultado)
}

export async function corregir(form: FormData): Promise<void> {
  const principal = await requireAdmitted()
  const parte = parteDe(form)
  volver(parte, await consultar(corregirContacto(principal, parte, texto(form, 'contacto'), texto(form, 'valor'))))
}

export async function quitar(form: FormData): Promise<void> {
  const principal = await requireAdmitted()
  const parte = parteDe(form)
  volver(parte, await consultar(quitarContacto(principal, parte, texto(form, 'contacto'))))
}
