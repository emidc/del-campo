import type postgres from 'postgres'

type QueryExecutor = postgres.Sql | postgres.TransactionSql
type DateValue = Date | string

export interface PolicySearchCriteria {
  readonly firstName?: string
  readonly lastName?: string
  readonly dni?: string
  readonly cuit?: string
  readonly company?: string
  readonly policyNumber?: string
  readonly insurer?: string
  readonly asOf: string
}

export interface HolderSummary {
  readonly partyId: string
  readonly kind: 'PERSON' | 'ORGANIZATION'
  readonly displayName: string
  readonly dni: string | null
  readonly cuit: string | null
}

export interface InsurerSummary {
  readonly id: string
  readonly name: string
}

export interface CurrentPolicyVersion {
  readonly id: string
  readonly versionNumber: number
  readonly effectiveFrom: string
  readonly effectiveTo: string | null
  readonly termStartDate: string
  readonly termEndDate: string
  readonly status: string | null
}

export interface PolicyCandidate {
  readonly policyId: string
  readonly policyNumber: string
  readonly insurer: InsurerSummary
  readonly holder: HolderSummary | null
  readonly currentVersion: CurrentPolicyVersion | null
  readonly documents: {
    readonly state: 'NO_LINK' | 'LINKED'
    readonly count: number
  }
}

export type PolicySearchResult =
  | { readonly state: 'NO_RESULTS'; readonly candidates: readonly [] }
  | { readonly state: 'CANDIDATES'; readonly candidates: readonly PolicyCandidate[] }

export interface EndorsementSummary {
  readonly id: string
  readonly number: string | null
  readonly kind: string
  readonly effectiveFrom: string | null
}

export interface PolicyVersionHistoryEntry extends CurrentPolicyVersion {
  readonly holder: HolderSummary
  readonly productReference: string | null
  readonly renewalMode: 'AUTOMATIC' | 'MANUAL'
  readonly premium: string | null
  readonly currency: string | null
  readonly coverageData: unknown
  readonly endorsement: EndorsementSummary | null
}

export interface DocumentLinkSummary {
  readonly id: string
  readonly driveFileId: string
  readonly driveUrl: string | null
  readonly driveItemType: 'FILE' | 'FOLDER'
  readonly documentKind: string | null
  readonly reconciliationStatus: string
  readonly lastSeenAt: string | null
}

export interface PolicyDetail {
  readonly policyId: string
  readonly policyNumber: string
  readonly renewedFromPolicyId: string | null
  readonly insurer: InsurerSummary
  readonly holder: HolderSummary | null
  readonly currentVersion: CurrentPolicyVersion | null
  readonly history: readonly PolicyVersionHistoryEntry[]
  readonly documents: readonly DocumentLinkSummary[]
}

export interface PartyMembershipSummary {
  readonly partyId: string
  readonly displayName: string
  readonly kind: string | null
  readonly roleOrPosition: string | null
  readonly isPrimary: boolean | null
}

export interface PartyOverview {
  readonly partyId: string
  readonly kind: 'PERSON' | 'ORGANIZATION'
  readonly displayName: string
  readonly dni: string | null
  readonly cuit: string | null
  readonly policies: readonly PolicyCandidate[]
  readonly organizations: readonly PartyMembershipSummary[]
  readonly contacts: readonly PartyMembershipSummary[]
}

interface CandidateRow {
  readonly policy_id: string
  readonly policy_number: string
  readonly insurer_id: string
  readonly insurer_name: string
  readonly holder_party_id: string | null
  readonly holder_kind: 'PERSON' | 'ORGANIZATION' | null
  readonly holder_display_name: string | null
  readonly holder_dni: string | null
  readonly holder_cuit: string | null
  readonly current_version_id: string | null
  readonly version_number: number | null
  readonly effective_from: DateValue | null
  readonly effective_to: DateValue | null
  readonly term_start_date: DateValue | null
  readonly term_end_date: DateValue | null
  readonly version_status: string | null
  readonly document_count: number
}

interface PolicyIdentityRow extends CandidateRow {
  readonly renewed_from_policy_id: string | null
}

