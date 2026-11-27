// T-0048 — Renovaciones (C6-02b). Vista derivada (DOMAIN §34): una renovación es la
// versión vigente de una póliza cuyo fin de vigencia cae en la ventana pedida. No hay
// tabla propia: el seguimiento (responsable, notas, resultado) vive en una gestión de
// tipo RENOVACION sobre la póliza, y la continuidad, en `policy.renewed_from_policy_id`.
// Corre con el Ejecutor que le dan: desde la app, por `conDatos`, con RLS decidiendo qué
// pólizas y gestiones ve la persona.

import type postgres from 'postgres'

import type { ServiceCaseStatus } from './service-case.ts'

type QueryExecutor = postgres.Sql | postgres.TransactionSql

export type RenewalMode = 'AUTOMATIC' | 'MANUAL'

/**
 * RENOVADA: existe en Broker OS una póliza que la renueva. CON_GESTION: tiene una gestión
 * de renovación abierta. PENDIENTE: ninguna de las dos. Sin sucesora en Broker OS no
 * prueba que no se haya renovado: los datos tienen la fecha de corte del último lote.
 */
export type RenewalState = 'RENOVADA' | 'CON_GESTION' | 'PENDIENTE'

export interface RenewalFilter {
  /** Primer y último día de fin de vigencia, YYYY-MM-DD, ambos incluidos. */
  readonly from: string
  readonly to: string
  readonly mode?: RenewalMode
  readonly state?: RenewalState
  readonly insurerId?: string
  readonly producer?: string
}

export interface RenewalItem {
  readonly policyId: string
  readonly policyNumber: string
  readonly insurerId: string
  readonly insurerName: string
  readonly producer: string | null
  readonly holderPartyId: string
  readonly holderName: string | null
  readonly productReference: string | null
  readonly termStartDate: string
  readonly termEndDate: string
  readonly renewalMode: RenewalMode
  readonly premium: string | null
  readonly totalPremium: string | null
  readonly sumInsured: string | null
  readonly currency: string | null
  readonly paymentMethod: string | null
  /** El número que le tocaría a la próxima refacturación de esta póliza. */
  readonly nextEndorsementNumber: number
  readonly state: RenewalState
  readonly successorPolicyId: string | null
  readonly successorPolicyNumber: string | null
  /** Lo que se edita de la póliza nueva desde Renovaciones; `null` si no hay. */
  readonly successor: SuccessorPolicy | null
  readonly caseId: string | null
  readonly caseStatus: ServiceCaseStatus | null
  readonly caseAssignedEmail: string | null
  /** El comentario de renovación que escribe el equipo en la tabla (0033). */
  readonly comment: string | null
}

/** La póliza que renueva a otra, con su versión abierta, para editarla desde la lista. */
export interface SuccessorPolicy {
  /** El equipo ya cargó toda la información disponible (0037). */
  readonly complete: boolean
  readonly insurerName: string
  readonly driveUrl: string | null
  readonly termStartDate: string
  readonly termEndDate: string
  readonly premium: string | null
  readonly totalPremium: string | null
  readonly sumInsured: string | null
  readonly currency: string | null
  readonly producer: string | null
  readonly productReference: string | null
  readonly paymentMethod: string | null
  readonly renewalMode: RenewalMode
}

const FECHA = /^\d{4}-\d{2}-\d{2}$/

