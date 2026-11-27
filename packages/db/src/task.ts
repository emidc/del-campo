// T-0052 — Tareas (0017_tarea.sql). Lectura y escritura de `task` y su historia,
// `task_event`. Como las gestiones, corren con el Ejecutor que les dan: desde la app, la
// transacción restringida de `conDatos`, donde RLS decide qué tareas ve y escribe la
// persona y `authz.usuario()` es quien actúa.

import type postgres from 'postgres'

type QueryExecutor = postgres.Sql | postgres.TransactionSql

export const TASK_STATUSES = ['PENDIENTE', 'EN_CURSO', 'TRABADA', 'EN_REVISION', 'HECHA'] as const
export type TaskStatus = (typeof TASK_STATUSES)[number]

export const TASK_PRIORITIES = ['ALTA', 'MEDIA', 'BAJA'] as const
export type TaskPriority = (typeof TASK_PRIORITIES)[number]
export const PRIORIDADES_DE_TAREA: Readonly<Record<TaskPriority, string>> = { ALTA: 'Alta', MEDIA: 'Media', BAJA: 'Baja' }

export const TASK_FOLLOW_UPS = ['COTIZANDO', 'EMITIENDO', 'GANADA', 'EN_SEGUIMIENTO', 'EN_PAUSA'] as const
export type TaskFollowUp = (typeof TASK_FOLLOW_UPS)[number]
export const SEGUIMIENTOS_DE_TAREA: Readonly<Record<TaskFollowUp, string>> = {
  COTIZANDO: 'Cotizando',
  EMITIENDO: 'Emitiendo',
  GANADA: 'Ganada',
  EN_SEGUIMIENTO: 'En seguimiento',
  EN_PAUSA: 'En pausa',
}

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
  readonly assignedUserId: string | null
  /** Nombre visible del responsable (o su correo si no tiene). */
  readonly assignedName: string | null
  readonly assignedToMe: boolean
  readonly dueDate: string | null
  readonly priority: TaskPriority | null
  readonly followUp: TaskFollowUp | null
  /** Va al tablero de «Tareas de la semana». */
  readonly weekly: boolean
  readonly createdAt: string
  readonly updatedAt: string
  readonly doneAt: string | null
  /** Lo que la persona que consulta tiene pendiente en la tarea por haber sido involucrada; `null` si nada. */
  readonly myPendingActions: string | null
}

/** Cuántas tareas encuentra cada pestaña de la pantalla Tareas. */
export interface TaskCounts {
  readonly todas: number
  readonly mias: number
  readonly asignaciones: number
  readonly bloqueadas: number
  /** Las de la semana a mi nombre, que es lo que abre la pestaña. */
  readonly semana: number
}

/** Una acción puntual de la tarea a cargo de otra persona («Involucrar a alguien»). */
export interface TaskAction {
  readonly id: string
  readonly description: string
  readonly status: 'PENDIENTE' | 'HECHA'
  readonly assignedEmail: string | null
  readonly assignedName: string | null
  readonly assignedToMe: boolean
  readonly createdAt: string
  readonly doneAt: string | null
}

export interface TaskEvent {
  readonly id: string
  readonly kind: 'ALTA' | 'COMENTARIO' | 'ESTADO' | 'ASIGNACION' | 'CAMBIO' | 'ACCION'
  readonly body: string | null
  readonly fromStatus: TaskStatus | null
  readonly toStatus: TaskStatus | null
  readonly authorEmail: string | null
  readonly authorName: string | null
  readonly createdAt: string
}

export interface TaskDetail extends TaskSummary {
  readonly events: readonly TaskEvent[]
  readonly actions: readonly TaskAction[]
}

