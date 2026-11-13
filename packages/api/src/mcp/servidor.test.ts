import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import type { Herramienta, OpcionesMcp } from './servidor.ts'
import { ErrorDeHerramienta, atenderMcp } from './servidor.ts'

const eco: Herramienta<string> = {
  name: 'eco',
  description: 'Devuelve lo que recibe',
  inputSchema: { type: 'object' },
  soloLectura: true,
  ejecutar: (quien, argumentos) => {
    if (argumentos.falla === 'agente') return Promise.reject(new ErrorDeHerramienta('Falta un dato.'))
    if (argumentos.falla === 'interna') return Promise.reject(new Error('detalle interno con una clave'))
    return Promise.resolve({ quien, argumentos })
  },
}

const llamadas: string[] = []
const opciones: OpcionesMcp<string> = {
  nombre: 'prueba',
  version: '0',
  instrucciones: 'instrucciones',
  herramientas: [eco],
  alLlamar: (_quien, herramienta, resultado) => {
    llamadas.push(`${herramienta}:${resultado}`)
    return Promise.resolve()
  },
}

interface Respuesta {
  readonly result: {
    readonly protocolVersion: string
    readonly serverInfo: { readonly name: string }
    readonly instructions: string
    readonly capabilities: unknown
    readonly tools: unknown
    readonly content: readonly [{ readonly text: string }]
    readonly isError?: boolean
  }
  readonly error: { readonly code: number }
}

const pedir = async (cuerpo: unknown, method = 'POST') => {
  const respuesta = await atenderMcp(
    opciones,
    'manuel',
    new Request('https://broker.test/api/mcp/x', {
      method,
      ...(method === 'POST' ? { body: typeof cuerpo === 'string' ? cuerpo : JSON.stringify(cuerpo) } : {}),
    }),
  )
  const texto = await respuesta.text()
  return { status: respuesta.status, json: (texto === '' ? null : JSON.parse(texto)) as Respuesta }
}

const rpc = (method: string, params?: unknown, id: number | undefined = 1) => ({ jsonrpc: '2.0', id, method, params })

describe('servidor MCP', () => {
  it('initialize devuelve la versión pedida si la conoce, el nombre y las instrucciones', async () => {
    const r = await pedir(rpc('initialize', { protocolVersion: '2025-03-26' }))
    assert.equal(r.status, 200)
    assert.equal(r.json.result.protocolVersion, '2025-03-26')
    assert.equal(r.json.result.serverInfo.name, 'prueba')
    assert.equal(r.json.result.instructions, 'instrucciones')
    assert.deepEqual(r.json.result.capabilities, { tools: {} })
  })

  it('una versión desconocida se responde con la más nueva que el servidor habla', async () => {
    const r = await pedir(rpc('initialize', { protocolVersion: '1999-01-01' }))
    assert.equal(r.json.result.protocolVersion, '2025-06-18')
  })

  it('una notificación no lleva respuesta', async () => {
    const r = await pedir({ jsonrpc: '2.0', method: 'notifications/initialized' })
    assert.equal(r.status, 202)
    assert.equal(r.json, null)
  })

  it('tools/list publica nombre, descripción, esquema y si es de sólo lectura', async () => {
    const r = await pedir(rpc('tools/list'))
    assert.deepEqual(r.json.result.tools, [
      { name: 'eco', description: 'Devuelve lo que recibe', inputSchema: { type: 'object' }, annotations: { readOnlyHint: true } },
    ])
  })

  it('tools/call corre la herramienta con el contexto de quien llama y registra la llamada', async () => {
    llamadas.length = 0
    const r = await pedir(rpc('tools/call', { name: 'eco', arguments: { a: 1 } }))
    assert.deepEqual(JSON.parse(r.json.result.content[0].text), { quien: 'manuel', argumentos: { a: 1 } })
    assert.equal(r.json.result.isError, undefined)
    assert.deepEqual(llamadas, ['eco:ok'])
  })

  it('un error pensado para el agente llega con su mensaje', async () => {
    llamadas.length = 0
    const r = await pedir(rpc('tools/call', { name: 'eco', arguments: { falla: 'agente' } }))
    assert.equal(r.json.result.isError, true)
    assert.equal(r.json.result.content[0].text, 'Falta un dato.')
    assert.deepEqual(llamadas, ['eco:error'])
  })

  it('un error interno no filtra su detalle', async (t) => {
    t.mock.method(console, 'error', () => undefined)
    const r = await pedir(rpc('tools/call', { name: 'eco', arguments: { falla: 'interna' } }))
    assert.equal(r.json.result.isError, true)
    assert.doesNotMatch(r.json.result.content[0].text, /clave/)
  })

  it('herramienta o método desconocido, JSON inválido y GET responden con el error que corresponde', async () => {
    assert.equal((await pedir(rpc('tools/call', { name: 'otra' }))).json.error.code, -32602)
    assert.equal((await pedir(rpc('resources/list'))).json.error.code, -32601)
    assert.equal((await pedir('{')).status, 400)
    assert.equal((await pedir(null, 'GET')).status, 405)
  })
})
