'use server'

// T-0052 — Acciones de las tareas. Cada una vuelve a pasar por el guard de sesión y por
// `conDatos`: lo que la persona puede escribir lo decide RLS, no el formulario.

import {
  cambiarEstadoTarea,
  cambiarGestionTarea,
  cambiarPrioridadTarea,
  cambiarSeguimientoTarea,
  cambiarVencimientoTarea,
  comentarTarea,
  completarAccionDeTarea,
  crearProspecto,
  crearTarea,
  eliminarTarea,
  esEstadoDeTarea,
  esPrioridadDeTarea,
  esSeguimientoDeTarea,
  esUuid,
  buscarEmpresas,
  buscarPersonas,
  involucrarEnTarea,
  isProspectOrigin,
  marcarTareaDeLaSemana,
  pasarTarea,
  renombrarTarea,
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
    case 'gestion':
      if (valor !== null && !esUuid(valor)) return fallo('Elegí una gestión de la lista.')
      escritura = cambiarGestionTarea(principal, id, valor)
      break
    case 'semana':
      escritura = marcarTareaDeLaSemana(principal, id, valor === '1')
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

/** El nombre de la tarea, editado desde el título de la ficha. */
export async function renombrar(_previo: Resultado, form: FormData): Promise<Resultado> {
  const principal = await requireAdmitted()
  const id = texto(form, 'id')
  const nombre = texto(form, 'nombre')
  if (!esUuid(id)) return fallo('No se encontró la tarea.')
  if (nombre === '') return fallo('El nombre no puede quedar vacío.')
  if (nombre.length > 200) return fallo('El nombre puede tener hasta 200 caracteres.')
  if (!(await intentar(renombrarTarea(principal, id, nombre)))) return fallo(FALLO)
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

/** La Nueva tarea del listado: el cliente se elige en el mismo formulario. */
export async function crearDesdeListado(_previo: Resultado, form: FormData): Promise<Resultado> {
  const principal = await requireAdmitted()
  const titulo = texto(form, 'titulo')
  const parte = texto(form, 'parte')
  const vence = opcional(form, 'vence')
  const responsable = opcional(form, 'responsable')
  if (titulo === '') return fallo('Escribí qué hay que hacer.')
  if (!esUuid(parte)) return fallo('Elegí el cliente de la lista.')
  if (vence !== null && !FECHA.test(vence)) return fallo('La fecha no es válida.')
  if (responsable !== null && !esUuid(responsable)) return fallo('Elegí un responsable de la lista.')
  let id: string
  try {
    id = await consultar(
      crearTarea(principal, {
        title: titulo.slice(0, 200),
        partyId: parte,
        policyId: null,
        serviceCaseId: null,
        dueDate: vence,
        assignedUserId: responsable,
        comment: opcional(form, 'comentario'),
      }),
    )
  } catch (error) {
    if (error instanceof Error && 'digest' in error) throw error
    console.error('tarea: no se pudo crear', error)
    return fallo('No se pudo crear la tarea. Probá de nuevo en un momento.')
  }
  revalidatePath('/tareas')
  redirect(`/tareas/${id}`)
}

export interface ClienteSugerido {
  readonly partyId: string
  readonly displayName: string
  readonly detalle: string | null
}

export type ProspectoCreado =
  | { readonly ok: true; readonly cliente: ClienteSugerido }
  | { readonly ok: false; readonly error: string }

export interface DatosDeProspecto {
  readonly tipo: string
  readonly origen: string
  readonly nombre: string
  readonly apellido: string
}

/**
 * Alta rápida de un prospecto desde «Nueva tarea»: alcanza con el tipo, el origen y el
 * nombre. Devuelve el prospecto para dejarlo elegido como cliente de la tarea.
 */
export async function crearProspectoParaTarea(datos: DatosDeProspecto): Promise<ProspectoCreado> {
  const principal = await requireAdmitted()
  const { tipo, origen } = datos
  if (tipo !== 'PERSON' && tipo !== 'ORGANIZATION') return { ok: false, error: 'Elegí si es una empresa o una persona.' }
  if (!isProspectOrigin(origen)) return { ok: false, error: 'Elegí el origen del prospecto.' }
  const empresa = tipo === 'ORGANIZATION'
  const nombre = datos.nombre.trim().slice(0, 160)
  const apellido = empresa ? '' : datos.apellido.trim().slice(0, 80)
  try {
    const resultado = await consultar(
      crearProspecto(principal, {
        kind: tipo,
        origin: origen,
        name: nombre,
        lastName: apellido,
        identifier: '',
        phone: '',
        email: '',
        driveFolderUrl: '',
      }),
    )
    if (resultado.kind === 'invalid') return { ok: false, error: resultado.message }
    revalidatePath('/clientes')
    const visible = [nombre, apellido].filter((p) => p !== '').join(' ').replace(/\s+/g, ' ')
    return { ok: true, cliente: { partyId: resultado.partyId, displayName: visible, detalle: 'Prospecto' } }
  } catch (error) {
    if (error instanceof Error && 'digest' in error) throw error
    console.error('tarea: no se pudo crear el prospecto', error)
    return { ok: false, error: 'No se pudo guardar el prospecto. Probá de nuevo en un momento.' }
  }
}

/** Personas y empresas que coinciden con lo que se va escribiendo. */
export async function clientesQueCoinciden(buscado: string): Promise<ClienteSugerido[]> {
  const principal = await requireAdmitted()
  const textoBuscado = buscado.trim().slice(0, 80)
  if (textoBuscado.length < 2) return []
  try {
    const [personas, empresas] = await consultar(
      Promise.all([buscarPersonas(principal, textoBuscado), buscarEmpresas(principal, textoBuscado)]),
    )
    return [
      ...empresas.map((e) => ({ partyId: e.partyId, displayName: e.displayName, detalle: e.cuit === null ? 'Empresa' : `CUIT ${e.cuit}` })),
      ...personas.map((p) => ({ partyId: p.partyId, displayName: p.displayName, detalle: p.dni === null ? null : `DNI ${p.dni}` })),
    ]
  } catch (error) {
    if (error instanceof Error && 'digest' in error) throw error
    console.error('tarea: no se pudo buscar clientes', error)
    return []
  }
}
