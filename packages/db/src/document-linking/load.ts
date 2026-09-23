// T-0017 — carga repetible del insumo revisado de conciliación asistida (D-0057).
//
// `document_verification_input` es el registro auditable de la fila del CSV
// (verificador, evidencia, fecha, cuenta); la proyección de dominio usa lo que ya existe
// de D-0054 (external_reference + policy_document_reference) para POLICY_DOCUMENT, y el
// document_link con resource_type = 'PARTY' agregado por 0004 para CLIENT_FOLDER.
//
// Idempotencia: la identidad de una relación cargada es (policy_id, link_scope,
// target_url) — igual a la unique de document_verification_input. Releer el mismo
// insumo hace upsert sobre esa identidad: sin cambios, mismo estado; con un cambio en
// una relación, sólo esa fila (y su proyección de dominio) se actualiza.

import type { Ejecutor } from '../import/db.ts'
import { leerCsv } from '../import/csv.ts'
import type { LinkScope, PendingReason, Status, TargetKind, ValidatedRow } from './csv-row.ts'
import { validateRow } from './csv-row.ts'

export interface LoadError {
  readonly rowNumber: number
  readonly column: string
  readonly reason: string
}

export interface LoadResult {
  readonly batchId: string
  readonly totalRows: number
  readonly loaded: number
  readonly rejected: readonly LoadError[]
  readonly ambiguousPolicyIds: readonly string[]
}

interface ResolvedRow extends ValidatedRow {
  readonly policyId: string
}

const resolvePolicyId = async (sql: Ejecutor, policySourceId: string): Promise<string | null> => {
  const rows = await sql<{ policy_id: string }[]>`
    select distinct policy_id
    from policy_version
    where source_event_type = 'Polizas' and source_event_id = ${policySourceId}
  `
  return rows.length === 1 ? (rows[0]?.policy_id ?? null) : null
}

const mostRecentHolderPartyId = async (sql: Ejecutor, policyId: string): Promise<string | null> => {
  const rows = await sql<{ holder_party_id: string }[]>`
    select holder_party_id
    from policy_version
    where policy_id = ${policyId}
    order by effective_from desc, version_number desc
    limit 1
  `
  return rows[0]?.holder_party_id ?? null
}

/**
 * Más de una fila VERIFIED de link_scope=POLICY_DOCUMENT para la misma Policy es
 * ambigüedad (Notes: "una Policy puede tener a lo sumo un POLICY_DOCUMENT verificado;
 * más de uno es AMBIGUOUS"). Se detecta sobre el lote completo, antes de escribir nada,
 * y convierte esas filas de VERIFIED a PENDING/AMBIGUOUS — nunca elige arbitrariamente
 * cuál de las dos vale.
 */
const withAmbiguityResolved = (rows: readonly ResolvedRow[]): { rows: ResolvedRow[]; ambiguousPolicyIds: string[] } => {
  const verifiedPolicyDocumentByPolicy = new Map<string, ResolvedRow[]>()
  for (const row of rows) {
    if (row.linkScope !== 'POLICY_DOCUMENT' || row.status !== 'VERIFIED') continue
    const group = verifiedPolicyDocumentByPolicy.get(row.policyId) ?? []
    group.push(row)
    verifiedPolicyDocumentByPolicy.set(row.policyId, group)
  }

  const ambiguousPolicyIds = [...verifiedPolicyDocumentByPolicy.entries()]
    .filter(([, group]) => group.length > 1)
    .map(([policyId]) => policyId)
  const ambiguous = new Set(ambiguousPolicyIds)

  const resolved = rows.map((row): ResolvedRow => {
    if (row.linkScope !== 'POLICY_DOCUMENT' || row.status !== 'VERIFIED' || !ambiguous.has(row.policyId)) {
      return row
    }
    return {
      ...row,
      status: 'PENDING',
      pendingReason: 'AMBIGUOUS',
      verifiedBy: null,
      verifiedAt: null,
      verifiedAccount: null,
      evidence: row.evidence,
    }
  })

  return { rows: resolved, ambiguousPolicyIds }
}

interface UpsertedInput {
  readonly id: string
  readonly policyId: string
  readonly linkScope: LinkScope
  readonly targetKind: TargetKind
  readonly targetUrl: string
  readonly status: Status
  readonly pendingReason: PendingReason | null
  readonly verifiedBy: string | null
  readonly verifiedAt: string | null
  readonly verifiedAccount: string | null
  readonly evidence: string | null
}

