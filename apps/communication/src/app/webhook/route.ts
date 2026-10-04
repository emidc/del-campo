import { createWebhookHandler, deliveryStore } from '@del-campo/communication'
import { after } from 'next/server'

import { database, log } from '../../lib/server.ts'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Receptor de Meta (T-0024). Fuera de la credencial de D-0066: lo protege la firma
 * `X-Hub-Signature-256`. Responde primero y procesa después, con `after`.
 */
const handle = async (request: Request): Promise<Response> => {
  const appSecret = process.env.WHATSAPP_APP_SECRET ?? ''
  const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN ?? ''
  // Sin configuración, 503: Meta reintenta, y no hay modo sin firma.
  if (appSecret === '' || verifyToken === '') return new Response(null, { status: 503 })
  const receive = createWebhookHandler({ appSecret, verifyToken, store: deliveryStore(database()), log })
  const { response, process: processDelivery } = await receive(request)
  if (processDelivery !== null) after(processDelivery)
  return response
}

export const GET = handle
export const POST = handle
