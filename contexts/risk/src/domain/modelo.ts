// Lo que las funciones de cálculo leen de un riesgo y de sus evaluaciones (dossier 15a §3.4 y
// §4). Es la forma mínima para calcular: identidad del riesgo, la cadena de evaluaciones con sus
// factores y el estado de revisión que decide la vigente (decisión 8a). Lo demás que guarda el
// esquema (procedencia, observaciones, texto) no entra al cálculo y no está acá.

import type { Factores, Uncertainty } from './metodologia.ts'

/** Versión de las funciones de cálculo. La v1 es la única que Risk OS v1 calcula (EMI-43 traerá la v1.1). */
export const VERSION_METODOLOGIA = 'metodologia v1'
export type VersionFunciones = typeof VERSION_METODOLOGIA

/** Falla si una versión de funciones no es una que este código sabe calcular. */
export function exigirVersion(version: string): asserts version is VersionFunciones {
  if (version !== VERSION_METODOLOGIA) throw new Error(`versión de funciones desconocida: "${version}"; sólo se calcula ${VERSION_METODOLOGIA}`)
}

export type TipoObjeto = 'riesgo' | 'padre' | 'sub_riesgo' | 'escenario'

export interface Riesgo {
  readonly id: string
  readonly organizacionId: string
  readonly tipoObjeto: TipoObjeto
  /** Sólo en un `sub_riesgo`. */
  readonly riesgoPadreId: string | null
  /** Sólo en un `escenario`. */
  readonly miembros: readonly string[]
}

/** Revisión humana (EMI-17, decisión 4a). `pending` es "nadie revisó todavía". */
export type ReviewStatus = 'pending' | 'accepted' | 'needs_revision' | 'rejected'

export interface Evaluacion {
  readonly id: string
  readonly riskId: string
  readonly tipo: 'inicial' | 'reevaluacion'
  readonly anteriorId: string | null
  readonly factores: Factores
  readonly uncertainty: Uncertainty
  /** El estado de su última revisión humana. */
  readonly reviewStatus: ReviewStatus
}
