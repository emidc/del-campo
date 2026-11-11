'use server'

// T-0045 — Acciones de las gestiones. Cada una vuelve a pasar por el guard de sesión y
// por `conDatos`: lo que la persona puede escribir lo decide RLS, no el formulario.

import {
  agregarRequisito,
  anotarGestion,
  asignarGestion,
  cambiarInterlocutor,
  cambiarEstadoGestion,
  crearGestion,
  deshacerEleccion,
  elegirPropuesta,
  esEstadoDeGestion,
  esMonedaDeCotizacion,
  esRolDeInterlocutor,
  esEtapaDeSiniestro,
  esTipoDeGestion,
  marcarRequisito,
  leerPrima,
  moverEtapaSiniestro,
  noCotiza,
  pedirCotizacion,
  registrarContacto,
  registrarCotizacion,
  sumarInterlocutor,
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

export async function asignar(form: FormData): Promise<void> {
  const principal = await requireAdmitted()
  const id = texto(form, 'id')
  await consultar(asignarGestion(principal, id, opcional(form, 'responsable')))
  revalidatePath(`/gestiones/${id}`)
  revalidatePath('/gestiones')
}

// T-0050 — Siniestros por etapas. Un avance con requisitos pendientes lo rechaza la base;
// el motivo vuelve a la página como aviso en vez de una pantalla de error.
export async function moverEtapa(form: FormData): Promise<void> {
  const principal = await requireAdmitted()
  const id = texto(form, 'id')
  const sentido = texto(form, 'sentido') === 'BACK' ? 'BACK' : 'NEXT'
  let aviso: string | null = null
  try {
    await consultar(moverEtapaSiniestro(principal, id, sentido))
  } catch (error) {
    const mensaje = error instanceof Error ? error.message : ''
    if (!/no se puede avanzar|de a una etapa|última etapa|primera etapa/.test(mensaje)) throw error
    aviso = mensaje
  }
  revalidatePath(`/gestiones/${id}`)
  redirect(aviso === null ? `/gestiones/${id}` : `/gestiones/${id}?aviso=${encodeURIComponent(aviso)}`)
}

export async function marcar(form: FormData): Promise<void> {
  const principal = await requireAdmitted()
  const id = texto(form, 'id')
  await consultar(marcarRequisito(principal, texto(form, 'requisito'), texto(form, 'cumplido') === '1'))
  revalidatePath(`/gestiones/${id}`)
}

export async function agregarRequisitoAEtapa(form: FormData): Promise<void> {
  const principal = await requireAdmitted()
  const id = texto(form, 'id')
  const etapa = texto(form, 'etapa')
  const nombre = texto(form, 'nombre')
  if (!esEtapaDeSiniestro(etapa)) throw new Error('Etapa de siniestro desconocida.')
  if (nombre !== '') await consultar(agregarRequisito(principal, id, etapa, nombre.slice(0, 200)))
  revalidatePath(`/gestiones/${id}`)
}

// T-0051 — Cotizaciones. Se pide a una compañía, se registra lo que cotizó o que no cotiza,
// y el cliente elige a lo sumo una propuesta. Una prima mal escrita vuelve como aviso.
const volverConAviso = (id: string, aviso: string): never =>
  redirect(`/gestiones/${id}?aviso=${encodeURIComponent(aviso)}#propuestas`)

export async function pedirACompania(form: FormData): Promise<void> {
  const principal = await requireAdmitted()
  const id = texto(form, 'id')
  const compania = texto(form, 'compania')
  if (compania === '') volverConAviso(id, 'elegí una compañía')
  try {
    await consultar(pedirCotizacion(principal, id, compania))
  } catch (error) {
    const mensaje = error instanceof Error ? error.message : ''
    if (!mensaje.includes('una_por_compania')) throw error
    volverConAviso(id, 'a esa compañía ya se le pidió')
  }
  revalidatePath(`/gestiones/${id}`)
}

export async function responderCotizacion(form: FormData): Promise<void> {
  const principal = await requireAdmitted()
  const id = texto(form, 'id')
  const propuesta = texto(form, 'propuesta')
  if (texto(form, 'respuesta') === 'NO_COTIZA') {
    await consultar(noCotiza(principal, propuesta))
    revalidatePath(`/gestiones/${id}`)
    return
  }
  const prima = leerPrima(texto(form, 'prima'))
  const moneda = texto(form, 'moneda')
  const vence = opcional(form, 'vence')
  if (prima === null) volverConAviso(id, 'la prima tiene que ser un monto positivo, por ejemplo 120.000,50')
  if (!esMonedaDeCotizacion(moneda) || (vence !== null && !FECHA.test(vence))) throw new Error('Moneda o fecha inválida.')
  await consultar(
    registrarCotizacion(principal, propuesta, {
      premium: prima ?? '',
      currency: moneda,
      validUntil: vence,
      note: opcional(form, 'nota'),
    }),
  )
  revalidatePath(`/gestiones/${id}`)
}

export async function elegir(form: FormData): Promise<void> {
  const principal = await requireAdmitted()
  const id = texto(form, 'id')
  const propuesta = texto(form, 'propuesta')
  await consultar(texto(form, 'deshacer') === '1' ? deshacerEleccion(principal, propuesta) : elegirPropuesta(principal, propuesta))
  revalidatePath(`/gestiones/${id}`)
  revalidatePath('/gestiones')
}

// T-0053 — Interlocutores del siniestro. Un responsable que no ve al cliente lo rechaza RLS.
const volverAInterlocutores = (id: string): never => redirect(`/gestiones/${id}#interlocutores`)

export async function sumarAlSiniestro(form: FormData): Promise<void> {
  const principal = await requireAdmitted()
  const id = texto(form, 'id')
  const rol = texto(form, 'rol')
  const nombre = texto(form, 'nombre')
  if (!esRolDeInterlocutor(rol) || nombre === '') throw new Error('Faltan el rol y el nombre del interlocutor.')
  await consultar(
    sumarInterlocutor(principal, id, {
      role: rol,
      name: nombre.slice(0, 200),
      contact: opcional(form, 'contacto')?.slice(0, 200) ?? null,
      assignedUserId: opcional(form, 'responsable'),
      pending: opcional(form, 'pendiente')?.slice(0, 300) ?? null,
    }),
  )
  revalidatePath(`/gestiones/${id}`)
  volverAInterlocutores(id)
}

export async function contactoDeHoy(form: FormData): Promise<void> {
  const principal = await requireAdmitted()
  const id = texto(form, 'id')
  await consultar(registrarContacto(principal, texto(form, 'interlocutor'), opcional(form, 'comentario'), undefined))
  revalidatePath(`/gestiones/${id}`)
  volverAInterlocutores(id)
}

export async function cambiarDeInterlocutor(form: FormData): Promise<void> {
  const principal = await requireAdmitted()
  const id = texto(form, 'id')
  await consultar(
    cambiarInterlocutor(principal, texto(form, 'interlocutor'), {
      pending: opcional(form, 'pendiente')?.slice(0, 300) ?? null,
      assignedUserId: opcional(form, 'responsable'),
    }),
  )
  revalidatePath(`/gestiones/${id}`)
  volverAInterlocutores(id)
}
