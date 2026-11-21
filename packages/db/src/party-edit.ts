// Contactos editables desde la app (0023_polizas_y_contactos_editables.sql): nombre y DNI
// de una persona, asociación a una empresa existente y borrado definitivo de un contacto
// sin vínculos. Corren con el Ejecutor que les dan: desde la app, la transacción
// restringida de `conDatos`, donde RLS decide y `authz.usuario()` es quien actúa.

import type postgres from 'postgres'

import type { DeleteBlocker } from './policy-edit.ts'

type QueryExecutor = postgres.Sql | postgres.TransactionSql

export type PartyEditResult =
  | { readonly kind: 'ok' }
  | { readonly kind: 'invalid'; readonly message: string }
  | { readonly kind: 'not_found' }

const auditar = async (sql: QueryExecutor, accion: string, partyId: string): Promise<void> => {
  await sql`
    insert into audit_event (actor_user_id, origin, action, object_type, object_id, outcome)
    values (authz.usuario(), 'app', ${accion}, 'party', ${partyId}, 'ok')`
}

/** Nombre y apellido de una persona. El encabezado y las búsquedas leen de acá. */
export const updatePersonName = async (
  sql: QueryExecutor,
  partyId: string,
  firstName: string,
  lastName: string,
): Promise<PartyEditResult> => {
  const nombre = firstName.trim().replace(/\s+/g, ' ')
  const apellido = lastName.trim().replace(/\s+/g, ' ')
  if (nombre === '' && apellido === '') return { kind: 'invalid', message: 'El nombre no puede quedar vacío.' }
  if (nombre.length > 80 || apellido.length > 80) return { kind: 'invalid', message: 'El nombre es demasiado largo.' }
  const filas = await sql`
    update person_profile set first_name = ${nombre}, last_name = ${apellido} where party_id = ${partyId} returning party_id`
  if (filas.length === 0) return { kind: 'not_found' }
  await sql`
    update party set display_name_cache = ${[nombre, apellido].filter((p) => p !== '').join(' ')}, updated_at = now()
    where id = ${partyId}`
  await auditar(sql, 'party.update_name', partyId)
  return { kind: 'ok' }
}

/** DNI de una persona: sólo dígitos, de 6 a 9. Vacío lo borra. */
export const updatePersonDni = async (sql: QueryExecutor, partyId: string, dni: string): Promise<PartyEditResult> => {
  const digitos = dni.replace(/[\s.-]/g, '')
  if (digitos !== '' && !/^\d{6,9}$/.test(digitos)) return { kind: 'invalid', message: 'El DNI va con 6 a 9 dígitos, sin letras.' }
  const filas = await sql`
    update person_profile set dni = ${digitos === '' ? null : digitos} where party_id = ${partyId} returning party_id`
  if (filas.length === 0) return { kind: 'not_found' }
  await auditar(sql, 'party.update_dni', partyId)
  return { kind: 'ok' }
}

export interface OrganizationOption {
  readonly partyId: string
  readonly displayName: string
  readonly cuit: string | null
}

/** Empresas guardadas cuyo nombre o CUIT contiene el texto. Como mucho diez. */
export const searchOrganizations = async (sql: QueryExecutor, texto: string): Promise<OrganizationOption[]> => {
  const buscado = texto.trim()
  if (buscado.length < 2) return []
  const patron = `%${buscado.replace(/[\\%_]/g, (c) => `\\${c}`)}%`
  return sql<OrganizationOption[]>`
    select op.party_id as "partyId", coalesce(op.trade_name, op.legal_name) as "displayName", op.cuit
    from organization_profile op
    join party p on p.id = op.party_id and p.status = 'ACTIVE'
    where op.legal_name ilike ${patron} or op.trade_name ilike ${patron} or op.cuit ilike ${patron}
    order by coalesce(op.trade_name, op.legal_name), op.party_id
    limit 10`
}

/** Asocia una persona a una empresa que ya existe en Broker OS. Si ya estaba asociada, no duplica. */
export const linkOrganization = async (
  sql: QueryExecutor,
  personPartyId: string,
  organizationPartyId: string,
): Promise<PartyEditResult> => {
  const [persona] = await sql`select 1 from person_profile where party_id = ${personPartyId}`
  if (persona === undefined) return { kind: 'not_found' }
  const [empresa] = await sql`
    select 1 from organization_profile op join party p on p.id = op.party_id and p.status = 'ACTIVE'
    where op.party_id = ${organizationPartyId}`
  if (empresa === undefined) return { kind: 'invalid', message: 'Elegí una empresa de la lista.' }
  const [ya] = await sql`
    select 1 from organization_membership
    where person_party_id = ${personPartyId} and organization_party_id = ${organizationPartyId}
      and valid_from <= now() and (valid_to is null or valid_to > now())`
  if (ya !== undefined) return { kind: 'invalid', message: 'Ya está asociada a esa empresa.' }
  await sql`
    insert into organization_membership (organization_party_id, person_party_id, kind)
    values (${organizationPartyId}, ${personPartyId}, null)`
  await auditar(sql, 'party.link_organization', personPartyId)
  return { kind: 'ok' }
}

/** Lo que impide borrar un contacto: pólizas, gestiones o tareas vinculadas, en cualquier estado. */
export const contactBlockers = async (sql: QueryExecutor, partyId: string): Promise<DeleteBlocker[]> => {
  const [fila] = await sql<{ bloqueos: DeleteBlocker[] }[]>`select public.bloqueos_de_contacto(${partyId}::uuid) as bloqueos`
  return fila?.bloqueos ?? []
}

/** Borra el contacto para siempre si no tiene vínculos; la base lo vuelve a verificar. */
export const deleteContact = async (sql: QueryExecutor, partyId: string): Promise<DeleteBlocker[]> => {
  const [fila] = await sql<{ bloqueos: DeleteBlocker[] }[]>`select public.eliminar_contacto(${partyId}::uuid) as bloqueos`
  return fila?.bloqueos ?? []
}
