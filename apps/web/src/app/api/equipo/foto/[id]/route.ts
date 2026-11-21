import { createHash } from 'node:crypto'

import { fotoDeIntegrante } from '@del-campo/api'

import { consultar, requireAdmitted } from '@/lib/sesion'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** La foto de un integrante del equipo, sólo para quien tiene sesión. */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }): Promise<Response> {
  const principal = await requireAdmitted()
  const { id } = await params
  const foto = await consultar(fotoDeIntegrante(principal, id))
  if (foto === null) return new Response(null, { status: 404 })
  const etiqueta = `"${createHash('sha1').update(foto.bytes).digest('hex')}"`
  const cabeceras = { 'cache-control': 'private, no-cache', etag: etiqueta }
  if (request.headers.get('if-none-match') === etiqueta) return new Response(null, { status: 304, headers: cabeceras })
  return new Response(Buffer.from(foto.bytes), { headers: { ...cabeceras, 'content-type': foto.type } })
}
