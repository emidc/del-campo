// Modelo de datos de riesgos (0029_modelo_de_riesgos.sql): ubicaciones y sus condiciones,
// coberturas de póliza con su historia de endosos, relevamientos y conclusiones del agente.
// Corren con el Ejecutor que les dan: RLS decide qué se ve y `authz.usuario()` es quien
// actúa. `agent` es el agente que escribió la fila (`riesgos@1`), o null si fue una persona.

import type postgres from 'postgres'

type QueryExecutor = postgres.Sql | postgres.TransactionSql

export type FactStatus = 'DESCONOCIDO' | 'DECLARADO' | 'CONFIRMADO' | 'PROPUESTO'
export type FactSource = 'CLIENTE' | 'VISITA' | 'DOCUMENTO' | 'POLIZA' | 'AGENTE'
export type CoverageKind = 'COBERTURA' | 'SUBLIMITE' | 'CONDICION' | 'EXCLUSION'
export type FindingAspect = 'PROTECCION' | 'MANTENIMIENTO' | 'PRUEBA' | 'HALLAZGO'
export type FindingResult = 'CUMPLE' | 'PARCIAL' | 'NO_CUMPLE' | 'NO_EXISTE' | 'NO_VERIFICADO'
export type FindingPriority = 'CRITICA' | 'ALTA' | 'MEDIA' | 'BAJA'
export type ConclusionLevel = 1 | 2 | 3 | 4

interface Id {
  readonly id: string
}

const idDe = (filas: readonly Id[]): string => {
  const [fila] = filas
  if (fila === undefined) throw new Error('la inserción no devolvió fila')
  return fila.id
}

// ── Ubicaciones y condiciones ───────────────────────────────────────────────

export interface NewLocation {
  readonly partyId: string
  readonly name: string
  readonly address?: string | null
  readonly locality?: string | null
  readonly province?: string | null
  readonly agent?: string | null
}

export const createLocation = async (sql: QueryExecutor, l: NewLocation): Promise<string> =>
  idDe(
    await sql<Id[]>`
      insert into client_location (party_id, name, address, locality, province, created_by_user_id, agent)
      values (${l.partyId}, ${l.name}, ${l.address ?? null}, ${l.locality ?? null}, ${l.province ?? null},
              authz.usuario(), ${l.agent ?? null})
      returning id
    `,
  )

export interface NewFact {
  readonly partyId: string
  /** null: vale para toda la empresa. */
  readonly locationId: string | null
  readonly attribute: string
  readonly value: string | null
  readonly status: FactStatus
  readonly source: FactSource
  readonly sourceReference?: string | null
  readonly observedOn?: string | null
  readonly agent?: string | null
}

/** Registra una condición. No pisa la anterior: la vigente es la última. */
export const recordFact = async (sql: QueryExecutor, f: NewFact): Promise<string> =>
  idDe(
    await sql<Id[]>`
      insert into location_fact (party_id, location_id, attribute, value, status, source, source_reference,
                                 observed_on, created_by_user_id, agent)
      values (${f.partyId}, ${f.locationId}, ${f.attribute}, ${f.value}, ${f.status}, ${f.source},
              ${f.sourceReference ?? null}, ${f.observedOn ?? null}, authz.usuario(), ${f.agent ?? null})
      returning id
    `,
  )

export interface CurrentFact {
  readonly id: string
  readonly locationId: string | null
  readonly locationName: string | null
  readonly attribute: string
  readonly value: string | null
  readonly status: FactStatus
  readonly source: FactSource
  readonly sourceReference: string | null
  readonly observedOn: string | null
}

export const listCurrentFacts = async (sql: QueryExecutor, partyId: string): Promise<readonly CurrentFact[]> =>
  sql<CurrentFact[]>`
    select f.id, f.location_id as "locationId", l.name as "locationName", f.attribute, f.value, f.status,
           f.source, f.source_reference as "sourceReference", f.observed_on::text as "observedOn"
    from location_fact_current f
    left join client_location l on l.id = f.location_id
    where f.party_id = ${partyId}
    order by l.name nulls first, f.attribute
  `

export interface PortfolioMatch {
  readonly partyId: string
  readonly partyName: string | null
  /** Las ubicaciones que activaron el filtro; null si la condición es de toda la empresa. */
  readonly locations: readonly { readonly id: string | null; readonly name: string | null; readonly status: FactStatus }[]
}

/**
 * Las empresas de la cartera con una condición vigente: una fila por empresa, con las
 * ubicaciones que la activaron. Por defecto cuenta declaradas y confirmadas; lo propuesto
 * por el agente y lo desconocido no activan.
 */
