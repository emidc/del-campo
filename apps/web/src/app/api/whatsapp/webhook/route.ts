import { whatsappWebhook } from '@del-campo/api'
import { after } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Receptor de WhatsApp Cloud API (T-0066). No usa la cookie de sesión: lo protege la firma
 * de Meta. Responde primero y procesa después, con `after`.
 */
const atender = async (request: Request): Promise<Response> => {
  const { response, process: procesar } = await whatsappWebhook(request)
  if (procesar !== null) after(procesar)
  return response
}

export { atender as GET, atender as POST }
