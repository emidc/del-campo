// Casos inválidos mínimos de la Fase 15b: un lote base válido y, por cada regla de rechazo del
// contrato, el cambio más chico que la dispara sola. `generar.ts` los escribe en disco; el test
// los valida en memoria y en disco.
//
// El lote base es sintético y chico (una organización): un padre con dos hijos, un riesgo con su
// inicial y una reevaluación por acción ejecutada, otro riesgo, un escenario de los dos, tres
// registros del plan de acción y una cobertura con un evento. No sale de ninguna ficha histórica.

import { idDe } from '../sinteticos/generar.ts'
import { columnas, mensaje, reglas, type Archivo } from '../validador/contrato.ts'
import { escribirCsv } from '../validador/csv.ts'

type Fila = Record<string, string>
export interface Lote { risks: Fila[]; acciones: Fila[]; transferencias: Fila[] }
export const FECHA_CORTE = '2026-10-14'
const LOTE = 'T-0021/15b-invalidos'
const F = '2026-10-01'

const id = (prefijo: string, semilla: string): string => idDe(prefijo, F, `${LOTE}/${semilla}`)
export const ID = {
  org: id('ORG', 'org'),
  P: id('RSK', 'P'), S1: id('RSK', 'S1'), S2: id('RSK', 'S2'), R1: id('RSK', 'R1'), R2: id('RSK', 'R2'), ESC: id('RSK', 'ESC'),
  eS1: id('EVA', 'S1'), eS2: id('EVA', 'S2'), eR1a: id('EVA', 'R1a'), eR1b: id('EVA', 'R1b'), eR2: id('EVA', 'R2'), eESC: id('EVA', 'ESC'),
  eR1c: id('EVA', 'R1c'), eR2b: id('EVA', 'R2b'),
  A1: id('ACC', 'A1'), A2: id('ACC', 'A2'), A3: id('ACC', 'A3'),
  T1: id('TRF', 'T1'), T2: id('TRF', 'T2'), EV1: id('EVT', 'EV1'),
}

const FACTORES: [string, string, string][] = [
  ['p', '3', 'Dos eventos en diez años en la planta propia.'],
  ['i_econ', '3', 'Pérdida plausible de un tercio del resultado operativo.'],
  ['i_pers', '2', 'Lesiones leves posibles durante la reparación.'],
  ['i_cont', '2', 'Dos a cinco días de parada parcial.'],
  ['i_legal', '1', 'Sin consecuencia jurídica.'],
  ['v_cont', '3', 'Detección temprana sin corte automático.'],
  ['v_rec', '3', 'Repuesto en depósito de un proveedor sin contrato.'],
]

function evaluacion(rid: string, tipo: string, titulo: string, eva: string, origen: string, extra: Fila = {}): Fila {
  const f: Fila = {
    risk_id: rid, organizacion_id: ID.org, tipo_objeto: tipo, titulo, id_origen: origen, lote_origen: LOTE,
    evaluacion_id: eva, evaluacion_id_origen: `E-${origen}`, tipo_evaluacion: 'inicial', fecha: F,
    version_metodologia: 'metodologia v1', evaluador: 'agente-15b', actor: 'ai', base: 'observed', evidencia: 'EV-INV-01',
    riesgo_causa: 'Desgaste por uso continuo', riesgo_evento: 'Falla del equipo', riesgo_consecuencia: 'Parada y reparación',
    uncertainty: 'low', justificacion: 'Caso sintético del lote base de los inválidos.', review_status: 'pending',
  }
  for (const [x, v, obs] of FACTORES) Object.assign(f, { [`${x}_estado`]: 'known', [`${x}_valor`]: v, [`${x}_observacion`]: obs })
  return Object.assign(f, extra)
}

