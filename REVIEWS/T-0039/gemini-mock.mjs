// Servidor mínimo de la Gemini API: 1.ª respuesta = functionCall; luego, texto final.
import { createServer } from 'node:http'
import { appendFileSync } from 'node:fs'
const port = Number(process.argv[2]); const plan = JSON.parse(process.argv[3]); const log = process.argv[4]
let n = 0
createServer((req, res) => {
  let body = ''
  req.on('data', (c) => (body += c))
  req.on('end', () => {
    appendFileSync(log, `${req.method} ${req.url}\n${body}\n---\n`)
    const usageMetadata = { promptTokenCount: 1, candidatesTokenCount: 1, totalTokenCount: 2 }
    if (req.url.includes(':countTokens')) { res.writeHead(200, { 'content-type': 'application/json' }); return res.end('{"totalTokens":1}') }
    if (!/generatecontent/i.test(req.url)) { res.writeHead(200, { 'content-type': 'application/json' }); return res.end('{}') }
    const isMain = body.includes('"tools"')
    const step = isMain ? plan[n++] : null
    const parts = step ? [{ functionCall: { name: step.name, args: step.args } }] : [{ text: isMain ? 'listo' : '{"reasoning":"x","next_speaker":"user"}' }]
    const chunk = { candidates: [{ content: { role: 'model', parts }, finishReason: 'STOP', index: 0 }], usageMetadata }
    if (/stream/i.test(req.url)) {
      res.writeHead(200, { 'content-type': 'text/event-stream' })
      res.end(`data: ${JSON.stringify(chunk)}\n\n`)
    } else {
      res.writeHead(200, { 'content-type': 'application/json' }); res.end(JSON.stringify(chunk))
    }
  })
}).listen(port, '127.0.0.1')