const upsertInput = async (sql: Ejecutor, batchId: string, row: ResolvedRow): Promise<UpsertedInput> => {
  const rows = await sql<UpsertedInput[]>`
    insert into document_verification_input (
      batch_id, policy_id, source_row_number, target_kind, link_scope, target_url,
      status, pending_reason, verified_by, verified_at, verified_account, evidence
    ) values (
      ${batchId}, ${row.policyId}, ${row.rowNumber}, ${row.targetKind}, ${row.linkScope}, ${row.targetUrl},
      ${row.status}, ${row.pendingReason}, ${row.verifiedBy}, ${row.verifiedAt}, ${row.verifiedAccount}, ${row.evidence}
    )
    on conflict (policy_id, link_scope, target_url) do update set
      batch_id = excluded.batch_id,
      source_row_number = excluded.source_row_number,
      target_kind = excluded.target_kind,
      status = excluded.status,
      pending_reason = excluded.pending_reason,
      verified_by = excluded.verified_by,
      verified_at = excluded.verified_at,
      verified_account = excluded.verified_account,
      evidence = excluded.evidence,
      updated_at = clock_timestamp()
    returning
      id, policy_id as "policyId", link_scope as "linkScope", target_kind as "targetKind",
      target_url as "targetUrl", status, pending_reason as "pendingReason",
      verified_by as "verifiedBy", verified_at as "verifiedAt",
      verified_account as "verifiedAccount", evidence
  `
  const upserted = rows[0]
  if (upserted === undefined) throw new Error('document_verification_input: upsert no devolvió fila')
  return upserted
}

/**
 * Proyecta una relación POLICY_DOCUMENT hacia el dominio (D-0054): siempre una
 * ExternalReference con pertenencia a la Policy; RESOLVED + document_link cuando la
 * relación quedó verificada, UNRESOLVED con el motivo cuando quedó pendiente. Se
 * reconcilia contra la fila anterior por identidad (input.id), nunca duplica.
 */
const projectPolicyDocument = async (sql: Ejecutor, input: UpsertedInput): Promise<void> => {
  const existing = await sql<{ external_reference_id: string; drive_link_id: string | null }[]>`
    select
      pdr.external_reference_id,
      er.resolved_target_id as drive_link_id
    from policy_document_reference pdr
    join external_reference er on er.id = pdr.external_reference_id
    where er.source_system = 'T-0017' and er.source_value = ${input.id}
  `
  const previous = existing[0] ?? null

  if (input.status === 'VERIFIED') {
    let driveLinkId = previous?.drive_link_id ?? null
    if (driveLinkId === null) {
      const [link] = await sql<{ id: string }[]>`
        insert into document_link (resource_type, resource_id, drive_file_id, drive_url, drive_item_type, reconciliation_status)
        values ('POLICY', ${input.policyId}, ${input.targetUrl}, ${input.targetUrl}, ${input.targetKind}, 'SYNCED')
        returning id
      `
      driveLinkId = link?.id ?? null
    } else {
      await sql`
        update document_link
        set drive_file_id = ${input.targetUrl}, drive_url = ${input.targetUrl}, reconciliation_status = 'SYNCED'
        where id = ${driveLinkId}
      `
    }

    if (previous === null) {
      // Ambas sentencias corren en la transacción del llamador (que ya envuelve la
      // carga completa); el trigger deferrable de D-0054 valida la totalidad al final
      // de esa transacción, no hace falta abrir una sub-transacción acá.
      const [reference] = await sql<{ id: string }[]>`
        insert into external_reference (
          source_system, source_entity_type, source_value, relation_type,
          resolution_status, resolved_target_type, resolved_target_id
        ) values (
          'T-0017', 'PolicyDocumentReference', ${input.id}, 'POLICY_DOCUMENT',
          'RESOLVED', 'DRIVE_FILE', ${driveLinkId}
        )
        returning id
      `
      if (reference === undefined) throw new Error('external_reference: insert no devolvió fila')
      await sql`
        insert into policy_document_reference (external_reference_id, policy_id)
        values (${reference.id}, ${input.policyId})
      `
    } else {
      await sql`
        update external_reference
        set resolution_status = 'RESOLVED', unresolved_reason = null,
            resolved_target_type = 'DRIVE_FILE', resolved_target_id = ${driveLinkId}
        where id = ${previous.external_reference_id}
      `
    }
    return
  }

  // PENDING: pertenencia sin resolver. Si antes estaba resuelta, no se puede volver a
  // UNRESOLVED con resolved_target_type/id no nulos (constraint de external_reference);
  // se limpia ese destino, dejando el document_link previo huérfano en Drive-terms sólo
  // en el sentido de que Broker OS deja de ofrecerlo — no se borra, es historia.
  if (previous === null) {
    const [reference] = await sql<{ id: string }[]>`
      insert into external_reference (
        source_system, source_entity_type, source_value, relation_type,
        resolution_status, unresolved_reason
      ) values (
        'T-0017', 'PolicyDocumentReference', ${input.id}, 'POLICY_DOCUMENT',
        'UNRESOLVED', ${input.pendingReason}
      )
      returning id
    `
    if (reference === undefined) throw new Error('external_reference: insert no devolvió fila')
    await sql`
      insert into policy_document_reference (external_reference_id, policy_id)
      values (${reference.id}, ${input.policyId})
    `
  } else {
    await sql`
      update external_reference
      set resolution_status = 'UNRESOLVED', unresolved_reason = ${input.pendingReason},
          resolved_target_type = null, resolved_target_id = null
      where id = ${previous.external_reference_id}
    `
  }
}