interface Row {
  readonly policy_id: string
  readonly policy_number: string
  readonly insurer_id: string
  readonly insurer_name: string
  readonly producer: string | null
  readonly holder_party_id: string
  readonly holder_name: string | null
  readonly product_reference: string | null
  readonly term_start_date: string
  readonly term_end_date: string
  readonly renewal_mode: RenewalMode
  readonly premium: string | null
  readonly total_premium: string | null
  readonly sum_insured: string | null
  readonly currency: string | null
  readonly payment_method: string | null
  readonly next_endorsement_number: number
  readonly successor_id: string | null
  readonly successor_number: string | null
  readonly successor_complete: boolean | null
  readonly successor_insurer_name: string | null
  readonly successor_drive_url: string | null
  readonly successor_term_start_date: string | null
  readonly successor_term_end_date: string | null
  readonly successor_premium: string | null
  readonly successor_total_premium: string | null
  readonly successor_sum_insured: string | null
  readonly successor_currency: string | null
  readonly successor_producer: string | null
  readonly successor_product_reference: string | null
  readonly successor_payment_method: string | null
  readonly successor_renewal_mode: RenewalMode | null
  readonly case_id: string | null
  readonly case_status: ServiceCaseStatus | null
  readonly case_assigned_email: string | null
  readonly comment: string | null
}

const sucesora = (row: Row): SuccessorPolicy | null =>
  row.successor_id === null || row.successor_term_start_date === null || row.successor_term_end_date === null
    ? null
    : {
        complete: row.successor_complete === true,
        insurerName: row.successor_insurer_name ?? '',
        driveUrl: row.successor_drive_url,
        termStartDate: row.successor_term_start_date,
        termEndDate: row.successor_term_end_date,
        premium: row.successor_premium,
        totalPremium: row.successor_total_premium,
        sumInsured: row.successor_sum_insured,
        currency: row.successor_currency,
        producer: row.successor_producer,
        productReference: row.successor_product_reference,
        paymentMethod: row.successor_payment_method,
        renewalMode: row.successor_renewal_mode ?? 'MANUAL',
      }

const estado = (row: Row): RenewalState =>
  row.successor_id !== null ? 'RENOVADA' : row.case_id !== null ? 'CON_GESTION' : 'PENDIENTE'

