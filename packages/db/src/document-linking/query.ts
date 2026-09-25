// T-0017 — lo que T-0018 necesita para "Abrir documento" / "Abrir carpeta del cliente" /
// ausencia (SLICES/VS01.md §2, D-0057). Deliberadamente separado de policy-query.ts: no
// se toca su forma existente (PolicyCandidate/PolicyDetail), evitando disparar R-13
// ("modificar tests existentes") por un campo que hoy sólo necesita T-0018, no T-0016.

import type { Ejecutor } from '../import/db.ts'

export interface DocumentAccess {
  readonly kind: 'FILE'
  readonly url: string
}

export interface ClientFolderAccess {
  readonly kind: 'FOLDER'
  readonly url: string
}

export interface PendingDocumentInfo {
  readonly reason: 'UNVERIFIED' | 'AMBIGUOUS' | 'INACCESSIBLE' | 'NO_REFERENCE'
}

export interface PolicyDocumentAccess {
  readonly policyId: string
  /** "Abrir documento": archivo de la póliza con asociación revisada, o null. */
  readonly document: DocumentAccess | null
  /** "Abrir carpeta del cliente": alternativa sustentada, o null. Nunca sustituye a `document`. */
  readonly clientFolder: ClientFolderAccess | null
  /** Motivo del pendiente documental de la Policy cuando existe una fila PENDING conocida. */
  readonly pending: PendingDocumentInfo | null
}

interface Row {
  readonly policy_id: string
  readonly document_url: string | null
  readonly client_folder_url: string | null
  readonly pending_reason: PendingDocumentInfo['reason'] | null
}

/**
 * Documento / carpeta / ausencia por Policy, para el conjunto consultado. Nunca
 * presenta una carpeta como documento (§65, §74, D-0057): son columnas separadas. La
 * ausencia de fila con `document_url`/`client_folder_url`/`pending_reason` en null
 * indica "sin referencia" (NO_REFERENCE implícito, distinto de la Policy no incluida en
 * `policyIds`), coherente con INV-019: no se infiere inexistencia, sólo se deja de
 * afirmar una relación.
 */
export const getDocumentAccessForPolicies = async (
  sql: Ejecutor,
  policyIds: readonly string[],
): Promise<PolicyDocumentAccess[]> => {
  if (policyIds.length === 0) return []

  const rows = await sql<Row[]>`
    with target_policy as (
      select unnest(${policyIds}::uuid[]) as policy_id
    ),
    -- Las tres CTEs agregan por Policy. Sin agregar, la PK de
    -- policy_document_reference es external_reference_id y no policy_id, así que dos
    -- referencias de la misma Policy devolvían dos filas: el conteo por categoría
    -- llegaba a superar su propio denominador (SLICES/VS01.md §2) y el Map del consumidor
    -- se quedaba en silencio con la última. El cargador de T-0017 ya deja ambiguos los
    -- dos extremos de ese caso; acá la consulta deja de depender de que así sea.
    document as (
      select pdr.policy_id, count(*) as candidatos, min(dl.drive_url) as drive_url
      from policy_document_reference pdr
      join external_reference er on er.id = pdr.external_reference_id
      join document_link dl on dl.id = er.resolved_target_id and dl.resource_type = 'POLICY'
      where er.resolution_status = 'RESOLVED'
      group by pdr.policy_id
    ),
    pending as (
      select pdr.policy_id, min(er.unresolved_reason) as unresolved_reason
      from policy_document_reference pdr
      join external_reference er on er.id = pdr.external_reference_id
      where er.resolution_status = 'UNRESOLVED'
      group by pdr.policy_id
    ),
    client_holder as (
      select distinct on (pv.policy_id) pv.policy_id, pv.holder_party_id
      from policy_version pv
      where pv.policy_id in (select policy_id from target_policy)
      order by pv.policy_id, pv.effective_from desc, pv.version_number desc
    ),
    client_folder as (
      select ch.policy_id, count(*) as candidatos, min(dl.drive_url) as drive_url
      from client_holder ch
      join document_link dl on dl.resource_type = 'PARTY' and dl.resource_id = ch.holder_party_id
      group by ch.policy_id
    )
    select
      tp.policy_id,
      case when document.candidatos = 1 then document.drive_url end as document_url,
      case when client_folder.candidatos = 1 then client_folder.drive_url end as client_folder_url,
      coalesce(
        pending.unresolved_reason,
        -- Varios candidatos no es "el archivo de la póliza": D-0057 reserva "Abrir
        -- documento" para la asociación revisada, y elegir uno sería presentar lo
        -- ambiguo como inequívoco. Queda pendiente, como ya lo deja el cargador.
        case when document.candidatos > 1 or client_folder.candidatos > 1 then 'AMBIGUOUS' end
      ) as pending_reason
    from target_policy tp
    left join document on document.policy_id = tp.policy_id
    left join pending on pending.policy_id = tp.policy_id
    left join client_folder on client_folder.policy_id = tp.policy_id
  `

  return rows.map((row) => ({
    policyId: row.policy_id,
    document: row.document_url === null ? null : { kind: 'FILE', url: row.document_url },
    clientFolder: row.client_folder_url === null ? null : { kind: 'FOLDER', url: row.client_folder_url },
    pending: row.pending_reason === null ? null : { reason: row.pending_reason },
  }))
}

export interface DocumentLinkingCounts {
  readonly denominator: number
  readonly withDocument: number
  readonly withClientFolderOnly: number
  readonly withPending: number
  readonly withoutReference: number
}

/**
 * Conteos por categoría sobre el conjunto consultado (`policyIds`), con denominador
 * explícito — nunca sobre todas las Policies de la base, que podría incluir Policies
 * fuera del lote/lote parcial bajo prueba.
 */
export const countDocumentLinkingCategories = async (
  sql: Ejecutor,
  policyIds: readonly string[],
): Promise<DocumentLinkingCounts> => {
  const access = await getDocumentAccessForPolicies(sql, policyIds)
  let withDocument = 0
  let withClientFolderOnly = 0
  let withPending = 0
  let withoutReference = 0

  for (const entry of access) {
    if (entry.document !== null) {
      withDocument += 1
    } else if (entry.clientFolder !== null) {
      withClientFolderOnly += 1
    } else if (entry.pending !== null) {
      withPending += 1
    } else {
      withoutReference += 1
    }
  }

  return {
    denominator: policyIds.length,
    withDocument,
    withClientFolderOnly,
    withPending,
    withoutReference,
  }
}
