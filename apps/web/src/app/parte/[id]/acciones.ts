'use server'

// Acciones de la ficha del cliente: teléfonos y mails (T-0068), nombre y DNI, razón social,
// CUIT y carpeta de Drive, vínculos persona–empresa y borrado definitivo. Cada acción
// vuelve a pasar por el guard de sesión y por `conDatos`; la base decide. Devuelven
// `{ ok }` o `{ error }` para que la fila quede abierta si falla.

import type { OrganizationOption, PartyEditResult, PersonOption, ResultadoDeContacto } from '@del-campo/api'
import {
  MENSAJE_DE_CONTACTO,
  agregarContacto,
  asociarEmpresa,
  asociarPersona,
  buscarEmpresas,
  buscarPersonas,
  convertirEnCliente,
  corregirContacto,
  describirBloqueos,
  editarCarpeta,
  editarCuit,
  editarOrigen,
  editarDni,
  editarNombre,
  editarRazonSocial,
  eliminarContacto,
  esCanalDeContacto,
  esUuid,
  quitarContacto,
  quitarDeEmpresa,
} from '@del-campo/api'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

import type { Resultado } from '@/app/_componentes/Edicion'
import { consultar, requireAdmitted } from '@/lib/sesion'

const texto = (form: FormData, campo: string): string => {
  const valor = form.get(campo)
  return typeof valor === 'string' ? valor.trim() : ''
}

const FALLO: Resultado = { ok: false, error: 'No se pudo guardar. Probá de nuevo en un momento.' }

const intentar = async <T>(escritura: Promise<T>): Promise<T | null> => {
  try {
    return await consultar(escritura)
  } catch (error) {
    if (error instanceof Error && 'digest' in error) throw error // redirect y notFound de Next
    console.error('ficha del cliente: no se pudo guardar', error)
    return null
  }
}

const parteDe = (form: FormData): string | null => {
  const parte = texto(form, 'parte')
  return esUuid(parte) ? parte : null
}

const deContacto = (parte: string, resultado: ResultadoDeContacto | null): Resultado => {
  if (resultado === null) return FALLO
  if (resultado === 'guardado' || resultado === 'quitado') {
    revalidatePath(`/parte/${parte}`)
    return { ok: true }
  }
  return { ok: false, error: MENSAJE_DE_CONTACTO[resultado] }
}

const deEdicion = (parte: string, resultado: PartyEditResult | null): Resultado => {
  if (resultado === null) return FALLO
  if (resultado.kind === 'invalid') return { ok: false, error: resultado.message }
  if (resultado.kind === 'not_found') return { ok: false, error: 'No se encontró el contacto.' }
  revalidatePath(`/parte/${parte}`)
  return { ok: true }
}

const sinParte: Resultado = { ok: false, error: 'No se encontró el contacto.' }

export async function agregar(_previo: Resultado, form: FormData): Promise<Resultado> {
  const principal = await requireAdmitted()
  const parte = parteDe(form)
  if (parte === null) return sinParte
  const canal = texto(form, 'canal')
  if (!esCanalDeContacto(canal)) return { ok: false, error: 'Elegí teléfono o mail.' }
  return deContacto(parte, await intentar(agregarContacto(principal, parte, canal, texto(form, 'valor'))))
}

export async function corregir(_previo: Resultado, form: FormData): Promise<Resultado> {
  const principal = await requireAdmitted()
  const parte = parteDe(form)
  if (parte === null) return sinParte
  return deContacto(parte, await intentar(corregirContacto(principal, parte, texto(form, 'contacto'), texto(form, 'valor'))))
}

/** Eliminar un teléfono o mail lo borra de la base. */
export async function quitar(_previo: Resultado, form: FormData): Promise<Resultado> {
  const principal = await requireAdmitted()
  const parte = parteDe(form)
  if (parte === null) return sinParte
  return deContacto(parte, await intentar(quitarContacto(principal, parte, texto(form, 'contacto'))))
}

export async function guardarNombre(_previo: Resultado, form: FormData): Promise<Resultado> {
  const principal = await requireAdmitted()
  const parte = parteDe(form)
  if (parte === null) return sinParte
  return deEdicion(parte, await intentar(editarNombre(principal, parte, texto(form, 'nombre'), texto(form, 'apellido'))))
}

export async function guardarDni(_previo: Resultado, form: FormData): Promise<Resultado> {
  const principal = await requireAdmitted()
  const parte = parteDe(form)
  if (parte === null) return sinParte
  return deEdicion(parte, await intentar(editarDni(principal, parte, texto(form, 'valor'))))
}

