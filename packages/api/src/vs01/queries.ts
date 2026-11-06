// Casos de uso de lectura de VS01. Componen las consultas de T-0016 (`policy-query.ts`)
// y T-0017 (`document-linking/query.ts`) sin redefinirlas (D-0058).
//
// Todos reciben un `Principal` como primer parámetro, para que sea imposible escribir una
// consulta de datos sin haber pasado por el guard. Y todos corren por `conDatos`, como
// `broker_app` con el principal declarado, donde filtran las políticas RLS de D-0022 y
// D-0027 (T-0035).

import type {
  PartyOverview,
  PolicyCandidate,
  PolicyDetail,
  PolicyDocumentAccess,
  PolicySearchCriteria,
  PolicySearchResult,
} from '@del-campo/db'
import {
  countDocumentLinkingCategories,
  getDocumentAccessForPolicies,
  getPartyOverview,
  getPolicyDetail,
  searchPolicies,
} from '@del-campo/db'

import type { Ejecutor } from '../acceso/datos.ts'
import { conDatos } from '../acceso/datos.ts'
import { sql } from '../db.ts'
import type { Principal } from '../session/admission.ts'

export type { PolicyCandidate, PolicyDetail, PolicyDocumentAccess, PolicySearchCriteria }

/** Conteos documentales sobre el conjunto consultado, con el denominador a la vista (§2). */
export interface DocumentTally {
  readonly denominator: number
  readonly withDocument: number
  readonly withClientFolderOnly: number
  readonly withPending: number
  readonly withoutReference: number
  /** Subconjuntos de los dos primeros: cobertura que viene de Zoho y nadie comprobó (D-0064). */
  readonly withZohoDocument: number
  readonly withZohoClientFolderOnly: number
}

export interface SearchOutcome {
  /** `NO_RESULTS` y `CANDIDATES` son estados distintos y visibles, nunca una lista vacía. */
  readonly state: 'NO_RESULTS' | 'CANDIDATES'
  readonly candidates: readonly PolicyCandidate[]
  /**
   * Con más de un candidato la selección es explícita: `SLICES/VS01.md` §2 prohíbe
   * presentar un candidato ambiguo como coincidencia inequívoca.
   */
  readonly ambiguous: boolean
  readonly documentAccess: ReadonlyMap<string, PolicyDocumentAccess>
  readonly tally: DocumentTally
}

const accessByPolicy = (
  entries: readonly PolicyDocumentAccess[],
): ReadonlyMap<string, PolicyDocumentAccess> =>
  new Map(entries.map((entry) => [entry.policyId, entry]))

export const search = async (
  principal: Principal,
  criteria: PolicySearchCriteria,
): Promise<SearchOutcome> => conDatos(sql(), principal, (executor) => buscar(executor, criteria))

const buscar = async (executor: Ejecutor, criteria: PolicySearchCriteria): Promise<SearchOutcome> => {
  const result: PolicySearchResult = await searchPolicies(executor, criteria)
  const policyIds = result.candidates.map((candidate) => candidate.policyId)
  const [access, tally] = await Promise.all([
    getDocumentAccessForPolicies(executor, policyIds),
    countDocumentLinkingCategories(executor, policyIds),
  ])

  return {
    state: result.state,
    candidates: result.candidates,
    ambiguous: result.candidates.length > 1,
    documentAccess: accessByPolicy(access),
    tally,
  }
}

export interface PolicyView {
  readonly detail: PolicyDetail
  readonly access: PolicyDocumentAccess
}

export const policy = async (
  principal: Principal,
  policyId: string,
  asOf: string,
): Promise<PolicyView | null> => conDatos(sql(), principal, (executor) => verPoliza(executor, policyId, asOf))

const verPoliza = async (executor: Ejecutor, policyId: string, asOf: string): Promise<PolicyView | null> => {
  const detail = await getPolicyDetail(executor, policyId, asOf)
  if (detail === null) return null
  const [access] = await getDocumentAccessForPolicies(executor, [policyId])
  return {
    detail,
    // Sin fila devuelta no hay referencia conocida: la ausencia se muestra, no se
    // interpreta como inexistencia (INV-019, D-0057).
    access: access ?? { policyId, document: null, clientFolder: null, pending: null },
  }
}

export const party = async (
  principal: Principal,
  partyId: string,
  asOf: string,
  membershipAt: string,
): Promise<PartyOverview | null> =>
  conDatos(sql(), principal, (executor) => getPartyOverview(executor, partyId, asOf, membershipAt))
