// T-0045 — Gestiones manuales (C6-01). Lectura y escritura de `service_case` y su
// historia, `service_case_event` (0013_gestion.sql). Corren con el Ejecutor que les dan:
// desde la app, la transacción restringida de `conDatos`, donde RLS decide qué gestiones
// ve y escribe la persona y `authz.usuario()` es quien actúa.

import type postgres from 'postgres'

type QueryExecutor = postgres.Sql | postgres.TransactionSql

export const SERVICE_CASE_KINDS = [
  'SINIESTRO',
  'ENDOSO',
  'COTIZACION',
  'RENOVACION',
  'RECLAMO_COMPANIA',
  'FACTURACION',
  'OTRO',
] as const
export type ServiceCaseKind = (typeof SERVICE_CASE_KINDS)[number]

export const SERVICE_CASE_STATUSES = [
  'ABIERTA',
  'EN_CURSO',
  'ESPERANDO_COMPANIA',
  'ESPERANDO_CLIENTE',
  'CERRADA',
] as const
export type ServiceCaseStatus = (typeof SERVICE_CASE_STATUSES)[number]

/** Etapas de un siniestro, en orden (0015_siniestro_etapas.sql). */
export const CLAIM_STAGES = ['DENUNCIA', 'DOCUMENTACION', 'INSPECCION', 'LIQUIDACION', 'PAGO', 'CIERRE'] as const
export type ClaimStage = (typeof CLAIM_STAGES)[number]

export interface ServiceCaseRequirement {
  readonly id: string
  readonly stage: ClaimStage
  readonly name: string
  readonly doneAt: string | null
  readonly doneByEmail: string | null
}

export interface ServiceCaseSummary {
  readonly id: string
  readonly kind: ServiceCaseKind
  readonly title: string
  readonly status: ServiceCaseStatus
  readonly partyId: string
  readonly partyName: string | null
  readonly policyId: string | null
  readonly policyNumber: string | null
  readonly assignedEmail: string | null
  readonly assignedToMe: boolean
  readonly dueDate: string | null
  readonly createdAt: string
  readonly updatedAt: string
  readonly closedAt: string | null
  /** Sólo en un siniestro. */
  readonly claimStage: ClaimStage | null
}

export interface ServiceCaseEvent {
  readonly id: string
  readonly kind: 'ALTA' | 'NOTA' | 'ESTADO' | 'CIERRE' | 'ASIGNACION' | 'ETAPA' | 'REQUISITO'
  readonly body: string | null
  readonly fromStatus: ServiceCaseStatus | null
  readonly toStatus: ServiceCaseStatus | null
  readonly authorEmail: string | null
  readonly createdAt: string
}

export interface ServiceCaseDetail extends ServiceCaseSummary {
  readonly outcome: string | null
  readonly events: readonly ServiceCaseEvent[]
  /** Requisitos de todas las etapas, en orden; vacío si no es un siniestro. */
  readonly requirements: readonly ServiceCaseRequirement[]
}

export interface ServiceCaseFilter {
  /** Por defecto sólo las abiertas: lo cerrado se pide explícitamente. */
  readonly includeClosed?: boolean
  readonly partyId?: string
  readonly policyId?: string
  readonly onlyMine?: boolean
  /** Un integrante, o `SIN_RESPONSABLE` para las que no tienen. */
  readonly assignedUserId?: string
}

export interface TeamMember {
  readonly userId: string
  readonly email: string
}

/** Carga de trabajo de un responsable: gestiones abiertas y, de esas, las vencidas. */
export interface Workload {
  readonly userId: string | null
  readonly email: string | null
  readonly open: number
  readonly overdue: number
}

export interface NewServiceCase {
  readonly kind: ServiceCaseKind
  readonly title: string
  readonly partyId: string
  readonly policyId: string | null
  readonly dueDate: string | null
  readonly note: string | null
}

interface SummaryRow {
  readonly id: string
  readonly kind: ServiceCaseKind
  readonly title: string
  readonly status: ServiceCaseStatus
  readonly party_id: string
  readonly party_name: string | null
  readonly policy_id: string | null
  readonly policy_number: string | null
  readonly assigned_email: string | null
  readonly assigned_to_me: boolean
  readonly due_date: string | null
  readonly created_at: string
  readonly updated_at: string
  readonly closed_at: string | null
  readonly outcome: string | null
  readonly claim_stage: ClaimStage | null
}