interface HistoryRow {
  readonly id: string
  readonly version_number: number
  readonly effective_from: DateValue
  readonly effective_to: DateValue | null
  readonly term_start_date: DateValue
  readonly term_end_date: DateValue
  readonly status: string | null
  readonly holder_party_id: string
  readonly holder_kind: 'PERSON' | 'ORGANIZATION'
  readonly holder_display_name: string
  readonly holder_dni: string | null
  readonly holder_cuit: string | null
  readonly product_reference: string | null
  readonly renewal_mode: 'AUTOMATIC' | 'MANUAL'
  readonly premium: string | null
  readonly currency: string | null
  readonly coverage_data: unknown
  readonly endorsement_id: string | null
  readonly endorsement_number: string | null
  readonly endorsement_kind: string | null
  readonly endorsement_effective_from: DateValue | null
}

interface DocumentRow {
  readonly id: string
  readonly drive_file_id: string
  readonly drive_url: string | null
  readonly drive_item_type: 'FILE' | 'FOLDER'
  readonly document_kind: string | null
  readonly reconciliation_status: string
  readonly last_seen_at: Date | string | null
}

interface PartyRow {
  readonly party_id: string
  readonly kind: 'PERSON' | 'ORGANIZATION'
  readonly display_name: string
  readonly dni: string | null
  readonly cuit: string | null
}

interface MembershipRow {
  readonly party_id: string
  readonly display_name: string
  readonly kind: string | null
  readonly role_or_position: string | null
  readonly is_primary: boolean | null
}

const dateOnly = (value: DateValue): string =>
  typeof value === 'string' ? value.slice(0, 10) : value.toISOString().slice(0, 10)

const timestamp = (value: Date | string): string =>
  typeof value === 'string' ? value : value.toISOString()

const normalizeOptional = (value: string | undefined): string | null => {
  const normalized = value?.trim()
  return normalized === undefined || normalized === '' ? null : normalized
}

const assertDate = (value: string): string => {
  const parsed = new Date(`${value}T00:00:00Z`)
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(value)
    || Number.isNaN(parsed.getTime())
    || parsed.toISOString().slice(0, 10) !== value
  ) {
    throw new Error(`asOf must be a valid YYYY-MM-DD date; received ${JSON.stringify(value)}`)
  }
  return value
}

const holderFromRow = (row: CandidateRow): HolderSummary | null => {
  if (
    row.holder_party_id === null
    || row.holder_kind === null
    || row.holder_display_name === null
  ) return null

  return {
    partyId: row.holder_party_id,
    kind: row.holder_kind,
    displayName: row.holder_display_name,
    dni: row.holder_dni,
    cuit: row.holder_cuit,
  }
}

const currentVersionFromRow = (row: CandidateRow): CurrentPolicyVersion | null => {
  if (
    row.current_version_id === null
    || row.version_number === null
    || row.effective_from === null
    || row.term_start_date === null
    || row.term_end_date === null
  ) return null

  return {
    id: row.current_version_id,
    versionNumber: row.version_number,
    effectiveFrom: dateOnly(row.effective_from),
    effectiveTo: row.effective_to === null ? null : dateOnly(row.effective_to),
    termStartDate: dateOnly(row.term_start_date),
    termEndDate: dateOnly(row.term_end_date),
    status: row.version_status,
  }
}

const candidateFromRow = (row: CandidateRow): PolicyCandidate => ({
  policyId: row.policy_id,
  policyNumber: row.policy_number,
  insurer: { id: row.insurer_id, name: row.insurer_name },
  holder: holderFromRow(row),
  currentVersion: currentVersionFromRow(row),
  documents: {
    state: row.document_count === 0 ? 'NO_LINK' : 'LINKED',
    count: row.document_count,
  },
})

/**
 * Busca todas las coincidencias sin ranking ni selección implícita. Los criterios se
 * combinan con AND. Texto descriptivo usa coincidencia parcial case-insensitive;
 * identificadores (DNI, CUIT y número de póliza) usan igualdad case-insensitive.
 */
