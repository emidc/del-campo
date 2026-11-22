// Listas de riesgos de una empresa (0030_listas_de_riesgos.sql): Riesgos, Acciones,
// Transferencia y Fuentes. Las columnas de cada lista son las de la planilla de inspección
// de Antucura (17/11/2026) y viven acá, no en la base: cambiarlas no requiere migrar.
// Corren con el Ejecutor que les dan: RLS decide qué se ve y `authz.usuario()` es quien actúa.

import type postgres from 'postgres'

type QueryExecutor = postgres.Sql | postgres.TransactionSql

export const RISK_LISTS = ['RIESGO', 'ACCION', 'TRANSFERENCIA', 'FUENTE'] as const
export type RiskList = (typeof RISK_LISTS)[number]

export interface RiskListColumn {
  readonly key: string
  readonly label: string
  /** Se muestra en la fila resumida de la lista. */
  readonly summary?: boolean
  /** Texto largo: se edita en un área de texto. */
  readonly long?: boolean
}

export const RISK_LIST_COLUMNS: Readonly<Record<RiskList, readonly RiskListColumn[]>> = {
  RIESGO: [
    { key: 'sector', label: 'Sector', summary: true },
    { key: 'riesgo', label: 'Riesgo', summary: true },
    { key: 'escenario', label: 'Escenario y consecuencia', long: true },
    { key: 'impacto', label: 'Impacto preliminar', summary: true },
    { key: 'probabilidad', label: 'Probabilidad preliminar', summary: true },
    { key: 'base_probabilidad', label: 'Base de probabilidad', long: true },
    { key: 'vulnerabilidad', label: 'Vulnerabilidad preliminar', summary: true },
    { key: 'base_vulnerabilidad', label: 'Base de vulnerabilidad', long: true },
    { key: 'que_relevar', label: 'Qué relevar', long: true },
    { key: 'modalidad', label: 'Modalidad' },
    { key: 'evidencia_previa', label: 'Evidencia previa' },
    { key: 'fuentes', label: 'Fuentes' },
    { key: 'estado_visita', label: 'Estado en visita' },
    { key: 'hallazgo', label: 'Hallazgo y evidencia', long: true },
    { key: 'probabilidad_revisada', label: 'Probabilidad revisada' },
    { key: 'vulnerabilidad_revisada', label: 'Vulnerabilidad revisada' },
    { key: 'impacto_revisado', label: 'Impacto revisado' },
  ],
  ACCION: [
    { key: 'riesgos', label: 'Riesgos', summary: true },
    { key: 'prioridad', label: 'Prioridad provisional', summary: true },
    { key: 'accion', label: 'Acción a evaluar', summary: true, long: true },
    { key: 'responsable_propuesto', label: 'Responsable propuesto', summary: true },
    { key: 'evidencia_cierre', label: 'Evidencia de cierre', long: true },
    { key: 'fuentes', label: 'Fuentes' },
    { key: 'decision', label: 'Decisión', long: true },
    { key: 'responsable_acordado', label: 'Responsable acordado' },
    { key: 'fecha_objetivo', label: 'Fecha objetivo' },
  ],
  TRANSFERENCIA: [
    { key: 'riesgos', label: 'Riesgos', summary: true },
    { key: 'cobertura', label: 'Cobertura a revisar', summary: true },
    { key: 'que_cubre', label: 'Qué cubre', long: true },
    { key: 'que_limita', label: 'Qué limita', long: true },
    { key: 'que_excluye', label: 'Qué excluye expresamente', long: true },
    { key: 'estado_brecha', label: 'Estado de la brecha', summary: true },
    { key: 'que_confirmar', label: 'Qué confirmar o evaluar', long: true },
    { key: 'prioridad_contraparte', label: 'Prioridad y contraparte', summary: true },
    { key: 'fuentes', label: 'Fuentes' },
    { key: 'respuesta', label: 'Respuesta o evidencia', long: true },
  ],
  FUENTE: [
    { key: 'documento', label: 'Documento', summary: true },
    { key: 'uso', label: 'Uso en la matriz', summary: true, long: true },
    { key: 'enlace', label: 'Enlace' },
  ],
}

/** El prefijo con que la planilla numera cada lista. */
export const RISK_LIST_PREFIX: Readonly<Record<RiskList, string>> = {
  RIESGO: 'R',
  ACCION: 'A',
  TRANSFERENCIA: 'T',
  FUENTE: '',
}

export const MAX_FIELD_LENGTH = 4000

export type RiskItemFields = Readonly<Record<string, string>>

/**
 * Deja sólo las columnas de la lista, sin espacios de más y sin las vacías. Devuelve null si
 * algún valor es demasiado largo.
 */
export const cleanRiskItemFields = (list: RiskList, crudo: Readonly<Record<string, unknown>>): RiskItemFields | null => {
  const limpio: Record<string, string> = {}
  for (const { key } of RISK_LIST_COLUMNS[list]) {
    const valor = crudo[key]
    if (typeof valor !== 'string') continue
    const texto = valor.trim()
    if (texto === '') continue
    if (texto.length > MAX_FIELD_LENGTH) return null
    limpio[key] = texto
  }
  return limpio
}

const CODIGO = /^[A-Z][A-Z0-9]{0,9}$/

export const cleanRiskItemCode = (crudo: string): string | null => {
  const codigo = crudo.trim().toUpperCase()
  return CODIGO.test(codigo) ? codigo : null
}

export interface RiskItemComment {
  readonly id: string
  readonly body: string
  readonly authorName: string | null
  readonly agent: string | null
  readonly createdAt: string
}

