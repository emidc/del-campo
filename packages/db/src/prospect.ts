// Prospectos (0025_prospectos.sql): empresas o personas que todavía no son clientes. Un
// prospecto es una Party con un `party_role` PROSPECT vigente; convertirlo cierra el rol y
// deja la misma Party como cliente. Corren con el Ejecutor que les dan: desde la app, la
// transacción restringida de `conDatos`, donde RLS decide y `authz.usuario()` es quien actúa.

import type postgres from 'postgres'

import { addContactPoint, cleanContact } from './contact-point.ts'
import type { PartyEditResult } from './party-edit.ts'
import { updateDriveFolder, updateOrganizationCuit, updatePersonDni } from './party-edit.ts'

type QueryExecutor = postgres.Sql | postgres.TransactionSql

export const PROSPECT_ORIGINS = ['INSTAGRAM', 'FACEBOOK', 'WEB', 'GOOGLE', 'MANUAL'] as const
export type ProspectOrigin = (typeof PROSPECT_ORIGINS)[number]

export const isProspectOrigin = (valor: unknown): valor is ProspectOrigin =>
  typeof valor === 'string' && (PROSPECT_ORIGINS as readonly string[]).includes(valor)

export interface NewProspect {
  readonly kind: 'PERSON' | 'ORGANIZATION'
  readonly origin: ProspectOrigin
  /** Persona: nombre y apellido. Empresa: razón social en `name`. */
  readonly name: string
  readonly lastName: string
  /** DNI o CUIT; puede quedar vacío. */
  readonly identifier: string
  readonly phone: string
  readonly email: string
  readonly driveFolderUrl: string
}

export type NewProspectResult = { readonly kind: 'ok'; readonly partyId: string } | { readonly kind: 'invalid'; readonly message: string }

class Invalido extends Error {}

/** Un savepoint si ya hay transacción; si no, una transacción nueva. */
const enTransaccion = (
  sql: QueryExecutor,
  accion: (tx: postgres.TransactionSql) => Promise<NewProspectResult>,
): Promise<NewProspectResult> => ('savepoint' in sql ? sql.savepoint(accion) : sql.begin(accion))

const comprobar = (resultado: PartyEditResult): void => {
  if (resultado.kind === 'invalid') throw new Invalido(resultado.message)
  if (resultado.kind === 'not_found') throw new Error('el prospecto recién creado no se encontró')
}

/**
 * Crea el prospecto con lo que se cargó. Si algún dato no sirve, no crea nada y dice cuál.
 * Corre dentro de la transacción del llamador: un error revierte todo.
 */
export const createProspect = async (sql: QueryExecutor, datos: NewProspect): Promise<NewProspectResult> => {
  const nombre = datos.name.trim().replace(/\s+/g, ' ')
  const apellido = datos.lastName.trim().replace(/\s+/g, ' ')
  if (datos.kind === 'PERSON' && nombre === '' && apellido === '') return { kind: 'invalid', message: 'Cargá el nombre o el apellido.' }
  if (datos.kind === 'ORGANIZATION' && nombre === '') return { kind: 'invalid', message: 'Cargá la razón social.' }
  if (nombre.length > 160 || apellido.length > 80) return { kind: 'invalid', message: 'El nombre es demasiado largo.' }
  const telefono = datos.phone.trim() === '' ? null : cleanContact('PHONE', datos.phone)
  if (telefono === null && datos.phone.trim() !== '') return { kind: 'invalid', message: 'El teléfono va con característica, por ejemplo 261 555 0101.' }
  const mail = datos.email.trim() === '' ? null : cleanContact('EMAIL', datos.email)
  if (mail === null && datos.email.trim() !== '') return { kind: 'invalid', message: 'El mail va con la forma nombre@dominio.com.' }

  const visible = datos.kind === 'PERSON' ? [nombre, apellido].filter((p) => p !== '').join(' ') : nombre
  try {
    return await enTransaccion(sql, async (tx) => {
      const [party] = await tx<{ id: string }[]>`
        insert into party (kind, display_name_cache) values (${datos.kind}, ${visible}) returning id`
      if (party === undefined) throw new Error('el prospecto no se guardó')
      const id = party.id
      if (datos.kind === 'PERSON') {
        await tx`insert into person_profile (party_id, first_name, last_name) values (${id}, ${nombre}, ${apellido})`
        if (datos.identifier.trim() !== '') comprobar(await updatePersonDni(tx, id, datos.identifier))
      } else {
        await tx`insert into organization_profile (party_id, legal_name) values (${id}, ${nombre})`
        if (datos.identifier.trim() !== '') comprobar(await updateOrganizationCuit(tx, id, datos.identifier))
      }
      await tx`
        insert into party_role (party_id, role, origin, created_by_user_id)
        values (${id}, 'PROSPECT', ${datos.origin}, authz.usuario())`
      if (telefono !== null) await addContactPoint(tx, id, 'PHONE', telefono)
      if (mail !== null) await addContactPoint(tx, id, 'EMAIL', mail)
      if (datos.driveFolderUrl.trim() !== '') comprobar(await updateDriveFolder(tx, id, datos.driveFolderUrl))
      await tx`
        insert into audit_event (actor_user_id, origin, action, object_type, object_id, outcome)
        values (authz.usuario(), 'app', 'party.create_prospect', 'party', ${id}, 'ok')`
      return { kind: 'ok' as const, partyId: id }
    })
  } catch (error) {
    if (error instanceof Invalido) return { kind: 'invalid', message: error.message }
    throw error
  }
}