export interface TaskFilter {
  /** Por defecto sólo las no hechas. */
  readonly includeDone?: boolean
  readonly onlyMine?: boolean
  /** Sólo aquellas en las que la persona fue involucrada y tiene su acción pendiente. */
  readonly involved?: boolean
  readonly partyId?: string
  readonly serviceCaseId?: string
  readonly status?: TaskStatus
  /** Sólo las marcadas como tareas de la semana, en cualquier estado. */
  readonly weekly?: boolean
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
  readonly assigned_user_id: string | null
  readonly assigned_name: string | null
  readonly assigned_to_me: boolean
  readonly due_date: string | null
  readonly priority: TaskPriority | null
  readonly follow_up: TaskFollowUp | null
  readonly weekly: boolean
  readonly created_at: string
  readonly updated_at: string
  readonly done_at: string | null
  readonly my_pending_actions: string | null
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
  assignedUserId: row.assigned_user_id,
  assignedName: row.assigned_name,
  assignedToMe: row.assigned_to_me,
  dueDate: row.due_date,
  priority: row.priority,
  followUp: row.follow_up,
  weekly: row.weekly,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  doneAt: row.done_at,
  myPendingActions: row.my_pending_actions,
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
    t.assigned_user_id,
    authz.nombre_integrante(t.assigned_user_id) as assigned_name,
    coalesce(t.assigned_user_id = authz.usuario(), false) as assigned_to_me,
    to_char(t.due_date, 'YYYY-MM-DD') as due_date,
    t.priority,
    t.follow_up,
    t.weekly,
    t.created_at::text as created_at,
    t.updated_at::text as updated_at,
    t.done_at::text as done_at,
    (select string_agg(a.description, ' · ' order by a.created_at, a.id) from task_action a
      where a.task_id = t.id and a.assigned_user_id = authz.usuario() and a.status <> 'HECHA') as my_pending_actions
  from task t
  left join party pa on pa.id = t.party_id
  left join person_profile pp on pp.party_id = t.party_id
  left join organization_profile op on op.party_id = t.party_id
  left join policy p on p.id = t.policy_id
  left join service_case c on c.id = t.service_case_id
`

/** Un integrante del equipo con su nombre visible y si tiene foto. */
export interface TeamMemberProfile {
  readonly userId: string
  readonly email: string
  readonly name: string
  readonly hasPhoto: boolean
}

interface PerfilRow {
  readonly id: string
  readonly email: string
  readonly nombre: string
  readonly con_foto: boolean
}

const perfil = (r: PerfilRow): TeamMemberProfile => ({ userId: r.id, email: r.email, name: r.nombre, hasPhoto: r.con_foto })

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export const listTasks = async (sql: QueryExecutor, filter: TaskFilter = {}): Promise<TaskSummary[]> => {
  for (const id of [filter.partyId, filter.serviceCaseId]) if (id !== undefined && !UUID.test(id)) return []
  const rows = await sql<SummaryRow[]>`
    ${seleccion(sql)}
    where (${filter.includeDone === true || filter.weekly === true || filter.status === 'HECHA'} or t.status <> 'HECHA')
      and (${filter.weekly !== true} or t.weekly)
      and (${filter.status ?? null}::text is null or t.status = ${filter.status ?? null}::text)
      and (${filter.onlyMine !== true} or t.assigned_user_id = authz.usuario())
      and (${filter.involved !== true} or exists (
        select 1 from task_action a where a.task_id = t.id and a.assigned_user_id = authz.usuario() and a.status <> 'HECHA'))
      and (${filter.partyId ?? null}::uuid is null or t.party_id = ${filter.partyId ?? null}::uuid)
      and (${filter.serviceCaseId ?? null}::uuid is null or t.service_case_id = ${filter.serviceCaseId ?? null}::uuid)
    order by (t.status = 'HECHA'), t.due_date nulls last, t.updated_at desc
    limit 500
  `
  return rows.map(resumen)
}

/** Los números de las pestañas de Tareas, con los mismos criterios que `listTasks`. */
export const countTasks = async (sql: QueryExecutor): Promise<TaskCounts> => {
  const [row] = await sql<TaskCounts[]>`
    select
      count(*)::int as todas,
      count(*) filter (where t.status <> 'HECHA' and t.assigned_user_id = authz.usuario())::int as mias,
      count(*) filter (where t.status <> 'HECHA' and exists (
        select 1 from task_action a where a.task_id = t.id and a.assigned_user_id = authz.usuario() and a.status <> 'HECHA'))::int as asignaciones,
      count(*) filter (where t.status = 'TRABADA')::int as bloqueadas,
      count(*) filter (where t.weekly and t.assigned_user_id = authz.usuario())::int as semana
    from task t
  `
  return row ?? { todas: 0, mias: 0, asignaciones: 0, bloqueadas: 0, semana: 0 }
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
      author_name: string | null
      created_at: string
    }[]
  >`
    select e.id, e.kind, e.body, e.from_status, e.to_status,
      authz.correo_integrante(e.author_user_id) as author_email,
      authz.nombre_integrante(e.author_user_id) as author_name, e.created_at::text as created_at
    from task_event e
    where e.task_id = ${id}
    order by e.created_at, e.id
  `
  const actions = await sql<
    {
      id: string
      description: string
      status: TaskAction['status']
      assigned_email: string | null
      assigned_name: string | null
      assigned_to_me: boolean
      created_at: string
      done_at: string | null
    }[]
  >`
    select a.id, a.description, a.status,
      authz.correo_integrante(a.assigned_user_id) as assigned_email,
      authz.nombre_integrante(a.assigned_user_id) as assigned_name,
      coalesce(a.assigned_user_id = authz.usuario(), false) as assigned_to_me,
      a.created_at::text as created_at, a.done_at::text as done_at
    from task_action a
    where a.task_id = ${id}
    order by a.created_at, a.id
  `
  return {
    ...resumen(row),
    actions: actions.map((a) => ({
      id: a.id,
      description: a.description,
      status: a.status,
      assignedEmail: a.assigned_email,
      assignedName: a.assigned_name,
      assignedToMe: a.assigned_to_me,
      createdAt: a.created_at,
      doneAt: a.done_at,
    })),
    events: events.map((e) => ({
      id: e.id,
      kind: e.kind,
      body: e.body,
      fromStatus: e.from_status,
      toStatus: e.to_status,
      authorEmail: e.author_email,
      authorName: e.author_name,
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
    select authz.nombre_integrante(${userId}::uuid) as email
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
): Promise<TeamMemberProfile[]> => {
  if (!UUID.test(partyId)) return []
  const rows = await sql<PerfilRow[]>`
    select e.id, e.email, e.nombre, e.con_foto from authz.equipo_visible() e
    where e.id in (select i.id from authz.integrantes_que_ven(${partyId}::uuid) i)
      and authz.ve_cliente(${partyId}::uuid)
  `
  return rows.map(perfil)
}

const FECHA = /^\d{4}-\d{2}-\d{2}$/
const legible = (iso: string | null): string => (iso === null ? 'sin fecha' : iso.split('-').reverse().join('/'))

const registrarCambio = async (sql: QueryExecutor, id: string, texto: string): Promise<void> => {
  await sql`
    insert into task_event (task_id, kind, body, author_user_id)
    values (${id}, 'CAMBIO', ${texto}, authz.usuario())
  `
}

const actual = async (sql: QueryExecutor, id: string) => {
  const [fila] = await sql<{ due_date: string | null; priority: TaskPriority | null; follow_up: TaskFollowUp | null }[]>`
    select to_char(due_date, 'YYYY-MM-DD') as due_date, priority, follow_up from task where id = ${id} for update
  `
  if (fila === undefined) throw new Error('tarea inexistente o fuera de alcance')
  return fila
}

/** Cambia el nombre de la tarea y lo deja en la historia. Un nombre vacío se rechaza. */
export const renameTask = async (sql: QueryExecutor, id: string, title: string): Promise<void> => {
  const nuevo = title.trim()
  if (nuevo === '' || nuevo.length > 200) throw new Error('nombre inválido')
  const [antes] = await sql<{ title: string }[]>`select title from task where id = ${id} for update`
  if (antes === undefined) throw new Error('tarea inexistente o fuera de alcance')
  if (antes.title === nuevo) return
  await sql`update task set title = ${nuevo}, updated_at = now() where id = ${id}`
  await registrarCambio(sql, id, `Nombre: «${antes.title}» → «${nuevo}»`)
}

/** Cambia el vencimiento (`null` lo quita) y lo deja en la historia. */
export const setTaskDueDate = async (sql: QueryExecutor, id: string, dueDate: string | null): Promise<void> => {
  if (dueDate !== null && !FECHA.test(dueDate)) throw new Error('fecha inválida')
  const antes = await actual(sql, id)
  if (antes.due_date === dueDate) return
  await sql`update task set due_date = ${dueDate}, updated_at = now() where id = ${id}`
  await registrarCambio(sql, id, `Vencimiento: ${legible(antes.due_date)} → ${legible(dueDate)}`)
}

export const setTaskPriority = async (sql: QueryExecutor, id: string, priority: TaskPriority | null): Promise<void> => {
  const antes = await actual(sql, id)
  if (antes.priority === priority) return
  await sql`update task set priority = ${priority}, updated_at = now() where id = ${id}`
  await registrarCambio(sql, id, `Prioridad: ${priority === null ? 'sin prioridad' : PRIORIDADES_DE_TAREA[priority]}`)
}

export const setTaskFollowUp = async (sql: QueryExecutor, id: string, followUp: TaskFollowUp | null): Promise<void> => {
  const antes = await actual(sql, id)
  if (antes.follow_up === followUp) return
  await sql`update task set follow_up = ${followUp}, updated_at = now() where id = ${id}`
  await registrarCambio(sql, id, `Seguimiento: ${followUp === null ? 'sin seguimiento' : SEGUIMIENTOS_DE_TAREA[followUp]}`)
}

/**
 * Involucra a un integrante en una acción puntual de la tarea. El responsable y el estado
 * de la tarea no cambian. Devuelve el id de la acción.
 */
export const involveInTask = async (
  sql: QueryExecutor,
  id: string,
  userId: string,
  description: string,
): Promise<string> => {
  const texto = description.trim()
  if (texto === '') throw new Error('falta describir qué tiene que hacer')
  const [fila] = await sql<{ id: string }[]>`
    insert into task_action (task_id, assigned_user_id, description, created_by_user_id)
    values (${id}, ${userId}, ${texto}, authz.usuario())
    returning id
  `
  if (fila === undefined) throw new Error('la acción no se creó')
  const [destino] = await sql<{ email: string | null }[]>`select authz.nombre_integrante(${userId}::uuid) as email`
  await sql`
    insert into task_event (task_id, kind, body, author_user_id)
    values (${id}, 'ACCION', ${`Involucró a ${destino?.email ?? 'un integrante'}: ${texto}`}, authz.usuario())
  `
  await tocar(sql, id)
  return fila.id
}

/** La persona involucrada marca su acción como hecha. RLS rechaza a cualquier otra. */
export const completeTaskAction = async (sql: QueryExecutor, actionId: string): Promise<void> => {
  if (!UUID.test(actionId)) throw new Error('acción inexistente')
  const [fila] = await sql<{ task_id: string; description: string }[]>`
    update task_action set status = 'HECHA', done_at = now()
    where id = ${actionId} and status = 'PENDIENTE'
    returning task_id, description
  `
  if (fila === undefined) throw new Error('la acción no existe, ya está hecha o no es tuya')
  await sql`
    insert into task_event (task_id, kind, body, author_user_id)
    values (${fila.task_id}, 'ACCION', ${`Hizo: ${fila.description}`}, authz.usuario())
  `
  await tocar(sql, fila.task_id)
}

/** Borra la tarea para siempre, con sus acciones y su historia. */
export const deleteTask = async (sql: QueryExecutor, id: string): Promise<void> => {
  if (!UUID.test(id)) throw new Error('tarea inexistente o fuera de alcance')
  await sql`select public.eliminar_tarea(${id}::uuid)`
}

/** Marca o desmarca la tarea como tarea de la semana. */
export const setTaskWeekly = async (sql: QueryExecutor, id: string, weekly: boolean): Promise<void> => {
  if (!UUID.test(id)) throw new Error('tarea inexistente o fuera de alcance')
  const filas = await sql`update task set weekly = ${weekly} where id = ${id} returning id`
  if (filas.length === 0) throw new Error('tarea inexistente o fuera de alcance')
}

/**
 * Limpieza de los lunes: destilda «Tarea de la semana» en las tareas Hechas. Corre fuera
 * de la sesión, con la conexión de la app. Devuelve cuántas destildó.
 */
export const clearDoneWeeklyTasks = async (sql: QueryExecutor): Promise<number> => {
  const filas = await sql`update task set weekly = false where weekly and status = 'HECHA' returning id`
  return filas.length
}

/** Los integrantes activos del equipo: a cualquiera se le puede asignar una tarea (0020). */
export const listTeamMembers = async (sql: QueryExecutor): Promise<TeamMemberProfile[]> => {
  const rows = await sql<PerfilRow[]>`select e.id, e.email, e.nombre, e.con_foto from authz.equipo_visible() e`
  return rows.map(perfil)
}

/** Vincula la tarea a otra gestión del mismo cliente, o la desvincula con `null`. */
export const setTaskServiceCase = async (sql: QueryExecutor, id: string, serviceCaseId: string | null): Promise<void> => {
  if (!UUID.test(id) || (serviceCaseId !== null && !UUID.test(serviceCaseId))) throw new Error('gestión inexistente')
  const [antes] = await sql<{ service_case_id: string | null }[]>`select service_case_id from task where id = ${id} for update`
  if (antes === undefined) throw new Error('tarea inexistente o fuera de alcance')
  if (antes.service_case_id === serviceCaseId) return
  await sql`update task set service_case_id = ${serviceCaseId}, updated_at = now() where id = ${id}`
  const [gestion] = await sql<{ title: string }[]>`select title from service_case where id = ${serviceCaseId}`
  await registrarCambio(sql, id, `Gestión: ${gestion?.title ?? 'sin gestión'}`)
}