export const listRenewals = async (sql: QueryExecutor, filter: RenewalFilter): Promise<RenewalItem[]> => {
  if (!FECHA.test(filter.from) || !FECHA.test(filter.to))
    throw new Error('listRenewals: from y to tienen que ser fechas YYYY-MM-DD')
  const rows = await sql<Row[]>`
    select
      p.id as policy_id,
      p.policy_number,
      i.id as insurer_id,
      i.canonical_name as insurer_name,
      pv.producer,
      pv.holder_party_id,
      coalesce(
        nullif(concat_ws(' ', pp.first_name, pp.last_name), ''),
        op.trade_name,
        op.legal_name,
        pa.display_name_cache
      ) as holder_name,
      pv.product_reference,
      to_char(pv.term_start_date, 'YYYY-MM-DD') as term_start_date,
      to_char(pv.term_end_date, 'YYYY-MM-DD') as term_end_date,
      pv.renewal_mode,
      pv.premium::text,
      pv.total_premium::text,
      pv.sum_insured::text,
      pv.currency,
      pv.payment_method,
      (
        select coalesce(max(case when e.number ~ '^[0-9]{1,9}$' then e.number::int end), 0) + 1
        from endorsement e where e.policy_id = p.id
      ) as next_endorsement_number,
      sucesora.id as successor_id,
      sucesora.policy_number as successor_number,
      sucesora.complete as successor_complete,
      (select si.canonical_name from insurer si where si.id = sucesora.insurer_id) as successor_insurer_name,
      sucesora.drive_url as successor_drive_url,
      to_char(sv.term_start_date, 'YYYY-MM-DD') as successor_term_start_date,
      to_char(sv.term_end_date, 'YYYY-MM-DD') as successor_term_end_date,
      sv.premium::text as successor_premium,
      sv.total_premium::text as successor_total_premium,
      sv.sum_insured::text as successor_sum_insured,
      sv.currency as successor_currency,
      sv.producer as successor_producer,
      sv.product_reference as successor_product_reference,
      sv.payment_method as successor_payment_method,
      sv.renewal_mode as successor_renewal_mode,
      gestion.id as case_id,
      gestion.status as case_status,
      authz.correo_integrante(gestion.assigned_user_id) as case_assigned_email,
      comentario.body as comment
    from policy p
    join insurer i on i.id = p.insurer_id
    join lateral (
      select v.*
      from policy_version v
      where v.policy_id = p.id
        and v.effective_from <= current_date
        and (v.effective_to is null or v.effective_to > current_date)
      order by v.effective_from desc, v.version_number desc
      limit 1
    ) pv on true
    left join party pa on pa.id = pv.holder_party_id
    left join person_profile pp on pp.party_id = pv.holder_party_id
    left join organization_profile op on op.party_id = pv.holder_party_id
    left join lateral (
      select s.id, s.policy_number, s.insurer_id, s.complete, s.drive_url from policy s
      where s.renewed_from_policy_id = p.id
      order by s.created_at desc, s.id
      limit 1
    ) sucesora on true
    left join lateral (
      select v.* from policy_version v
      where v.policy_id = sucesora.id and v.effective_to is null
      order by v.version_number desc
      limit 1
    ) sv on true
    left join lateral (
      select c.id, c.status, c.assigned_user_id from service_case c
      where c.policy_id = p.id and c.kind = 'RENOVACION' and c.status <> 'CERRADA'
      order by c.created_at desc, c.id
      limit 1
    ) gestion on true
    left join policy_renewal_comment comentario on comentario.policy_id = p.id
    where pv.term_end_date between ${filter.from}::date and ${filter.to}::date
      and (${filter.mode ?? null}::text is null or pv.renewal_mode = ${filter.mode ?? null}::text)
      and (${filter.insurerId ?? null}::uuid is null or p.insurer_id = ${filter.insurerId ?? null}::uuid)
      and (${filter.producer ?? null}::text is null or pv.producer = ${filter.producer ?? null}::text)
    order by pv.term_end_date, i.canonical_name, p.policy_number
    limit 5000
  `
  const items = rows.map(
    (row): RenewalItem => ({
      policyId: row.policy_id,
      policyNumber: row.policy_number,
      insurerId: row.insurer_id,
      insurerName: row.insurer_name,
      producer: row.producer,
      holderPartyId: row.holder_party_id,
      holderName: row.holder_name,
      productReference: row.product_reference,
      termStartDate: row.term_start_date,
      termEndDate: row.term_end_date,
      renewalMode: row.renewal_mode,
      premium: row.premium,
      totalPremium: row.total_premium,
      sumInsured: row.sum_insured,
      currency: row.currency,
      paymentMethod: row.payment_method,
      nextEndorsementNumber: row.next_endorsement_number,
      state: estado(row),
      successorPolicyId: row.successor_id,
      successorPolicyNumber: row.successor_number,
      successor: sucesora(row),
      caseId: row.case_id,
      caseStatus: row.case_status,
      caseAssignedEmail: row.case_assigned_email,
      comment: row.comment,
    }),
  )
  return filter.state === undefined ? items : items.filter((item) => item.state === filter.state)
}

/** El comentario como se guarda: sin espacios de más; `''` lo borra. `null` si es muy largo. */
export const cleanRenewalComment = (body: string): string | null => {
  const limpio = body.replace(/\r\n/g, '\n').trim()
  return limpio.length > 2000 ? null : limpio
}

/**
 * Escribe o borra el comentario de renovación de una póliza, a nombre de `authz.usuario()`.
 * `false` si la póliza no existe o no la ve quien escribe.
 */
export const saveRenewalComment = async (sql: QueryExecutor, policyId: string, body: string): Promise<boolean> => {
  const [visible] = await sql<{ id: string }[]>`select id from policy where id = ${policyId}`
  if (visible === undefined) return false
  if (body === '') {
    await sql`delete from policy_renewal_comment where policy_id = ${policyId}`
    return true
  }
  await sql`
    insert into policy_renewal_comment (policy_id, body, updated_by_user_id)
    values (${policyId}, ${body}, authz.usuario())
    on conflict (policy_id) do update
    set body = excluded.body, updated_by_user_id = excluded.updated_by_user_id, updated_at = clock_timestamp()`
  return true
}
