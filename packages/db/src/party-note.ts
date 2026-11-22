// Notas de una parte (0032_notas.sql). Corren con el Ejecutor que les dan: desde la app,
// la transacción restringida de `conDatos`, donde RLS decide y `authz.usuario()` es quien
// actúa.

import type postgres from 'postgres'

type QueryExecutor = postgres.Sql | postgres.TransactionSql

export interface PartyNote {
  readonly id: string
  readonly title: string | null
  readonly body: string
  readonly archived: boolean
  readonly source: 'Broker OS' | 'Zoho'
  /** Quién la escribió: el integrante del equipo o, si viene de Zoho, el nombre que traía. */
  readonly author: string | null
  readonly createdAt: Date
  readonly updatedAt: Date | null
  readonly updatedBy: string | null
}

export interface NoteText {
  readonly title: string | null
  readonly body: string
}

/** El título y el texto como se guardan, o `null` si no hay nada que guardar o es muy largo. */
export const cleanNote = (title: string, body: string): NoteText | null => {
  const t = title.trim().replace(/\s+/g, ' ')
  const b = body.replace(/\r\n/g, '\n').trim()
  if (t === '' && b === '') return null
  if (t.length > 200 || b.length > 20000) return null
  return { title: t === '' ? null : t, body: b }
}

/** Las notas de una parte, activas y archivadas, de la más nueva a la más vieja. */
export const listPartyNotes = async (sql: QueryExecutor, partyId: string): Promise<PartyNote[]> =>
  sql<PartyNote[]>`
    select n.id, n.title, n.body, n.archived_at is not null as archived, n.source,
      coalesce(authz.nombre_integrante(n.created_by_user_id), n.source_author) as author,
      n.created_at as "createdAt", n.updated_at as "updatedAt",
      authz.nombre_integrante(n.updated_by_user_id) as "updatedBy"
    from party_note n
    where n.party_id = ${partyId}
    order by n.created_at desc, n.id`

export const addPartyNote = async (sql: QueryExecutor, partyId: string, note: NoteText): Promise<string> => {
  const [row] = await sql<{ id: string }[]>`
    insert into party_note (party_id, title, body, created_by_user_id)
    values (${partyId}, ${note.title}, ${note.body}, authz.usuario())
    returning id`
  if (row === undefined) throw new Error('la nota no se guardó')
  return row.id
}

/** Cambia el título y el texto. `false` si la nota no es de esa parte. */
export const updatePartyNote = async (sql: QueryExecutor, partyId: string, id: string, note: NoteText): Promise<boolean> => {
  const rows = await sql`
    update party_note
    set title = ${note.title}, body = ${note.body}, updated_by_user_id = authz.usuario(), updated_at = clock_timestamp()
    where id = ${id} and party_id = ${partyId}
    returning id`
  return rows.length === 1
}

/** Archiva o desarchiva. `false` si la nota no es de esa parte o ya estaba así. */
export const setPartyNoteArchived = async (sql: QueryExecutor, partyId: string, id: string, archived: boolean): Promise<boolean> => {
  const rows = archived
    ? await sql`
        update party_note
        set archived_at = clock_timestamp(), archived_by_user_id = authz.usuario(),
          updated_by_user_id = authz.usuario(), updated_at = clock_timestamp()
        where id = ${id} and party_id = ${partyId} and archived_at is null
        returning id`
    : await sql`
        update party_note
        set archived_at = null, archived_by_user_id = null,
          updated_by_user_id = authz.usuario(), updated_at = clock_timestamp()
        where id = ${id} and party_id = ${partyId} and archived_at is not null
        returning id`
  return rows.length === 1
}

/** Borra la nota para siempre. `false` si no era de esa parte. */
export const deletePartyNote = async (sql: QueryExecutor, partyId: string, id: string): Promise<boolean> => {
  const rows = await sql`delete from party_note where id = ${id} and party_id = ${partyId} returning id`
  return rows.length === 1
}
