import { registrarCliente, sessionConfig } from '@del-campo/api'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** Registro dinámico de agentes (RFC 7591). Registrarse no da acceso: falta que una persona autorice. */
export const POST = (request: Request): Promise<Response> => registrarCliente(request, sessionConfig().secret)