export const searchPolicies = async (
  sql: QueryExecutor,
  criteria: PolicySearchCriteria,
): Promise<PolicySearchResult> => {
  const firstName = normalizeOptional(criteria.firstName)
  const lastName = normalizeOptional(criteria.lastName)
  const dni = normalizeOptional(criteria.dni)
  const cuit = normalizeOptional(criteria.cuit)
  const company = normalizeOptional(criteria.company)
  const policyNumber = normalizeOptional(criteria.policyNumber)
  const insurer = normalizeOptional(criteria.insurer)
  const asOf = assertDate(criteria.asOf)

  if ([firstName, lastName, dni, cuit, company, policyNumber, insurer].every((value) => value === null)) {
    throw new Error('at least one DOMAIN.md §65 search criterion is required')
  }

  const rows = await sql<CandidateRow[]>`
    select
      p.id as policy_id,
      p.policy_number,
      i.id as insurer_id,
      i.canonical_name as insurer_name,
      pv.holder_party_id,
      holder.kind as holder_kind,
      coalesce(
        nullif(concat_ws(' ', pp.first_name, pp.last_name), ''),
        op.trade_name,
        op.legal_name
      ) as holder_display_name,
      pp.dni as holder_dni,
      op.cuit as holder_cuit,
      pv.id as current_version_id,
      pv.version_number,
      pv.effective_from,
      pv.effective_to,
      pv.term_start_date,
      pv.term_end_date,
      pv.status as version_status,
      (select count(*)::int from document_link dl
        where dl.resource_type = 'POLICY' and dl.resource_id = p.id) as document_count
    from policy p
    join insurer i on i.id = p.insurer_id
    left join lateral (
      select selected.*
      from policy_version selected
      where selected.policy_id = p.id
        and selected.effective_from <= ${asOf}::date
        and (selected.effective_to is null or selected.effective_to > ${asOf}::date)
      order by selected.effective_from desc, selected.version_number desc
      limit 1
    ) pv on true
    left join party holder on holder.id = pv.holder_party_id
    left join person_profile pp on pp.party_id = holder.id
    left join organization_profile op on op.party_id = holder.id
    where (${firstName}::text is null or pp.first_name ilike '%' || ${firstName}::text || '%')
      and (${lastName}::text is null or pp.last_name ilike '%' || ${lastName}::text || '%')
      and (${dni}::text is null or lower(pp.dni) = lower(${dni}::text))
      and (${cuit}::text is null or lower(op.cuit) = lower(${cuit}::text))
      and (
        ${company}::text is null
        or op.legal_name ilike '%' || ${company}::text || '%'
        or op.trade_name ilike '%' || ${company}::text || '%'
      )
      and (${policyNumber}::text is null or lower(p.policy_number) = lower(${policyNumber}::text))
      and (
        ${insurer}::text is null
        or i.canonical_name ilike '%' || ${insurer}::text || '%'
        or exists (
          select 1 from insurer_alias ia
          where ia.insurer_id = i.id and ia.alias ilike '%' || ${insurer}::text || '%'
        )
      )
    order by i.canonical_name, p.policy_number, p.id
  `

  if (rows.length === 0) return { state: 'NO_RESULTS', candidates: [] }
  return { state: 'CANDIDATES', candidates: rows.map(candidateFromRow) }
}

const policyIdentity = async (
  sql: QueryExecutor,
  policyId: string,
  asOf: string,
): Promise<PolicyIdentityRow | null> => {
  const rows = await sql<PolicyIdentityRow[]>`
    select
      p.id as policy_id,
      p.policy_number,
      p.renewed_from_policy_id,
      i.id as insurer_id,
      i.canonical_name as insurer_name,
      pv.holder_party_id,
      holder.kind as holder_kind,
      coalesce(
        nullif(concat_ws(' ', pp.first_name, pp.last_name), ''),
        op.trade_name,
        op.legal_name
      ) as holder_display_name,
      pp.dni as holder_dni,
      op.cuit as holder_cuit,
      pv.id as current_version_id,
      pv.version_number,
      pv.effective_from,
      pv.effective_to,
      pv.term_start_date,
      pv.term_end_date,
      pv.status as version_status,
      (select count(*)::int from document_link dl
        where dl.resource_type = 'POLICY' and dl.resource_id = p.id) as document_count
    from policy p
    join insurer i on i.id = p.insurer_id
    left join lateral (
      select selected.* from policy_version selected
      where selected.policy_id = p.id
        and selected.effective_from <= ${asOf}::date
        and (selected.effective_to is null or selected.effective_to > ${asOf}::date)
      order by selected.effective_from desc, selected.version_number desc
      limit 1
    ) pv on true
    left join party holder on holder.id = pv.holder_party_id
    left join person_profile pp on pp.party_id = holder.id
    left join organization_profile op on op.party_id = holder.id
    where p.id = ${policyId}
  `
  return rows[0] ?? null
}