export function base(): Lote {
  return {
    risks: [
      { risk_id: ID.P, organizacion_id: ID.org, tipo_objeto: 'padre', titulo: 'Falla de la línea de envasado', id_origen: 'P', lote_origen: LOTE, riesgo_consecuencia: 'Línea de envasado detenida' },
      evaluacion(ID.S1, 'sub_riesgo', 'Falla de la llenadora', ID.eS1, 'S1', { riesgo_padre_id: ID.P }),
      evaluacion(ID.S2, 'sub_riesgo', 'Falla de la tapadora', ID.eS2, 'S2', { riesgo_padre_id: ID.P }),
      evaluacion(ID.R1, 'riesgo', 'Falla del compresor', ID.eR1a, 'R1', { i_econ_monto_bruto: '50000', moneda: 'USD' }),
      evaluacion(ID.R1, 'riesgo', 'Falla del compresor', ID.eR1b, 'R1', {
        evaluacion_id_origen: 'E-R1b', tipo_evaluacion: 'reevaluacion', evaluacion_anterior_id: ID.eR1a, motivo: 'accion_ejecutada',
        accion_id: ID.A1, fecha: '2026-10-10', p_valor: '2', i_econ_monto_bruto: '50000', moneda: 'USD',
      }),
      evaluacion(ID.R2, 'riesgo', 'Corte de energía', ID.eR2, 'R2'),
      evaluacion(ID.ESC, 'escenario', 'Tormenta que corta energía y daña el compresor', ID.eESC, 'ESC', { miembros: `${ID.R1};${ID.R2}` }),
    ],
    acciones: [
      {
        accion_id: ID.A1, risk_id: ID.R1, id_origen: 'A1', lote_origen: LOTE, tipo_registro: 'accion', descripcion: 'Análisis de aceite mensual',
        factor_objetivo: 'p', mecanismo_causal: 'p: detecta el desgaste antes de la falla', cambio_esperado: 'p 3→2', estado: 'cumplida',
        fecha_alta: F, fecha_cumplida: '2026-10-08', evidencia_ejecucion: 'EV-INV-02', efecto: 'efecto_total', evaluacion_efecto_id: ID.eR1b,
        actor: 'ai', base: 'observed', evidencia: 'EV-INV-02', review_status: 'pending',
      },
      {
        accion_id: ID.A2, risk_id: ID.R2, id_origen: 'A2', lote_origen: LOTE, tipo_registro: 'decision_tratamiento', descripcion: 'Aceptar el corte de energía',
        fecha_alta: F, decision: 'aceptar', fundamento: 'El costo del grupo electrógeno supera la pérdida plausible', fecha_proxima_revision: '2027-01-01',
        actor: 'ai', base: 'reported', evidencia: 'EV-INV-03', review_status: 'pending',
      },
      {
        accion_id: ID.A3, risk_id: ID.S1, id_origen: 'A3', lote_origen: LOTE, tipo_registro: 'accion', descripcion: 'Sensor de nivel en la llenadora',
        factor_objetivo: 'v_cont', mecanismo_causal: 'v_cont: corta la llenadora antes del derrame', estado: 'planificada', fecha_alta: F,
        actor: 'ai', base: 'assumed', evidencia: 'sin_evidencia', review_status: 'pending',
      },
    ],
    transferencias: [
      {
        tipo_registro: 'cobertura', transferencia_id: ID.T1, risk_id: ID.R1, id_origen: 'T1', lote_origen: LOTE, poliza_ref: 'POL-INV-1',
        cobertura: 'Rotura de maquinaria', vigencia_desde: '2026-01-01', vigencia_hasta: '2026-12-31', limite_monto: '100000',
        suficiencia: 'no_evaluada', moneda: 'USD', actor: 'ai', base: 'reported', evidencia: 'EV-INV-04', uncertainty: 'low', review_status: 'pending',
      },
      {
        tipo_registro: 'evento', evento_id: ID.EV1, risk_id: ID.R1, transferencia_ref: ID.T1, id_origen: 'EV1', lote_origen: LOTE,
        tipo_evento: 'consumo_limite', fecha_evento: '2026-06-01', monto_evento: '1000', moneda: 'USD', actor: 'ai', base: 'reported', evidencia: 'EV-INV-05',
      },
    ],
  }
}

