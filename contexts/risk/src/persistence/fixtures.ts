// Filas válidas para los tests de integración del esquema `risk`, todas sintéticas (R-19).
// `base` escribe un juego mínimo de registros relacionados; `fila` arma una fila válida de
// cualquier tabla a partir de ese juego, para que cada caso cambie sólo lo que quiere romper.

import type { TransactionSql } from './database.ts'

let siguiente = 1000

/** Un id con el prefijo de la entidad y 26 caracteres Crockford (RV-ID-01). */
export const nuevoId = (prefijo: string): string => `${prefijo}-${String(siguiente++).padStart(26, '0')}`
const fijo = (prefijo: string, n: number): string => `${prefijo}-${String(n).padStart(26, '0')}`

export const ORG_A = 'ORG-SINTETICA-A'
export const ORG_B = 'ORG-SINTETICA-B'
export const LOTE = 'T-0028/integracion'

/** Los registros de `base`. */
export const B = {
  persona: fijo('PER', 1),
  // `orden_previo` es uno por revisor y empresa, y `persona` ya tiene los dos de la base.
  otraPersona: fijo('PER', 2),
  riesgo: fijo('RSK', 1),
  otroRiesgo: fijo('RSK', 2),
  padre: fijo('RSK', 3),
  subRiesgo: fijo('RSK', 4),
  escenario: fijo('RSK', 5),
  riesgoOrgB: fijo('RSK', 6),
  accion: fijo('ACC', 1),
  decision: fijo('ACC', 2),
  accionOrgB: fijo('ACC', 3),
  inicial: fijo('EVA', 1),
  reevaluacion: fijo('EVA', 2),
  inicialOrgB: fijo('EVA', 3),
  transferencia: fijo('TRF', 1),
  transferenciaOrgB: fijo('TRF', 2),
  evento: fijo('EVT', 1),
  novedad: fijo('NOV', 1),
  comentario: fijo('NOV', 2),
  revisionPorNovedad: fijo('REV', 1),
  revisionPorAccion: fijo('REV', 2),
  ordenPrevio: fijo('OPR', 1),
  ordenPrevioOrgB: fijo('OPR', 2),
  reordenamiento: fijo('ROR', 1),
} as const

export const PERSONA_INEXISTENTE = fijo('PER', 999)

export type Tabla =
  | 'persona' | 'registro_acceso' | 'riesgo' | 'miembro_escenario' | 'accion' | 'evaluacion'
  | 'accion_estado' | 'transferencia' | 'evento_poliza' | 'revision_humana' | 'novedad'
  | 'revision_pendiente' | 'cierre_revision' | 'orden_previo' | 'orden_previo_item'
  | 'reordenamiento' | 'reordenamiento_vigente'

export type Fila = Record<string, unknown>

const FACTORES = ['p', 'i_econ', 'i_pers', 'i_cont', 'i_legal', 'v_cont', 'v_rec'] as const

const factoresConocidos = (): Fila => {
  const f: Fila = {}
  for (const x of FACTORES) {
    f[`${x}_estado`] = 'known'
    f[`${x}_valor`] = 3
  }
  return f
}

const procedencia = { actor: 'human', base: 'observed', evidencia: ['sin_evidencia'] }

