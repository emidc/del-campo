// T-0013, paso 5 — Contactos/Cuentas → Party/PersonProfile/OrganizationProfile/
// ContactPoint/OrganizationMembership. Idempotencia vía `party_source_link`: cada
// `source_record_id` obtiene una Party la primera vez y la reutiliza siempre; no hay
// fusión entre Parties de distintos `source_record_id` (§61, matching ≠ merge).

import type { Ejecutor } from './db.ts'

import { CAMPOS_CONTACTO, CAMPOS_CUENTA } from './zoho-fields.ts'

const vacioComoNulo = (valor: string | undefined): string | null =>
  valor === undefined || valor.trim() === '' ? null : valor.trim()

const obtenerOCrearParty = async (
  sql: Ejecutor,
  sourceEntityType: 'Contactos' | 'Cuentas',
  sourceRecordId: string,
  kind: 'PERSON' | 'ORGANIZATION',
  displayName: string,
): Promise<string> => {
  const [vinculo] = await sql<{ party_id: string }[]>`
    select party_id from party_source_link
    where source_system = 'Zoho' and source_entity_type = ${sourceEntityType} and source_record_id = ${sourceRecordId}
  `
  if (vinculo !== undefined) return vinculo.party_id

  const [party] = await sql<{ id: string }[]>`
    insert into party (kind, display_name_cache) values (${kind}, ${displayName}) returning id
  `
  if (party === undefined) throw new Error('no se pudo crear party')

  await sql`
    insert into party_source_link (source_system, source_entity_type, source_record_id, party_id)
    values ('Zoho', ${sourceEntityType}, ${sourceRecordId}, ${party.id})
    on conflict (source_system, source_entity_type, source_record_id) do nothing
  `
  return party.id
}

const crearContactPoint = async (
  sql: Ejecutor,
  partyId: string,
  channel: 'EMAIL' | 'PHONE' | 'WHATSAPP',
  valor: string,
  source: string,
): Promise<void> => {
  const normalizado = valor.trim().toLowerCase()
  await sql`
    insert into contact_point (party_id, channel, value, normalized_value, source)
    values (${partyId}, ${channel}, ${valor}, ${normalizado}, ${source})
    on conflict (party_id, channel, normalized_value, source) do nothing
  `
}

export interface ConteoParties {
  readonly contactos: number
  readonly cuentas: number
  readonly membresias: number
}

export const importarContactos = async (sql: Ejecutor): Promise<number> => {
  const filas = await sql<{ source_record_id: string; raw: Record<string, string> }[]>`
    select source_record_id, raw from staging_contact
  `
  let contador = 0
  for (const fila of filas) {
    const nombre = fila.raw[CAMPOS_CONTACTO.nombre]?.trim() ?? ''
    const apellidos = fila.raw[CAMPOS_CONTACTO.apellidos]?.trim() ?? ''
    const displayName = `${nombre} ${apellidos}`.trim() || fila.source_record_id

    const partyId = await obtenerOCrearParty(sql, 'Contactos', fila.source_record_id, 'PERSON', displayName)

    await sql`
      insert into person_profile (party_id, first_name, last_name, dni, cuil)
      values (
        ${partyId}, ${nombre}, ${apellidos},
        ${vacioComoNulo(fila.raw[CAMPOS_CONTACTO.dni])},
        ${vacioComoNulo(fila.raw[CAMPOS_CONTACTO.cuil])}
      )
      on conflict (party_id) do nothing
    `

    const source = `zoho:Contactos:${fila.source_record_id}`
    const email = fila.raw[CAMPOS_CONTACTO.correoElectronico]?.trim()
    if (email !== undefined && email !== '') await crearContactPoint(sql, partyId, 'EMAIL', email, source)
    const emailSecundario = fila.raw[CAMPOS_CONTACTO.correoElectronicoSecundario]?.trim()
    if (emailSecundario !== undefined && emailSecundario !== '') {
      await crearContactPoint(sql, partyId, 'EMAIL', emailSecundario, source)
    }
    const telefono = fila.raw[CAMPOS_CONTACTO.telefono]?.trim()
    if (telefono !== undefined && telefono !== '') await crearContactPoint(sql, partyId, 'PHONE', telefono, source)
    const movil = fila.raw[CAMPOS_CONTACTO.movil]?.trim()
    if (movil !== undefined && movil !== '') await crearContactPoint(sql, partyId, 'PHONE', movil, source)

    contador += 1
  }
  return contador
}

export const importarCuentas = async (sql: Ejecutor): Promise<number> => {
  const filas = await sql<{ source_record_id: string; raw: Record<string, string> }[]>`
    select source_record_id, raw from staging_account
  `
  let contador = 0
  for (const fila of filas) {
    const legalName = vacioComoNulo(fila.raw[CAMPOS_CUENTA.nombreDeCuenta]) ?? fila.source_record_id

    const partyId = await obtenerOCrearParty(sql, 'Cuentas', fila.source_record_id, 'ORGANIZATION', legalName)

    await sql`
      insert into organization_profile (party_id, legal_name, cuit)
      values (${partyId}, ${legalName}, ${vacioComoNulo(fila.raw[CAMPOS_CUENTA.cuit])})
      on conflict (party_id) do nothing
    `

    const telefono = fila.raw[CAMPOS_CUENTA.telefono]?.trim()
    if (telefono !== undefined && telefono !== '') {
      await crearContactPoint(sql, partyId, 'PHONE', telefono, `zoho:Cuentas:${fila.source_record_id}`)
    }

    contador += 1
  }
  return contador
}

/** Cuenta↔Contacto → OrganizationMembership. §17: la relación persona-organización, no un rol contractual. */
export const importarMembresias = async (sql: Ejecutor): Promise<number> => {
  const filas = await sql<{ contacto_party_id: string; cuenta_party_id: string }[]>`
    select psl_contacto.party_id as contacto_party_id, psl_cuenta.party_id as cuenta_party_id
    from staging_contact sc
    join party_source_link psl_contacto
      on psl_contacto.source_system = 'Zoho' and psl_contacto.source_entity_type = 'Contactos'
      and psl_contacto.source_record_id = sc.source_record_id
    join party_source_link psl_cuenta
      on psl_cuenta.source_system = 'Zoho' and psl_cuenta.source_entity_type = 'Cuentas'
      and psl_cuenta.source_record_id = sc.account_source_id
    where sc.account_source_id is not null
  `
  let contador = 0
  for (const fila of filas) {
    const [existente] = await sql<{ id: string }[]>`
      select id from organization_membership
      where organization_party_id = ${fila.cuenta_party_id} and person_party_id = ${fila.contacto_party_id}
      and valid_to is null
    `
    if (existente !== undefined) continue

    await sql`
      insert into organization_membership (organization_party_id, person_party_id)
      values (${fila.cuenta_party_id}, ${fila.contacto_party_id})
    `
    contador += 1
  }
  return contador
}
