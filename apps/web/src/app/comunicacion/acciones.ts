'use server'

// T-0066 — Responder un WhatsApp. Vuelve a pasar por el guard de sesión y por `conDatos`.
// La clave de idempotencia viene del formulario: reenviar el mismo formulario no manda dos
// veces el mensaje.

import { crearProspectoDeConversacion, isProspectOrigin, responderConversacion, vincularConversacion } from '@del-campo/api'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

import type { Resultado } from '@/app/_componentes/Edicion'
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

/** T-0068 — Vincula la conversación con un cliente: le carga el teléfono de quien escribe. */
export async function vincular(form: FormData): Promise<void> {
  const principal = await requireAdmitted()
  const crudo = texto(form, 'id')
  const id = /^[1-9]\d{0,15}$/.test(crudo) ? Number(crudo) : null
  if (id === null) throw new Error('Conversación inexistente.')
  const resultado = await consultar(vincularConversacion(principal, id, texto(form, 'cliente')))
  revalidatePath(`/comunicacion/${String(id)}`)
  revalidatePath('/comunicacion')
  redirect(`/comunicacion/${String(id)}?v=${resultado}`)
}

/**
 * Crea un prospecto con el teléfono de quien escribe: la conversación queda vinculada a
 * él. Si un dato no sirve, devuelve el error y el formulario queda como estaba.
 */
export async function crearProspecto(_previo: Resultado, form: FormData): Promise<Resultado> {
  const principal = await requireAdmitted()
  const crudo = texto(form, 'id')
  const id = /^[1-9]\d{0,15}$/.test(crudo) ? Number(crudo) : null
  if (id === null) return { ok: false, error: 'La conversación no existe.' }
  const tipo = texto(form, 'tipo')
  const origen = texto(form, 'origen')
  if (tipo !== 'PERSON' && tipo !== 'ORGANIZATION') return { ok: false, error: 'Elegí si es una empresa o una persona.' }
  if (!isProspectOrigin(origen)) return { ok: false, error: 'Elegí el origen del prospecto.' }
  const empresa = tipo === 'ORGANIZATION'
  const campo = (nombre: string): string => texto(form, nombre).trim().slice(0, 500)
  let resultado
  try {
    resultado = await consultar(
      crearProspectoDeConversacion(principal, id, {
        kind: tipo,
        origin: origen,
        name: campo(empresa ? 'razonSocial' : 'nombre'),
        lastName: empresa ? '' : campo('apellido'),
      }),
    )
  } catch (error) {
    if (error instanceof Error && 'digest' in error) throw error
    console.error('comunicacion: no se pudo crear el prospecto', error)
    return { ok: false, error: 'No se pudo guardar. Probá de nuevo en un momento.' }
  }
  if (resultado.kind === 'invalid') return { ok: false, error: resultado.message }
  if (resultado.kind === 'inexistente') return { ok: false, error: 'La conversación no existe.' }
  if (resultado.kind === 'sin-telefono') return { ok: false, error: 'Este contacto no tiene teléfono visible: no se puede vincular.' }
  revalidatePath(`/comunicacion/${String(id)}`)
  revalidatePath('/comunicacion')
  revalidatePath('/clientes')
  redirect(`/comunicacion/${String(id)}?v=prospecto`)
}
