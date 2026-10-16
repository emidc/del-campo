// Formularios de la actualización (T-0031). Cada uno es un POST a un endpoint detrás de
// `withSesion`, que llama a un caso de uso de `@del-campo/risk` y vuelve a la página con un aviso.
// El autor de lo que se registra es siempre la persona de la sesión: ningún formulario tiene un
// campo de autor, de actor ni de revisor (decisión 2 del owner).
//
// Ningún formulario escribe un factor por su cuenta: la reevaluación la carga una persona con los
// niveles que decidió, y queda `pending` hasta que alguien la acepta (D18). El cambio esperado de
// una acción no se copia a ningún factor (D16).

import type { ReactElement, ReactNode } from 'react'

import {
  BASES, CAUSAS_REORDENAMIENTO, ESTADOS_ACCION, ESTADOS_REVISION, FACTORES, MOTIVOS, PATRONES_REORDENAMIENTO, SUFICIENCIAS, TIPOS_EVENTO,
  TIPOS_NOVEDAD, UNCERTAINTY, type AccionVista, type CoberturaVista, type EvaluacionDetalle, type NombreFactor, type RevisionPendienteVista,
} from '@del-campo/risk'

import { corto, h, NOMBRE_FACTOR } from './comun.ts'

type Opcion = readonly [valor: string, texto: string]

const opciones = (xs: readonly string[]): Opcion[] => xs.map((x) => [x, x.replaceAll('_', ' ')])

export const entrada = (etiqueta: string, name: string, p: { type?: string; value?: string | number | null; required?: boolean; placeholder?: string; min?: number; max?: number } = {}): ReactElement =>
  h('label', null, h('span', null, etiqueta), h('input', {
    name, type: p.type ?? 'text', defaultValue: p.value ?? undefined, required: p.required ?? false, placeholder: p.placeholder, min: p.min, max: p.max,
  }))

export const area = (etiqueta: string, name: string, p: { value?: string | null; required?: boolean; placeholder?: string } = {}): ReactElement =>
  h('label', null, h('span', null, etiqueta), h('textarea', { name, defaultValue: p.value ?? undefined, required: p.required ?? false, placeholder: p.placeholder, rows: 2 }))

export const seleccion = (etiqueta: string, name: string, xs: readonly Opcion[], elegido?: string | null, p: { vacio?: string } = {}): ReactElement =>
  h('label', null, h('span', null, etiqueta), h('select', { name, defaultValue: elegido ?? (p.vacio === undefined ? undefined : '') },
    ...(p.vacio === undefined ? [] : [h('option', { value: '' }, p.vacio)]),
    ...xs.map(([v, t]) => h('option', { value: v }, t))))

/** Un formulario de una operación: va al endpoint con `op` y la página a la que vuelve. */
export const formulario = (accion: string, op: string, volver: string, titulo: string, boton: string, ...campos: ReactNode[]): ReactElement =>
  h('details', { className: 'formulario', 'data-formulario': op },
    h('summary', null, titulo),
    h('form', { method: 'post', action: accion },
      h('input', { type: 'hidden', name: 'op', value: op }),
      h('input', { type: 'hidden', name: 'volver', value: volver }),
      ...campos,
      h('button', { type: 'submit' }, boton)))

const destinoRiesgo = (riskId: string): string => `/api/r/${riskId}/actualizar`

const EVIDENCIA_AYUDA = 'referencias separadas por ; o sin_evidencia'

// ── Revisión humana ──────────────────────────────────────────────────────────

/** Revisar una evaluación, una acción o una cobertura. Revisa la persona de la sesión. */
export const formRevisar = (riskId: string, objeto: 'evaluacion' | 'accion' | 'transferencia', id: string, volver: string): ReactElement =>
  formulario(destinoRiesgo(riskId), 'revisar', volver, 'Revisar', 'Registrar revisión',
    h('input', { type: 'hidden', name: 'objeto', value: objeto }),
    h('input', { type: 'hidden', name: 'id', value: id }),
    seleccion('Estado', 'estado', opciones(ESTADOS_REVISION), 'accepted'))

// ── Acciones ─────────────────────────────────────────────────────────────────

