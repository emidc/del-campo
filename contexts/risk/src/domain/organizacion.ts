// Lo que Risk OS tiene registrado de una organización, en la forma en que lo leen las vistas
// (T-0030): riesgos, evaluaciones con sus siete factores y su procedencia, acciones con su
// historia de estados, coberturas con sus eventos de póliza, novedades y revisiones
// pendientes. Es todo dato declarado: nada de acá es un derivado (decisión 6a). Los derivados
// los calcula `lectura.ts` con las funciones de `metodologia.ts`, y `vistas.ts` arma las vistas.

import type { Dimension, Factor, Factores, Nivel, Recuperacion, Uncertainty } from './metodologia.ts'
import type { Evaluacion, ReviewStatus, Riesgo, TipoObjeto } from './modelo.ts'

/** Los siete factores, en el orden del vector que muestran todas las vistas (RO01 §3, regla 1). */
export const FACTORES = ['p', 'i_econ', 'i_pers', 'i_cont', 'i_legal', 'v_cont', 'v_rec'] as const
export type NombreFactor = (typeof FACTORES)[number]

export interface FactorRegistrado {
  readonly estado: 'known' | 'unknown' | 'no_aplica'
  readonly valor: Nivel | null
  readonly min: Nivel | null
  readonly max: Nivel | null
  readonly observacion: string | null
  readonly base: string | null
  readonly evidencia: readonly string[] | null
}

export interface Procedencia {
  readonly actor: string
  readonly base: string
  readonly evidencia: readonly string[]
}

/** Una revisión humana (EMI-17). `revisor` es el nombre de la persona de la sesión o el texto del CSV. */
export interface RevisionRegistrada {
  readonly estado: Exclude<ReviewStatus, 'pending'>
  readonly actor: 'human' | 'ai'
  readonly revisor: string
  readonly fecha: string
  readonly origen: 'importacion' | 'sesion'
  readonly registradaEn: string
}

export interface RiesgoRegistrado {
  readonly id: string
  readonly organizacionId: string
  readonly unidadId: string | null
  readonly tipoObjeto: TipoObjeto
  readonly riesgoPadreId: string | null
  readonly miembros: readonly string[]
  readonly titulo: string
  readonly consecuenciaComun: string | null
  readonly idOrigen: string | null
  readonly loteOrigen: string | null
  readonly origen: 'importacion' | 'sesion'
  /** La persona de la sesión que lo registró; `null` si vino de una importación. */
  readonly autor: string | null
  readonly registradoEn: string
}

export interface EvaluacionRegistrada {
  readonly id: string
  readonly riskId: string
  readonly tipo: 'inicial' | 'reevaluacion'
  readonly anteriorId: string | null
  readonly motivo: string | null
  readonly accionId: string | null
  readonly fecha: string
  readonly versionMetodologia: string
  /** El evaluador del CSV, o el nombre de la persona de la sesión. */
  readonly evaluador: string
  readonly procedencia: Procedencia
  readonly riesgoCausa: string | null
  readonly riesgoEvento: string
  readonly riesgoConsecuencia: string | null
  readonly factores: Readonly<Record<NombreFactor, FactorRegistrado>>
  readonly montoBruto: string | null
  readonly moneda: string | null
  readonly uncertainty: Uncertainty
  readonly uncertaintyNota: string | null
  readonly necesidadValidacion: string | null
  readonly motivoNoEvaluable: string | null
  readonly justificacion: string | null
  readonly reglasAplicadas: readonly string[] | null
  readonly idOrigen: string | null
  readonly loteOrigen: string | null
  readonly origen: 'importacion' | 'sesion'
  readonly registradaEn: string
  /** En el orden en que se registraron; la última decide el `review_status`. */
  readonly revisiones: readonly RevisionRegistrada[]
}

export interface EstadoAccionRegistrado {
  readonly estado: 'planificada' | 'en_curso' | 'cumplida' | 'cancelada'
  readonly fechaCumplida: string | null
  readonly evidenciaEjecucion: readonly string[] | null
  readonly efecto: string | null
  readonly efectoNota: string | null
  readonly evaluacionEfectoId: string | null
  readonly origen: 'importacion' | 'sesion'
  readonly autor: string | null
  readonly registradoEn: string
}

