// T-0017 — validación del insumo CSV descrito en las Notes del contrato. Una fila
// inválida se rechaza nombrando fila y columna, nunca el contenido (R-19): el insumo
// real trae URLs e identificadores de clientes, y un mensaje de error no es un lugar
// donde eso deba aparecer.

export const TARGET_KINDS = ['FILE', 'FOLDER'] as const
export type TargetKind = (typeof TARGET_KINDS)[number]

export const LINK_SCOPES = ['POLICY_DOCUMENT', 'CLIENT_FOLDER'] as const
export type LinkScope = (typeof LINK_SCOPES)[number]

export const STATUSES = ['VERIFIED', 'PENDING'] as const
export type Status = (typeof STATUSES)[number]

export const PENDING_REASONS = ['UNVERIFIED', 'AMBIGUOUS', 'INACCESSIBLE', 'NO_REFERENCE'] as const
export type PendingReason = (typeof PENDING_REASONS)[number]

const REQUIRED_COLUMNS = [
  'policy_source_id',
  'target_url',
  'target_kind',
  'link_scope',
  'status',
  'pending_reason',
  'verified_by',
  'verified_at',
  'verified_account',
  'evidence',
] as const

export interface ValidatedRow {
  readonly rowNumber: number
  readonly policySourceId: string
  readonly targetUrl: string
  readonly targetKind: TargetKind
  readonly linkScope: LinkScope
  readonly status: Status
  readonly pendingReason: PendingReason | null
  readonly verifiedBy: string | null
  readonly verifiedAt: string | null
  readonly verifiedAccount: string | null
  readonly evidence: string | null
}

export interface RowError {
  readonly rowNumber: number
  readonly column: string
  readonly reason: string
}

export type RowValidation =
  | { readonly ok: true; readonly row: ValidatedRow }
  | { readonly ok: false; readonly errors: readonly RowError[] }

const blankToNull = (value: string | undefined): string | null => {
  const trimmed = value?.trim()
  return trimmed === undefined || trimmed === '' ? null : trimmed
}

const isZonedInstant = (value: string): boolean => {
  const hasExplicitZone = /(?:Z|[+-]\d{2}:\d{2})$/i.test(value)
  const isIsoDateTime = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/i.test(value)
  return hasExplicitZone && isIsoDateTime && !Number.isNaN(Date.parse(value))
}

/**
 * Valida una fila del CSV de la Notes de T-0017. No consulta la base: sólo forma y
 * consistencia interna de la fila. La resolución de `policy_source_id` contra Policy y
 * la detección de ambigüedad entre filas viven en `load.ts`, porque necesitan el resto
 * del lote y la base.
 */
export const validateRow = (raw: Record<string, string>, rowNumber: number): RowValidation => {
  const errors: RowError[] = []

  for (const column of REQUIRED_COLUMNS) {
    if (!(column in raw)) {
      errors.push({ rowNumber, column, reason: 'columna ausente del CSV' })
    }
  }
  if (errors.length > 0) return { ok: false, errors }

  const policySourceId = blankToNull(raw.policy_source_id)
  if (policySourceId === null) {
    errors.push({ rowNumber, column: 'policy_source_id', reason: 'requerido' })
  }

  const targetUrl = blankToNull(raw.target_url)
  if (targetUrl === null) {
    errors.push({ rowNumber, column: 'target_url', reason: 'requerido' })
  }

  const targetKindRaw = blankToNull(raw.target_kind)
  const targetKind = targetKindRaw !== null && (TARGET_KINDS as readonly string[]).includes(targetKindRaw)
    ? (targetKindRaw as TargetKind)
    : null
  if (targetKind === null) {
    errors.push({ rowNumber, column: 'target_kind', reason: `debe ser uno de ${TARGET_KINDS.join('|')}` })
  }

  const linkScopeRaw = blankToNull(raw.link_scope)
  const linkScope = linkScopeRaw !== null && (LINK_SCOPES as readonly string[]).includes(linkScopeRaw)
    ? (linkScopeRaw as LinkScope)
    : null
  if (linkScope === null) {
    errors.push({ rowNumber, column: 'link_scope', reason: `debe ser uno de ${LINK_SCOPES.join('|')}` })
  }

  const statusRaw = blankToNull(raw.status)
  const status = statusRaw !== null && (STATUSES as readonly string[]).includes(statusRaw)
    ? (statusRaw as Status)
    : null
  if (status === null) {
    errors.push({ rowNumber, column: 'status', reason: `debe ser uno de ${STATUSES.join('|')}` })
  }

  const pendingReasonRaw = blankToNull(raw.pending_reason)
  const pendingReason = pendingReasonRaw !== null && (PENDING_REASONS as readonly string[]).includes(pendingReasonRaw)
    ? (pendingReasonRaw as PendingReason)
    : null
  if (pendingReasonRaw !== null && pendingReason === null) {
    errors.push({ rowNumber, column: 'pending_reason', reason: `debe ser uno de ${PENDING_REASONS.join('|')} o estar vacío` })
  }

  const verifiedBy = blankToNull(raw.verified_by)
  const verifiedAtRaw = blankToNull(raw.verified_at)
  const verifiedAccount = blankToNull(raw.verified_account)
  const evidence = blankToNull(raw.evidence)

  let verifiedAt: string | null = null
  if (verifiedAtRaw !== null) {
    if (!isZonedInstant(verifiedAtRaw)) {
      errors.push({ rowNumber, column: 'verified_at', reason: 'debe ser ISO 8601 con zona' })
    } else {
      verifiedAt = verifiedAtRaw
    }
  }

  // Reglas cruzadas entre columnas — sólo se evalúan si las columnas individuales ya
  // son válidas, para no encadenar un segundo error sobre un valor ya rechazado.
  if (linkScope === 'POLICY_DOCUMENT' && targetKind !== null && targetKind !== 'FILE') {
    errors.push({ rowNumber, column: 'target_kind', reason: 'POLICY_DOCUMENT exige FILE' })
  }

  if (status === 'VERIFIED') {
    if (pendingReasonRaw !== null) {
      errors.push({ rowNumber, column: 'pending_reason', reason: 'debe estar vacío cuando status es VERIFIED' })
    }
    if (verifiedBy === null) errors.push({ rowNumber, column: 'verified_by', reason: 'requerido cuando status es VERIFIED' })
    if (verifiedAtRaw === null) errors.push({ rowNumber, column: 'verified_at', reason: 'requerido cuando status es VERIFIED' })
    if (verifiedAccount === null) errors.push({ rowNumber, column: 'verified_account', reason: 'requerido cuando status es VERIFIED' })
    if (evidence === null) errors.push({ rowNumber, column: 'evidence', reason: 'requerido cuando status es VERIFIED' })
  } else if (status === 'PENDING' && pendingReason === null) {
    errors.push({ rowNumber, column: 'pending_reason', reason: 'requerido cuando status es PENDING' })
  }

  if (errors.length > 0) return { ok: false, errors }

  if (policySourceId === null || targetUrl === null || targetKind === null || linkScope === null || status === null) {
    throw new Error('validateRow: fila sin errores pero con un campo requerido nulo (invariante rota)')
  }

  return {
    ok: true,
    row: {
      rowNumber,
      policySourceId,
      targetUrl,
      targetKind,
      linkScope,
      status,
      pendingReason,
      verifiedBy,
      verifiedAt,
      verifiedAccount,
      evidence,
    },
  }
}
