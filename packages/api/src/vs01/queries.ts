// Casos de uso de lectura de VS01. Componen las consultas de T-0016 (`policy-query.ts`)
// y T-0017 (`document-linking/query.ts`) sin redefinirlas (D-0058).
//
// Todos reciben un `Principal` como primer parámetro. No lo usan para filtrar —VS01 es de
// un único tipo de principal y no tiene permisos por cartera (D-0022 sigue abierta)— sino
// para que sea imposible escribir una consulta de datos sin haber pasado por el guard.
// Un parámetro que no se usa sería ruido en cualquier otro lado; acá es la frontera.

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
  _principal: Principal,
  criteria: PolicySearchCriteria,
): Promise<SearchOutcome> => {
  const executor = sql()
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
  _principal: Principal,
  policyId: string,
  asOf: string,
): Promise<PolicyView | null> => {
  const executor = sql()
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
  _principal: Principal,
  partyId: string,
  asOf: string,
  membershipAt: string,
): Promise<PartyOverview | null> => getPartyOverview(sql(), partyId, asOf, membershipAt)