export interface AccionRegistrada {
  readonly id: string
  readonly riskId: string
  readonly tipoRegistro: 'accion' | 'decision_tratamiento'
  readonly descripcion: string
  readonly factorObjetivo: readonly string[] | null
  readonly mecanismoCausal: string | null
  readonly cambioEsperado: string | null
  readonly decision: string | null
  readonly fundamento: string | null
  readonly fechaProximaRevision: string | null
  readonly fechaAlta: string
  readonly procedencia: Procedencia
  readonly idOrigen: string | null
  readonly loteOrigen: string | null
  readonly origen: 'importacion' | 'sesion'
  readonly autor: string | null
  readonly registradaEn: string
  /** En el orden en que se registraron; el vigente es el último. Una decisión no tiene. */
  readonly estados: readonly EstadoAccionRegistrado[]
  readonly revisiones: readonly RevisionRegistrada[]
}

export interface EventoRegistrado {
  readonly id: string
  readonly riskId: string
  readonly transferenciaId: string
  readonly tipo: string
  readonly fecha: string
  readonly monto: string | null
  readonly moneda: string | null
  readonly nota: string | null
  readonly procedencia: Procedencia
  readonly idOrigen: string | null
  readonly loteOrigen: string | null
  readonly origen: 'importacion' | 'sesion'
  readonly autor: string | null
  readonly registradoEn: string
}

export interface CoberturaRegistrada {
  readonly id: string
  readonly riskId: string
  readonly polizaRef: string
  readonly cobertura: string
  readonly vigenciaDesde: string
  readonly vigenciaHasta: string
  readonly limite: string | null
  readonly sublimite: string | null
  readonly sublimitesTexto: string | null
  readonly deducible: string | null
  readonly deducibleTexto: string | null
  readonly exclusiones: string | null
  readonly exposicionRetenida: string | null
  readonly exposicionRetenidaNota: string | null
  readonly suficiencia: string
  readonly suficienciaNota: string | null
  readonly moneda: string | null
  readonly procedencia: Procedencia
  readonly uncertainty: Uncertainty
  readonly uncertaintyNota: string | null
  readonly idOrigen: string | null
  readonly loteOrigen: string | null
  readonly origen: 'importacion' | 'sesion'
  readonly autor: string | null
  readonly registradaEn: string
  /** Por fecha del evento. */
  readonly eventos: readonly EventoRegistrado[]
  readonly revisiones: readonly RevisionRegistrada[]
}

export interface NovedadRegistrada {
  readonly id: string
  readonly riskId: string
  readonly accionId: string | null
  readonly transferenciaId: string | null
  readonly tipo: 'comentario' | 'informacion_nueva' | 'cambio_contexto'
  readonly texto: string
  readonly evidencia: readonly string[]
  readonly autor: string
  readonly registradaEn: string
}

export interface CierreRegistrado {
  readonly resultado: 'reevaluacion_aceptada' | 'sin_cambio'
  readonly evaluacionId: string | null
  readonly fundamento: string | null
  readonly cerradaPor: string
  readonly cerradaEn: string
}

export interface RevisionPendienteRegistrada {
  readonly id: string
  readonly riskId: string
  readonly disparador: string
  readonly accionId: string | null
  readonly novedadId: string | null
  readonly versionMetodologia: string | null
  readonly origen: 'importacion' | 'sesion'
  readonly autor: string | null
  readonly abiertaEn: string
  readonly cierre: CierreRegistrado | null
}

/** Una fila de la foto del orden calculado que guarda un reordenamiento (decisión 6a). */
export interface FilaOrdenCalculado {
  readonly riskId: string
  readonly posicion: number
  readonly empate: boolean
  readonly provisional: boolean
  readonly banda: string | null
}

/** Reordenamiento profesional (decisión 5; dossier 15a §6). Lo declara una persona: no es un derivado. */
export interface ReordenamientoRegistrado {
  readonly id: string
  readonly organizacionId: string
  readonly autor: string
  readonly tipo: 'par' | 'posicion' | 'banda'
  readonly riskIdSube: string | null
  readonly riskIdBaja: string | null
  readonly riskId: string | null
  readonly posicionProfesional: number | null
  readonly bandaProfesional: string | null
  readonly ordenCalculado: readonly FilaOrdenCalculado[]
  readonly versionFunciones: string
  readonly causa: string
  readonly fundamento: string
  readonly patron: string
  readonly ordenPrevioId: string | null
  readonly registradoEn: string
  /** Las evaluaciones vigentes con que se calculó el orden (de un padre, la de su hijo prioritario). */
  readonly vigentes: readonly { readonly riskId: string; readonly evaluacionId: string }[]
}

