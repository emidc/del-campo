// T-0052 — Tareas (0017_tarea.sql). Lectura y escritura de `task` y su historia,
// `task_event`. Como las gestiones, corren con el Ejecutor que les dan: desde la app, la
// transacción restringida de `conDatos`, donde RLS decide qué tareas ve y escribe la
// persona y `authz.usuario()` es quien actúa.

import type postgres from 'postgres'

type QueryExecutor = postgres.Sql | postgres.TransactionSql

export const TASK_STATUSES = ['PENDIENTE', 'EN_CURSO', 'TRABADA', 'EN_REVISION', 'HECHA'] as const
export type TaskStatus = (typeof TASK_STATUSES)[number]

export interface TaskSummary {
  readonly id: string
  readonly title: string
  readonly status: TaskStatus
  readonly partyId: string
  readonly partyName: string | null
  readonly policyId: string | null
  readonly policyNumber: string | null
  readonly serviceCaseId: string | null
  readonly serviceCaseTitle: string | null
  readonly assignedEmail: string | null
  readonly assignedToMe: boolean
  readonly dueDate: string | null
  readonly createdAt: string
  readonly updatedAt: string
  readonly doneAt: string | null
}

export interface TaskEvent {
  readonly id: string
  readonly kind: 'ALTA' | 'COMENTARIO' | 'ESTADO' | 'ASIGNACION'
  readonly body: string | null
  readonly fromStatus: TaskStatus | null
  readonly toStatus: TaskStatus | null
  readonly authorEmail: string | null
  readonly createdAt: string
}

export interface TaskDetail extends TaskSummary {
  readonly events: readonly TaskEvent[]
}

export interface TaskFilter {
  /** Por defecto sólo las no hechas. */
  readonly includeDone?: boolean
  readonly onlyMine?: boolean
  readonly partyId?: string
  readonly serviceCaseId?: string
  readonly status?: TaskStatus
}

export interface NewTask {
  readonly title: string
  readonly partyId: string
  readonly policyId: string | null
  readonly serviceCaseId: string | null
  readonly dueDate: string | null
  /** `null`: queda a nombre de quien la crea. */
  readonly assignedUserId: string | null
  readonly comment: string | null
}

interface SummaryRow {
  readonly id: string
  readonly title: string
  readonly status: TaskStatus
  readonly party_id: string
  readonly party_name: string | null
  readonly policy_id: string | null
  readonly policy_number: string | null
  readonly service_case_id: string | null
  readonly service_case_title: string | null
  readonly assigned_email: string | null
  readonly assigned_to_me: boolean
  readonly due_date: string | null
  readonly created_at: string
  readonly updated_at: string
  readonly done_at: string | null
}

const resumen = (row: SummaryRow): TaskSummary => ({
  id: row.id,
  title: row.title,
  status: row.status,
  partyId: row.party_id,
  partyName: row.party_name,
  policyId: row.policy_id,
  policyNumber: row.policy_number,
  serviceCaseId: row.service_case_id,
  serviceCaseTitle: row.service_case_title,
  assignedEmail: row.assigned_email,
  assignedToMe: row.assigned_to_me,
  dueDate: row.due_date,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  doneAt: row.done_at,
})

const seleccion = (sql: QueryExecutor) => sql`
  select
    t.id, t.title, t.status, t.party_id,
    coalesce(
      nullif(concat_ws(' ', pp.first_name, pp.last_name), ''),
      op.trade_name,
      op.legal_name,
      pa.display_name_cache
    ) as party_name,
    t.policy_id,
    p.policy_number,
    t.service_case_id,
    c.title as service_case_title,
    authz.correo_integrante(t.assigned_user_id) as assigned_email,
    coalesce(t.assigned_user_id = authz.usuario(), false) as assigned_to_me,
    to_char(t.due_date, 'YYYY-MM-DD') as due_date,
    t.created_at::text as created_at,
    t.updated_at::text as updated_at,
    t.done_at::text as done_at
  from task t
  left join party pa on pa.id = t.party_id
  left join person_profile pp on pp.party_id = t.party_id
  left join organization_profile op on op.party_id = t.party_id
  left join policy p on p.id = t.policy_id
  left join service_case c on c.id = t.service_case_id
`

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export const listTasks = async (sql: QueryExecutor, filter: TaskFilter = {}): Promise<TaskSummary[]> => {
  for (const id of [filter.partyId, filter.serviceCaseId]) if (id !== undefined && !UUID.test(id)) return []
  const rows = await sql<SummaryRow[]>`
    ${seleccion(sql)}
    where (${filter.includeDone === true || filter.status === 'HECHA'} or t.status <> 'HECHA')
      and (${filter.status ?? null}::text is null or t.status = ${filter.status ?? null}::text)
      and (${filter.onlyMine !== true} or t.assigned_user_id = authz.usuario())
      and (${filter.partyId ?? null}::uuid is null or t.party_id = ${filter.partyId ?? null}::uuid)
      and (${filter.serviceCaseId ?? null}::uuid is null or t.service_case_id = ${filter.serviceCaseId ?? null}::uuid)
    order by (t.status = 'HECHA'), t.due_date nulls last, t.updated_at desc
    limit 500
  `
  return rows.map(resumen)
}