export const portfolioWithCondition = async (
  sql: QueryExecutor,
  filtro: { readonly attribute: string; readonly value: string; readonly statuses?: readonly FactStatus[] },
): Promise<readonly PortfolioMatch[]> => {
  const estados = filtro.statuses ?? ['DECLARADO', 'CONFIRMADO']
  return sql<PortfolioMatch[]>`
    select f.party_id as "partyId", p.display_name_cache as "partyName",
           json_agg(json_build_object('id', f.location_id, 'name', l.name, 'status', f.status)
                    order by l.name nulls first) as locations
    from location_fact_current f
    join party p on p.id = f.party_id
    left join client_location l on l.id = f.location_id
    where f.attribute = ${filtro.attribute} and f.value = ${filtro.value} and f.status = any(${estados as string[]})
    group by f.party_id, p.display_name_cache
    order by p.display_name_cache, f.party_id
  `
}

// ── Coberturas ──────────────────────────────────────────────────────────────

export interface NewCoverage {
  readonly policyId: string
  /** null: la póliza base. */
  readonly endorsementId: string | null
  readonly kind: CoverageKind
  readonly coverage: string
  readonly locationId?: string | null
  readonly asset?: string | null
  readonly limitAmount?: number | null
  readonly currency?: string | null
  readonly limitBasis?: string | null
  readonly deductible?: string | null
  readonly detail?: string | null
  readonly effectiveFrom: string
  /** La cobertura que este endoso modifica. */
  readonly replacesId?: string | null
  readonly sourceDocument: string
  /** Página, cláusula o anexo. */
  readonly sourceLocation: string
  readonly agent?: string | null
}

export const recordCoverage = async (sql: QueryExecutor, c: NewCoverage): Promise<string> =>
  idDe(
    await sql<Id[]>`
      insert into policy_coverage (policy_id, endorsement_id, kind, coverage, location_id, asset, limit_amount,
                                   currency, limit_basis, deductible, detail, effective_from, replaces_id,
                                   source_document, source_location, created_by_user_id, agent)
      values (${c.policyId}, ${c.endorsementId}, ${c.kind}, ${c.coverage}, ${c.locationId ?? null}, ${c.asset ?? null},
              ${c.limitAmount ?? null}, ${c.currency ?? null}, ${c.limitBasis ?? null}, ${c.deductible ?? null},
              ${c.detail ?? null}, ${c.effectiveFrom}, ${c.replacesId ?? null}, ${c.sourceDocument},
              ${c.sourceLocation}, authz.usuario(), ${c.agent ?? null})
      returning id
    `,
  )

export const confirmCoverage = async (sql: QueryExecutor, coverageId: string): Promise<boolean> => {
  const filas = await sql<Id[]>`
    update policy_coverage set confirmed_by_user_id = authz.usuario(), confirmed_at = now()
    where id = ${coverageId} and confirmed_by_user_id is null
    returning id
  `
  return filas.length === 1
}

export interface Coverage {
  readonly id: string
  readonly endorsementId: string | null
  readonly endorsementNumber: string | null
  readonly kind: CoverageKind
  readonly coverage: string
  readonly locationId: string | null
  readonly asset: string | null
  readonly limitAmount: string | null
  readonly currency: string | null
  readonly limitBasis: string | null
  readonly deductible: string | null
  readonly detail: string | null
  readonly effectiveFrom: string
  readonly replacesId: string | null
  readonly sourceDocument: string
  readonly sourceLocation: string
  readonly confirmed: boolean
}

/** Lo que rige en la póliza en una fecha, con la cita de cada valor. */
export const coveragesAt = async (sql: QueryExecutor, policyId: string, date: string): Promise<readonly Coverage[]> =>
  sql<Coverage[]>`
    select c.id, c.endorsement_id as "endorsementId", e.number as "endorsementNumber", c.kind, c.coverage,
           c.location_id as "locationId", c.asset, c.limit_amount::text as "limitAmount", c.currency,
           c.limit_basis as "limitBasis", c.deductible, c.detail, c.effective_from::text as "effectiveFrom",
           c.replaces_id as "replacesId", c.source_document as "sourceDocument",
           c.source_location as "sourceLocation", c.confirmed_at is not null as confirmed
    from coberturas_a_fecha(${policyId}, ${date}) c
    left join endorsement e on e.id = c.endorsement_id
  `

