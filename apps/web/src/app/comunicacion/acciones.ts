'use server'

// T-0066 — Responder un WhatsApp. Vuelve a pasar por el guard de sesión y por `conDatos`.
// La clave de idempotencia viene del formulario: reenviar el mismo formulario no manda dos
// veces el mensaje.

import { responderConversacion } from '@del-campo/api'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

import { consultar, requireAdmitted } from '@/lib/sesion'

const texto = (form: FormData, campo: string): string => {
  const valor = form.get(campo)
  return typeof valor === 'string' ? valor : ''
}

export async function responder(form: FormData): Promise<void> {
  const principal = await requireAdmitted()
  const crudo = texto(form, 'id')
  const id = /^[1-9]\d{0,15}$/.test(crudo) ? Number(crudo) : null
  if (id === null) throw new Error('Conversación inexistente.')
  const resultado = await consultar(
    responderConversacion(principal, { idempotencyKey: texto(form, 'clave'), conversationId: id, body: texto(form, 'mensaje') }),
  )
  revalidatePath(`/comunicacion/${String(id)}`)
  revalidatePath('/comunicacion')
  redirect(`/comunicacion/${String(id)}?r=${resultado.kind}`)
}