const resumen = (row: SummaryRow): ServiceCaseSummary => ({
  id: row.id,
  kind: row.kind,
  title: row.title,
  status: row.status,
  partyId: row.party_id,
  partyName: row.party_name,
  policyId: row.policy_id,
  policyNumber: row.policy_number,
  assignedEmail: row.assigned_email,
  assignedToMe: row.assigned_to_me,
  dueDate: row.due_date,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  closedAt: row.closed_at,
  claimStage: row.claim_stage,
})

const seleccion = (sql: QueryExecutor) => sql`
  select
    c.id, c.kind, c.title, c.status, c.party_id,
    coalesce(
      nullif(concat_ws(' ', pp.first_name, pp.last_name), ''),
      op.trade_name,
      op.legal_name,
      pa.display_name_cache
    ) as party_name,
    c.policy_id,
    p.policy_number,
    authz.correo_integrante(c.assigned_user_id) as assigned_email,
    coalesce(c.assigned_user_id = authz.usuario(), false) as assigned_to_me,
    to_char(c.due_date, 'YYYY-MM-DD') as due_date,
    c.created_at::text as created_at,
    c.updated_at::text as updated_at,
    c.closed_at::text as closed_at,
    c.outcome,
    c.claim_stage
  from service_case c
  left join party pa on pa.id = c.party_id
  left join person_profile pp on pp.party_id = c.party_id
  left join organization_profile op on op.party_id = c.party_id
  left join policy p on p.id = c.policy_id
`

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export const listServiceCases = async (
  sql: QueryExecutor,
  filter: ServiceCaseFilter = {},
): Promise<ServiceCaseSummary[]> => {
  // Un id que no es uuid no identifica nada: lista vacía, no un error de la base.
  for (const id of [filter.partyId, filter.policyId]) if (id !== undefined && !UUID.test(id)) return []
  const sinResponsable = filter.assignedUserId === 'SIN_RESPONSABLE'
  const responsable = filter.assignedUserId !== undefined && !sinResponsable ? filter.assignedUserId : null
  if (responsable !== null && !UUID.test(responsable)) return []
  const rows = await sql<SummaryRow[]>`
    ${seleccion(sql)}
    where (${filter.includeClosed === true} or c.status <> 'CERRADA')
      and (${filter.partyId ?? null}::uuid is null or c.party_id = ${filter.partyId ?? null}::uuid)
      and (${filter.policyId ?? null}::uuid is null or c.policy_id = ${filter.policyId ?? null}::uuid)
      and (${filter.onlyMine !== true} or c.assigned_user_id = authz.usuario())
      and (${!sinResponsable} or c.assigned_user_id is null)
      and (${responsable}::uuid is null or c.assigned_user_id = ${responsable}::uuid)
    order by (c.status = 'CERRADA'), c.due_date nulls last, c.updated_at desc
    limit 500
  `
  return rows.map(resumen)
}

export const getServiceCase = async (sql: QueryExecutor, id: string): Promise<ServiceCaseDetail | null> => {
  if (!UUID.test(id)) return null
  const [row] = await sql<SummaryRow[]>`${seleccion(sql)} where c.id = ${id}`
  if (row === undefined) return null
  const events = await sql<
    {
      id: string
      kind: ServiceCaseEvent['kind']
      body: string | null
      from_status: ServiceCaseStatus | null
      to_status: ServiceCaseStatus | null
      author_email: string | null
      created_at: string
    }[]
  >`
    select e.id, e.kind, e.body, e.from_status, e.to_status,
      authz.correo_integrante(e.author_user_id) as author_email, e.created_at::text as created_at
    from service_case_event e
    where e.service_case_id = ${id}
    order by e.created_at, e.id
  `
  const requirements = await sql<
    { id: string; stage: ClaimStage; name: string; done_at: string | null; done_by_email: string | null }[]
  >`
    select r.id, r.stage, r.name, r.done_at::text as done_at,
      authz.correo_integrante(r.done_by_user_id) as done_by_email
    from service_case_requirement r
    where r.service_case_id = ${id}
    order by array_position(${CLAIM_STAGES}::text[], r.stage), r.position, r.created_at
  `
  return {
    ...resumen(row),
    outcome: row.outcome,
    requirements: requirements.map((r) => ({
      id: r.id,
      stage: r.stage,
      name: r.name,
      doneAt: r.done_at,
      doneByEmail: r.done_by_email,
    })),
    events: events.map((e) => ({
      id: e.id,
      kind: e.kind,
      body: e.body,
      fromStatus: e.from_status,
      toStatus: e.to_status,
      authorEmail: e.author_email,
      createdAt: e.created_at,
    })),
  }
}

