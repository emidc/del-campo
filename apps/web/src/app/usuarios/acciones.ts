'use server'

// T-0060 — Invitar y dar de baja a personas del equipo. Sólo lo hace un Administrador; la
// regla la aplica la base, no este formulario.

import type { MemberPhoto } from '@del-campo/api'
import { MAX_PHOTO_BYTES, PHOTO_TYPES, cambiarEmailDelEquipo, darDeBajaDelEquipo, editarPerfil, invitarAlEquipo } from '@del-campo/api'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

import type { Resultado } from '@/app/_componentes/Edicion'
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

const ERRORES_EMAIL: Readonly<Record<string, string>> = {
  ACTOR_NO_AUTORIZADO: 'Sólo un administrador puede cambiar el correo.',
  EMAIL_INVALIDO: 'Ese correo no es válido.',
  YA_EXISTE: 'Ya hay otra persona con ese correo.',
  YA_ACTIVO: 'El correo sólo se puede cambiar mientras la persona no haya entrado.',
  USUARIO_INEXISTENTE: 'No se encontró a esa persona.',
}

const TIPOS = new Set<string>(PHOTO_TYPES)
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * Nombre visible y, si viene una imagen, la foto. Cada persona edita el suyo; un
 * Administrador, cualquiera. Si viene `email`, primero se corrige el correo de la persona
 * invitada (sólo un Administrador y sólo si todavía no entró).
 */
export async function guardarPerfil(_previo: Resultado, form: FormData): Promise<Resultado> {
  const principal = await requireAdmitted()
  const usuario = texto(form, 'usuario')
  if (!UUID.test(usuario)) return { ok: false, error: 'No se encontró a esa persona.' }
  const archivo = form.get('foto')
  let foto: MemberPhoto | undefined
  if (archivo instanceof File && archivo.size > 0) {
    if (!TIPOS.has(archivo.type)) return { ok: false, error: 'La foto tiene que ser JPG, PNG o WebP.' }
    if (archivo.size > MAX_PHOTO_BYTES) return { ok: false, error: 'La foto es muy grande. Probá con otra imagen.' }
    foto = { bytes: new Uint8Array(await archivo.arrayBuffer()), type: archivo.type as MemberPhoto['type'] }
  }
  const email = form.get('email')
  if (typeof email === 'string') {
    const motivo = await consultar(cambiarEmailDelEquipo(principal, usuario, email))
    if (motivo !== null) return { ok: false, error: ERRORES_EMAIL[motivo] ?? 'No se pudo cambiar el correo.' }
  }
  try {
    await consultar(editarPerfil(principal, usuario, texto(form, 'nombre'), foto))
  } catch (error) {
    if (error instanceof Error && 'digest' in error) throw error
    console.error('equipo: no se pudo guardar el perfil', error)
    return { ok: false, error: 'No se pudo guardar. Sólo la persona o un administrador pueden cambiar este perfil.' }
  }
  revalidatePath('/usuarios')
  return { ok: true }
}