/** La cadena de valores de una cobertura, del más nuevo al original. */
export const coverageHistory = async (sql: QueryExecutor, coverageId: string): Promise<readonly Coverage[]> =>
  sql<Coverage[]>`
    with recursive cadena as (
      select c.*, 0 as paso from policy_coverage c where c.id = ${coverageId}
      union all
      select c.*, cadena.paso + 1 from policy_coverage c join cadena on c.id = cadena.replaces_id
    )
    select c.id, c.endorsement_id as "endorsementId", e.number as "endorsementNumber", c.kind, c.coverage,
           c.location_id as "locationId", c.asset, c.limit_amount::text as "limitAmount", c.currency,
           c.limit_basis as "limitBasis", c.deductible, c.detail, c.effective_from::text as "effectiveFrom",
           c.replaces_id as "replacesId", c.source_document as "sourceDocument",
           c.source_location as "sourceLocation", c.confirmed_at is not null as confirmed
    from cadena c
    left join endorsement e on e.id = c.endorsement_id
    order by c.paso
  `

// ── Relevamientos ───────────────────────────────────────────────────────────

export interface NewFinding {
  readonly area?: string | null
  readonly topic: string
  readonly aspect: FindingAspect
  readonly result: FindingResult
  readonly priority?: FindingPriority | null
  readonly description: string
  readonly recommendation?: string | null
  readonly sourceLocation?: string | null
}

export interface NewSurvey {
  readonly partyId: string
  readonly locationId: string | null
  readonly visitedOn: string
  readonly performedBy: string
  readonly sourceDocument?: string | null
  readonly summary?: string | null
  readonly findings: readonly NewFinding[]
  readonly agent?: string | null
}

/** Guarda un relevamiento con sus hallazgos. Devuelve el id del relevamiento. */
export const recordSurvey = async (sql: QueryExecutor, s: NewSurvey): Promise<string> => {
  const id = idDe(
    await sql<Id[]>`
      insert into survey (party_id, location_id, visited_on, performed_by, source_document, summary,
                          created_by_user_id, agent)
      values (${s.partyId}, ${s.locationId}, ${s.visitedOn}, ${s.performedBy}, ${s.sourceDocument ?? null},
              ${s.summary ?? null}, authz.usuario(), ${s.agent ?? null})
      returning id
    `,
  )
  for (const h of s.findings) {
    await sql`
      insert into survey_finding (survey_id, area, topic, aspect, result, priority, description, recommendation,
                                  source_location, created_by_user_id, agent)
      values (${id}, ${h.area ?? null}, ${h.topic}, ${h.aspect}, ${h.result}, ${h.priority ?? null},
              ${h.description}, ${h.recommendation ?? null}, ${h.sourceLocation ?? null}, authz.usuario(),
              ${s.agent ?? null})
    `
  }
  return id
}

export interface FindingTally {
  readonly result: FindingResult
  /** Empresas distintas con ese resultado en su último relevamiento del tema. */
  readonly companies: number
}

/**
 * Cifra de cartera de un tema y aspecto (por ejemplo, bomba de incendio · prueba): cuántas
 * empresas tienen cada resultado, mirando el relevamiento más reciente de cada una.
 */
export const tallyFindings = async (
  sql: QueryExecutor,
  filtro: { readonly topic: string; readonly aspect: FindingAspect },
): Promise<readonly FindingTally[]> =>
  sql<FindingTally[]>`
    with ultimo as (
      select distinct on (s.party_id) s.party_id, h.result
      from survey_finding h
      join survey s on s.id = h.survey_id
      where h.topic = ${filtro.topic} and h.aspect = ${filtro.aspect}
      order by s.party_id, s.visited_on desc, h.created_at desc
    )
    select result, count(*)::int as companies from ultimo group by result order by result
  `

// ── Conclusiones ────────────────────────────────────────────────────────────

export type NewEvidence =
  | { readonly locationFactId: string }
  | { readonly policyCoverageId: string }
  | { readonly surveyFindingId: string }
  | { readonly document: string; readonly documentLocation: string }

export interface NewConclusion {
  readonly partyId: string
  readonly locationId?: string | null
  readonly level: ConclusionLevel
  readonly statement: string
  /** ID de la nota del cerebro de riesgos (CLI-001, F-LEA-WEB-12…). */
  readonly noteId: string
  readonly noteVersion?: string | null
  readonly policyId?: string | null
  readonly endorsementId?: string | null
  /** Si falta, la conclusión queda pendiente y dice qué documento hace falta. */
  readonly missingDocument?: string | null
  readonly evidence: readonly NewEvidence[]
  readonly agent?: string | null
}