export interface RiskItem {
  readonly id: string
  readonly list: RiskList
  readonly code: string
  readonly fields: RiskItemFields
  readonly retired: boolean
  readonly createdAt: string
  readonly createdByName: string | null
  readonly updatedAt: string
  readonly updatedByName: string | null
  readonly updatedByAgent: string | null
  /** Cuántas versiones tiene: 1 si nunca se editó. */
  readonly versions: number
  readonly comments: readonly RiskItemComment[]
}

/** Orden natural del código: R2 antes que R10, A01 antes que A02, Z0 antes que ZC. */
const ordenDeCodigo = (a: string, b: string): number => a.localeCompare(b, 'es', { numeric: true })

/** Los ítems de una empresa, de todas las listas o de una. Sin los dados de baja salvo que se pidan. */
export const listRiskItems = async (
  sql: QueryExecutor,
  partyId: string,
  opciones: { readonly list?: RiskList; readonly includeRetired?: boolean } = {},
): Promise<readonly RiskItem[]> => {
  const lista = opciones.list ?? null
  const filas = await sql<RiskItem[]>`
    select c.id, c.list, c.code, c.fields, c.retired, to_json(c.created_at) #>> '{}' as "createdAt",
           authz.nombre_integrante(c.created_by_user_id) as "createdByName",
           to_json(c.updated_at) #>> '{}' as "updatedAt", authz.nombre_integrante(c.updated_by_user_id) as "updatedByName",
           c.updated_by_agent as "updatedByAgent",
           (select count(*)::int from risk_item_version v where v.item_id = c.id) as versions,
           coalesce((
             select json_agg(json_build_object(
                      'id', m.id, 'body', m.body, 'authorName', authz.nombre_integrante(m.created_by_user_id),
                      'agent', m.agent, 'createdAt', m.created_at) order by m.created_at, m.id)
             from risk_item_comment m where m.item_id = c.id
           ), '[]'::json) as comments
    from risk_item_current c
    where c.party_id = ${partyId}
      and (${lista}::text is null or c.list = ${lista})
      and (${opciones.includeRetired === true} or not c.retired)
  `
  return [...filas].sort((a, b) => RISK_LISTS.indexOf(a.list) - RISK_LISTS.indexOf(b.list) || ordenDeCodigo(a.code, b.code))
}

export interface NewRiskItem {
  readonly partyId: string
  readonly list: RiskList
  readonly code: string
  readonly fields: RiskItemFields
  readonly agent?: string | null
}

export type RiskItemWrite = { readonly kind: 'ok'; readonly id: string } | { readonly kind: 'duplicate' } | { readonly kind: 'not_found' }

/** Crea un ítem con su primera versión. Un código repetido en la misma lista no se guarda. */
export const createRiskItem = async (sql: QueryExecutor, nuevo: NewRiskItem): Promise<RiskItemWrite> => {
  const filas = await sql<{ id: string }[]>`
    insert into risk_item (party_id, list, code, created_by_user_id, agent)
    values (${nuevo.partyId}, ${nuevo.list}, ${nuevo.code}, authz.usuario(), ${nuevo.agent ?? null})
    on conflict (party_id, list, code) do nothing
    returning id
  `
  const [fila] = filas
  if (fila === undefined) return { kind: 'duplicate' }
  await sql`
    insert into risk_item_version (item_id, fields, created_by_user_id, agent)
    values (${fila.id}, ${sql.json(nuevo.fields)}, authz.usuario(), ${nuevo.agent ?? null})
  `
  return { kind: 'ok', id: fila.id }
}

const existe = async (sql: QueryExecutor, partyId: string, itemId: string): Promise<boolean> =>
  (await sql`select 1 from risk_item where id = ${itemId} and party_id = ${partyId}`).length === 1

/** Guarda lo que dice ahora el ítem como una versión nueva. La anterior queda. */
export const updateRiskItem = async (
  sql: QueryExecutor,
  partyId: string,
  itemId: string,
  fields: RiskItemFields,
  agent: string | null = null,
): Promise<RiskItemWrite> => {
  if (!(await existe(sql, partyId, itemId))) return { kind: 'not_found' }
  await sql`
    insert into risk_item_version (item_id, fields, created_by_user_id, agent)
    values (${itemId}, ${sql.json(fields)}, authz.usuario(), ${agent})
  `
  return { kind: 'ok', id: itemId }
}

/** Da de baja (o reactiva) el ítem con una versión nueva que conserva lo que decía. */
export const retireRiskItem = async (
  sql: QueryExecutor,
  partyId: string,
  itemId: string,
  retired = true,
  agent: string | null = null,
): Promise<RiskItemWrite> => {
  const filas = await sql<{ id: string }[]>`
    insert into risk_item_version (item_id, fields, retired, created_by_user_id, agent)
    select c.id, c.fields, ${retired}, authz.usuario(), ${agent}
    from risk_item_current c
    where c.id = ${itemId} and c.party_id = ${partyId}
    returning item_id as id
  `
  return filas.length === 1 ? { kind: 'ok', id: itemId } : { kind: 'not_found' }
}

export const commentRiskItem = async (
  sql: QueryExecutor,
  partyId: string,
  itemId: string,
  body: string,
  agent: string | null = null,
): Promise<RiskItemWrite> => {
  if (!(await existe(sql, partyId, itemId))) return { kind: 'not_found' }
  const [fila] = await sql<{ id: string }[]>`
    insert into risk_item_comment (item_id, body, created_by_user_id, agent)
    values (${itemId}, ${body}, authz.usuario(), ${agent})
    returning id
  `
  if (fila === undefined) throw new Error('la inserción no devolvió fila')
  return { kind: 'ok', id: fila.id }
}