const NOMBRES: Record<Archivo, keyof Lote> = { 'risks.csv': 'risks', 'action-plan.csv': 'acciones', 'risk-transfer.csv': 'transferencias' }
export function aTexto(l: Lote, archivo: Archivo): string {
  return escribirCsv(columnas(archivo).map((c) => c.nombre), l[NOMBRES[archivo]])
}

export interface Caso {
  readonly regla: string
  readonly archivo: Archivo
  /** Fila del hallazgo (encabezado = 1); null en un hallazgo de archivo. */
  readonly fila: number | null
  readonly que: string
  readonly valores: Record<string, string | number>
  /** Cambio sobre las filas del lote base. */
  readonly filas?: (l: Lote) => void
  /** Cambio sobre el texto de un archivo, para las reglas de estructura. */
  readonly texto?: (t: string) => string
}

const r = (l: Lote, n: number): Fila => { const f = l.risks[n - 2]; if (f === undefined) throw new Error(`risks fila ${n}`); return f }
const a = (l: Lote, n: number): Fila => { const f = l.acciones[n - 2]; if (f === undefined) throw new Error(`acciones fila ${n}`); return f }
const t = (l: Lote, n: number): Fila => { const f = l.transferencias[n - 2]; if (f === undefined) throw new Error(`transferencias fila ${n}`); return f }
const sinEfecto = (l: Lote): void => { Object.assign(a(l, 2), { efecto: '', evaluacion_efecto_id: '' }) }
const unknown = (l: Lote, x: string, extra: Fila = {}): void => { Object.assign(r(l, 7), { [`${x}_estado`]: 'unknown', [`${x}_valor`]: '' }, extra) }

