// El vínculo entre una conversación de WhatsApp y un cliente de Broker OS. No se guarda:
// se calcula al leer, comparando el teléfono del participante con los teléfonos vigentes
// de `contact_point`. Los teléfonos de los clientes vienen como los escribió alguien, así
// que se comparan los últimos 10 dígitos (característica y número, sin país ni prefijos).
// Un teléfono con menos de 10 dígitos no vincula. Lo que no coincide queda sin identificar.

import type { Conexion } from './database.ts'

export interface ConversationParty {
  readonly conversationId: number
  readonly partyId: string
  readonly name: string
  /** Si todavía es prospecto (rol PROSPECT vigente). */
  readonly prospect: boolean
  /** El integrante del equipo responsable de los mensajes del cliente (0031), si tiene. */
  readonly ownerUserId: string | null
}

const filas = (rows: (Omit<ConversationParty, 'conversationId'> & { conversationId: string })[]): ConversationParty[] =>
  rows.map((r) => ({ ...r, conversationId: Number(r.conversationId) }))

/** Los clientes de cada conversación, o sólo las conversaciones de `partyId`. */
export const listConversationParties = async (sql: Conexion, partyId: string | null = null): Promise<ConversationParty[]> =>
  filas(await sql<(Omit<ConversationParty, 'conversationId'> & { conversationId: string })[]>`
    with conv as (
      select min(id) as id, wa_id from (
        select id, wa_id from communication.message where wa_id is not null
        union all
        select id, wa_id from communication.unsupported_message where wa_id is not null
      ) a
      group by wa_id
    ), tel as (
      select distinct party_id, right(regexp_replace(value, '\\D', '', 'g'), 10) as digitos
      from contact_point
      where channel in ('PHONE', 'WHATSAPP') and status = 'ACTIVE'
        and (valid_to is null or valid_to > now())
        and length(regexp_replace(value, '\\D', '', 'g')) >= 10
        and (${partyId}::uuid is null or party_id = ${partyId}::uuid)
    )
    select c.id as "conversationId", pa.id as "partyId", pa.message_owner_user_id as "ownerUserId",
           exists (select 1 from party_role r where r.party_id = pa.id and r.role = 'PROSPECT' and r.valid_to is null) as prospect,
           coalesce(
             nullif(concat_ws(' ', pp.first_name, pp.last_name), ''),
             op.trade_name,
             op.legal_name,
             pa.display_name_cache,
             'sin nombre'
           ) as name
    from conv c
    join tel t on t.digitos = right(c.wa_id, 10)
    join party pa on pa.id = t.party_id
    left join person_profile pp on pp.party_id = pa.id
    left join organization_profile op on op.party_id = pa.id
    order by c.id, name`)
