// Servidor mínimo de la Responses API: 1.ª respuesta = tool call; luego, mensaje final.
import { createServer } from 'node:http'
import { appendFileSync } from 'node:fs'
const port = Number(process.argv[2]); const plan = JSON.parse(process.argv[3]); const log = process.argv[4]
let n = 0
createServer((req, res) => {
  let body = ''
  req.on('data', (c) => (body += c))
  req.on('end', () => {
    appendFileSync(log, `${req.method} ${req.url}\n${body}\n---\n`)
    if (!req.url.includes('/responses')) { res.writeHead(404); return res.end() }
    res.writeHead(200, { 'content-type': 'text/event-stream' })
    const send = (o) => res.write(`event: ${o.type}\ndata: ${JSON.stringify(o)}\n\n`)
    const id = `resp_${n}`
    send({ type: 'response.created', response: { id } })
    const step = plan[n++]
    if (step) send({ type: 'response.output_item.done', item: { type: 'function_call', id: `fc_${n}`, call_id: `call_${n}`, name: step.name, arguments: JSON.stringify(step.args) } })
    else send({ type: 'response.output_item.done', item: { type: 'message', role: 'assistant', id: `msg_${n}`, content: [{ type: 'output_text', text: 'listo' }] } })
    send({ type: 'response.completed', response: { id, usage: { input_tokens: 1, input_tokens_details: null, output_tokens: 1, output_tokens_details: null, total_tokens: 2 } } })
    res.end()
  })
}).listen(port, '127.0.0.1')
