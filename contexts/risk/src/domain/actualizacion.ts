// Reglas de la actualización de Risk OS (T-0031; RO01 §2 «Actualización», «Revisión pendiente» y
// «Revisión humana»; dossier 15a §5; metodología §11; D16, D17, D18 y D22). Funciones puras: los
// casos de uso de `src/application/actualizacion.ts` las consultan antes de escribir, y la
// migración 0004 hace cumplir en la base las mismas reglas que se pueden comprobar fila a fila.
//
// Nada de este archivo calcula ni escribe un factor. Un factor cambia sólo con una evaluación
// nueva que una persona acepta (D18): el cambio esperado de una acción es una hipótesis (D16) y
// un evento de póliza no toca el riesgo (D17).

import type { ReviewStatus } from './modelo.ts'

/** Un pedido que la regla rechaza: el mensaje es para la persona que lo hizo. */
export class RechazoActualizacion extends Error {
  constructor(motivo: string) {
    super(motivo)
    this.name = 'RechazoActualizacion'
  }
}

export function rechazar(motivo: string): never {
  throw new RechazoActualizacion(motivo)
}

// ── Qué abre una revisión pendiente (dossier 15a §5, tabla) ─────────────────

export type Disparador = 'accion_ejecutada' | 'informacion_nueva' | 'cambio_contexto' | 'cambio_version_metodologia'
export const DISPARADORES: readonly Disparador[] = ['accion_ejecutada', 'informacion_nueva', 'cambio_contexto', 'cambio_version_metodologia']

export type EstadoAccion = 'planificada' | 'en_curso' | 'cumplida' | 'cancelada'
export const ESTADOS_ACCION: readonly EstadoAccion[] = ['planificada', 'en_curso', 'cumplida', 'cancelada']

export type TipoNovedad = 'comentario' | 'informacion_nueva' | 'cambio_contexto'
export const TIPOS_NOVEDAD: readonly TipoNovedad[] = ['comentario', 'informacion_nueva', 'cambio_contexto']

/** Un cambio de actividad sobre un riesgo, tal como lo registra Risk OS. */
export type Cambio =
  | { readonly tipo: 'alta_accion' }
  | { readonly tipo: 'estado_accion'; readonly estado: EstadoAccion }
  | { readonly tipo: 'eficacia' }
  | { readonly tipo: 'novedad'; readonly novedad: TipoNovedad }
  | { readonly tipo: 'cobertura' }
  | { readonly tipo: 'evento_poliza' }
  | { readonly tipo: 'revision_humana' }
  | { readonly tipo: 'reevaluacion' }
  | { readonly tipo: 'reordenamiento' }
  | { readonly tipo: 'cambio_version'; readonly marcadoPorRegresion: boolean }
  | { readonly tipo: 'propuesta_ia' }

/**
 * El disparador de la revisión pendiente que abre un cambio, o `null` si no abre ninguna.
 * Abren solas: una acción que pasa a `cumplida`, una novedad de información nueva o de cambio
 * de contexto y, sólo donde la regresión dice que el resultado podría cambiar, una versión nueva
 * de la metodología. No abren: una acción creada, planificada, en curso o cancelada, su eficacia,
 * un comentario, una cobertura, un evento de póliza, una revisión humana, una reevaluación, un
 * reordenamiento ni una propuesta de IA.
 */
export function abreRevision(c: Cambio): Disparador | null {
  switch (c.tipo) {
    case 'estado_accion':
      return c.estado === 'cumplida' ? 'accion_ejecutada' : null
    case 'novedad':
      return c.novedad === 'comentario' ? null : c.novedad
    case 'cambio_version':
      return c.marcadoPorRegresion ? 'cambio_version_metodologia' : null
    case 'alta_accion':
    case 'eficacia':
    case 'cobertura':
    case 'evento_poliza':
    case 'revision_humana':
    case 'reevaluacion':
    case 'reordenamiento':
    case 'propuesta_ia':
      return null
  }
}

// ── Qué la cierra ───────────────────────────────────────────────────────────

export type Motivo = 'accion_ejecutada' | 'informacion_nueva' | 'correccion_evaluacion' | 'cambio_contexto' | 'cambio_version_metodologia'
export const MOTIVOS: readonly Motivo[] = ['accion_ejecutada', 'informacion_nueva', 'correccion_evaluacion', 'cambio_contexto', 'cambio_version_metodologia']

/** Los motivos de reevaluación que responden a un disparador (dossier 15a §5; la misma tabla que `risk.motivo_cierra`). */
export const MOTIVOS_QUE_CIERRAN: Readonly<Record<Disparador, readonly Motivo[]>> = {
  accion_ejecutada: ['accion_ejecutada'],
  informacion_nueva: ['informacion_nueva', 'correccion_evaluacion'],
  cambio_contexto: ['cambio_contexto'],
  cambio_version_metodologia: ['cambio_version_metodologia'],
}

export const motivoCierra = (d: Disparador, m: string): boolean => (MOTIVOS_QUE_CIERRAN[d] as readonly string[]).includes(m)

