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
}

export interface RenewalItem {
  readonly policyId: string
  readonly policyNumber: string
  readonly insurerName: string
  readonly holderPartyId: string
  readonly holderName: string | null
  readonly productReference: string | null
  readonly termEndDate: string
  readonly renewalMode: RenewalMode
  readonly state: RenewalState
  readonly successorPolicyId: string | null
  readonly successorPolicyNumber: string | null
  readonly caseId: string | null
  readonly caseStatus: ServiceCaseStatus | null
  readonly caseAssignedEmail: string | null
}

const FECHA = /^\d{4}-\d{2}-\d{2}$/

interface Row {
  readonly policy_id: string
  readonly policy_number: string
  readonly insurer_name: string
  readonly holder_party_id: string
  readonly holder_name: string | null
  readonly product_reference: string | null
  readonly term_end_date: string
  readonly renewal_mode: RenewalMode
  readonly successor_id: string | null
  readonly successor_number: string | null
  readonly case_id: string | null
  readonly case_status: ServiceCaseStatus | null
  readonly case_assigned_email: string | null
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
      i.canonical_name as insurer_name,
      pv.holder_party_id,
      coalesce(
        nullif(concat_ws(' ', pp.first_name, pp.last_name), ''),
        op.trade_name,
        op.legal_name,
        pa.display_name_cache
      ) as holder_name,
      pv.product_reference,
      to_char(pv.term_end_date, 'YYYY-MM-DD') as term_end_date,
      pv.renewal_mode,
      sucesora.id as successor_id,
      sucesora.policy_number as successor_number,
      gestion.id as case_id,
      gestion.status as case_status,
      authz.correo_integrante(gestion.assigned_user_id) as case_assigned_email
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
      select s.id, s.policy_number from policy s
      where s.renewed_from_policy_id = p.id
      order by s.created_at desc, s.id
      limit 1
    ) sucesora on true
    left join lateral (
      select c.id, c.status, c.assigned_user_id from service_case c
      where c.policy_id = p.id and c.kind = 'RENOVACION' and c.status <> 'CERRADA'
      order by c.created_at desc, c.id
      limit 1
    ) gestion on true
    where pv.term_end_date between ${filter.from}::date and ${filter.to}::date
      and (${filter.mode ?? null}::text is null or pv.renewal_mode = ${filter.mode ?? null}::text)
    order by pv.term_end_date, i.canonical_name, p.policy_number
    limit 1000
  `
  const items = rows.map(
    (row): RenewalItem => ({
      policyId: row.policy_id,
      policyNumber: row.policy_number,
      insurerName: row.insurer_name,
      holderPartyId: row.holder_party_id,
      holderName: row.holder_name,
      productReference: row.product_reference,
      termEndDate: row.term_end_date,
      renewalMode: row.renewal_mode,
      state: estado(row),
      successorPolicyId: row.successor_id,
      successorPolicyNumber: row.successor_number,
      caseId: row.case_id,
      caseStatus: row.case_status,
      caseAssignedEmail: row.case_assigned_email,
    }),
  )
  return filter.state === undefined ? items : items.filter((item) => item.state === filter.state)
}