// Filas del lote base: risks P=2, S1=3, S2=4, R1a=5, R1b=6, R2=7, ESC=8; acciones A1=2, A2=3, A3=4; transferencias T1=2, EV1=3.
export const CASOS: Caso[] = [
  { regla: 'RV-ARCH-01', archivo: 'risks.csv', fila: null, que: 'una comilla sin cerrar en la línea 9', valores: { n: 9 }, texto: (x) => `${x}${ID.R2},"sin cerrar\n` },
  { regla: 'RV-ARCH-02', archivo: 'risk-transfer.csv', fila: 3, que: 'el evento trae un campo de más', valores: { n: 3, k: 36, m: 35 }, texto: (x) => x.replace(/\n$/, ',de más\n') },
  { regla: 'RV-ARCH-03', archivo: 'risks.csv', fila: 1, que: 'falta la columna justificacion', valores: { columna: 'justificacion' }, texto: (x) => quitarColumna(x, 'justificacion') },
  { regla: 'RV-ARCH-04', archivo: 'risks.csv', fila: 1, que: 'trae la columna derivada c_raw', valores: { columna: 'c_raw' }, texto: (x) => agregarColumna(x, 'c_raw', '27') },
  { regla: 'RV-ARCH-05', archivo: 'risks.csv', fila: 7, que: 'fecha 2026-13-01', valores: { id: ID.eR2, columna: 'fecha', valor: '2026-13-01', tipo: 'una fecha AAAA-MM-DD' }, filas: (l) => { r(l, 7).fecha = '2026-13-01' } },
  { regla: 'RV-ID-01', archivo: 'action-plan.csv', fila: 4, que: 'accion_id sin ULID', valores: { n: 4, columna: 'accion_id', valor: 'ACC-123', entidad: 'acción' }, filas: (l) => { a(l, 4).accion_id = 'ACC-123' } },
  { regla: 'RV-ID-02', archivo: 'action-plan.csv', fila: 4, que: 'A3 repite el id de A2', valores: { id: ID.A2, n1: 3, n2: 4 }, filas: (l) => { a(l, 4).accion_id = ID.A2 } },
  { regla: 'RV-ID-03', archivo: 'action-plan.csv', fila: 4, que: 'A3 repite el origen de A2', valores: { lote_origen: LOTE, id_origen: 'A2' }, filas: (l) => { a(l, 4).id_origen = 'A2' } },
  { regla: 'RV-RSK-01', archivo: 'risks.csv', fila: 6, que: 'la reevaluación de R1 cambia el título', valores: { risk_id: ID.R1, columna: 'titulo' }, filas: (l) => { r(l, 6).titulo = 'Rotura del compresor' } },
  { regla: 'RV-RSK-02', archivo: 'risks.csv', fila: 4, que: 'sub_riesgo sin padre', valores: { risk_id: ID.S2 }, filas: (l) => { r(l, 4).riesgo_padre_id = '' } },
  { regla: 'RV-RSK-03', archivo: 'risks.csv', fila: 4, que: 'el padre de S2 es un riesgo simple', valores: { risk_id: ID.S2, riesgo_padre_id: ID.R2 }, filas: (l) => { r(l, 4).riesgo_padre_id = ID.R2 } },
  { regla: 'RV-RSK-04', archivo: 'risks.csv', fila: 8, que: 'escenario con un solo miembro', valores: { risk_id: ID.ESC }, filas: (l) => { r(l, 8).miembros = ID.R1 } },
  { regla: 'RV-RSK-05', archivo: 'risks.csv', fila: 8, que: 'un miembro del escenario es el padre', valores: { risk_id: ID.ESC, miembro: ID.P, tipo: 'padre' }, filas: (l) => { r(l, 8).miembros = `${ID.R1};${ID.P}` } },
  { regla: 'RV-RSK-06', archivo: 'risks.csv', fila: 2, que: 'el padre trae p_estado', valores: { risk_id: ID.P, columna: 'p_estado' }, filas: (l) => { r(l, 2).p_estado = 'known' } },
  { regla: 'RV-RSK-07', archivo: 'risks.csv', fila: 9, que: 'el padre repetido en una segunda fila', valores: { risk_id: ID.P }, filas: (l) => { l.risks.push({ ...r(l, 2) }) } },
  { regla: 'RV-RSK-09', archivo: 'risks.csv', fila: 7, que: 'R2 sin evaluacion_id', valores: { risk_id: ID.R2 }, filas: (l) => { r(l, 7).evaluacion_id = '' } },
  { regla: 'RV-EVA-01', archivo: 'risks.csv', fila: 7, que: 'inicial con motivo', valores: { evaluacion_id: ID.eR2, tipo_evaluacion: 'inicial' }, filas: (l) => { r(l, 7).motivo = 'informacion_nueva' } },
  { regla: 'RV-EVA-02', archivo: 'risks.csv', fila: 6, que: 'la anterior es de otro riesgo', valores: { evaluacion_id: ID.eR1b, evaluacion_anterior_id: ID.eR2 }, filas: (l) => { r(l, 6).evaluacion_anterior_id = ID.eR2 } },
  { regla: 'RV-EVA-03', archivo: 'risks.csv', fila: 9, que: 'una segunda inicial de R2', valores: { risk_id: ID.R2, ids: `${ID.eR2}, ${ID.eR2b}` }, filas: (l) => { l.risks.push({ ...r(l, 7), evaluacion_id: ID.eR2b, evaluacion_id_origen: 'E-R2b' }) } },
  { regla: 'RV-EVA-04', archivo: 'risks.csv', fila: 6, que: 'accion_id con motivo correccion_evaluacion (A1 sin eficacia registrada)', valores: { evaluacion_id: ID.eR1b }, filas: (l) => { r(l, 6).motivo = 'correccion_evaluacion'; sinEfecto(l) } },
  { regla: 'RV-EVA-05', archivo: 'risks.csv', fila: 6, que: 'la acción citada es de otro riesgo y no está cumplida (A1 sin eficacia registrada)', valores: { evaluacion_id: ID.eR1b, accion_id: ID.A3 }, filas: (l) => { r(l, 6).accion_id = ID.A3; sinEfecto(l) } },
  { regla: 'RV-EVA-07', archivo: 'risks.csv', fila: 9, que: 'una segunda reevaluación de la inicial de R1', valores: { risk_id: ID.R1, id1: ID.eR1b, id2: ID.eR1c, anterior: ID.eR1a }, filas: (l) => { l.risks.push({ ...r(l, 6), evaluacion_id: ID.eR1c, evaluacion_id_origen: 'E-R1c', motivo: 'informacion_nueva', accion_id: '' }) } },
  { regla: 'RV-EVA-09', archivo: 'risks.csv', fila: 7, que: 'sin riesgo_evento', valores: { evaluacion_id: ID.eR2 }, filas: (l) => { r(l, 7).riesgo_evento = '' } },
  { regla: 'RV-PRO-01', archivo: 'risk-transfer.csv', fila: 2, que: 'base fuera del enum', valores: { id: ID.T1, valor: 'confirmed' }, filas: (l) => { t(l, 2).base = 'confirmed' } },
  { regla: 'RV-PRO-02', archivo: 'action-plan.csv', fila: 3, que: 'evidencia vacía', valores: { id: ID.A2 }, filas: (l) => { a(l, 3).evidencia = '' } },
  { regla: 'RV-PRO-03', archivo: 'risks.csv', fila: 7, que: 'sin_evidencia con una referencia', valores: { id: ID.eR2 }, filas: (l) => { r(l, 7).evidencia = 'EV-INV-01;sin_evidencia' } },
  { regla: 'RV-PRO-04', archivo: 'action-plan.csv', fila: 4, que: 'actor fuera del enum', valores: { id: ID.A3, valor: 'bot' }, filas: (l) => { a(l, 4).actor = 'bot' } },
  { regla: 'RV-PRO-05', archivo: 'risks.csv', fila: 7, que: 'p_base fuera del enum', valores: { evaluacion_id: ID.eR2, f: 'p', valor: 'seguro' }, filas: (l) => { r(l, 7).p_base = 'seguro' } },
  { regla: 'RV-FAC-01', archivo: 'risks.csv', fila: 7, que: 'i_legal_estado vacío', valores: { evaluacion_id: ID.eR2, f: 'i_legal' }, filas: (l) => { r(l, 7).i_legal_estado = '' } },
  { regla: 'RV-FAC-02', archivo: 'risks.csv', fila: 7, que: 'i_legal_valor 7', valores: { evaluacion_id: ID.eR2, f: 'i_legal' }, filas: (l) => { r(l, 7).i_legal_valor = '7' } },
  { regla: 'RV-FAC-03', archivo: 'risks.csv', fila: 7, que: 'no_aplica en p', valores: { evaluacion_id: ID.eR2, f: 'p' }, filas: (l) => { Object.assign(r(l, 7), { p_estado: 'no_aplica', p_valor: '' }) } },
  { regla: 'RV-FAC-04', archivo: 'risks.csv', fila: 7, que: 'p 3 fuera de su rango 4–5', valores: { evaluacion_id: ID.eR2, f: 'p', min: 4, valor: 3, max: 5 }, filas: (l) => { Object.assign(r(l, 7), { p_min: '4', p_max: '5' }) } },
  { regla: 'RV-FAC-05', archivo: 'risks.csv', fila: 7, que: 'i_legal unknown sin nota', valores: { evaluacion_id: ID.eR2, f: 'i_legal' }, filas: (l) => { unknown(l, 'i_legal', { i_legal_observacion: '', necesidad_validacion: 'Confirmar si hay reclamos.' }) } },
  { regla: 'RV-FAC-06', archivo: 'risks.csv', fila: 7, que: 'i_legal unknown sin necesidad_validacion', valores: { evaluacion_id: ID.eR2 }, filas: (l) => { unknown(l, 'i_legal', { i_legal_observacion: 'Falta saber si hay contratos con penalidad.' }) } },
  { regla: 'RV-UNC-01', archivo: 'risk-transfer.csv', fila: 2, que: 'uncertainty fuera del enum', valores: { id: ID.T1 }, filas: (l) => { t(l, 2).uncertainty = 'alta' } },
  { regla: 'RV-UNC-02', archivo: 'risks.csv', fila: 7, que: 'medium sin nota', valores: { id: ID.eR2, valor: 'medium' }, filas: (l) => { r(l, 7).uncertainty = 'medium' } },
  { regla: 'RV-REV-01', archivo: 'action-plan.csv', fila: 4, que: 'review_status fuera del enum', valores: { id: ID.A3, valor: 'aprobado' }, filas: (l) => { a(l, 4).review_status = 'aprobado' } },
  { regla: 'RV-REV-02', archivo: 'risks.csv', fila: 7, que: 'needs_revision sin revisor', valores: { id: ID.eR2 }, filas: (l) => { r(l, 7).review_status = 'needs_revision' } },
  { regla: 'RV-REV-03', archivo: 'risks.csv', fila: 7, que: 'accepted por una IA', valores: { id: ID.eR2, valor: 'ai' }, filas: (l) => { Object.assign(r(l, 7), { review_status: 'accepted', revisado_por: 'otro-agente', revisado_por_actor: 'ai', fecha_revision: '2026-10-10' }) } },
  { regla: 'RV-REV-04', archivo: 'risk-transfer.csv', fila: 2, que: 'pending con revisor', valores: { id: ID.T1 }, filas: (l) => { t(l, 2).revisado_por = 'revisor' } },
  { regla: 'RV-ECO-01', archivo: 'risks.csv', fila: 7, que: 'monto bruto sin moneda', valores: { evaluacion_id: ID.eR2 }, filas: (l) => { r(l, 7).i_econ_monto_bruto = '5000' } },
  { regla: 'RV-ACC-01', archivo: 'action-plan.csv', fila: 4, que: 'acción sobre el padre', valores: { accion_id: ID.A3, risk_id: ID.P }, filas: (l) => { a(l, 4).risk_id = ID.P } },
  { regla: 'RV-ACC-03', archivo: 'action-plan.csv', fila: 4, que: 'factor V sin aspecto', valores: { accion_id: ID.A3, valor: 'v' }, filas: (l) => { a(l, 4).factor_objetivo = 'v' } },
  { regla: 'RV-ACC-04', archivo: 'action-plan.csv', fila: 4, que: 'sin mecanismo causal', valores: { accion_id: ID.A3 }, filas: (l) => { a(l, 4).mecanismo_causal = '' } },
  { regla: 'RV-ACC-06', archivo: 'action-plan.csv', fila: 2, que: 'cumplida sin evidencia de ejecución', valores: { accion_id: ID.A1 }, filas: (l) => { a(l, 2).evidencia_ejecucion = '' } },
  { regla: 'RV-ACC-07', archivo: 'action-plan.csv', fila: 2, que: 'efecto parcial sin nota', valores: { accion_id: ID.A1 }, filas: (l) => { a(l, 2).efecto = 'efecto_parcial' } },
  { regla: 'RV-ACC-08', archivo: 'action-plan.csv', fila: 2, que: 'la eficacia apunta a la inicial', valores: { accion_id: ID.A1, evaluacion_efecto_id: ID.eR1a }, filas: (l) => { a(l, 2).evaluacion_efecto_id = ID.eR1a } },
  { regla: 'RV-ACC-09', archivo: 'action-plan.csv', fila: 2, que: 'eficacia en una acción en curso', valores: { accion_id: ID.A1 }, filas: (l) => { a(l, 2).estado = 'en_curso' } },
  { regla: 'RV-ACC-10', archivo: 'action-plan.csv', fila: 3, que: 'aceptar sin fundamento', valores: { accion_id: ID.A2 }, filas: (l) => { a(l, 3).fundamento = '' } },
  { regla: 'RV-TRF-01', archivo: 'risk-transfer.csv', fila: 4, que: 'una cobertura sobre el padre', valores: { transferencia_id: ID.T2, risk_id: ID.P }, filas: (l) => { l.transferencias.push({ ...t(l, 2), transferencia_id: ID.T2, risk_id: ID.P, id_origen: 'T2' }) } },
  { regla: 'RV-TRF-02', archivo: 'risk-transfer.csv', fila: 2, que: 'vigencia invertida', valores: { transferencia_id: ID.T1 }, filas: (l) => { t(l, 2).vigencia_desde = '2027-01-01' } },
  { regla: 'RV-TRF-03', archivo: 'risk-transfer.csv', fila: 2, que: 'límite negativo', valores: { id: ID.T1, columna: 'limite_monto' }, filas: (l) => { t(l, 2).limite_monto = '-5' } },
  { regla: 'RV-TRF-04', archivo: 'risk-transfer.csv', fila: 3, que: 'evento sin cobertura', valores: { evento_id: ID.EV1 }, filas: (l) => { t(l, 3).transferencia_ref = '' } },
  { regla: 'RV-TRF-05', archivo: 'risk-transfer.csv', fila: 3, que: 'consumo_limite sin monto', valores: { evento_id: ID.EV1 }, filas: (l) => { t(l, 3).monto_evento = '' } },
  { regla: 'RV-TRF-06', archivo: 'risk-transfer.csv', fila: 3, que: 'el evento trae la columna cobertura', valores: { id: ID.EV1, columna: 'cobertura', tipo: 'evento' }, filas: (l) => { t(l, 3).cobertura = 'Incendio' } },
]

