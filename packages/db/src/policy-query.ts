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
    readonly state: 'NO_REFERENCE' | 'KNOWN_UNRESOLVED' | 'KNOWN_RESOLVED' | 'LINKED'
    readonly linkCount: number
    readonly referenceCount: number
    readonly unresolvedReasons: readonly string[]
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

export interface ExternalDocumentReferenceSummary {
  readonly id: string
  readonly sourceSystem: string
  readonly sourceEntityType: string
  readonly sourceExternalId: string | null
  readonly sourceValue: string | null
  readonly resolutionStatus: 'UNRESOLVED' | 'RESOLVED'
  readonly unresolvedReason: string | null
  readonly resolvedTargetType: string | null
  readonly resolvedTargetId: string | null
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
  readonly documentReferences: readonly ExternalDocumentReferenceSummary[]
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
  readonly document_reference_count: number
  readonly unresolved_reference_count: number
  readonly unresolved_reasons: string[]
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

interface ExternalDocumentReferenceRow {
  readonly id: string
  readonly source_system: string
  readonly source_entity_type: string
  readonly source_external_id: string | null
  readonly source_value: string | null
  readonly resolution_status: 'UNRESOLVED' | 'RESOLVED'
  readonly unresolved_reason: string | null
  readonly resolved_target_type: string | null
  readonly resolved_target_id: string | null
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

const assertZonedInstant = (value: string): string => {
  const hasExplicitZone = /(?:Z|[+-]\d{2}:\d{2})$/i.test(value)
  const isIsoDateTime = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/i.test(value)
  if (!hasExplicitZone || !isIsoDateTime || Number.isNaN(Date.parse(value))) {
    throw new Error(
      `membershipAt must be a valid ISO-8601 instant with Z or an explicit offset; received ${JSON.stringify(value)}`,
    )
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
    state: row.document_count > 0
      ? 'LINKED'
      : row.unresolved_reference_count > 0
        ? 'KNOWN_UNRESOLVED'
        : row.document_reference_count > 0
          ? 'KNOWN_RESOLVED'
          : 'NO_REFERENCE',
    linkCount: row.document_count,
    referenceCount: row.document_reference_count,
    unresolvedReasons: row.unresolved_reasons,
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
    with recursive party_resolution (origin_id, resolved_id) as (
      select id, id from party
      union all
      select resolution.origin_id, current_party.merged_into_party_id
      from party_resolution resolution
      join party current_party on current_party.id = resolution.resolved_id
      where current_party.merged_into_party_id is not null
    ), canonical_party as (
      select resolution.origin_id, resolution.resolved_id as canonical_id
      from party_resolution resolution
      join party canonical on canonical.id = resolution.resolved_id
      where canonical.merged_into_party_id is null
    )
    select
      p.id as policy_id,
      p.policy_number,
      i.id as insurer_id,
      i.canonical_name as insurer_name,
      holder.id as holder_party_id,
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
        where dl.resource_type = 'POLICY' and dl.resource_id = p.id) as document_count,
      (select count(*)::int from policy_document_reference pdr
        where pdr.policy_id = p.id) as document_reference_count,
      (select count(*)::int
        from policy_document_reference pdr
        join external_reference er on er.id = pdr.external_reference_id
        where pdr.policy_id = p.id and er.resolution_status = 'UNRESOLVED'
      ) as unresolved_reference_count,
      coalesce((
        select array_agg(er.unresolved_reason order by er.id)
          filter (where er.unresolved_reason is not null)
        from policy_document_reference pdr
        join external_reference er on er.id = pdr.external_reference_id
        where pdr.policy_id = p.id and er.resolution_status = 'UNRESOLVED'
      ), array[]::text[]) as unresolved_reasons
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
    left join canonical_party resolved_holder on resolved_holder.origin_id = pv.holder_party_id
    left join party holder on holder.id = resolved_holder.canonical_id
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
    with recursive party_resolution (origin_id, resolved_id) as (
      select id, id from party
      union all
      select resolution.origin_id, current_party.merged_into_party_id
      from party_resolution resolution
      join party current_party on current_party.id = resolution.resolved_id
      where current_party.merged_into_party_id is not null
    ), canonical_party as (
      select resolution.origin_id, resolution.resolved_id as canonical_id
      from party_resolution resolution
      join party canonical on canonical.id = resolution.resolved_id
      where canonical.merged_into_party_id is null
    )
    select
      p.id as policy_id,
      p.policy_number,
      p.renewed_from_policy_id,
      i.id as insurer_id,
      i.canonical_name as insurer_name,
      holder.id as holder_party_id,
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
        where dl.resource_type = 'POLICY' and dl.resource_id = p.id) as document_count,
      (select count(*)::int from policy_document_reference pdr
        where pdr.policy_id = p.id) as document_reference_count,
      (select count(*)::int
        from policy_document_reference pdr
        join external_reference er on er.id = pdr.external_reference_id
        where pdr.policy_id = p.id and er.resolution_status = 'UNRESOLVED'
      ) as unresolved_reference_count,
      coalesce((
        select array_agg(er.unresolved_reason order by er.id)
          filter (where er.unresolved_reason is not null)
        from policy_document_reference pdr
        join external_reference er on er.id = pdr.external_reference_id
        where pdr.policy_id = p.id and er.resolution_status = 'UNRESOLVED'
      ), array[]::text[]) as unresolved_reasons
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
    left join canonical_party resolved_holder on resolved_holder.origin_id = pv.holder_party_id
    left join party holder on holder.id = resolved_holder.canonical_id
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