export const getPolicyDetail = async (
  sql: QueryExecutor,
  policyId: string,
  atDate: string,
): Promise<PolicyDetail | null> => {
  const asOf = assertDate(atDate)
  const identity = await policyIdentity(sql, policyId, asOf)
  if (identity === null) return null

  const [historyRows, documentRows] = await Promise.all([
    sql<HistoryRow[]>`
      select
        pv.id,
        pv.version_number,
        pv.effective_from,
        pv.effective_to,
        pv.term_start_date,
        pv.term_end_date,
        pv.status,
        pv.holder_party_id,
        holder.kind as holder_kind,
        coalesce(
          nullif(concat_ws(' ', pp.first_name, pp.last_name), ''),
          op.trade_name,
          op.legal_name
        ) as holder_display_name,
        pp.dni as holder_dni,
        op.cuit as holder_cuit,
        pv.product_reference,
        pv.renewal_mode,
        pv.premium::text,
        pv.currency,
        pv.coverage_data,
        e.id as endorsement_id,
        e.number as endorsement_number,
        e.kind as endorsement_kind,
        e.effective_from as endorsement_effective_from
      from policy_version pv
      join party holder on holder.id = pv.holder_party_id
      left join person_profile pp on pp.party_id = holder.id
      left join organization_profile op on op.party_id = holder.id
      left join endorsement e on e.id = pv.endorsement_id and e.policy_id = pv.policy_id
      where pv.policy_id = ${policyId}
      order by pv.version_number desc
    `,
    sql<DocumentRow[]>`
      select
        id, drive_file_id, drive_url, drive_item_type, document_kind,
        reconciliation_status, last_seen_at
      from document_link
      where resource_type = 'POLICY' and resource_id = ${policyId}
      order by created_at, id
    `,
  ])

  const history = historyRows.map<PolicyVersionHistoryEntry>((row) => ({
    id: row.id,
    versionNumber: row.version_number,
    effectiveFrom: dateOnly(row.effective_from),
    effectiveTo: row.effective_to === null ? null : dateOnly(row.effective_to),
    termStartDate: dateOnly(row.term_start_date),
    termEndDate: dateOnly(row.term_end_date),
    status: row.status,
    holder: {
      partyId: row.holder_party_id,
      kind: row.holder_kind,
      displayName: row.holder_display_name,
      dni: row.holder_dni,
      cuit: row.holder_cuit,
    },
    productReference: row.product_reference,
    renewalMode: row.renewal_mode,
    premium: row.premium,
    currency: row.currency,
    coverageData: row.coverage_data,
    endorsement: row.endorsement_id === null || row.endorsement_kind === null
      ? null
      : {
          id: row.endorsement_id,
          number: row.endorsement_number,
          kind: row.endorsement_kind,
          effectiveFrom: row.endorsement_effective_from === null
            ? null
            : dateOnly(row.endorsement_effective_from),
        },
  }))

  return {
    policyId: identity.policy_id,
    policyNumber: identity.policy_number,
    renewedFromPolicyId: identity.renewed_from_policy_id,
    insurer: { id: identity.insurer_id, name: identity.insurer_name },
    holder: holderFromRow(identity),
    currentVersion: currentVersionFromRow(identity),
    history,
    documents: documentRows.map((row) => ({
      id: row.id,
      driveFileId: row.drive_file_id,
      driveUrl: row.drive_url,
      driveItemType: row.drive_item_type,
      documentKind: row.document_kind,
      reconciliationStatus: row.reconciliation_status,
      lastSeenAt: row.last_seen_at === null ? null : timestamp(row.last_seen_at),
    })),
  }
}

