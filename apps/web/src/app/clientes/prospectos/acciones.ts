'use server'

// Alta de un prospecto. Vuelve a pasar por el guard de sesión y por `conDatos`; la base
// decide. Si un dato no sirve, devuelve el error y el formulario queda como estaba.

import { crearProspecto, isProspectOrigin } from '@del-campo/api'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

import type { Resultado } from '@/app/_componentes/Edicion'
import { consultar, requireAdmitted } from '@/lib/sesion'

const texto = (form: FormData, campo: string): string => {
  const valor = form.get(campo)
  return typeof valor === 'string' ? valor.trim().slice(0, 500) : ''
}

export async function crear(_previo: Resultado, form: FormData): Promise<Resultado> {
  const principal = await requireAdmitted()
  const tipo = texto(form, 'tipo')
  const origen = texto(form, 'origen')
  if (tipo !== 'PERSON' && tipo !== 'ORGANIZATION') return { ok: false, error: 'Elegí si es una empresa o una persona.' }
  if (!isProspectOrigin(origen)) return { ok: false, error: 'Elegí el origen del prospecto.' }
  const empresa = tipo === 'ORGANIZATION'
  let resultado
  try {
    resultado = await consultar(
      crearProspecto(principal, {
        kind: tipo,
        origin: origen,
        name: texto(form, empresa ? 'razonSocial' : 'nombre'),
        lastName: empresa ? '' : texto(form, 'apellido'),
        identifier: texto(form, empresa ? 'cuit' : 'dni'),
        phone: texto(form, 'telefono'),
        email: texto(form, 'mail'),
        driveFolderUrl: texto(form, 'carpeta'),
      }),
    )
  } catch (error) {
    if (error instanceof Error && 'digest' in error) throw error
    console.error('prospectos: no se pudo crear', error)
    return { ok: false, error: 'No se pudo guardar. Probá de nuevo en un momento.' }
  }
  if (resultado.kind === 'invalid') return { ok: false, error: resultado.message }
  revalidatePath('/clientes')
  redirect(`/parte/${resultado.partyId}`)
}
