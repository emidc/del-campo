import type { Sql } from '../persistence/database.ts'
import type { Manifest } from './manifest.ts'
import { measure, type Observation } from './report.ts'

/** Consistent, read-only snapshot. No migration, writes, raw payloads or database dumps. */
export const readReport = async (sql: Sql, m: Manifest) => sql.begin('isolation level repeatable read read only', async tx => {
  await tx`set local statement_timeout = '30s'`
  const participants = await tx<{ code: 'P1' | 'P2'; wa_id: string | null; bsuid: string | null }[]>`
    with activity as (
      select id, wa_id, bsuid from communication.message where phone_number_id = ${m.phoneNumberId}
      union all
      select id, wa_id, bsuid from communication.unsupported_message where phone_number_id = ${m.phoneNumberId}
    ), groups as (
      select min(id) as id, min(wa_id) as wa_id, min(bsuid) as bsuid
      from activity group by coalesce(wa_id, 'bsuid:' || bsuid)
    )
    select p.code, g.wa_id, g.bsuid from groups g
    join (values ('P1', ${m.participants.P1}::bigint), ('P2', ${m.participants.P2}::bigint)) p(code, id) on p.id = g.id`
  if (participants.length !== 2) throw new Error('CO01_PARTICIPANTS_INVALID')
  const p1 = participants.find(p => p.code === 'P1'), p2 = participants.find(p => p.code === 'P2')
  if (!p1 || !p2) throw new Error('CO01_PARTICIPANTS_INVALID')
  const rows = await tx<Observation[]>`
    with marked as (
      select m.*, substring(body from '^(CO01-P[12]-[0-9]{3,6})(?:[[:space:]]|$)') as marker
      from communication.message m where phone_number_id = ${m.phoneNumberId}
    )
    select m.marker,
      case when (${p1.wa_id}::text is not null and m.wa_id = ${p1.wa_id}) or
                     (${p1.wa_id}::text is null and m.wa_id is null and m.bsuid = ${p1.bsuid}) then 'P1'
           when (${p2.wa_id}::text is not null and m.wa_id = ${p2.wa_id}) or
                     (${p2.wa_id}::text is null and m.wa_id is null and m.bsuid = ${p2.bsuid}) then 'P2'
           else null end as participant,
      m.direction, m.wa_timestamp as at, m.received_at as "receivedAt", s.status,
      exists(select 1 from communication.outbound_attempt a where a.message_id = m.id and a.state = 'accepted') as "acceptedFromUi",
      exists(
        select 1 from (
          select phone_number_id, wa_id, bsuid, wa_timestamp, received_at from communication.message where direction = 'inbound'
          union all
          select phone_number_id, wa_id, bsuid, wa_timestamp, received_at from communication.unsupported_message
        ) i where i.phone_number_id = m.phone_number_id
          and ((m.wa_id is not null and i.wa_id = m.wa_id) or (m.bsuid is not null and i.bsuid = m.bsuid))
          and i.wa_timestamp <= m.wa_timestamp and i.received_at <= m.wa_timestamp
          and i.wa_timestamp > m.wa_timestamp - interval '24 hours'
      ) as "windowOpen"
    from marked m left join communication.outbound_status s on m.direction = 'outbound' and s.wamid = m.wamid
    where m.marker is not null and (
      (m.wa_timestamp >= ${m.start}::timestamptz and m.wa_timestamp < ${m.end}::timestamptz)
      or m.marker = any(${m.messages.map(x => x.marker)}::text[]))
    order by m.wa_timestamp, m.id`
  const [duplicates] = await tx<{ n: number }[]>`
    select coalesce(sum(n - 1), 0)::int as n from (
      select count(*) as n from communication.message
      where phone_number_id = ${m.phoneNumberId} group by wamid having count(*) > 1
    ) d`
  return measure(m, rows, duplicates?.n ?? 0)
})