const DEFECTOS: Record<Tabla, () => Fila> = {
  persona: () => ({ id: nuevoId('PER'), nombre: 'Persona sintética' }),
  registro_acceso: () => ({ persona_id: B.persona, tipo: 'inicio_sesion' }),
  riesgo: () => ({ id: nuevoId('RSK'), organizacion_id: ORG_A, tipo_objeto: 'riesgo', titulo: 'Riesgo sintético', origen: 'importacion' }),
  miembro_escenario: () => ({ escenario_id: B.escenario, miembro_id: B.riesgo, miembro_tipo: 'riesgo', organizacion_id: ORG_A }),
  accion: () => ({
    id: nuevoId('ACC'), risk_id: B.riesgo, riesgo_tipo: 'riesgo', tipo_registro: 'accion', descripcion: 'Acción sintética',
    factor_objetivo: ['p'], mecanismo_causal: 'Mecanismo sintético', fecha_alta: '2026-10-01', ...procedencia, origen: 'importacion',
  }),
  evaluacion: () => ({
    id: nuevoId('EVA'), risk_id: B.subRiesgo, riesgo_tipo: 'sub_riesgo', tipo_evaluacion: 'inicial', fecha: '2026-10-01',
    version_metodologia: 'metodologia v1', evaluador: 'agente', ...procedencia, riesgo_evento: 'Evento sintético',
    ...factoresConocidos(), uncertainty: 'low', origen: 'importacion',
  }),
  accion_estado: () => ({ accion_id: B.accion, estado: 'planificada', origen: 'importacion' }),
  transferencia: () => ({
    id: nuevoId('TRF'), risk_id: B.riesgo, riesgo_tipo: 'riesgo', poliza_ref: 'POL-SINTETICA', cobertura: 'Cobertura sintética',
    vigencia_desde: '2026-01-01', vigencia_hasta: '2026-12-31', suficiencia: 'suficiente', ...procedencia, uncertainty: 'low',
    origen: 'importacion',
  }),
  evento_poliza: () => ({
    id: nuevoId('EVT'), risk_id: B.riesgo, transferencia_ref: B.transferencia, tipo_evento: 'firma', fecha_evento: '2026-01-01',
    ...procedencia, origen: 'importacion',
  }),
  revision_humana: () => ({
    evaluacion_id: B.inicial, estado: 'accepted', revisado_por_actor: 'human', revisado_por_origen: 'Revisor sintético',
    fecha_revision: '2026-10-02', origen: 'importacion',
  }),
  novedad: () => ({
    id: nuevoId('NOV'), risk_id: B.riesgo, tipo: 'informacion_nueva', texto: 'Novedad sintética', evidencia: ['sin_evidencia'],
    autor_persona_id: B.persona,
  }),
  revision_pendiente: () => ({
    id: nuevoId('REV'), risk_id: B.riesgo, riesgo_tipo: 'riesgo', disparador: 'cambio_version_metodologia',
    version_metodologia: 'metodologia v1', origen: 'importacion',
  }),
  cierre_revision: () => ({ revision_id: B.revisionPorNovedad, risk_id: B.riesgo, resultado: 'sin_cambio', fundamento: 'Sin cambio sintético', cerrada_por: B.persona }),
  orden_previo: () => ({ id: nuevoId('OPR'), organizacion_id: ORG_B, revisor_persona_id: B.otraPersona, material_ref: 'material-ciego-sintetico' }),
  orden_previo_item: () => ({ orden_previo_id: B.ordenPrevio, organizacion_id: ORG_A, risk_id: B.riesgo, posicion: 1, banda: 'Alta' }),
  reordenamiento: () => ({
    id: nuevoId('ROR'), organizacion_id: ORG_A, autor_persona_id: B.persona, tipo: 'par', risk_id_sube: B.riesgo,
    risk_id_baja: B.otroRiesgo, orden_calculado: { posiciones: [B.otroRiesgo, B.riesgo] }, version_funciones: 'metodologia v1',
    causa: 'sin_causa', fundamento: 'Fundamento sintético', patron: 'otro',
  }),
  reordenamiento_vigente: () => ({ reordenamiento_id: B.reordenamiento, organizacion_id: ORG_A, evaluacion_id: B.inicial, risk_id: B.riesgo }),
}

/** Una fila válida de `tabla` sobre los registros de `base`, con `cambios` encima. */
export const fila = (tabla: Tabla, cambios: Fila = {}): Fila => ({ ...DEFECTOS[tabla](), ...cambios })

// Sin sentencias preparadas (`prepare: false`), postgres.js no sabe el tipo de una lista: va como text[].
const TEXT = 25

