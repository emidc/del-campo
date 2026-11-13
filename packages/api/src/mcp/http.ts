// T-0062 — El borde HTTP del servidor MCP: token → persona → herramientas.

import { auditar } from '../acceso/base.ts'
import { sql } from '../db.ts'
import type { ContextoMcp } from './herramientas.ts'
import { HERRAMIENTAS_MCP, INSTRUCCIONES_MCP } from './herramientas.ts'
import { atenderMcp } from './servidor.ts'
import type { Principal } from '../session/admission.ts'
import { crearTokenMcp, resolverTokenMcp, revocarTokenMcp, tokenMcpVigente } from './tokens.ts'

/** Atiende `/api/mcp/<token>`. Un token desconocido o revocado responde 404, sin cuerpo. */
export const mcpBrokerOs = async (request: Request, token: string): Promise<Response> => {
  const titular = await resolverTokenMcp(sql(), token)
  if (titular === null) return new Response(null, { status: 404, headers: { 'cache-control': 'no-store' } })
  return atenderMcp<ContextoMcp>(
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
}

/** Lo que usa la pantalla "Conectar Claude": generar, revocar y consultar el token propio. */
export const generarTokenMcp = (principal: Principal): Promise<string> => crearTokenMcp(sql(), principal)
export const quitarTokenMcp = (principal: Principal): Promise<void> => revocarTokenMcp(sql(), principal)
export const tokenMcpDesde = (principal: Principal): Promise<Date | null> => tokenMcpVigente(sql(), principal)