/** Crea la gestión a nombre de quien actúa, que queda como responsable. Devuelve su id. */
export const createServiceCase = async (sql: QueryExecutor, input: NewServiceCase): Promise<string> => {
  const [row] = await sql<{ id: string }[]>`
    insert into service_case (kind, title, party_id, policy_id, due_date, assigned_user_id, created_by_user_id)
    values (
      ${input.kind}, ${input.title.trim()}, ${input.partyId}, ${input.policyId}, ${input.dueDate},
      authz.usuario(), authz.usuario()
    )
    returning id
  `
  if (row === undefined) throw new Error('la gestión no se creó')
  const note = input.note?.trim() ?? ''
  await sql`
    insert into service_case_event (service_case_id, kind, body, to_status, author_user_id)
    values (${row.id}, 'ALTA', ${note === '' ? null : note}, 'ABIERTA', authz.usuario())
  `
  return row.id
}

export const addServiceCaseNote = async (sql: QueryExecutor, id: string, body: string): Promise<void> => {
  const texto = body.trim()
  if (texto === '') throw new Error('la nota está vacía')
  await sql`
    insert into service_case_event (service_case_id, kind, body, author_user_id)
    values (${id}, 'NOTA', ${texto}, authz.usuario())
  `
  await sql`update service_case set updated_at = now() where id = ${id}`
}

/**
 * Cambia el estado y deja el cambio en la historia. Pasar a `CERRADA` es el cierre: fija
 * `closed_at` y guarda el resultado. Salir de `CERRADA` la reabre.
 */
export const changeServiceCaseStatus = async (
  sql: QueryExecutor,
  id: string,
  to: ServiceCaseStatus,
  comment: string | null,
): Promise<void> => {
  const [actual] = await sql<{ status: ServiceCaseStatus }[]>`
    select status from service_case where id = ${id} for update
  `
  if (actual === undefined) throw new Error('gestión inexistente o fuera de alcance')
  if (actual.status === to) return
  const texto = comment?.trim() ?? ''
  const cierre = to === 'CERRADA'
  await sql`
    update service_case set
      status = ${to},
      closed_at = ${cierre ? sql`now()` : sql`null`},
      outcome = ${cierre ? sql`${texto === '' ? null : texto}` : sql`outcome`},
      updated_at = now()
    where id = ${id}
  `
  await sql`
    insert into service_case_event (service_case_id, kind, body, from_status, to_status, author_user_id)
    values (${id}, ${cierre ? 'CIERRE' : 'ESTADO'}, ${texto === '' ? null : texto}, ${actual.status}, ${to}, authz.usuario())
  `
}

/** Quiénes pueden ser responsables de la gestión: los integrantes que ven a su cliente. */
export const listAssignableMembers = async (sql: QueryExecutor, id: string): Promise<TeamMember[]> => {
  if (!UUID.test(id)) return []
  const rows = await sql<{ id: string; email: string }[]>`
    select i.id, i.email
    from service_case c, authz.integrantes_que_ven(c.party_id) i
    where c.id = ${id}
    order by i.email
  `
  return rows.map((r) => ({ userId: r.id, email: r.email }))
}

/**
 * Asigna la gestión (o la deja sin responsable con `null`) y lo deja en la historia. RLS
 * rechaza a quien no ve al cliente.
 */
export const assignServiceCase = async (sql: QueryExecutor, id: string, userId: string | null): Promise<void> => {
  const [actual] = await sql<{ assigned_user_id: string | null }[]>`
    select assigned_user_id from service_case where id = ${id} for update
  `
  if (actual === undefined) throw new Error('gestión inexistente o fuera de alcance')
  if (actual.assigned_user_id === userId) return
  await sql`update service_case set assigned_user_id = ${userId}, updated_at = now() where id = ${id}`
  await sql`
    insert into service_case_event (service_case_id, kind, body, author_user_id)
    values (
      ${id}, 'ASIGNACION',
      coalesce(authz.correo_integrante(${userId}::uuid), 'sin responsable'),
      authz.usuario()
    )
  `
}

