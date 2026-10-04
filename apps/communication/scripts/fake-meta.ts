// Meta simulado para el recorrido local de T-0025: responde a
// POST /{version}/{phone_number_id}/messages con la forma documentada por Meta
// (fixtures `send-*.documented.json` del contexto). No hay llamadas reales.
//
//   node apps/communication/scripts/fake-meta.ts            # escucha en 127.0.0.1:4010
//   WHATSAPP_GRAPH_BASE_URL=http://127.0.0.1:4010 pnpm --filter ./apps/communication dev
//
// Si el texto del mensaje contiene `#rechazar`, responde el error 131030 (HTTP 400). Si
// contiene `#colgar`, no responde nunca (el cliente corta a los 15 s: sin confirmar).
// Cuenta las llamadas y las expone en GET /calls, para verificar que un mismo intento
// no se envía dos veces. No loguea contenido ni destinatarios.

import { randomUUID } from 'node:crypto'
import { createServer } from 'node:http'

const PORT = Number(process.env.FAKE_META_PORT ?? '4010')
let calls = 0

const server = createServer((request, response) => {
  if (request.method === 'GET' && request.url === '/calls') {
    response.writeHead(200, { 'content-type': 'application/json' }).end(JSON.stringify({ calls }))
    return
  }
  if (request.method !== 'POST' || !/^\/v\d+\.\d+\/\d+\/messages$/.test(request.url ?? '')) {
    response.writeHead(404).end()
    return
  }
  let raw = ''
  request.on('data', (chunk: Buffer) => {
    raw += chunk.toString('utf8')
  })
  request.on('end', () => {
    calls += 1
    console.info(`[fake-meta] llamada ${String(calls)}`)
    let body = ''
    let to = ''
    try {
      const parsed = JSON.parse(raw) as { to?: string; text?: { body?: string } }
      body = parsed.text?.body ?? ''
      to = parsed.to ?? ''
    } catch {
      response.writeHead(400, { 'content-type': 'application/json' }).end('{"error":{"message":"bad json","code":100}}')
      return
    }
    if (body.includes('#colgar')) return
    if (body.includes('#rechazar')) {
      response.writeHead(400, { 'content-type': 'application/json' }).end(
        JSON.stringify({
          error: {
            message: '(#131030) Recipient phone number not in allowed list',
            type: 'OAuthException',
            code: 131030,
            error_data: { messaging_product: 'whatsapp', details: 'Recipient phone number not in allowed list' },
            fbtrace_id: 'SYNTHtrace',
          },
        }),
      )
      return
    }
    response.writeHead(200, { 'content-type': 'application/json' }).end(
      JSON.stringify({
        messaging_product: 'whatsapp',
        contacts: [{ input: to, wa_id: to }],
        messages: [{ id: `wamid.SYNTH-${randomUUID()}` }],
      }),
    )
  })
})

server.listen(PORT, '127.0.0.1', () => {
  console.info(`[fake-meta] escuchando en http://127.0.0.1:${String(PORT)}`)
})
