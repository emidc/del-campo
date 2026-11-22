'use server'

import { autorizarAgente, rechazar, sessionConfig, validarAutorizacion } from '@del-campo/api'
import { redirect } from 'next/navigation'

import { consultar, requireAdmitted } from '@/lib/sesion'

const CAMPOS = ['client_id', 'redirect_uri', 'state', 'response_type', 'code_challenge', 'code_challenge_method']

/** La persona respondió en /oauth/autorizar: vuelve al agente con el código o con access_denied. */
export async function responder(datos: FormData): Promise<void> {
  const principal = await requireAdmitted()
  const parametros = Object.fromEntries(
    CAMPOS.map((c) => [c, datos.get(c)]).filter((e): e is [string, string] => typeof e[1] === 'string'),
  )
  const validada = await validarAutorizacion(parametros, sessionConfig().secret)
  if (!validada.ok) redirect(validada.volverA ?? '/conectar')
  if (datos.get('decision') !== 'autorizar') redirect(rechazar(validada.pedido))
  redirect(await consultar(autorizarAgente(principal, validada.pedido)))
}
