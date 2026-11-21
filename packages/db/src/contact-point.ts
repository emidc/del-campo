// T-0068 — Teléfonos y mails de un cliente (0022_contactos_del_cliente.sql). Los que
// carga el equipo llevan `source = 'Broker OS'` y quién los cargó; los demás vienen de la
// importación de Zoho. Corren con el Ejecutor que les dan: desde la app, la transacción
// restringida de `conDatos`, donde RLS decide y `authz.usuario()` es quien actúa.

import type postgres from 'postgres'

type QueryExecutor = postgres.Sql | postgres.TransactionSql

export const CONTACT_CHANNELS = ['PHONE', 'WHATSAPP', 'EMAIL'] as const
export type ContactChannel = (typeof CONTACT_CHANNELS)[number]

export const BROKER_OS_SOURCE = 'Broker OS'

export interface ContactPoint {
  readonly id: string
  readonly channel: ContactChannel
  readonly value: string
  /** De dónde salió: `Broker OS` si lo cargó el equipo. */
  readonly source: string | null
}

export interface CleanContact {
  readonly value: string
  readonly normalized: string
}

const digitos = (valor: string): string => valor.replace(/\D/g, '')

/**
 * El valor como se guarda, o `null` si no sirve. Un teléfono necesita característica y
 * número (10 dígitos o más): con menos no se puede vincular con una conversación. Un mail
 * necesita la forma `algo@dominio.algo`.
 */
export const cleanContact = (channel: ContactChannel, raw: string): CleanContact | null => {
  const value = raw.trim().replace(/\s+/g, ' ')
  if (value === '' || value.length > 120) return null
  if (channel === 'EMAIL') {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? { value: value.toLowerCase(), normalized: value.toLowerCase() } : null
  }
  if (!/^[\d\s()+.-]+$/.test(value)) return null
  const n = digitos(value)
  return n.length >= 10 && n.length <= 15 ? { value, normalized: n } : null
}

/** Los teléfonos y mails vigentes de un cliente: primero teléfonos, después mails. */
export const listContactPoints = async (sql: QueryExecutor, partyId: string): Promise<ContactPoint[]> =>
  sql<ContactPoint[]>`
    select id, channel, value, source
    from contact_point
    where party_id = ${partyId} and status = 'ACTIVE' and (valid_to is null or valid_to > now())
    order by (channel = 'EMAIL'), created_at, value collate "C"`

export type AddContactResult = { readonly kind: 'ok'; readonly id: string } | { readonly kind: 'duplicate' }

/**
 * Agrega un teléfono o un mail ya limpio. Si el cliente ya lo tiene vigente (el mismo
 * mail, o un teléfono con los mismos últimos 10 dígitos), no agrega nada. Si el equipo lo
 * había dado de baja, lo vuelve a activar.
 */
export const addContactPoint = async (
  sql: QueryExecutor,
  partyId: string,
  channel: ContactChannel,
  contact: CleanContact,
): Promise<AddContactResult> => {
  const vigentes = await listContactPoints(sql, partyId)
  const repetido = vigentes.some((v) =>
    channel === 'EMAIL'
      ? v.channel === 'EMAIL' && v.value.trim().toLowerCase() === contact.normalized
      : v.channel !== 'EMAIL' && digitos(v.value).length >= 10 && digitos(v.value).slice(-10) === contact.normalized.slice(-10),
  )
  if (repetido) return { kind: 'duplicate' }
  const [row] = await sql<{ id: string }[]>`
    insert into contact_point (party_id, channel, value, normalized_value, source, created_by_user_id)
    values (${partyId}, ${channel}, ${contact.value}, ${contact.normalized}, ${BROKER_OS_SOURCE}, authz.usuario())
    on conflict (party_id, channel, normalized_value, source)
      do update set status = 'ACTIVE', valid_to = null, ended_by_user_id = null
    returning id`
  if (row === undefined) throw new Error('el contacto no se guardó')
  return { kind: 'ok', id: row.id }
}

/** Da de baja un teléfono o un mail de ese cliente. `false` si no era uno vigente suyo. */
export const endContactPoint = async (sql: QueryExecutor, partyId: string, id: string): Promise<boolean> => {
  const rows = await sql<{ id: string }[]>`
    update contact_point
    set status = 'INACTIVE', valid_to = clock_timestamp(), ended_by_user_id = authz.usuario()
    where id = ${id} and party_id = ${partyId} and status = 'ACTIVE'
    returning id`
  return rows.length === 1
}

/** Borra de la base un teléfono o un mail de ese cliente. `false` si no era suyo. */
export const deleteContactPoint = async (sql: QueryExecutor, partyId: string, id: string): Promise<boolean> => {
  const rows = await sql<{ id: string }[]>`
    delete from contact_point where id = ${id} and party_id = ${partyId} returning id`
  return rows.length === 1
}