export const formEstadoAccion = (a: AccionVista, volver: string): ReactElement | null => {
  if (a.tipoRegistro !== 'accion' || a.estado === 'cancelada' || a.estado === 'cumplida') return null
  return formulario(destinoRiesgo(a.riskId), 'estado', volver, 'Cambiar el estado', 'Registrar el cambio',
    h('input', { type: 'hidden', name: 'accion', value: a.id }),
    seleccion('Nuevo estado', 'estado', opciones(ESTADOS_ACCION.filter((e) => e !== a.estado))),
    entrada('Fecha de cumplimiento (si pasa a cumplida)', 'fecha_cumplida', { type: 'date' }),
    entrada('Evidencia (de ejecución, si pasa a cumplida)', 'evidencia', { required: true, placeholder: EVIDENCIA_AYUDA }),
    area('Comentario', 'comentario', { required: true, placeholder: 'qué pasó y por qué cambia' }),
    h('p', { className: 'muted small' }, 'Si pasa a cumplida, se abre una revisión pendiente del riesgo. Planificar, poner en curso o cancelar no abre nada.'))
}

/** La eficacia, con la reevaluación por acción ejecutada de esta acción que la midió. */
export const formEficacia = (a: AccionVista, reevaluaciones: readonly { readonly id: string; readonly fecha: string; readonly accionId: string | null; readonly motivo: string | null }[], volver: string): ReactElement | null => {
  if (a.estado !== 'cumplida' || a.eficacia !== null) return null
  const propias = reevaluaciones.filter((e) => e.motivo === 'accion_ejecutada' && e.accionId === a.id)
  if (propias.length === 0) return h('p', { className: 'muted small' }, 'La eficacia se registra con la reevaluación por acción ejecutada de esta acción: todavía no hay ninguna.')
  return formulario(destinoRiesgo(a.riskId), 'eficacia', volver, 'Registrar la eficacia', 'Registrar la eficacia',
    h('input', { type: 'hidden', name: 'accion', value: a.id }),
    seleccion('Efecto', 'efecto', opciones(['efecto_total', 'efecto_parcial', 'sin_efecto_medible'])),
    seleccion('Reevaluación que lo midió', 'evaluacion', propias.map((e) => [e.id, `${corto(e.id)} del ${e.fecha}`])),
    area('Nota (esperado, obtenido y la brecha)', 'nota'))
}

export const formAltaAccion = (riskId: string, volver: string): ReactElement =>
  formulario(destinoRiesgo(riskId), 'alta_accion', volver, 'Nueva acción o decisión de tratamiento', 'Dar de alta',
    seleccion('Tipo', 'tipo_registro', [['accion', 'acción'], ['decision_tratamiento', 'decisión de tratamiento']]),
    area('Descripción', 'descripcion', { required: true }),
    h('fieldset', null, h('legend', null, 'Si es una acción'),
      h('div', { className: 'checks' }, ...FACTORES.map((f) => h('label', null, h('input', { type: 'checkbox', name: 'factor_objetivo', value: f }), ` ${NOMBRE_FACTOR[f]}`))),
      area('Mecanismo causal', 'mecanismo_causal'),
      entrada('Cambio esperado (hipótesis, no cambia ningún factor)', 'cambio_esperado', { placeholder: 'p 3→2' }),
      seleccion('Estado inicial', 'estado', [['planificada', 'planificada'], ['en_curso', 'en curso']])),
    h('fieldset', null, h('legend', null, 'Si es una decisión de tratamiento'),
      seleccion('Decisión', 'decision', opciones(['tratar', 'aceptar', 'transferir']), null, { vacio: '—' }),
      area('Fundamento (obligatorio si se acepta)', 'fundamento'),
      entrada('Próxima revisión', 'fecha_proxima_revision', { type: 'date' })),
    entrada('Fecha de alta', 'fecha_alta', { type: 'date', required: true }),
    seleccion('Base', 'base', opciones(BASES), 'reported'),
    entrada('Evidencia', 'evidencia', { required: true, value: 'sin_evidencia', placeholder: EVIDENCIA_AYUDA }))

// ── Novedades ────────────────────────────────────────────────────────────────

export const formNovedad = (riskId: string, destinos: readonly Opcion[], volver: string): ReactElement =>
  formulario(destinoRiesgo(riskId), 'novedad', volver, 'Registrar una novedad', 'Registrar',
    seleccion('Tipo', 'tipo', opciones(TIPOS_NOVEDAD), 'comentario'),
    seleccion('Sobre', 'destino', [['', 'el riesgo'], ...destinos]),
    area('Texto', 'texto', { required: true }),
    entrada('Evidencia', 'evidencia', { required: true, value: 'sin_evidencia', placeholder: EVIDENCIA_AYUDA }),
    h('p', { className: 'muted small' }, 'Una información nueva o un cambio de contexto abren una revisión pendiente; un comentario no.'))

// ── Reevaluación ─────────────────────────────────────────────────────────────

