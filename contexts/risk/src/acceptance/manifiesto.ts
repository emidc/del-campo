// El manifiesto de la aceptación de RO01 (T-0032): un JSON que el owner completa en su equipo y
// nunca entra al repositorio. Dice qué organización es cada empresa histórica (H1 a H5), los
// intentos de importación de cada una, copiados de los informes sin valores, y qué persona es el
// revisor profesional. Sólo lleva ids opacos, fechas, huellas y conteos: ningún nombre, título ni
// valor (R-19). Un campo de más, uno que falta o uno con otra forma se rechaza sin repetir su
// contenido.

export const EMPRESAS = ['H1', 'H2', 'H3', 'H4', 'H5'] as const
export type CodigoEmpresa = (typeof EMPRESAS)[number]

/** Lo que dejó un intento, según la primera línea del informe del importador. */
export const ESTADOS_INTENTO = ['importado', 'ya_importado', 'rechazado', 'sin_destino', 'falla_escritura'] as const
export type EstadoIntento = (typeof ESTADOS_INTENTO)[number]

export interface Intento {
  readonly fecha: string
  readonly estado: EstadoIntento
  /** La huella del lote (primera línea `huella …` del informe). */
  readonly huella: string
  /** Rechazos y avisos por `regla_id`, como los cuenta la sección «por regla» del informe. */
  readonly rechazos: Readonly<Record<string, number>>
  readonly avisos: Readonly<Record<string, number>>
}

export interface EmpresaManifiesto {
  readonly organizacionId: string
  readonly intentos: readonly Intento[]
}

export interface Manifiesto {
  readonly empresas: Readonly<Record<CodigoEmpresa, EmpresaManifiesto>>
  /** Las personas por código: `R1` es el revisor profesional; las demás, opcionales (`O1`, …). */
  readonly personas: Readonly<Record<string, string>>
}

export const ERROR_MANIFIESTO = 'RO01_MANIFIESTO_INVALIDO'

export class ManifiestoInvalido extends Error {
  readonly campo: string

  constructor(campo: string) {
    // Sólo el nombre del campo, nunca su contenido: el archivo es privado.
    super(`${ERROR_MANIFIESTO}: ${campo}`)
    this.name = 'ManifiestoInvalido'
    this.campo = campo
  }
}

const ORG = /^ORG-[0-9A-HJKMNP-TV-Z]{26}$/
const PERSONA = /^PER-[0-9A-HJKMNP-TV-Z]{26}$/
const HUELLA = /^[0-9a-f]{64}$/
const REGLA = /^RV-[A-Z]{2,4}-\d{2}$/
const CODIGO_PERSONA = /^[A-Z]\d{1,2}$/
const FECHA = /^\d{4}-\d{2}-\d{2}$/

const objeto = (v: unknown, campo: string, claves?: readonly string[]): Record<string, unknown> => {
  if (typeof v !== 'object' || v === null || Array.isArray(v)) throw new ManifiestoInvalido(campo)
  const r = v as Record<string, unknown>
  if (claves !== undefined && (Object.keys(r).length !== claves.length || claves.some((k) => !Object.hasOwn(r, k)))) {
    throw new ManifiestoInvalido(campo)
  }
  return r
}

const fecha = (v: unknown, campo: string): string => {
  if (typeof v !== 'string' || !FECHA.test(v) || Number.isNaN(Date.parse(`${v}T00:00:00Z`)) || new Date(`${v}T00:00:00Z`).toISOString().slice(0, 10) !== v) {
    throw new ManifiestoInvalido(campo)
  }
  return v
}

const conteos = (v: unknown, campo: string): Record<string, number> => {
  const r = objeto(v, campo)
  for (const [k, n] of Object.entries(r)) {
    if (!REGLA.test(k) || typeof n !== 'number' || !Number.isSafeInteger(n) || n < 1) throw new ManifiestoInvalido(campo)
  }
  return r as Record<string, number>
}

export function leerManifiesto(input: unknown): Manifiesto {
  const r = objeto(input, 'raíz', ['empresas', 'personas'])
  const e = objeto(r.empresas, 'empresas', EMPRESAS)
  const organizaciones = new Set<string>()
  const empresas = Object.fromEntries(EMPRESAS.map((codigo): [CodigoEmpresa, EmpresaManifiesto] => {
    const x = objeto(e[codigo], `empresas.${codigo}`, ['organizacionId', 'intentos'])
    if (typeof x.organizacionId !== 'string' || !ORG.test(x.organizacionId) || organizaciones.has(x.organizacionId)) {
      throw new ManifiestoInvalido(`empresas.${codigo}.organizacionId`)
    }
    organizaciones.add(x.organizacionId)
    if (!Array.isArray(x.intentos) || x.intentos.length === 0 || x.intentos.length > 100) throw new ManifiestoInvalido(`empresas.${codigo}.intentos`)
    const intentos = x.intentos.map((v: unknown, i): Intento => {
      const campo = `empresas.${codigo}.intentos[${String(i)}]`
      const t = objeto(v, campo, ['fecha', 'estado', 'huella', 'rechazos', 'avisos'])
      if (typeof t.estado !== 'string' || !(ESTADOS_INTENTO as readonly string[]).includes(t.estado)) throw new ManifiestoInvalido(`${campo}.estado`)
      if (typeof t.huella !== 'string' || !HUELLA.test(t.huella)) throw new ManifiestoInvalido(`${campo}.huella`)
      const rechazos = conteos(t.rechazos, `${campo}.rechazos`)
      // Un lote importado no tiene rechazos; uno rechazado tiene al menos uno.
      const conRechazos = Object.keys(rechazos).length > 0
      if (((t.estado === 'importado' || t.estado === 'ya_importado') && conRechazos) || (t.estado === 'rechazado' && !conRechazos)) {
        throw new ManifiestoInvalido(`${campo}.rechazos`)
      }
      return { fecha: fecha(t.fecha, `${campo}.fecha`), estado: t.estado as EstadoIntento, huella: t.huella, rechazos, avisos: conteos(t.avisos, `${campo}.avisos`) }
    })
    for (let i = 1; i < intentos.length; i++) {
      if ((intentos[i]?.fecha ?? '') < (intentos[i - 1]?.fecha ?? '')) throw new ManifiestoInvalido(`empresas.${codigo}.intentos (en orden de fecha)`)
    }
    return [codigo, { organizacionId: x.organizacionId, intentos }]
  })) as Record<CodigoEmpresa, EmpresaManifiesto>
  const p = objeto(r.personas, 'personas')
  if (!Object.hasOwn(p, 'R1')) throw new ManifiestoInvalido('personas.R1')
  const ids = new Set<string>()
  for (const [codigo, id] of Object.entries(p)) {
    if (!CODIGO_PERSONA.test(codigo) || typeof id !== 'string' || !PERSONA.test(id) || ids.has(id)) throw new ManifiestoInvalido(`personas.${codigo}`)
    ids.add(id)
  }
  return { empresas, personas: p as Record<string, string> }
}
