// T-0062 — Servidor MCP de Broker OS, sobre `Request`/`Response` estándar (transporte
// "Streamable HTTP", sin estado y con respuestas JSON). Implementa lo que un cliente como
// Claude necesita: initialize, tools/list y tools/call. Sin dependencias: el protocolo es
// JSON-RPC 2.0 y cabe en este archivo.
//
// Las herramientas no viven acá (ver `herramientas.ts`): este módulo sólo las despacha.

export interface Herramienta<Contexto> {
  readonly name: string
  readonly description: string
  /** JSON Schema de los argumentos. */
  readonly inputSchema: Readonly<Record<string, unknown>>
  /** true si no modifica datos. */
  readonly soloLectura: boolean
  readonly ejecutar: (contexto: Contexto, argumentos: Readonly<Record<string, unknown>>) => Promise<unknown>
}

/** Un error que se le muestra al agente tal cual (argumento inválido, no encontrado). */
export class ErrorDeHerramienta extends Error {}

export interface OpcionesMcp<Contexto> {
  readonly nombre: string
  readonly version: string
  readonly instrucciones: string
  readonly herramientas: readonly Herramienta<Contexto>[]
  /** Se llama después de cada tools/call, haya salido bien o mal. */
  readonly alLlamar?: (contexto: Contexto, herramienta: string, resultado: 'ok' | 'error') => Promise<void>
}

const VERSIONES = ['2025-06-18', '2025-03-26', '2024-11-05']

type Id = string | number | null

const json = (cuerpo: unknown, status = 200): Response =>
  new Response(JSON.stringify(cuerpo), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  })

const exito = (id: Id, result: unknown) => ({ jsonrpc: '2.0', id, result })
const falla = (id: Id, code: number, message: string) => ({ jsonrpc: '2.0', id, error: { code, message } })

const esObjeto = (valor: unknown): valor is Record<string, unknown> =>
  typeof valor === 'object' && valor !== null && !Array.isArray(valor)

const despachar = async <Contexto>(
  opciones: OpcionesMcp<Contexto>,
  contexto: Contexto,
  mensaje: unknown,
): Promise<object | null> => {
  if (!esObjeto(mensaje) || mensaje.jsonrpc !== '2.0' || typeof mensaje.method !== 'string') {
    return falla(null, -32600, 'Pedido inválido')
  }
  // Sin id es una notificación: no lleva respuesta.
  if (mensaje.id === undefined) return null
  const id = mensaje.id as Id
  const params = esObjeto(mensaje.params) ? mensaje.params : {}

  switch (mensaje.method) {
    case 'initialize': {
      const pedida = typeof params.protocolVersion === 'string' ? params.protocolVersion : ''
      return exito(id, {
        protocolVersion: VERSIONES.includes(pedida) ? pedida : VERSIONES[0],
        capabilities: { tools: {} },
        serverInfo: { name: opciones.nombre, version: opciones.version },
        instructions: opciones.instrucciones,
      })
    }
    case 'ping':
      return exito(id, {})
    case 'tools/list':
      return exito(id, {
        tools: opciones.herramientas.map((h) => ({
          name: h.name,
          description: h.description,
          inputSchema: h.inputSchema,
          annotations: { readOnlyHint: h.soloLectura },
        })),
      })
    case 'tools/call': {
      const herramienta = opciones.herramientas.find((h) => h.name === params.name)
      if (herramienta === undefined) return falla(id, -32602, `Herramienta desconocida: ${String(params.name)}`)
      const argumentos = esObjeto(params.arguments) ? params.arguments : {}
      try {
        const resultado = await herramienta.ejecutar(contexto, argumentos)
        await opciones.alLlamar?.(contexto, herramienta.name, 'ok')
        return exito(id, { content: [{ type: 'text', text: JSON.stringify(resultado, null, 2) }] })
      } catch (error) {
        await opciones.alLlamar?.(contexto, herramienta.name, 'error')
        // Sólo los errores pensados para el agente llevan su mensaje; el resto no filtra detalle.
        const texto = error instanceof ErrorDeHerramienta ? error.message : 'No se pudo completar el pedido.'
        if (!(error instanceof ErrorDeHerramienta)) console.error('mcp', herramienta.name, error)
        return exito(id, { content: [{ type: 'text', text: texto }], isError: true })
      }
    }
    default:
      return falla(id, -32601, `Método desconocido: ${mensaje.method}`)
  }
}

/** Atiende un pedido MCP ya autenticado. `contexto` es lo que reciben las herramientas. */
export const atenderMcp = async <Contexto>(
  opciones: OpcionesMcp<Contexto>,
  contexto: Contexto,
  request: Request,
): Promise<Response> => {
  if (request.method !== 'POST') {
    return new Response(null, { status: 405, headers: { allow: 'POST' } })
  }
  let cuerpo: unknown
  try {
    cuerpo = await request.json()
  } catch {
    return json(falla(null, -32700, 'JSON inválido'), 400)
  }
  if (Array.isArray(cuerpo)) {
    const respuestas = (await Promise.all(cuerpo.map((m) => despachar(opciones, contexto, m)))).filter((r) => r !== null)
    return respuestas.length === 0 ? new Response(null, { status: 202 }) : json(respuestas)
  }
  const respuesta = await despachar(opciones, contexto, cuerpo)
  return respuesta === null ? new Response(null, { status: 202 }) : json(respuesta)
}
