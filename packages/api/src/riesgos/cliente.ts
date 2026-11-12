// Los riesgos de una empresa, leídos de Risk OS para la ficha (C4-03b; D-0071, D-0077). Diseño:
// docs/desarrollo/riesgos-en-la-ficha.md §3.
//
// Broker OS no importa `@del-campo/risk`: declara acá el contrato del endpoint
// `GET /api/entre-contextos/empresas/:empresa/riesgos` y valida el JSON a mano. No guarda ni
// cachea nada: si Risk OS no responde, la ficha lo dice y no muestra datos viejos.
//
// La identidad viaja en un token ES256 de 60 s firmado por Broker OS, uno por llamada y sin
// reintento (su `jti` es de un solo uso). Lo que la persona ve lo decide Risk OS con su propia
// admisión y sus asignaciones.

import { emitirToken } from '@del-campo/identidad'

import type { Principal } from '../session/admission.ts'

export interface RiesgoEnFicha {
  readonly riskId: string
  readonly titulo: string
  readonly tipoObjeto: string
  readonly unidad: string | null
  readonly posicion: number
  readonly empate: boolean
  readonly provisional: boolean
  readonly banda: string | null
}

export interface RiesgosVinculados {
  readonly estado: 'vinculada'
  readonly organizacion: { readonly id: string; readonly sector: string | null; readonly tamano: string | null; readonly zonas: readonly string[] }
  readonly version: string
  readonly generadoEn: string
  readonly riesgos: readonly RiesgoEnFicha[]
  readonly noEvaluables: number
  readonly enCola: number
}

export type ResultadoRiesgos =
  | (RiesgosVinculados & { readonly urlRisk: string })
  | { readonly estado: 'pendiente' | 'sin_vinculo' | 'sin_acceso' | 'no_disponible' | 'no_configurado' }

export type EnvRiesgos = Readonly<Record<string, string | undefined>>

export interface DepsRiesgos {
  readonly env: EnvRiesgos
  readonly fetch: typeof fetch
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
// Risk OS en frío (función y conexión a la base) puede pasar los 3 s; la ficha no espera por esto.
const TIMEOUT_MS = 8000

const esTexto = (x: unknown): x is string => typeof x === 'string'
const esTextoONulo = (x: unknown): x is string | null => x === null || typeof x === 'string'
const esEntero = (x: unknown): x is number => typeof x === 'number' && Number.isInteger(x) && x >= 0

const esRiesgo = (x: unknown): x is RiesgoEnFicha => {
  if (typeof x !== 'object' || x === null) return false
  const r = x as Record<string, unknown>
  return esTexto(r.riskId) && esTexto(r.titulo) && esTexto(r.tipoObjeto) && esTextoONulo(r.unidad) && esEntero(r.posicion)
    && typeof r.empate === 'boolean' && typeof r.provisional === 'boolean' && esTextoONulo(r.banda)
}

/** El cuerpo de un 200, si cumple el contrato; `null` si no. */
export const leerCuerpo = (cuerpo: unknown): RiesgosVinculados | { readonly estado: 'pendiente' | 'sin_vinculo' } | null => {
  if (typeof cuerpo !== 'object' || cuerpo === null) return null
  const c = cuerpo as Record<string, unknown>
  if (c.estado === 'pendiente' || c.estado === 'sin_vinculo') return { estado: c.estado }
  if (c.estado !== 'vinculada') return null
  const o = c.organizacion as Record<string, unknown> | null | undefined
  const organizacionValida = typeof o === 'object' && o !== null && esTexto(o.id) && esTextoONulo(o.sector) && esTextoONulo(o.tamano)
    && Array.isArray(o.zonas) && o.zonas.every(esTexto)
  if (!organizacionValida || !esTexto(c.version) || !esTexto(c.generadoEn) || Number.isNaN(Date.parse(c.generadoEn))) return null
  if (!Array.isArray(c.riesgos) || !c.riesgos.every(esRiesgo) || !esEntero(c.noEvaluables) || !esEntero(c.enCola)) return null
  return {
    estado: 'vinculada',
    organizacion: { id: o.id as string, sector: o.sector as string | null, tamano: o.tamano as string | null, zonas: o.zonas as string[] },
    version: c.version,
    generadoEn: c.generadoEn,
    riesgos: c.riesgos,
    noEvaluables: c.noEvaluables,
    enCola: c.enCola,
  }
}

interface Config {
  readonly apiUrl: URL
  readonly baseUrl: string
  readonly clave: Parameters<typeof emitirToken>[0]
}

const configDe = (env: EnvRiesgos): Config | null => {
  try {
    const apiUrl = new URL(env.RISK_API_URL ?? '')
    const baseUrl = new URL(env.RISK_BASE_URL ?? env.RISK_API_URL ?? '').origin
    const clave: unknown = JSON.parse(env.BROKER_TOKEN_CLAVE_PRIVADA ?? '')
    if (typeof clave !== 'object' || clave === null) return null
    return { apiUrl, baseUrl, clave }
  } catch {
    return null
  }
}

/**
 * Los riesgos de una empresa que la persona ya ve en Broker OS. Sólo para una `Party` de tipo
 * organización: lo comprueba la ficha antes de llamar.
 */
export const riesgosDeEmpresa = async (
  principal: Principal, partyId: string, deps: DepsRiesgos = { env: process.env, fetch },
): Promise<ResultadoRiesgos> => {
  const config = configDe(deps.env)
  if (config === null) return { estado: 'no_configurado' }
  if (!UUID.test(partyId)) return { estado: 'sin_vinculo' }
  let token: string
  try {
    token = await emitirToken(config.clave, { emisor: 'broker-os', audiencia: 'risk-os', proveedor: 'google', sujeto: principal.sub })
  } catch {
    return { estado: 'no_configurado' }
  }
  const url = new URL(`/api/entre-contextos/empresas/${partyId}/riesgos`, config.apiUrl)
  let respuesta: Response
  try {
    respuesta = await deps.fetch(url, {
      headers: { authorization: `Bearer ${token}`, accept: 'application/json' },
      cache: 'no-store',
      signal: AbortSignal.timeout(TIMEOUT_MS),
    })
  } catch {
    return { estado: 'no_disponible' }
  }
  if (respuesta.status === 401 || respuesta.status === 403) return { estado: 'sin_acceso' }
  if (respuesta.status !== 200) return { estado: 'no_disponible' }
  let cuerpo: unknown
  try {
    cuerpo = await respuesta.json()
  } catch {
    return { estado: 'no_disponible' }
  }
  const leido = leerCuerpo(cuerpo)
  if (leido === null) return { estado: 'no_disponible' }
  if (leido.estado !== 'vinculada') return leido
  return { ...leido, urlRisk: `${config.baseUrl}/o/${encodeURIComponent(leido.organizacion.id)}` }
}
