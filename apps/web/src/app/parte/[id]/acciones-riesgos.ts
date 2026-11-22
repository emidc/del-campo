'use server'

// T-0061 — Acciones de la sección Riesgos de la ficha: crear, editar, dar de baja y comentar
// un ítem de las listas. Cada una vuelve a pasar por el guard de sesión y por `conDatos`; la
// base decide. Devuelven `{ ok }` o `{ error }` para que el formulario quede abierto si falla.

import type { ResultadoDeItem } from '@del-campo/api'
import {
  MENSAJE_DE_ITEM,
  RISK_LIST_COLUMNS,
  comentarItemDeRiesgo,
  crearItemDeRiesgo,
  darDeBajaItemDeRiesgo,
  editarItemDeRiesgo,
  esListaDeRiesgos,
} from '@del-campo/api'
import { revalidatePath } from 'next/cache'

import type { Resultado } from '@/app/_componentes/Edicion'
import { consultar, requireAdmitted } from '@/lib/sesion'

const texto = (form: FormData, campo: string): string => {
  const valor = form.get(campo)
  return typeof valor === 'string' ? valor : ''
}

const FALLO: Resultado = { ok: false, error: 'No se pudo guardar. Probá de nuevo en un momento.' }
const SIN_LISTA: Resultado = { ok: false, error: 'No se encontró la lista.' }

const responder = async (parte: string, escritura: Promise<ResultadoDeItem>): Promise<Resultado> => {
  let resultado: ResultadoDeItem
  try {
    resultado = await consultar(escritura)
  } catch (error) {
    if (error instanceof Error && 'digest' in error) throw error
    console.error('riesgos de la ficha: no se pudo guardar', error)
    return FALLO
  }
  if (resultado !== 'guardado') return { ok: false, error: MENSAJE_DE_ITEM[resultado] }
  revalidatePath(`/parte/${parte}`)
  return { ok: true }
}

const camposDe = (form: FormData, lista: keyof typeof RISK_LIST_COLUMNS): Record<string, string> =>
  Object.fromEntries(RISK_LIST_COLUMNS[lista].map(({ key }) => [key, texto(form, `campo_${key}`)]))

export async function crearItem(_previo: Resultado, form: FormData): Promise<Resultado> {
  const principal = await requireAdmitted()
  const parte = texto(form, 'parte')
  const lista = texto(form, 'lista')
  if (!esListaDeRiesgos(lista)) return SIN_LISTA
  return responder(parte, crearItemDeRiesgo(principal, parte, lista, texto(form, 'codigo'), camposDe(form, lista)))
}

export async function editarItem(_previo: Resultado, form: FormData): Promise<Resultado> {
  const principal = await requireAdmitted()
  const parte = texto(form, 'parte')
  const lista = texto(form, 'lista')
  if (!esListaDeRiesgos(lista)) return SIN_LISTA
  return responder(parte, editarItemDeRiesgo(principal, parte, texto(form, 'item'), lista, camposDe(form, lista)))
}

export async function bajaDeItem(_previo: Resultado, form: FormData): Promise<Resultado> {
  const principal = await requireAdmitted()
  const parte = texto(form, 'parte')
  return responder(parte, darDeBajaItemDeRiesgo(principal, parte, texto(form, 'item'), texto(form, 'baja') !== 'no'))
}

export async function comentarItem(_previo: Resultado, form: FormData): Promise<Resultado> {
  const principal = await requireAdmitted()
  const parte = texto(form, 'parte')
  return responder(parte, comentarItemDeRiesgo(principal, parte, texto(form, 'item'), texto(form, 'comentario')))
}
