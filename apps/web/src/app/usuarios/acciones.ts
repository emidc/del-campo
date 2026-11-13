'use server'

// T-0060 — Invitar y dar de baja a personas del equipo. Sólo lo hace un Administrador; la
// regla la aplica la base, no este formulario.

import { darDeBajaDelEquipo, invitarAlEquipo } from '@del-campo/api'
import { redirect } from 'next/navigation'

import { consultar, requireAdmitted } from '@/lib/sesion'

const texto = (form: FormData, campo: string): string => {
  const valor = form.get(campo)
  return typeof valor === 'string' ? valor.trim() : ''
}

export async function invitar(form: FormData): Promise<void> {
  const principal = await requireAdmitted()
  const motivo = await consultar(invitarAlEquipo(principal, texto(form, 'email')))
  redirect(motivo === null ? '/usuarios?ok=invitada' : `/usuarios?error=${motivo}`)
}

export async function darDeBaja(form: FormData): Promise<void> {
  const principal = await requireAdmitted()
  const motivo = await consultar(darDeBajaDelEquipo(principal, texto(form, 'usuario')))
  redirect(motivo === null ? '/usuarios?ok=baja' : `/usuarios?error=${motivo}`)
}