/** Lo que hace falta saber de una reevaluación para decidir si cierra una revisión. */
export interface ReevaluacionCandidata {
  readonly tipo: 'inicial' | 'reevaluacion'
  readonly motivo: string | null
  readonly accionId: string | null
  readonly registradaEn: string
  readonly reviewStatus: ReviewStatus
}

export interface RevisionAbierta {
  readonly disparador: Disparador
  readonly accionId: string | null
  readonly abiertaEn: string
}

/**
 * Por qué una evaluación no puede cerrar una revisión con «reevaluación aceptada», o `null` si
 * puede (sin contar su aceptación, que el cierre agrega si falta). Tiene que ser una reevaluación
 * del motivo del disparador (de la misma acción, si el disparador es una), registrada después de
 * la apertura y no rechazada ni devuelta: una reevaluación `rejected` o `needs_revision` deja la
 * revisión abierta.
 */
export function porQueNoCierra(r: RevisionAbierta, e: ReevaluacionCandidata): string | null {
  if (e.tipo !== 'reevaluacion') return 'una evaluación inicial no cierra una revisión'
  if (e.motivo === null || !motivoCierra(r.disparador, e.motivo)) {
    return `una reevaluación por ${e.motivo ?? 'motivo sin registrar'} no responde a una revisión abierta por ${r.disparador}`
  }
  if (r.disparador === 'accion_ejecutada' && e.accionId !== r.accionId) return 'la reevaluación es de otra acción'
  if (e.registradaEn < r.abiertaEn) return 'la reevaluación es anterior a la apertura de la revisión'
  if (e.reviewStatus === 'rejected' || e.reviewStatus === 'needs_revision') {
    return `la reevaluación está ${e.reviewStatus}: la revisión sigue abierta`
  }
  return null
}

/** Un «sin cambio» siempre trae fundamento (dossier 15a §5): no se crea evaluación porque el riesgo no cambió. */
export function exigirFundamento(fundamento: string): string {
  const f = fundamento.trim()
  if (f === '') rechazar('un «sin cambio» necesita su fundamento')
  return f
}

// ── Revisión humana (EMI-17, decisión 4a) ───────────────────────────────────

export type EstadoRevisionHumana = Exclude<ReviewStatus, 'pending'>
export const ESTADOS_REVISION: readonly EstadoRevisionHumana[] = ['accepted', 'needs_revision', 'rejected']

/** Sólo una persona deja algo en `accepted`; lo que revisa una IA no lo acepta (EMI-17). */
export function exigirRevisor(actor: 'human' | 'ai', estado: EstadoRevisionHumana): void {
  if (estado === 'accepted' && actor !== 'human') rechazar('sólo una persona deja algo en accepted (EMI-17)')
}

// ── Estado de una acción (metodología §11.2; la misma regla que `risk.accion_estado_transicion`) ──

/** Por qué no se puede pasar del estado vigente al nuevo, o `null` si se puede. */
export function porQueNoCambia(vigente: EstadoAccion | null, nuevo: EstadoAccion): string | null {
  if (vigente === 'cancelada') return 'la acción está cancelada; ese estado es final'
  if (vigente === 'cumplida') return 'la acción ya está cumplida; sólo se le puede registrar la eficacia'
  if (vigente === nuevo) return `la acción ya está ${nuevo.replace('_', ' ')}`
  return null
}

// ── Textos y referencias ────────────────────────────────────────────────────

/** Un texto obligatorio, sin espacios sobrantes. */
export function exigirTexto(valor: string | null | undefined, que: string): string {
  const v = (valor ?? '').trim()
  if (v === '') rechazar(`falta ${que}`)
  return v
}

/** Un texto opcional: vacío es `null`. */
export const opcional = (valor: string | null | undefined): string | null => {
  const v = (valor ?? '').trim()
  return v === '' ? null : v
}

/**
 * Referencias de evidencia separadas por `;` o por renglón (como en los CSV, EMI-17): al menos
 * una, o `sin_evidencia` sola.
 */
export function referencias(texto: string, que = 'la evidencia'): string[] {
  const refs = texto.split(/[;\n]/).map((r) => r.trim()).filter((r) => r !== '')
  if (refs.length === 0) rechazar(`falta ${que}: al menos una referencia, o sin_evidencia`)
  if (refs.length > 1 && refs.includes('sin_evidencia')) rechazar(`${que}: sin_evidencia va sola`)
  return refs
}

/** Evidencia de ejecución de una acción cumplida: al menos una referencia real (D25, RV-ACC-06). */
export function evidenciaDeEjecucion(texto: string): string[] {
  const refs = referencias(texto, 'la evidencia de ejecución')
  if (refs.includes('sin_evidencia')) rechazar('una acción cumplida es ejecución verificada: necesita evidencia (D25)')
  return refs
}

/** AAAA-MM-DD, una fecha que existe. */
export function fecha(valor: string, que: string): string {
  const v = valor.trim()
  const d = /^\d{4}-\d{2}-\d{2}$/.test(v) ? new Date(`${v}T00:00:00Z`) : null
  if (d === null || Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== v) rechazar(`${que}: se espera una fecha AAAA-MM-DD`)
  return v
}