function quitarColumna(texto: string, columna: string): string {
  const lineas = texto.trimEnd().split('\n')
  const j = (lineas[0] ?? '').split(',').indexOf(columna)
  // El lote base no tiene comas dentro de campos en esta columna ni antes de ella fuera de comillas: se arma de nuevo.
  return lineas.map((l) => partir(l).filter((_, k) => k !== j).map(celda).join(',')).join('\n') + '\n'
}
function agregarColumna(texto: string, columna: string, valor: string): string {
  const lineas = texto.trimEnd().split('\n')
  return lineas.map((l, k) => `${l},${k === 0 ? columna : valor}`).join('\n') + '\n'
}
function partir(linea: string): string[] {
  const out: string[] = []
  let campo = ''
  let q = false
  for (let i = 0; i < linea.length; i++) {
    const c = linea.charAt(i)
    if (q) { if (c === '"' && linea[i + 1] === '"') { campo += '"'; i++ } else if (c === '"') q = false; else campo += c }
    else if (c === '"') q = true
    else if (c === ',') { out.push(campo); campo = '' }
    else campo += c
  }
  out.push(campo)
  return out
}
const celda = (v: string): string => (/[",\n\r]/.test(v) ? `"${v.replaceAll('"', '""')}"` : v)

/** Los archivos de un caso: los tres del lote base con el cambio aplicado. */
export function archivosDe(c: Caso): Record<Archivo, string> {
  const l = base()
  c.filas?.(l)
  const out = { 'risks.csv': aTexto(l, 'risks.csv'), 'action-plan.csv': aTexto(l, 'action-plan.csv'), 'risk-transfer.csv': aTexto(l, 'risk-transfer.csv') }
  if (c.texto !== undefined) out[c.archivo] = c.texto(out[c.archivo])
  return out
}

/** El mensaje que el caso tiene que producir: el texto de error del contrato con los valores del caso. */
export function errorEsperado(c: Caso): string {
  const regla = reglas().get(c.regla)
  if (regla === undefined) throw new Error(`${c.regla} no está en el contrato`)
  return mensaje(regla, { archivo: c.archivo, ...c.valores })
}