export interface ProspectStatus {
  /** Si hoy es prospecto. */
  readonly active: boolean
  /** El origen del último rol de prospecto: queda después de convertirlo. */
  readonly origin: ProspectOrigin | null
}

/** Si la Party es prospecto y de dónde llegó. `null` si nunca fue prospecto. */
export const getProspectStatus = async (sql: QueryExecutor, partyId: string): Promise<ProspectStatus | null> => {
  const [fila] = await sql<{ active: boolean; origin: ProspectOrigin | null }[]>`
    select valid_to is null as active, origin
    from party_role
    where party_id = ${partyId} and role = 'PROSPECT'
    order by valid_to is null desc, valid_from desc
    limit 1`
  return fila === undefined ? null : { active: fila.active, origin: fila.origin }
}

/** Cambia el origen de un prospecto vigente. */
export const updateProspectOrigin = async (sql: QueryExecutor, partyId: string, origin: string): Promise<PartyEditResult> => {
  if (!isProspectOrigin(origin)) return { kind: 'invalid', message: 'Elegí un origen de la lista.' }
  const filas = await sql`
    update party_role set origin = ${origin}
    where party_id = ${partyId} and role = 'PROSPECT' and valid_to is null
    returning id`
  return filas.length === 0 ? { kind: 'not_found' } : { kind: 'ok' }
}

export type ConvertResult =
  | { readonly kind: 'ok' }
  /** Ya era cliente: otro clic o un reintento llegó primero. */
  | { readonly kind: 'already' }
  | { readonly kind: 'missing'; readonly field: 'CUIT' | 'DNI' }
  | { readonly kind: 'not_found' }

/**
 * Convierte el prospecto en cliente: cierra el rol. Sólo pide el CUIT de una empresa o el
 * DNI de una persona. La fila del rol se bloquea, así que dos clics a la vez convierten una
 * sola vez y el segundo responde `already`.
 */
export const convertProspect = async (sql: QueryExecutor, partyId: string): Promise<ConvertResult> => {
  const [party] = await sql<{ kind: 'PERSON' | 'ORGANIZATION'; dni: string | null; cuit: string | null }[]>`
    select p.kind, pp.dni, op.cuit
    from party p
    left join person_profile pp on pp.party_id = p.id
    left join organization_profile op on op.party_id = p.id
    where p.id = ${partyId} and p.status = 'ACTIVE'`
  if (party === undefined) return { kind: 'not_found' }
  const [rol] = await sql<{ id: string }[]>`
    select id from party_role where party_id = ${partyId} and role = 'PROSPECT' and valid_to is null for update`
  if (rol === undefined) {
    const [antes] = await sql`select 1 from party_role where party_id = ${partyId} and role = 'PROSPECT'`
    return antes === undefined ? { kind: 'not_found' } : { kind: 'already' }
  }
  if (party.kind === 'ORGANIZATION' && (party.cuit ?? '') === '') return { kind: 'missing', field: 'CUIT' }
  if (party.kind === 'PERSON' && (party.dni ?? '') === '') return { kind: 'missing', field: 'DNI' }
  await sql`update party_role set valid_to = clock_timestamp() where id = ${rol.id}`
  await sql`
    insert into audit_event (actor_user_id, origin, action, object_type, object_id, outcome)
    values (authz.usuario(), 'app', 'party.convert_prospect', 'party', ${partyId}, 'ok')`
  return { kind: 'ok' }
}

export interface ProspectListItem {
  readonly partyId: string
  readonly kind: 'PERSON' | 'ORGANIZATION'
  readonly displayName: string
  readonly identifier: string | null
  readonly origin: ProspectOrigin | null
  readonly since: string
}

export interface ProspectList {
  readonly prospects: readonly ProspectListItem[]
  readonly total: number
}

/** Los prospectos pendientes, de los dos tipos, los más nuevos primero. Filtra por nombre, DNI o CUIT. */
export const listProspects = async (sql: QueryExecutor, text: string, limit: number): Promise<ProspectList> => {
  const needle = text.trim()
  const pattern = `%${needle.replace(/[\\%_]/g, (c) => `\\${c}`)}%`
  const digits = needle.replace(/\D/g, '')
  const filas = await sql<(ProspectListItem & { total: number })[]>`
    select
      p.id as "partyId",
      p.kind,
      coalesce(nullif(concat_ws(' ', pp.first_name, pp.last_name), ''), op.trade_name, op.legal_name, 'sin nombre') as "displayName",
      coalesce(pp.dni, op.cuit) as identifier,
      r.origin,
      to_char(r.valid_from at time zone 'America/Argentina/Mendoza', 'YYYY-MM-DD') as since,
      (count(*) over ())::int as total
    from party_role r
    join party p on p.id = r.party_id and p.status = 'ACTIVE'
    left join person_profile pp on pp.party_id = p.id
    left join organization_profile op on op.party_id = p.id
    where r.role = 'PROSPECT' and r.valid_to is null
      and (
        ${needle} = ''
        or concat_ws(' ', pp.first_name, pp.last_name) ilike ${pattern}
        or op.legal_name ilike ${pattern}
        or op.trade_name ilike ${pattern}
        or (${digits} <> '' and regexp_replace(coalesce(pp.dni, op.cuit, ''), '\\D', '', 'g') like ${`%${digits}%`})
      )
    order by r.valid_from desc, p.id
    limit ${limit}`
  return {
    prospects: filas.map(({ total: _total, ...fila }) => fila),
    total: filas[0]?.total ?? 0,
  }
}
