// T-0062 — El borde HTTP del servidor MCP: token → persona → herramientas.

import { auditar } from '../acceso/base.ts'
import { sql } from '../db.ts'
import type { ContextoMcp } from './herramientas.ts'
import { HERRAMIENTAS_MCP, INSTRUCCIONES_MCP } from './herramientas.ts'
import { atenderMcp } from './servidor.ts'
import type { Principal } from '../session/admission.ts'
import { sessionConfig } from '../session/config.ts'
import type { PedidoDeAutorizacion } from './oauth.ts'
import { emitirCodigo, noAutorizado, usuarioDelAcceso } from './oauth.ts'
import type { TitularDeToken } from './tokens.ts'
import {
  crearTokenMcp,
  resolverTokenMcp,
  resolverUsuarioMcp,
  revocarTokenMcp,
  tokenMcpVigente,
  usuarioIdDe,
} from './tokens.ts'

/** Atiende `/api/mcp/<token>`. Un token desconocido o revocado responde 404, sin cuerpo. */
export const mcpBrokerOs = async (request: Request, token: string): Promise<Response> => {
  const titular = await resolverTokenMcp(sql(), token)
  if (titular === null) return new Response(null, { status: 404, headers: { 'cache-control': 'no-store' } })
  return atender(request, titular)
}

/** Atiende `/api/mcp` con `Authorization: Bearer`, el token que entrega el inicio de sesión OAuth. */
export const mcpBrokerOsOauth = async (request: Request): Promise<Response> => {
  const usuarioId = await usuarioDelAcceso(request, sessionConfig().secret)
  const titular = usuarioId === null ? null : await resolverUsuarioMcp(sql(), usuarioId)
  if (titular === null) return noAutorizado(request)
  return atender(request, titular)
}

/** La persona en sesión autorizó al agente: la dirección de vuelta, con el código. */
export const autorizarAgente = async (principal: Principal, pedido: PedidoDeAutorizacion): Promise<string> =>
  emitirCodigo(pedido, await usuarioIdDe(sql(), principal), sessionConfig().secret)

const atender = (request: Request, titular: TitularDeToken): Promise<Response> =>
  atenderMcp<ContextoMcp>(
    {
      nombre: 'broker-os',
      version: '0.1.0',
      instrucciones: INSTRUCCIONES_MCP,
      herramientas: HERRAMIENTAS_MCP,
      alLlamar: (contexto, herramienta, resultado) =>
        auditar(sql(), {
          actor: contexto.usuarioId,
          origen: 'mcp',
          accion: `mcp.${herramienta}`,
          tipoObjeto: null,
          idObjeto: null,
          resultado,
          motivo: null,
        }),
    },
    titular,
    request,
  )

/** Lo que usa la pantalla "Conectar un agente": generar, revocar y consultar el token propio. */
export const generarTokenMcp = (principal: Principal): Promise<string> => crearTokenMcp(sql(), principal)
export const quitarTokenMcp = (principal: Principal): Promise<void> => revocarTokenMcp(sql(), principal)
export const tokenMcpDesde = (principal: Principal): Promise<Date | null> => tokenMcpVigente(sql(), principal)