export const getTask = async (sql: QueryExecutor, id: string): Promise<TaskDetail | null> => {
  if (!UUID.test(id)) return null
  const [row] = await sql<SummaryRow[]>`${seleccion(sql)} where t.id = ${id}`
  if (row === undefined) return null
  const events = await sql<
    {
      id: string
      kind: TaskEvent['kind']
      body: string | null
      from_status: TaskStatus | null
      to_status: TaskStatus | null
      author_email: string | null
      created_at: string
    }[]
  >`
    select e.id, e.kind, e.body, e.from_status, e.to_status,
      authz.correo_integrante(e.author_user_id) as author_email, e.created_at::text as created_at
    from task_event e
    where e.task_id = ${id}
    order by e.created_at, e.id
  `
  return {
    ...resumen(row),
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

const tocar = async (sql: QueryExecutor, id: string): Promise<void> => {
  await sql`update task set updated_at = now() where id = ${id}`
}

/** Crea la tarea. Sin responsable explícito queda a nombre de quien la crea. Devuelve su id. */
export const createTask = async (sql: QueryExecutor, input: NewTask): Promise<string> => {
  const [row] = await sql<{ id: string }[]>`
    insert into task (title, party_id, policy_id, service_case_id, due_date, assigned_user_id, created_by_user_id)
    values (
      ${input.title.trim()}, ${input.partyId}, ${input.policyId}, ${input.serviceCaseId}, ${input.dueDate},
      coalesce(${input.assignedUserId}::uuid, authz.usuario()), authz.usuario()
    )
    returning id
  `
  if (row === undefined) throw new Error('la tarea no se creó')
  const comment = input.comment?.trim() ?? ''
  await sql`
    insert into task_event (task_id, kind, body, to_status, author_user_id)
    values (${row.id}, 'ALTA', ${comment === '' ? null : comment}, 'PENDIENTE', authz.usuario())
  `
  return row.id
}

export const commentTask = async (sql: QueryExecutor, id: string, body: string): Promise<void> => {
  const texto = body.trim()
  if (texto === '') throw new Error('el comentario está vacío')
  await sql`
    insert into task_event (task_id, kind, body, author_user_id)
    values (${id}, 'COMENTARIO', ${texto}, authz.usuario())
  `
  await tocar(sql, id)
}

/** Cambia el estado con un comentario opcional. Pasar a Hecha fija `done_at`; salir la reabre. */
export const changeTaskStatus = async (
  sql: QueryExecutor,
  id: string,
  to: TaskStatus,
  comment: string | null,
): Promise<void> => {
  const [actual] = await sql<{ status: TaskStatus }[]>`select status from task where id = ${id} for update`
  if (actual === undefined) throw new Error('tarea inexistente o fuera de alcance')
  const texto = comment?.trim() ?? ''
  if (actual.status === to) {
    if (texto !== '') await commentTask(sql, id, texto)
    return
  }
  await sql`
    update task set
      status = ${to},
      done_at = ${to === 'HECHA' ? sql`now()` : sql`null`},
      updated_at = now()
    where id = ${id}
  `
  await sql`
    insert into task_event (task_id, kind, body, from_status, to_status, author_user_id)
    values (${id}, 'ESTADO', ${texto === '' ? null : texto}, ${actual.status}, ${to}, authz.usuario())
  `
}

/**
 * Pasa la tarea a otro integrante (o a nadie con `null`) con un comentario opcional, y lo
 * deja en la historia. RLS rechaza a quien no ve al cliente.
 */
export const assignTask = async (
  sql: QueryExecutor,
  id: string,
  userId: string | null,
  comment: string | null,
): Promise<void> => {
  const [actual] = await sql<{ assigned_user_id: string | null }[]>`
    select assigned_user_id from task where id = ${id} for update
  `
  if (actual === undefined) throw new Error('tarea inexistente o fuera de alcance')
  const texto = comment?.trim() ?? ''
  if (actual.assigned_user_id === userId) {
    if (texto !== '') await commentTask(sql, id, texto)
    return
  }
  await sql`update task set assigned_user_id = ${userId}, updated_at = now() where id = ${id}`
  const [destino] = await sql<{ email: string | null }[]>`
    select authz.correo_integrante(${userId}::uuid) as email
  `
  const a = destino?.email ?? 'sin responsable'
  await sql`
    insert into task_event (task_id, kind, body, author_user_id)
    values (${id}, 'ASIGNACION', ${texto === '' ? a : `${a}: ${texto}`}, authz.usuario())
  `
}

/** Quiénes pueden ser responsables de la tarea: los integrantes que ven a su cliente. */
export const listTaskAssignees = async (
  sql: QueryExecutor,
  partyId: string,
): Promise<{ userId: string; email: string }[]> => {
  if (!UUID.test(partyId)) return []
  const rows = await sql<{ id: string; email: string }[]>`
    select i.id, i.email from authz.integrantes_que_ven(${partyId}::uuid) i
    where authz.ve_cliente(${partyId}::uuid)
    order by i.email
  `
  return rows.map((r) => ({ userId: r.id, email: r.email }))
}