const camposFactor = (f: NombreFactor, base: EvaluacionDetalle | undefined): ReactElement => {
  const x = base?.factores.find((y) => y.factor === f)
  const estados = f === 'v_rec' ? ['known', 'unknown', 'no_aplica'] : ['known', 'unknown']
  return h('tr', { 'data-factor-form': f },
    h('th', { scope: 'row' }, NOMBRE_FACTOR[f]),
    h('td', null, h('select', { name: `${f}_estado`, defaultValue: x?.estado ?? 'known', 'aria-label': `${f} estado` }, ...estados.map((e) => h('option', { value: e }, e)))),
    h('td', null, h('input', { name: `${f}_valor`, type: 'number', min: 1, max: 5, defaultValue: x?.valor ?? undefined, 'aria-label': `${f} valor` })),
    h('td', null, h('input', { name: `${f}_min`, type: 'number', min: 1, max: 5, defaultValue: x?.min ?? undefined, 'aria-label': `${f} mínimo` })),
    h('td', null, h('input', { name: `${f}_max`, type: 'number', min: 1, max: 5, defaultValue: x?.max ?? undefined, 'aria-label': `${f} máximo` })),
    h('td', null, h('input', { name: `${f}_observacion`, defaultValue: x?.observacion ?? undefined, 'aria-label': `${f} observación` })))
}

/**
 * Una reevaluación nueva: apunta a la última de la cadena. Los campos arrancan con los niveles de
 * la evaluación usada para que la persona cambie sólo lo que decidió cambiar; nada se completa
 * desde el cambio esperado de una acción.
 */
export const formReevaluacion = (riskId: string, base: EvaluacionDetalle | undefined, acciones: readonly AccionVista[], volver: string): ReactElement =>
  formulario(destinoRiesgo(riskId), 'reevaluacion', volver, 'Cargar una reevaluación', 'Cargar la reevaluación (queda pending)',
    seleccion('Motivo', 'motivo', opciones(MOTIVOS)),
    seleccion('Acción ejecutada (sólo con ese motivo)', 'accion', acciones.filter((a) => a.estado === 'cumplida').map((a) => [a.id, a.descripcion]), null, { vacio: '—' }),
    entrada('Fecha', 'fecha', { type: 'date', required: true }),
    h('div', { className: 'tabla' }, h('table', null,
      h('thead', null, h('tr', null, h('th', null, 'Factor'), h('th', null, 'Estado'), h('th', null, 'Valor'), h('th', null, 'Mín.'), h('th', null, 'Máx.'), h('th', null, 'Observación'))),
      h('tbody', null, ...FACTORES.map((f) => camposFactor(f, base))))),
    area('Causa', 'riesgo_causa', { value: base?.riesgoCausa ?? null }),
    area('Evento', 'riesgo_evento', { value: base?.riesgoEvento ?? null, required: true }),
    area('Consecuencia', 'riesgo_consecuencia', { value: base?.riesgoConsecuencia ?? null }),
    seleccion('Base', 'base', opciones(BASES), base?.procedencia.base ?? 'reported'),
    entrada('Evidencia', 'evidencia', { required: true, placeholder: EVIDENCIA_AYUDA }),
    seleccion('Uncertainty', 'uncertainty', opciones(UNCERTAINTY), base?.uncertainty ?? 'medium'),
    area('Nota de uncertainty (si no es low)', 'uncertainty_nota', { value: base?.uncertaintyNota ?? null }),
    area('Necesidad de validación (si hay un unknown)', 'necesidad_validacion', { value: base?.necesidadValidacion ?? null }),
    area('Justificación', 'justificacion'),
    entrada('Monto bruto (I econ.)', 'monto_bruto', { value: base?.montoBruto ?? null }),
    entrada('Moneda', 'moneda', { value: base?.moneda ?? null, placeholder: 'USD' }))

// ── Cierre de una revisión pendiente ─────────────────────────────────────────

export const formCerrar = (riskId: string, p: RevisionPendienteVista, reevaluaciones: readonly EvaluacionDetalle[], volver: string): ReactElement[] => {
  const candidatas = reevaluaciones.filter((e) => e.tipo === 'reevaluacion' && e.registradaEn >= p.abiertaEn && e.reviewStatus !== 'rejected' && e.reviewStatus !== 'needs_revision')
  return [
    candidatas.length === 0
      ? h('p', { className: 'muted small' }, 'Para cerrarla con una reevaluación, cargá una nueva con el motivo que responde a esta revisión.')
      : formulario(destinoRiesgo(riskId), 'cerrar', volver, 'Cerrar con una reevaluación aceptada', 'Aceptar la reevaluación y cerrar',
        h('input', { type: 'hidden', name: 'revision', value: p.id }),
        seleccion('Reevaluación', 'evaluacion', candidatas.map((e) => [e.id, `${corto(e.id)} · ${e.motivo ?? ''} · ${e.fecha} · ${e.reviewStatus}`])),
        h('p', { className: 'muted small' }, 'Si la reevaluación todavía no está aceptada, la aceptás en el mismo paso.')),
    formulario(destinoRiesgo(riskId), 'sin_cambio', volver, 'Cerrar sin cambio', 'Cerrar sin cambio',
      h('input', { type: 'hidden', name: 'revision', value: p.id }),
      area('Fundamento', 'fundamento', { required: true, placeholder: 'por qué el riesgo no cambia' })),
  ]
}