/** Una fila lista para `tx(...)`: el JSON como jsonb y las listas como text[]. */
export const valores = (tx: TransactionSql, f: Fila): Record<string, never> =>
  Object.fromEntries(
    Object.entries(f).map(([k, v]) => [
      k,
      k === 'orden_calculado' && v !== null ? tx.json(v as never) : Array.isArray(v) ? tx.array(v as string[], TEXT) : v,
    ]),
  ) as Record<string, never>

export const insertar = async (tx: TransactionSql, tabla: Tabla, f: Fila): Promise<void> => {
  await tx`insert into ${tx(`risk.${tabla}`)} ${tx(valores(tx, f))}`
}

/** Escribe el juego de registros de `B`. */
export const base = async (tx: TransactionSql): Promise<void> => {
  const ins = (t: Tabla, c: Fila): Promise<void> => insertar(tx, t, fila(t, c))
  await ins('persona', { id: B.persona })
  await ins('persona', { id: B.otraPersona })
  await ins('riesgo', { id: B.riesgo, lote_origen: LOTE, id_origen: 'S99-R01' })
  await ins('riesgo', { id: B.otroRiesgo })
  await ins('riesgo', { id: B.padre, tipo_objeto: 'padre', consecuencia_comun: 'Consecuencia común sintética' })
  await ins('riesgo', { id: B.subRiesgo, tipo_objeto: 'sub_riesgo', riesgo_padre_id: B.padre })
  await ins('riesgo', { id: B.escenario, tipo_objeto: 'escenario' })
  await ins('riesgo', { id: B.riesgoOrgB, organizacion_id: ORG_B })
  await ins('accion', { id: B.accion, lote_origen: LOTE, id_origen: 'S99-A01' })
  await ins('accion', {
    id: B.decision, tipo_registro: 'decision_tratamiento', factor_objetivo: null, mecanismo_causal: null,
    decision: 'tratar', fecha_proxima_revision: '2027-01-01',
  })
  await ins('accion', { id: B.accionOrgB, risk_id: B.riesgoOrgB })
  await ins('evaluacion', { id: B.inicial, risk_id: B.riesgo, riesgo_tipo: 'riesgo', lote_origen: LOTE, id_origen: 'S99-E01' })
  await ins('evaluacion', {
    id: B.reevaluacion, risk_id: B.riesgo, riesgo_tipo: 'riesgo', tipo_evaluacion: 'reevaluacion',
    evaluacion_anterior_id: B.inicial, motivo: 'accion_ejecutada', accion_id: B.accion,
  })
  await ins('evaluacion', { id: B.inicialOrgB, risk_id: B.riesgoOrgB, riesgo_tipo: 'riesgo' })
  await ins('transferencia', { id: B.transferencia, lote_origen: LOTE, id_origen: 'S99-T01' })
  await ins('transferencia', { id: B.transferenciaOrgB, risk_id: B.riesgoOrgB })
  await ins('evento_poliza', { id: B.evento, lote_origen: LOTE, id_origen: 'S99-EV01' })
  await ins('novedad', { id: B.novedad })
  await ins('novedad', { id: B.comentario, tipo: 'comentario' })
  await ins('revision_pendiente', {
    id: B.revisionPorNovedad, disparador: 'informacion_nueva', novedad_id: B.novedad, version_metodologia: null,
  })
  await ins('revision_pendiente', {
    id: B.revisionPorAccion, disparador: 'accion_ejecutada', accion_id: B.accion, version_metodologia: null,
  })
  await ins('orden_previo', { id: B.ordenPrevio, organizacion_id: ORG_A, revisor_persona_id: B.persona })
  await ins('orden_previo', { id: B.ordenPrevioOrgB, organizacion_id: ORG_B, revisor_persona_id: B.persona })
  await ins('reordenamiento', { id: B.reordenamiento })
}
