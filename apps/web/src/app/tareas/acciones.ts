'use server'

// T-0052 — Acciones de las tareas. Cada una vuelve a pasar por el guard de sesión y por
// `conDatos`: lo que la persona puede escribir lo decide RLS, no el formulario.

import {
  cambiarEstadoTarea,
  cambiarPrioridadTarea,
  cambiarSeguimientoTarea,
  cambiarVencimientoTarea,
  comentarTarea,
  completarAccionDeTarea,
  crearTarea,
  eliminarTarea,
  esEstadoDeTarea,
  esPrioridadDeTarea,
  esSeguimientoDeTarea,
  esUuid,
  involucrarEnTarea,
  pasarTarea,
} from '@del-campo/api'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

import type { Resultado } from '@/app/_componentes/Edicion'
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

// ── Ficha de la tarea: edición en el lugar, acciones del equipo y borrado ────────

const FALLO = 'No se pudo guardar. Probá de nuevo en un momento.'
const fallo = (mensaje: string): Resultado => ({ ok: false, error: mensaje })

/** Corre la escritura; un error inesperado se muestra en el formulario en vez de romper la página. */
const intentar = async (escritura: Promise<unknown>): Promise<boolean> => {
  try {
    await consultar(escritura)
    return true
  } catch (error) {
    if (error instanceof Error && 'digest' in error) throw error // redirect y notFound de Next
    console.error('tarea: no se pudo guardar', error)
    return false
  }
}

const releer = (id: string): void => {
  revalidatePath(`/tareas/${id}`)
  revalidatePath('/tareas')
}

/** Un dato de la ficha: estado, vencimiento, prioridad, seguimiento o responsable. */
export async function editarCampo(_previo: Resultado, form: FormData): Promise<Resultado> {
  const principal = await requireAdmitted()
  const id = texto(form, 'id')
  const campo = texto(form, 'campo')
  const valor = opcional(form, 'valor')
  if (!esUuid(id)) return fallo('No se encontró la tarea.')
  let escritura: Promise<unknown>
  switch (campo) {
    case 'estado':
      if (!esEstadoDeTarea(valor)) return fallo('Elegí un estado.')
      escritura = cambiarEstadoTarea(principal, id, valor, null)
      break
    case 'vencimiento':
      if (valor !== null && !FECHA.test(valor)) return fallo('La fecha no es válida.')
      escritura = cambiarVencimientoTarea(principal, id, valor)
      break
    case 'prioridad':
      if (valor !== null && !esPrioridadDeTarea(valor)) return fallo('Elegí Alta, Media o Baja.')
      escritura = cambiarPrioridadTarea(principal, id, valor)
      break
    case 'seguimiento':
      if (valor !== null && !esSeguimientoDeTarea(valor)) return fallo('Elegí una etapa de seguimiento.')
      escritura = cambiarSeguimientoTarea(principal, id, valor)
      break
    case 'responsable':
      if (valor !== null && !esUuid(valor)) return fallo('Elegí un integrante.')
      escritura = pasarTarea(principal, id, valor, null)
      break
    default:
      return fallo('Ese campo no se edita.')
  }
  if (!(await intentar(escritura))) return fallo(FALLO)
  releer(id)
  return { ok: true }
}

export async function involucrar(_previo: Resultado, form: FormData): Promise<Resultado> {
  const principal = await requireAdmitted()
  const id = texto(form, 'id')
  const persona = texto(form, 'persona')
  const descripcion = texto(form, 'descripcion')
  if (!esUuid(id)) return fallo('No se encontró la tarea.')
  if (!esUuid(persona)) return fallo('Elegí a quién involucrar.')
  if (descripcion === '') return fallo('Describí qué tiene que hacer.')
  if (!(await intentar(involucrarEnTarea(principal, id, persona, descripcion.slice(0, 2000))))) return fallo(FALLO)
  releer(id)
  return { ok: true }
}

export async function marcarAccionHecha(_previo: Resultado, form: FormData): Promise<Resultado> {
  const principal = await requireAdmitted()
  const id = texto(form, 'id')
  const accion = texto(form, 'accion')
  if (!esUuid(id) || !esUuid(accion)) return fallo('No se encontró la acción.')
  if (!(await intentar(completarAccionDeTarea(principal, accion)))) return fallo('No se pudo marcar. Sólo la persona involucrada puede hacerlo.')
  releer(id)
  return { ok: true }
}

export async function eliminar(_previo: Resultado, form: FormData): Promise<Resultado> {
  const principal = await requireAdmitted()
  const id = texto(form, 'id')
  if (!esUuid(id)) return fallo('No se encontró la tarea.')
  if (!(await intentar(eliminarTarea(principal, id)))) return fallo('No se pudo eliminar. La tarea sigue como estaba.')
  revalidatePath('/tareas')
  redirect('/tareas')
}
