'use server'

// Comentario de renovación desde la tabla. Pasa por el guard de sesión y por `conDatos`.

import { comentarRenovacion } from '@del-campo/api'

import { consultar, requireAdmitted } from '@/lib/sesion'

export type ResultadoDeComentario = { readonly ok: true; readonly texto: string } | { readonly ok: false; readonly error: string }

export async function comentar(poliza: string, texto: string): Promise<ResultadoDeComentario> {
  const principal = await requireAdmitted()
  try {
    const resultado = await consultar(comentarRenovacion(principal, poliza, texto))
    if (resultado === 'largo') return { ok: false, error: 'El comentario puede tener hasta 2.000 caracteres.' }
    if (resultado === 'inexistente') return { ok: false, error: 'No se encontró la póliza.' }
    return { ok: true, texto: texto.replace(/\r\n/g, '\n').trim() }
  } catch (error) {
    if (error instanceof Error && 'digest' in error) throw error
    console.error('renovaciones: no se pudo guardar el comentario', error)
    return { ok: false, error: 'No se pudo guardar. Probá de nuevo.' }
  }
}