/** Orden y bandas del revisor, registrados antes de ver resultados (decisión 6). */
export interface OrdenPrevioRegistrado {
  readonly id: string
  readonly organizacionId: string
  readonly revisorPersonaId: string
  readonly revisor: string
  readonly materialRef: string
  readonly registradoEn: string
  readonly items: readonly { readonly riskId: string; readonly posicion: number; readonly banda: string | null }[]
}

/** Todo lo registrado de **una** organización: ninguna vista mezcla dos (RO01 §3, regla 4). */
export interface DatosOrganizacion {
  readonly organizacionId: string
  readonly riesgos: readonly RiesgoRegistrado[]
  readonly evaluaciones: readonly EvaluacionRegistrada[]
  readonly acciones: readonly AccionRegistrada[]
  readonly coberturas: readonly CoberturaRegistrada[]
  readonly novedades: readonly NovedadRegistrada[]
  readonly revisionesPendientes: readonly RevisionPendienteRegistrada[]
  readonly reordenamientos: readonly ReordenamientoRegistrado[]
  readonly ordenesPrevios: readonly OrdenPrevioRegistrado[]
}

/** Falla si algún registro es de otra organización: una vista es siempre de una sola. */
export function exigirUnaOrganizacion(d: DatosOrganizacion): void {
  const ajeno = d.riesgos.find((r) => r.organizacionId !== d.organizacionId)
  if (ajeno !== undefined) throw new Error(`${ajeno.id} no es de ${d.organizacionId}: una vista es de una sola organización (§7.1.4)`)
  const ids = new Set(d.riesgos.map((r) => r.id))
  for (const x of [...d.evaluaciones, ...d.acciones, ...d.coberturas, ...d.novedades, ...d.revisionesPendientes]) {
    if (!ids.has(x.riskId)) throw new Error(`${x.id} es de un riesgo que no está en ${d.organizacionId}`)
  }
  for (const x of [...d.reordenamientos, ...d.ordenesPrevios]) {
    if (x.organizacionId !== d.organizacionId) throw new Error(`${x.id} no es de ${d.organizacionId}`)
  }
}

// ── Del registro al modelo de cálculo ────────────────────────────────────────

/** El `review_status` vigente: el de la última revisión humana; sin ninguna, `pending` (EMI-17). */
export function reviewStatusDe(revisiones: readonly RevisionRegistrada[]): ReviewStatus {
  return revisiones.at(-1)?.estado ?? 'pending'
}

function factor(f: FactorRegistrado): Factor<Nivel> {
  return {
    valor: f.estado === 'known' && f.valor !== null ? f.valor : 'unknown',
    ...(f.min === null ? {} : { min: f.min }),
    ...(f.max === null ? {} : { max: f.max }),
  }
}

const DIMENSION_DE: Readonly<Record<Dimension, NombreFactor>> = { econ: 'i_econ', pers: 'i_pers', cont: 'i_cont', legal: 'i_legal' }

/** Los factores de una evaluación, como los leen las funciones de la metodología. */
export function factoresDe(e: EvaluacionRegistrada): Factores {
  const rec = e.factores.v_rec
  const vRec: Factor<Recuperacion> = rec.estado === 'no_aplica' ? { valor: 'no_aplica' } : factor(rec)
  return {
    p: factor(e.factores.p),
    i: {
      econ: factor(e.factores[DIMENSION_DE.econ]),
      pers: factor(e.factores[DIMENSION_DE.pers]),
      cont: factor(e.factores[DIMENSION_DE.cont]),
      legal: factor(e.factores[DIMENSION_DE.legal]),
    },
    vCont: factor(e.factores.v_cont),
    vRec,
  }
}

export function aEvaluacion(e: EvaluacionRegistrada): Evaluacion {
  return {
    id: e.id,
    riskId: e.riskId,
    tipo: e.tipo,
    anteriorId: e.anteriorId,
    factores: factoresDe(e),
    uncertainty: e.uncertainty,
    reviewStatus: reviewStatusDe(e.revisiones),
  }
}

export function aRiesgo(r: RiesgoRegistrado): Riesgo {
  return { id: r.id, organizacionId: r.organizacionId, tipoObjeto: r.tipoObjeto, riesgoPadreId: r.riesgoPadreId, miembros: r.miembros }
}