const policiesForParty = async (
  sql: QueryExecutor,
  partyId: string,
  asOf: string,
): Promise<PolicyCandidate[]> => {
  const rows = await sql<CandidateRow[]>`
    select
      p.id as policy_id,
      p.policy_number,
      i.id as insurer_id,
      i.canonical_name as insurer_name,
      pv.holder_party_id,
      holder.kind as holder_kind,
      coalesce(
        nullif(concat_ws(' ', pp.first_name, pp.last_name), ''),
        op.trade_name,
        op.legal_name
      ) as holder_display_name,
      pp.dni as holder_dni,
      op.cuit as holder_cuit,
      pv.id as current_version_id,
      pv.version_number,
      pv.effective_from,
      pv.effective_to,
      pv.term_start_date,
      pv.term_end_date,
      pv.status as version_status,
      (select count(*)::int from document_link dl
        where dl.resource_type = 'POLICY' and dl.resource_id = p.id) as document_count
    from policy p
    join insurer i on i.id = p.insurer_id
    join lateral (
      select selected.* from policy_version selected
      where selected.policy_id = p.id
        and selected.effective_from <= ${asOf}::date
        and (selected.effective_to is null or selected.effective_to > ${asOf}::date)
      order by selected.effective_from desc, selected.version_number desc
      limit 1
    ) pv on true
    join party holder on holder.id = pv.holder_party_id
    left join person_profile pp on pp.party_id = holder.id
    left join organization_profile op on op.party_id = holder.id
    where pv.holder_party_id = ${partyId}
    order by i.canonical_name, p.policy_number, p.id
  `
  return rows.map(candidateFromRow)
}

const membershipFromRow = (row: MembershipRow): PartyMembershipSummary => ({
  partyId: row.party_id,
  displayName: row.display_name,
  kind: row.kind,
  roleOrPosition: row.role_or_position,
  isPrimary: row.is_primary,
})

export const getPartyOverview = async (
  sql: QueryExecutor,
  partyId: string,
  atDate: string,
): Promise<PartyOverview | null> => {
  const asOf = assertDate(atDate)
  const partyRows = await sql<PartyRow[]>`
    select
      p.id as party_id,
      p.kind,
      coalesce(
        nullif(concat_ws(' ', pp.first_name, pp.last_name), ''),
        op.trade_name,
        op.legal_name
      ) as display_name,
      pp.dni,
      op.cuit
    from party p
    left join person_profile pp on pp.party_id = p.id
    left join organization_profile op on op.party_id = p.id
    where p.id = ${partyId} and p.status = 'ACTIVE'
  `
  const party = partyRows[0]
  if (party === undefined) return null

  const [policies, organizationRows, contactRows] = await Promise.all([
    policiesForParty(sql, partyId, asOf),
    sql<MembershipRow[]>`
      select
        organization.id as party_id,
        coalesce(op.trade_name, op.legal_name) as display_name,
        membership.kind,
        membership.role_or_position,
        membership.is_primary
      from organization_membership membership
      join party organization on organization.id = membership.organization_party_id
      join organization_profile op on op.party_id = organization.id
      where membership.person_party_id = ${partyId}
        and membership.valid_from::date <= ${asOf}::date
        and (membership.valid_to is null or membership.valid_to::date > ${asOf}::date)
      order by display_name, organization.id
    `,
    sql<MembershipRow[]>`
      select
        person.id as party_id,
        concat_ws(' ', pp.first_name, pp.last_name) as display_name,
        membership.kind,
        membership.role_or_position,
        membership.is_primary
      from organization_membership membership
      join party person on person.id = membership.person_party_id
      join person_profile pp on pp.party_id = person.id
      where membership.organization_party_id = ${partyId}
        and membership.valid_from::date <= ${asOf}::date
        and (membership.valid_to is null or membership.valid_to::date > ${asOf}::date)
      order by display_name, person.id
    `,
  ])

  return {
    partyId: party.party_id,
    kind: party.kind,
    displayName: party.display_name,
    dni: party.dni,
    cuit: party.cuit,
    policies,
    organizations: organizationRows.map(membershipFromRow),
    contacts: contactRows.map(membershipFromRow),
  }
}