/**
 * Proyecta una relación CLIENT_FOLDER hacia el dominio sólo cuando está verificada: es
 * la única forma de este scope que D-0057 ofrece como alternativa sustentada. Un
 * CLIENT_FOLDER pendiente queda únicamente en document_verification_input — no existe
 * hoy un mecanismo de pertenencia de dominio para una referencia documental que no sea
 * POLICY_DOCUMENT (D-0054 lo restringe a propósito); introducir uno es trabajo de una
 * tarea futura si aparece la necesidad, no de este loader.
 */
const projectClientFolder = async (sql: Ejecutor, input: UpsertedInput): Promise<void> => {
  if (input.status !== 'VERIFIED') return

  const clientPartyId = await mostRecentHolderPartyId(sql, input.policyId)
  if (clientPartyId === null) return

  const existing = await sql<{ id: string }[]>`
    select id from document_link
    where resource_type = 'PARTY' and resource_id = ${clientPartyId} and drive_file_id = ${input.targetUrl}
  `
  if (existing[0] !== undefined) {
    await sql`
      update document_link
      set drive_url = ${input.targetUrl}, drive_item_type = ${input.targetKind}, reconciliation_status = 'SYNCED'
      where id = ${existing[0].id}
    `
    return
  }

  await sql`
    insert into document_link (resource_type, resource_id, drive_file_id, drive_url, drive_item_type, reconciliation_status)
    values ('PARTY', ${clientPartyId}, ${input.targetUrl}, ${input.targetUrl}, ${input.targetKind}, 'SYNCED')
  `
}

export const loadDocumentVerificationInput = async (
  sql: Ejecutor,
  batchId: string,
  filePath: string,
): Promise<LoadResult> => {
  const rejected: LoadError[] = []
  const resolved: ResolvedRow[] = []

  let rowNumber = 0
  for await (const raw of leerCsv(filePath)) {
    rowNumber += 1
    const validation = validateRow(raw, rowNumber)
    if (!validation.ok) {
      rejected.push(...validation.errors)
      continue
    }

    const policyId = await resolvePolicyId(sql, validation.row.policySourceId)
    if (policyId === null) {
      rejected.push({
        rowNumber,
        column: 'policy_source_id',
        reason: 'no resuelve a exactamente una Policy en Broker OS',
      })
      continue
    }

    resolved.push({ ...validation.row, policyId })
  }

  const { rows, ambiguousPolicyIds } = withAmbiguityResolved(resolved)

  let loaded = 0
  for (const row of rows) {
    const upserted = await upsertInput(sql, batchId, row)
    if (upserted.linkScope === 'POLICY_DOCUMENT') {
      await projectPolicyDocument(sql, upserted)
    } else {
      await projectClientFolder(sql, upserted)
    }
    loaded += 1
  }

  return { batchId, totalRows: rowNumber, loaded, rejected, ambiguousPolicyIds }
}
