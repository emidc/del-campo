// T-0053 — Interlocutores del siniestro (0018_siniestro_interlocutores.sql). Cada uno tiene
// rol, nombre, contacto, responsable interno, último contacto y pendiente; lo que cambia
// queda en la historia de la gestión (evento INTERLOCUTOR). Corren con el Ejecutor que les
// dan: desde la app, la transacción restringida de `conDatos`, donde RLS decide.

import type postgres from 'postgres'

type QueryExecutor = postgres.Sql | postgres.TransactionSql

export const CLAIM_CONTACT_ROLES = [
  'CLIENTE',
  'COMPANIA',
  'PERITO',
  'TALLER',
  'LIQUIDADOR',
  'ABOGADO',
  'TERCERO',
  'OTRO',
] as const
export type ClaimContactRole = (typeof CLAIM_CONTACT_ROLES)[number]

export const CLAIM_CONTACT_ROLE_LABELS: Readonly<Record<ClaimContactRole, string>> = {
  CLIENTE: 'Cliente',
  COMPANIA: 'Compañía',
  PERITO: 'Perito',
  TALLER: 'Taller',
  LIQUIDADOR: 'Liquidador',
  ABOGADO: 'Abogado',
  TERCERO: 'Tercero',
  OTRO: 'Otro',
}

export interface ClaimContact {
  readonly id: string
  readonly role: ClaimContactRole
  readonly name: string
  readonly contact: string | null
  readonly assignedUserId: string | null
  readonly assignedEmail: string | null
  readonly assignedToMe: boolean
  readonly lastContactOn: string | null
  /** `null`: no hace falta intervenir. */
  readonly pending: string | null
}

export interface NewClaimContact {
  readonly role: ClaimContactRole
  readonly name: string
  readonly contact: string | null
  readonly assignedUserId: string | null
  readonly pending: string | null
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const limpio = (valor: string | null): string | null => {
  const t = valor?.trim() ?? ''
  return t === '' ? null : t
}

const anotar = async (sql: QueryExecutor, caseId: string, body: string): Promise<void> => {
  await sql`
    insert into service_case_event (service_case_id, kind, body, author_user_id)
    values (${caseId}, 'INTERLOCUTOR', ${body}, authz.usuario())
  `
  await sql`update service_case set updated_at = now() where id = ${caseId}`
}

export const listClaimContacts = async (sql: QueryExecutor, caseId: string): Promise<ClaimContact[]> => {
  if (!UUID.test(caseId)) return []
  const rows = await sql<
    {
      id: string
      role: ClaimContactRole
      name: string
      contact: string | null
      assigned_user_id: string | null
      assigned_email: string | null
      assigned_to_me: boolean
      last_contact_on: string | null
      pending: string | null
    }[]
  >`
    select k.id, k.role, k.name, k.contact, k.assigned_user_id,
      authz.correo_integrante(k.assigned_user_id) as assigned_email,
      coalesce(k.assigned_user_id = authz.usuario(), false) as assigned_to_me,
      to_char(k.last_contact_on, 'YYYY-MM-DD') as last_contact_on, k.pending
    from service_case_contact k
    where k.service_case_id = ${caseId}
    order by array_position(${CLAIM_CONTACT_ROLES}::text[], k.role), k.created_at
  `
  return rows.map((r) => ({
    id: r.id,
    role: r.role,
    name: r.name,
    contact: r.contact,
    assignedUserId: r.assigned_user_id,
    assignedEmail: r.assigned_email,
    assignedToMe: r.assigned_to_me,
    lastContactOn: r.last_contact_on,
    pending: r.pending,
  }))
}

/** Suma un interlocutor al siniestro. Devuelve su id. */
export const addClaimContact = async (sql: QueryExecutor, caseId: string, input: NewClaimContact): Promise<string> => {
  const name = input.name.trim()
  if (name === '') throw new Error('falta el nombre del interlocutor')
  const [row] = await sql<{ id: string }[]>`
    insert into service_case_contact (service_case_id, role, name, contact, assigned_user_id, pending)
    values (${caseId}, ${input.role}, ${name}, ${limpio(input.contact)}, ${input.assignedUserId}, ${limpio(input.pending)})
    returning id
  `
  if (row === undefined) throw new Error('el interlocutor no se creó')
  await anotar(sql, caseId, `Sumó a ${CLAIM_CONTACT_ROLE_LABELS[input.role]}: ${name}`)
  return row.id
}

const leer = async (sql: QueryExecutor, contactId: string) => {
  const [k] = await sql<
    { service_case_id: string; role: ClaimContactRole; name: string; assigned_user_id: string | null; pending: string | null }[]
  >`
    select service_case_id, role, name, assigned_user_id, pending
    from service_case_contact where id = ${contactId} for update
  `
  if (k === undefined) throw new Error('interlocutor inexistente o fuera de alcance')
  return k
}

/**
 * Registra un contacto de hoy con un comentario opcional y, si viene, el nuevo pendiente
 * (cadena vacía: ya no hace falta intervenir).
 */
export const recordClaimContact = async (
  sql: QueryExecutor,
  contactId: string,
  note: string | null,
  pending: string | null | undefined,
): Promise<void> => {
  const k = await leer(sql, contactId)
  const nuevo = pending === undefined ? k.pending : limpio(pending)
  await sql`
    update service_case_contact
    set last_contact_on = current_date, pending = ${nuevo}, updated_at = now()
    where id = ${contactId}
  `
  const texto = limpio(note)
  await anotar(
    sql,
    k.service_case_id,
    `Contacto con ${CLAIM_CONTACT_ROLE_LABELS[k.role]} ${k.name}${texto === null ? '' : `: ${texto}`}` +
      (nuevo === k.pending ? '' : ` · Pendiente: ${nuevo ?? 'sin intervención'}`),
  )
}

/** Cambia el pendiente y el responsable interno de un interlocutor. */
export const updateClaimContact = async (
  sql: QueryExecutor,
  contactId: string,
  change: { readonly pending: string | null; readonly assignedUserId: string | null },
): Promise<void> => {
  const k = await leer(sql, contactId)
  const pending = limpio(change.pending)
  if (pending === k.pending && change.assignedUserId === k.assigned_user_id) return
  await sql`
    update service_case_contact
    set pending = ${pending}, assigned_user_id = ${change.assignedUserId}, updated_at = now()
    where id = ${contactId}
  `
  const partes: string[] = []
  if (pending !== k.pending) partes.push(`pendiente: ${pending ?? 'sin intervención'}`)
  if (change.assignedUserId !== k.assigned_user_id) {
    const [d] = await sql<{ email: string | null }[]>`select authz.correo_integrante(${change.assignedUserId}::uuid) as email`
    partes.push(`responsable: ${d?.email ?? 'nadie'}`)
  }
  await anotar(sql, k.service_case_id, `${CLAIM_CONTACT_ROLE_LABELS[k.role]} ${k.name}, ${partes.join(', ')}`)
}