/** La persona que actúa toma la gestión como responsable. */
export const takeServiceCase = async (sql: QueryExecutor, id: string): Promise<void> => {
  const [yo] = await sql<{ id: string | null }[]>`select authz.usuario() as id`
  await assignServiceCase(sql, id, yo?.id ?? null)
}

/** Carga de trabajo por responsable sobre las gestiones abiertas que la persona ve. */
export const getWorkload = async (sql: QueryExecutor): Promise<Workload[]> => {
  const rows = await sql<{ user_id: string | null; email: string | null; open: number; overdue: number }[]>`
    select c.assigned_user_id as user_id,
      authz.correo_integrante(c.assigned_user_id) as email,
      count(*)::int as open,
      count(*) filter (where c.due_date < current_date)::int as overdue
    from service_case c
    where c.status <> 'CERRADA'
    group by c.assigned_user_id
    order by count(*) desc, 2 nulls first
  `
  return rows.map((r) => ({ userId: r.user_id, email: r.email, open: r.open, overdue: r.overdue }))
}

export const CLAIM_STAGE_LABELS: Readonly<Record<ClaimStage, string>> = {
  DENUNCIA: 'Denuncia',
  DOCUMENTACION: 'Documentación',
  INSPECCION: 'Inspección o peritaje',
  LIQUIDACION: 'Liquidación',
  PAGO: 'Pago o rechazo',
  CIERRE: 'Cierre',
}

/**
 * Mueve un siniestro una etapa adelante o atrás y lo deja en la historia. La base rechaza
 * avanzar con requisitos pendientes de la etapa actual (0015) y devuelve cuáles faltan.
 */
export const moveClaimStage = async (sql: QueryExecutor, id: string, direction: 'NEXT' | 'BACK'): Promise<void> => {
  const [actual] = await sql<{ claim_stage: ClaimStage | null }[]>`
    select claim_stage from service_case where id = ${id} for update
  `
  if (actual === undefined) throw new Error('gestión inexistente o fuera de alcance')
  if (actual.claim_stage === null) throw new Error('sólo un siniestro tiene etapas')
  const i = CLAIM_STAGES.indexOf(actual.claim_stage)
  const destino = CLAIM_STAGES[direction === 'NEXT' ? i + 1 : i - 1]
  if (destino === undefined) throw new Error(direction === 'NEXT' ? 'ya está en la última etapa' : 'ya está en la primera etapa')
  await sql`update service_case set claim_stage = ${destino}, updated_at = now() where id = ${id}`
  await sql`
    insert into service_case_event (service_case_id, kind, body, author_user_id)
    values (
      ${id}, 'ETAPA',
      ${`${CLAIM_STAGE_LABELS[actual.claim_stage]} → ${CLAIM_STAGE_LABELS[destino]}`},
      authz.usuario()
    )
  `
}

/** Marca un requisito como cumplido o lo vuelve a pendiente, y lo deja en la historia. */
export const setClaimRequirementDone = async (sql: QueryExecutor, requirementId: string, done: boolean): Promise<void> => {
  const [r] = await sql<{ service_case_id: string; name: string; done: boolean }[]>`
    select service_case_id, name, done_at is not null as done
    from service_case_requirement where id = ${requirementId} for update
  `
  if (r === undefined) throw new Error('requisito inexistente o fuera de alcance')
  if (r.done === done) return
  await sql`
    update service_case_requirement
    set done_at = case when ${done} then now() end,
      done_by_user_id = case when ${done} then authz.usuario() end
    where id = ${requirementId}
  `
  await sql`
    insert into service_case_event (service_case_id, kind, body, author_user_id)
    values (${r.service_case_id}, 'REQUISITO', ${`${done ? 'Cumplido' : 'Pendiente otra vez'}: ${r.name}`}, authz.usuario())
  `
  await sql`update service_case set updated_at = now() where id = ${r.service_case_id}`
}

/** Agrega un requisito a una etapa del siniestro. */
export const addClaimRequirement = async (
  sql: QueryExecutor,
  id: string,
  stage: ClaimStage,
  name: string,
): Promise<void> => {
  const texto = name.trim()
  if (texto === '') throw new Error('el requisito está vacío')
  await sql`
    insert into service_case_requirement (service_case_id, stage, name)
    values (${id}, ${stage}, ${texto})
  `
}