  const [historyRows, documentRows, externalReferenceRows] = await Promise.all([
    sql<HistoryRow[]>`
      with recursive party_resolution (origin_id, resolved_id) as (
        select id, id from party
        union all
        select resolution.origin_id, current_party.merged_into_party_id
        from party_resolution resolution
        join party current_party on current_party.id = resolution.resolved_id
        where current_party.merged_into_party_id is not null
      ), canonical_party as (
        select resolution.origin_id, resolution.resolved_id as canonical_id
        from party_resolution resolution
        join party canonical on canonical.id = resolution.resolved_id
        where canonical.merged_into_party_id is null
      )
      select
        pv.id,
        pv.version_number,
        pv.effective_from,
        pv.effective_to,
        pv.term_start_date,
        pv.term_end_date,
        pv.status,
        holder.id as holder_party_id,
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
      join canonical_party resolved_holder on resolved_holder.origin_id = pv.holder_party_id
      join party holder on holder.id = resolved_holder.canonical_id
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
    sql<ExternalDocumentReferenceRow[]>`
      select
        er.id,
        er.source_system,
        er.source_entity_type,
        er.source_external_id,
        er.source_value,
        er.resolution_status,
        er.unresolved_reason,
        er.resolved_target_type,
        er.resolved_target_id
      from policy_document_reference pdr
      join external_reference er on er.id = pdr.external_reference_id
      where pdr.policy_id = ${policyId}
      order by er.created_at, er.id
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
    documentReferences: externalReferenceRows.map((row) => ({
      id: row.id,
      sourceSystem: row.source_system,
      sourceEntityType: row.source_entity_type,
      sourceExternalId: row.source_external_id,
      sourceValue: row.source_value,
      resolutionStatus: row.resolution_status,
      unresolvedReason: row.unresolved_reason,
      resolvedTargetType: row.resolved_target_type,
      resolvedTargetId: row.resolved_target_id,
    })),
  }
}

const policiesForParty = async (
  sql: QueryExecutor,
  partyId: string,
  asOf: string,
): Promise<PolicyCandidate[]> => {
  const rows = await sql<CandidateRow[]>`
    with recursive party_resolution (origin_id, resolved_id) as (
      select id, id from party
      union all
      select resolution.origin_id, current_party.merged_into_party_id
      from party_resolution resolution
      join party current_party on current_party.id = resolution.resolved_id
      where current_party.merged_into_party_id is not null
    ), canonical_party as (
      select resolution.origin_id, resolution.resolved_id as canonical_id
      from party_resolution resolution
      join party canonical on canonical.id = resolution.resolved_id
      where canonical.merged_into_party_id is null
    )
    select
      p.id as policy_id,
      p.policy_number,
      i.id as insurer_id,
      i.canonical_name as insurer_name,
      holder.id as holder_party_id,
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
        where dl.resource_type = 'POLICY' and dl.resource_id = p.id) as document_count,
      (select count(*)::int from policy_document_reference pdr
        where pdr.policy_id = p.id) as document_reference_count,
      (select count(*)::int
        from policy_document_reference pdr
        join external_reference er on er.id = pdr.external_reference_id
        where pdr.policy_id = p.id and er.resolution_status = 'UNRESOLVED'
      ) as unresolved_reference_count,
      coalesce((
        select array_agg(er.unresolved_reason order by er.id)
          filter (where er.unresolved_reason is not null)
        from policy_document_reference pdr
        join external_reference er on er.id = pdr.external_reference_id
        where pdr.policy_id = p.id and er.resolution_status = 'UNRESOLVED'
      ), array[]::text[]) as unresolved_reasons
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
    join canonical_party resolved_holder on resolved_holder.origin_id = pv.holder_party_id
    join party holder on holder.id = resolved_holder.canonical_id
    left join person_profile pp on pp.party_id = holder.id
    left join organization_profile op on op.party_id = holder.id
    where resolved_holder.canonical_id = ${partyId}
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
  membershipAt: string,
): Promise<PartyOverview | null> => {
  const asOf = assertDate(atDate)
  const atInstant = assertZonedInstant(membershipAt)
  const partyRows = await sql<PartyRow[]>`
    with recursive resolution as (
      select id, kind, status, merged_into_party_id
      from party
      where id = ${partyId}
      union all
      select next_party.id, next_party.kind, next_party.status, next_party.merged_into_party_id
      from resolution current_party
      join party next_party on next_party.id = current_party.merged_into_party_id
    )
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
    from resolution resolved
    join party p on p.id = resolved.id
    left join person_profile pp on pp.party_id = p.id
    left join organization_profile op on op.party_id = p.id
    where resolved.merged_into_party_id is null and p.status = 'ACTIVE'
  `
  const party = partyRows[0]
  if (party === undefined) return null
  const canonicalPartyId = party.party_id

  const [policies, organizationRows, contactRows] = await Promise.all([
    policiesForParty(sql, canonicalPartyId, asOf),
    sql<MembershipRow[]>`
      with recursive party_resolution (origin_id, resolved_id) as (
        select id, id from party
        union all
        select resolution.origin_id, current_party.merged_into_party_id
        from party_resolution resolution
        join party current_party on current_party.id = resolution.resolved_id
        where current_party.merged_into_party_id is not null
      ), canonical_party as (
        select resolution.origin_id, resolution.resolved_id as canonical_id
        from party_resolution resolution
        join party canonical on canonical.id = resolution.resolved_id
        where canonical.merged_into_party_id is null
      ), unique_memberships as (
        select distinct on (canonical_organization.canonical_id)
          organization.id as party_id,
          coalesce(op.trade_name, op.legal_name) as display_name,
          membership.kind,
          membership.role_or_position,
          membership.is_primary,
          membership.valid_from,
          membership.id
        from organization_membership membership
        join canonical_party canonical_person
          on canonical_person.origin_id = membership.person_party_id
        join canonical_party canonical_organization
          on canonical_organization.origin_id = membership.organization_party_id
        join party organization on organization.id = canonical_organization.canonical_id
        join organization_profile op on op.party_id = organization.id
        where canonical_person.canonical_id = ${canonicalPartyId}
          and membership.valid_from <= ${atInstant}::timestamptz
          and (membership.valid_to is null or membership.valid_to > ${atInstant}::timestamptz)
        order by canonical_organization.canonical_id, membership.valid_from desc, membership.id
      )
      select party_id, display_name, kind, role_or_position, is_primary
      from unique_memberships
      order by display_name, party_id
    `,
    sql<MembershipRow[]>`
      with recursive party_resolution (origin_id, resolved_id) as (
        select id, id from party
        union all
        select resolution.origin_id, current_party.merged_into_party_id
        from party_resolution resolution
        join party current_party on current_party.id = resolution.resolved_id
        where current_party.merged_into_party_id is not null
      ), canonical_party as (
        select resolution.origin_id, resolution.resolved_id as canonical_id
        from party_resolution resolution
        join party canonical on canonical.id = resolution.resolved_id
        where canonical.merged_into_party_id is null
      ), unique_memberships as (
        select distinct on (canonical_person.canonical_id)
          person.id as party_id,
          concat_ws(' ', pp.first_name, pp.last_name) as display_name,
          membership.kind,
          membership.role_or_position,
          membership.is_primary,
          membership.valid_from,
          membership.id
        from organization_membership membership
        join canonical_party canonical_organization
          on canonical_organization.origin_id = membership.organization_party_id
        join canonical_party canonical_person
          on canonical_person.origin_id = membership.person_party_id
        join party person on person.id = canonical_person.canonical_id
        join person_profile pp on pp.party_id = person.id
        where canonical_organization.canonical_id = ${canonicalPartyId}
          and membership.valid_from <= ${atInstant}::timestamptz
          and (membership.valid_to is null or membership.valid_to > ${atInstant}::timestamptz)
        order by canonical_person.canonical_id, membership.valid_from desc, membership.id
      )
      select party_id, display_name, kind, role_or_position, is_primary
      from unique_memberships
      order by display_name, party_id
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