// ── Transferencia ────────────────────────────────────────────────────────────

export const formEvento = (c: CoberturaVista, volver: string): ReactElement =>
  formulario(destinoRiesgo(c.riskId), 'evento', volver, 'Registrar un evento de póliza', 'Registrar el evento',
    h('input', { type: 'hidden', name: 'transferencia', value: c.id }),
    seleccion('Tipo', 'tipo', opciones(TIPOS_EVENTO)),
    entrada('Fecha', 'fecha', { type: 'date', required: true }),
    entrada('Monto (consumo o ampliación)', 'monto'),
    entrada('Moneda', 'moneda', { value: c.moneda }),
    area('Nota', 'nota'),
    seleccion('Base', 'base', opciones(BASES), 'reported'),
    entrada('Evidencia', 'evidencia', { required: true, placeholder: EVIDENCIA_AYUDA }),
    h('p', { className: 'muted small' }, 'Es una observación local de Risk OS (D-0067): no abre revisión ni cambia la criticidad del riesgo (D17).'))

export const formAltaCobertura = (riskId: string, volver: string): ReactElement =>
  formulario(destinoRiesgo(riskId), 'alta_cobertura', volver, 'Nueva cobertura', 'Dar de alta',
    entrada('Póliza (referencia)', 'poliza_ref', { required: true }),
    entrada('Cobertura', 'cobertura', { required: true }),
    entrada('Vigencia desde', 'vigencia_desde', { type: 'date', required: true }),
    entrada('Vigencia hasta', 'vigencia_hasta', { type: 'date', required: true }),
    entrada('Límite', 'limite'), entrada('Sublímite aplicable', 'sublimite'), area('Sublímites (texto)', 'sublimites_texto'),
    entrada('Deducible', 'deducible'), area('Deducible (texto)', 'deducible_texto'), area('Exclusiones', 'exclusiones'),
    entrada('Exposición retenida', 'exposicion_retenida'), area('Nota de la exposición retenida', 'exposicion_retenida_nota'),
    seleccion('Suficiencia', 'suficiencia', opciones(SUFICIENCIAS), 'no_evaluada'), area('Nota de suficiencia', 'suficiencia_nota'),
    entrada('Moneda', 'moneda', { placeholder: 'USD' }),
    seleccion('Base', 'base', opciones(BASES), 'reported'),
    entrada('Evidencia', 'evidencia', { required: true, placeholder: EVIDENCIA_AYUDA }),
    seleccion('Uncertainty', 'uncertainty', opciones(UNCERTAINTY), 'medium'),
    area('Nota de uncertainty (si no es low)', 'uncertainty_nota'))

// ── Reordenamiento profesional ───────────────────────────────────────────────

export const formReordenar = (organizacionId: string, riesgos: readonly Opcion[], volver: string): ReactElement =>
  formulario(`/api/o/${encodeURIComponent(organizacionId)}/reordenar`, 'reordenar', volver, 'Registrar un reordenamiento profesional', 'Registrar',
    seleccion('Tipo', 'tipo', [['par', 'un riesgo sube sobre otro'], ['posicion', 'un riesgo a una posición'], ['banda', 'una banda profesional']]),
    seleccion('Sube (par)', 'sube', riesgos, null, { vacio: '—' }),
    seleccion('Baja (par)', 'baja', riesgos, null, { vacio: '—' }),
    seleccion('Riesgo (posición o banda)', 'riesgo', riesgos, null, { vacio: '—' }),
    entrada('Posición profesional', 'posicion', { type: 'number', min: 1 }),
    seleccion('Banda profesional', 'banda', opciones(['Baja', 'Media', 'Alta', 'Crítica']), null, { vacio: '—' }),
    seleccion('Causa', 'causa', opciones(CAUSAS_REORDENAMIENTO)),
    seleccion('Patrón', 'patron', opciones(PATRONES_REORDENAMIENTO), 'otro'),
    area('Fundamento', 'fundamento', { required: true }),
    h('p', { className: 'muted small' }, 'Se guarda con el orden calculado de ahora y las evaluaciones vigentes. No cambia factores, criticidad ni banda, y no abre revisión.'))
