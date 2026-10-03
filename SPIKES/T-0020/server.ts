// Webhook mínimo de WhatsApp Cloud API. HTTP plano, sin framework. Descartable.
import { createHmac, timingSafeEqual } from 'node:crypto'
import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http'
import { connect, markFailed, processDelivery, recordDelivery, type Sql } from './db.ts'
import { parsePayload, type Parsed } from './parse.ts'

const MAX_BODY = 1024 * 1024

export function sign(raw: Buffer | string, secret: string): string {
  return 'sha256=' + createHmac('sha256', secret).update(raw).digest('hex')
}

/** Compara `X-Hub-Signature-256` contra el HMAC del body crudo, en tiempo constante. */
export function verifySignature(raw: Buffer, header: string | undefined, secret: string): boolean {
  if (header?.startsWith('sha256=') !== true) return false
  const given = Buffer.from(header.slice('sha256='.length), 'hex')
  const expected = createHmac('sha256', secret).update(raw).digest()
  return given.length === expected.length && timingSafeEqual(given, expected)
}

export interface Store {
  record(bodyRaw: string, signature: 'valid' | 'unchecked'): Promise<number>
  process(deliveryId: number, parsed: Parsed): Promise<void>
  fail(deliveryId: number, error: unknown): Promise<void>
}

export const sqlStore = (sql: Sql): Store => ({
  record: (b, s) => recordDelivery(sql, b, s),
  process: (id, p) => processDelivery(sql, id, p),
  fail: (id, e) => markFailed(sql, id, e),
})

export interface Options {
  verifyToken: string | undefined
  appSecret: string | undefined
  store: Store
  log?: (msg: string) => void
}

async function readBody(req: IncomingMessage): Promise<Buffer | undefined> {
  const chunks: Buffer[] = []
  let size = 0
  for await (const chunk of req) {
    const buf = chunk as Buffer
    size += buf.length
    if (size > MAX_BODY) return undefined
    chunks.push(buf)
  }
  return Buffer.concat(chunks)
}

export function createWebhookServer(opts: Options): Server {
  const log = opts.log ?? ((m: string) => { console.log(m) })
  if (opts.appSecret === undefined) log('ADVERTENCIA: WHATSAPP_APP_SECRET sin definir; se aceptan POST sin firma (modo dev).')

  const handle = async (req: IncomingMessage, res: ServerResponse): Promise<void> => {
    const url = new URL(req.url ?? '/', 'http://localhost')
    if (url.pathname !== '/webhook') return void res.writeHead(404).end()

    if (req.method === 'GET') {
      const q = url.searchParams
      const ok = opts.verifyToken !== undefined &&
        q.get('hub.mode') === 'subscribe' &&
        q.get('hub.verify_token') === opts.verifyToken
      if (!ok) return void res.writeHead(403).end()
      return void res.writeHead(200, { 'content-type': 'text/plain' }).end(q.get('hub.challenge') ?? '')
    }

    if (req.method !== 'POST') return void res.writeHead(405).end()

    const raw = await readBody(req)
    if (raw === undefined) return void res.writeHead(413).end()

    let signature: 'valid' | 'unchecked' = 'unchecked'
    if (opts.appSecret !== undefined) {
      const header = req.headers['x-hub-signature-256']
      if (!verifySignature(raw, typeof header === 'string' ? header : undefined, opts.appSecret)) {
        return void res.writeHead(401).end()
      }
      signature = 'valid'
    }

    // La entrega se guarda antes del 200: si el procesamiento falla después, el cuerpo
    // crudo queda en webhook_delivery para reprocesar. Meta no reintenta tras un 200.
    const bodyRaw = raw.toString('utf8')
    const deliveryId = await opts.store.record(bodyRaw, signature)
    res.writeHead(200).end()

    try {
      const parsed = parsePayload(JSON.parse(bodyRaw))
      await opts.store.process(deliveryId, parsed)
      // Solo conteos e ids técnicos: nada de contenido ni teléfonos en el log (R-19).
      log(`delivery ${String(deliveryId)}: ${String(parsed.messages.length)} texto, ` +
        `${String(parsed.statuses.length)} estados, ${String(parsed.ignored.length)} ignorados ` +
        `(${parsed.ignored.map((i) => i.type).join(',') || '-'})`)
    } catch (error) {
      await opts.store.fail(deliveryId, error)
      log(`delivery ${String(deliveryId)}: error al procesar`)
    }
  }

  return createServer((req, res) => {
    handle(req, res).catch((error: unknown) => {
      console.error(error)
      if (!res.headersSent) res.writeHead(500).end()
    })
  })
}

if (import.meta.main) {
  const env = process.env
  const sql = connect(env.DATABASE_URL)
  const port = Number(env.PORT ?? 8787)
  const server = createWebhookServer({
    verifyToken: env.WHATSAPP_VERIFY_TOKEN || undefined,
    appSecret: env.WHATSAPP_APP_SECRET || undefined,
    store: sqlStore(sql),
  })
  server.listen(port, () => { console.log(`Escuchando en http://localhost:${String(port)}/webhook`) })
  process.on('SIGINT', () => { server.close(); void sql.end().then(() => process.exit(0)) })
}