/** Las empresas guardadas que coinciden con lo que se va escribiendo. */
export async function empresasQueCoinciden(buscado: string): Promise<OrganizationOption[]> {
  const principal = await requireAdmitted()
  return (await intentar(buscarEmpresas(principal, buscado.slice(0, 80)))) ?? []
}

export async function asociar(_previo: Resultado, form: FormData): Promise<Resultado> {
  const principal = await requireAdmitted()
  const parte = parteDe(form)
  if (parte === null) return sinParte
  return deEdicion(parte, await intentar(asociarEmpresa(principal, parte, texto(form, 'empresa'))))
}

export async function guardarRazonSocial(_previo: Resultado, form: FormData): Promise<Resultado> {
  const principal = await requireAdmitted()
  const parte = parteDe(form)
  if (parte === null) return sinParte
  return deEdicion(parte, await intentar(editarRazonSocial(principal, parte, texto(form, 'valor'))))
}

export async function guardarCuit(_previo: Resultado, form: FormData): Promise<Resultado> {
  const principal = await requireAdmitted()
  const parte = parteDe(form)
  if (parte === null) return sinParte
  return deEdicion(parte, await intentar(editarCuit(principal, parte, texto(form, 'valor'))))
}

export async function guardarCarpeta(_previo: Resultado, form: FormData): Promise<Resultado> {
  const principal = await requireAdmitted()
  const parte = parteDe(form)
  if (parte === null) return sinParte
  return deEdicion(parte, await intentar(editarCarpeta(principal, parte, texto(form, 'valor').slice(0, 500))))
}

/** Las personas guardadas que coinciden con lo que se va escribiendo. */
export async function personasQueCoinciden(buscado: string): Promise<PersonOption[]> {
  const principal = await requireAdmitted()
  return (await intentar(buscarPersonas(principal, buscado.slice(0, 80)))) ?? []
}

/** Desde la ficha de una empresa: `parte` es la empresa y `persona`, el contacto. */
export async function asociarContacto(_previo: Resultado, form: FormData): Promise<Resultado> {
  const principal = await requireAdmitted()
  const parte = parteDe(form)
  if (parte === null) return sinParte
  return deEdicion(parte, await intentar(asociarPersona(principal, parte, texto(form, 'persona'))))
}

export async function quitarDeLaEmpresa(_previo: Resultado, form: FormData): Promise<Resultado> {
  const principal = await requireAdmitted()
  const parte = parteDe(form)
  if (parte === null) return sinParte
  const resultado = await intentar(quitarDeEmpresa(principal, parte, texto(form, 'persona')))
  if (resultado?.kind === 'not_found') return { ok: false, error: 'Ese contacto ya no estaba asociado.' }
  return deEdicion(parte, resultado)
}

export async function guardarOrigen(_previo: Resultado, form: FormData): Promise<Resultado> {
  const principal = await requireAdmitted()
  const parte = parteDe(form)
  if (parte === null) return sinParte
  const resultado = await intentar(editarOrigen(principal, parte, texto(form, 'valor')))
  if (resultado?.kind === 'not_found') return { ok: false, error: 'Ya no es prospecto: el origen no se cambia.' }
  return deEdicion(parte, resultado)
}

/**
 * Convierte el prospecto en cliente. Un segundo clic o un reintento encuentra el rol ya
 * cerrado y lleva a la misma ficha: nunca hay dos clientes.
 */
export async function convertir(_previo: Resultado, form: FormData): Promise<Resultado> {
  const principal = await requireAdmitted()
  const parte = parteDe(form)
  if (parte === null) return sinParte
  const resultado = await intentar(convertirEnCliente(principal, parte))
  if (resultado === null) return FALLO
  if (resultado.kind === 'not_found') return sinParte
  if (resultado.kind === 'missing') return { ok: false, error: `Para convertirlo en cliente, completá el ${resultado.field}.` }
  revalidatePath('/clientes')
  revalidatePath(`/parte/${parte}`)
  redirect(`/parte/${parte}?convertido=1`)
}

export async function eliminar(_previo: Resultado, form: FormData): Promise<Resultado> {
  const principal = await requireAdmitted()
  const parte = parteDe(form)
  if (parte === null) return sinParte
  const bloqueos = await intentar(eliminarContacto(principal, parte))
  if (bloqueos === null) return { ok: false, error: 'No se pudo eliminar. El contacto sigue como estaba.' }
  if (bloqueos.length > 0) return { ok: false, error: `No se puede eliminar. ${describirBloqueos(bloqueos)}` }
  revalidatePath('/clientes')
  redirect(texto(form, 'tipo') === 'empresa' ? '/clientes?eliminado=1' : '/clientes?tipo=personas&eliminado=1')
}
