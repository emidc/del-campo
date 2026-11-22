import { canjear, sessionConfig } from '@del-campo/api'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export const POST = (request: Request): Promise<Response> => canjear(request, sessionConfig().secret)