export const recordConclusion = async (sql: QueryExecutor, c: NewConclusion): Promise<string> => {
  const faltante = c.missingDocument ?? null
  const id = idDe(
    await sql<Id[]>`
      insert into risk_conclusion (party_id, location_id, level, statement, note_id, note_version, policy_id,
                                   endorsement_id, status, missing_document, created_by_user_id, agent)
      values (${c.partyId}, ${c.locationId ?? null}, ${c.level}, ${c.statement}, ${c.noteId}, ${c.noteVersion ?? null},
              ${c.policyId ?? null}, ${c.endorsementId ?? null}, ${faltante === null ? 'RESPALDADA' : 'PENDIENTE'},
              ${faltante}, authz.usuario(), ${c.agent ?? null})
      returning id
    `,
  )
  for (const e of c.evidence) {
    await sql`
      insert into risk_conclusion_evidence (conclusion_id, location_fact_id, policy_coverage_id, survey_finding_id,
                                            document, document_location)
      values (${id}, ${'locationFactId' in e ? e.locationFactId : null},
              ${'policyCoverageId' in e ? e.policyCoverageId : null},
              ${'surveyFindingId' in e ? e.surveyFindingId : null},
              ${'document' in e ? e.document : null}, ${'document' in e ? e.documentLocation : null})
    `
  }
  return id
}

export const reviewConclusion = async (
  sql: QueryExecutor,
  conclusionId: string,
  review: 'ACEPTADA' | 'RECHAZADA',
  comment: string | null,
): Promise<boolean> => {
  const filas = await sql<Id[]>`
    update risk_conclusion
    set review = ${review}, review_comment = ${comment}, reviewed_by_user_id = authz.usuario(), reviewed_at = now()
    where id = ${conclusionId} and review is null
    returning id
  `
  return filas.length === 1
}

export interface Conclusion {
  readonly id: string
  readonly locationId: string | null
  readonly level: ConclusionLevel
  readonly statement: string
  readonly noteId: string
  readonly noteVersion: string | null
  readonly policyId: string | null
  readonly endorsementId: string | null
  readonly status: 'PENDIENTE' | 'RESPALDADA'
  readonly missingDocument: string | null
  readonly agent: string | null
  readonly review: 'ACEPTADA' | 'RECHAZADA' | null
  readonly evidenceCount: number
  readonly createdAt: string
}

/** Las conclusiones de una empresa; `toReview` deja sólo las que nadie revisó. */
export const listConclusions = async (
  sql: QueryExecutor,
  partyId: string,
  opciones: { readonly toReview?: boolean } = {},
): Promise<readonly Conclusion[]> =>
  sql<Conclusion[]>`
    select c.id, c.location_id as "locationId", c.level, c.statement, c.note_id as "noteId",
           c.note_version as "noteVersion", c.policy_id as "policyId", c.endorsement_id as "endorsementId",
           c.status, c.missing_document as "missingDocument", c.agent, c.review,
           (select count(*)::int from risk_conclusion_evidence e where e.conclusion_id = c.id) as "evidenceCount",
           c.created_at::text as "createdAt"
    from risk_conclusion c
    where c.party_id = ${partyId} and (${opciones.toReview !== true} or c.review is null)
    order by c.created_at
  `

// ── Lo que muestra la ficha ─────────────────────────────────────────────────

export interface Location {
  readonly id: string
  readonly name: string
  readonly address: string | null
  readonly locality: string | null
  readonly province: string | null
}

export const listLocations = async (sql: QueryExecutor, partyId: string): Promise<readonly Location[]> =>
  sql<Location[]>`
    select id, name, address, locality, province from client_location where party_id = ${partyId} order by name, id
  `

export interface Finding {
  readonly id: string
  readonly area: string | null
  readonly topic: string
  readonly aspect: FindingAspect
  readonly result: FindingResult
  readonly priority: FindingPriority | null
  readonly description: string
  readonly recommendation: string | null
  readonly sourceLocation: string | null
}

export interface Survey {
  readonly id: string
  readonly locationName: string | null
  readonly visitedOn: string
  readonly performedBy: string
  readonly sourceDocument: string | null
  readonly summary: string | null
  readonly findings: readonly Finding[]
}

/** Los relevamientos de una empresa, del más reciente al más viejo, con sus hallazgos. */
export const listSurveys = async (sql: QueryExecutor, partyId: string): Promise<readonly Survey[]> =>
  sql<Survey[]>`
    select s.id, l.name as "locationName", s.visited_on::text as "visitedOn", s.performed_by as "performedBy",
           s.source_document as "sourceDocument", s.summary,
           coalesce((
             select json_agg(json_build_object(
                      'id', h.id, 'area', h.area, 'topic', h.topic, 'aspect', h.aspect, 'result', h.result,
                      'priority', h.priority, 'description', h.description, 'recommendation', h.recommendation,
                      'sourceLocation', h.source_location)
                    order by array_position(array['CRITICA','ALTA','MEDIA','BAJA'], h.priority) nulls last, h.created_at, h.id)
             from survey_finding h where h.survey_id = s.id
           ), '[]'::json) as findings
    from survey s
    left join client_location l on l.id = s.location_id
    where s.party_id = ${partyId}
    order by s.visited_on desc, s.created_at desc
  `
