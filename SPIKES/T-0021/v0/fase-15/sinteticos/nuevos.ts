// Lo que agrega la Fase 15b sobre el dataset de EMI-41 (decisión 10a de la 15a): 10 registros de
// acción, las reevaluaciones que piden el caso consistente, el ciclo de actualización y los casos
// válidos nuevos, un riesgo identificado sin evaluar y un evento de póliza. Todo es sintético,
// sale con `lote_origen = T-0021/15b`, lo escribe un agente (`actor = ai`) y queda `pending`:
// ninguna aceptación se escribe en nombre de Emiliano.

import { FACTORES, idDe, LOTE_15B, procedenciaDelRegistro, type Fila } from './generar.ts'

export interface Nuevos {
  readonly risks: Fila[]
  readonly acciones: Fila[]
  readonly transferencias: Fila[]
  readonly mapeo: Fila[]
}

interface Entrada {
  readonly risks: readonly Fila[]
  readonly transferencias: readonly Fila[]
  readonly rsk: (rid: string) => string
  readonly org: (empresa: string) => string
}

const EVALUADOR = 'agente-15b'
const VERSION = 'metodologia v1'

export function nuevos15b(e: Entrada): Nuevos {
  const risks: Fila[] = []
  const acciones: Fila[] = []
  const mapeo: Fila[] = []
  const todas = (): Fila[] => [...e.risks, ...risks]
  const vigente = (rid: string): Fila => {
    const f = todas().filter((x) => x.risk_id === e.rsk(rid) && x.evaluacion_id).at(-1)
    if (f === undefined) throw new Error(`${rid}: sin evaluación`)
    return f
  }
  const acc = (n: string, fecha: string): string => idDe('ACC', fecha, `${LOTE_15B}/${n}`)

  /** Una reevaluación nueva: copia la anterior, cambia lo que se indica y apunta a ella. Nunca la edita. */
  function reevaluar(rid: string, n: string, fecha: string, motivo: string, cambios: Fila, refsNuevas: string[], accionId = ''): Fila {
    const ant = vigente(rid)
    const fila: Fila = {}
    for (const [k, v] of Object.entries(ant)) if (!k.startsWith('_')) fila[k] = v
    Object.assign(fila, {
      lote_origen: LOTE_15B, evaluacion_id: idDe('EVA', fecha, `${LOTE_15B}/${n}`), evaluacion_id_origen: n,
      tipo_evaluacion: 'reevaluacion', evaluacion_anterior_id: ant.evaluacion_id ?? '', motivo, accion_id: accionId,
      fecha, version_metodologia: VERSION, evaluador: EVALUADOR, actor: 'ai',
      review_status: 'pending', revisado_por: '', revisado_por_actor: '', fecha_revision: '',
    }, cambios)
    const { base } = procedenciaDelRegistro(fila)
    const evid = [...new Set([...(ant.evidencia ?? '').split(';'), ...refsNuevas].filter((x) => x !== '' && x !== 'sin_evidencia'))]
    fila.base = base
    fila.evidencia = evid.length === 0 ? 'sin_evidencia' : evid.join(';')
    risks.push(fila)
    mapeo.push({ entidad: 'evaluacion', id_nuevo: fila.evaluacion_id ?? '', lote_origen: LOTE_15B, id_origen: n, risk_id_origen: rid, estado: 'nueva', motivo: `reevaluación sintética (${motivo})`, fuente: 'v0/fase-15/sinteticos/nuevos.ts' })
    return fila
  }

  function accion(n: string, rid: string, campos: Fila): Fila {
    const fila: Fila = {
      accion_id: acc(n, campos.fecha_alta ?? ''), risk_id: e.rsk(rid), id_origen: n, lote_origen: LOTE_15B,
      actor: 'ai', review_status: 'pending', ...campos,
    }
    acciones.push(fila)
    mapeo.push({ entidad: 'accion', id_nuevo: fila.accion_id ?? '', lote_origen: LOTE_15B, id_origen: n, risk_id_origen: rid, estado: 'nueva', motivo: 'acción sintética', fuente: 'v0/fase-15/sinteticos/nuevos.ts' })
    return fila
  }

  // ── 1 · Caso consistente de EMI-16 y ciclo con eficacia parcial: S07-R06 ───
  // Acción cumplida sobre P → revisión pendiente → reevaluación accion_ejecutada que apunta a la
  // anterior → eficacia registrada aparte. El factor toma el valor observado (P sigue en 3, con el
  // rango acotado), no el esperado (P 3→2): §11.2. Su cobertura es la de avería de maquinaria.
  const a1 = accion('15B-A01', 'S07-R06', {
    tipo_registro: 'accion',
    descripcion: 'Ultrasonido mensual de la corona del molino SAG y operación con el torque limitado al 85% hasta montar la corona de repuesto',
    factor_objetivo: 'p',
    mecanismo_causal: 'p: menos carga en la raíz de los dientes y detección mensual del crecimiento de la fisura bajan la probabilidad de rotura antes del reemplazo',
    cambio_esperado: 'p 3→2',
    estado: 'cumplida', fecha_alta: '2026-10-01', fecha_cumplida: '2026-10-09',
    evidencia_ejecucion: 'EV-S07-15B-01 (informe de ultrasonido de la corona, 2026-10-08);EV-S07-15B-02 (registro de torque del SAG, 2026-10-01 a 2026-10-09)',
    base: 'observed', evidencia: 'EV-S07-15B-01;EV-S07-15B-02',
  })
  const r1 = reevaluar('S07-R06', '15B-R01', '2026-10-12', 'accion_ejecutada', {
    p_valor: '3', p_min: '2', p_max: '3',
    p_observacion: 'Acción 15B-A01 cumplida (2026-10-09): la fisura de 18 mm no creció entre 2026-07 y 2026-10 con el torque al 85%. El comparable regional con rotura en 2022 sigue anclando 3; el peor creíble baja de 4 a 3 porque el precursor está vigilado y acotado.',
    p_evidencia: 'EV-S07-060;EV-S07-061;EV-S07-012;EV-S07-062;EV-S07-15B-01;EV-S07-15B-02',
    justificacion: 'Reevaluación por acción ejecutada (15B-A01): P se mantiene en 3 por el comparable; sólo baja su máximo. I y V no cambian: la acción no actúa sobre ellos.',
    uncertainty: 'medium', uncertainty_nota: 'Crecimiento de la fisura después de 2026-10 y fecha real de entrega de la corona de repuesto.',
  }, ['EV-S07-15B-01', 'EV-S07-15B-02'], a1.accion_id)
  Object.assign(a1, { efecto: 'efecto_parcial', evaluacion_efecto_id: r1.evaluacion_id ?? '', efecto_nota: 'Esperado: p 3→2. Obtenido: p sigue en 3 y su máximo baja de 4 a 3. Brecha: la acción controla el precursor propio, pero el comparable regional sigue anclando el nivel.' })

  // ── 2 · Acción cumplida con efecto total: S36-R06 ───────────────────────────
  const a2 = accion('15B-A02', 'S36-R06', {
    tipo_registro: 'accion',
    descripcion: 'Auditoría bromatológica mensual del concesionario del comedor y registro continuo de temperaturas de la cadena de frío',
    factor_objetivo: 'p',
    mecanismo_causal: 'p: el control mensual y el registro de temperaturas cortan las dos causas de los brotes anteriores (frío interrumpido y manipulación sin control)',
    cambio_esperado: 'p 4→3',
    estado: 'cumplida', fecha_alta: '2026-10-01', fecha_cumplida: '2026-10-08',
    evidencia_ejecucion: 'EV-S36-15B-01 (informe de auditoría bromatológica, 2026-10-07);EV-S36-15B-02 (registro de temperaturas de 2026-10)',
    base: 'observed', evidencia: 'EV-S36-15B-01;EV-S36-15B-02',
  })
  const r2 = reevaluar('S36-R06', '15B-R02', '2026-10-13', 'accion_ejecutada', {
    p_valor: '3', p_min: '3', p_max: '4',
    p_observacion: 'Acción 15B-A02 cumplida (2026-10-08): auditoría sin desvíos y cadena de frío registrada sin cortes. Sin las dos causas de los brotes anteriores, el ancla baja a 3; el máximo queda en 4 hasta tener un año de registro.',
    p_evidencia: 'EV-S36-15B-01;EV-S36-15B-02',
    justificacion: 'Reevaluación por acción ejecutada (15B-A02): P baja de 4 a 3 por el control de las causas. I y V no cambian.',
  }, ['EV-S36-15B-01', 'EV-S36-15B-02'], a2.accion_id)
  Object.assign(a2, { efecto: 'efecto_total', evaluacion_efecto_id: r2.evaluacion_id ?? '' })

  // ── 3 · Acción cumplida sin efecto medible: S28-R05 ─────────────────────────
  const a3 = accion('15B-A03', 'S28-R05', {
    tipo_registro: 'accion',
    descripcion: 'Cámaras con grabación sobre las cajas y las góndolas de mayor valor en los 15 locales',
    factor_objetivo: 'p',
    mecanismo_causal: 'p: la vigilancia visible disuade el hurto en las zonas con más faltantes',
    cambio_esperado: 'p 5→4',
    estado: 'cumplida', fecha_alta: '2026-10-01', fecha_cumplida: '2026-10-06',
    evidencia_ejecucion: 'EV-S28-15B-01 (acta de instalación de cámaras en los 15 locales, 2026-10-06)',
    base: 'observed', evidencia: 'EV-S28-15B-01',
  })
  const r3 = reevaluar('S28-R05', '15B-R03', '2026-10-13', 'accion_ejecutada', {
    p_observacion: 'Acción 15B-A03 cumplida (2026-10-06). Los faltantes de la primera semana siguen en el mismo orden que antes: hurtos varias veces por mes en cada local. P sigue en 5.',
    p_evidencia: 'EV-S28-15B-01;EV-S28-15B-02',
    justificacion: 'Reevaluación por acción ejecutada (15B-A03): no hay cambio observable en la frecuencia. Ningún factor cambia.',
  }, ['EV-S28-15B-01', 'EV-S28-15B-02'], a3.accion_id)
  Object.assign(a3, { efecto: 'sin_efecto_medible', evaluacion_efecto_id: r3.evaluacion_id ?? '', efecto_nota: 'Esperado: p 5→4. Obtenido: p sigue en 5 (faltantes de la primera semana, EV-S28-15B-02). Brecha: una semana no alcanza para ver un cambio de frecuencia; se vuelve a medir con el inventario trimestral.' })

  // ── 4 · Acción en curso y planificada sobre un riesgo safety_critical: S05-P01-S03 ──
  // Ninguna abre revisión ni baja un factor (D18): no hay reevaluación.
  accion('15B-A04', 'S05-P01-S03', {
    tipo_registro: 'accion',
    descripcion: 'Líneas de vida y redes de protección en los puentes y alcantarillas de la obra vial',
    factor_objetivo: 'p',
    mecanismo_causal: 'p: el anclaje continuo evita que un tropiezo en el borde termine en caída a distinto nivel',
    cambio_esperado: 'p 5→4',
    estado: 'en_curso', fecha_alta: '2026-10-02',
    base: 'reported', evidencia: 'EV-S05-15B-01 (orden de compra de líneas de vida, 2026-10-02)',
  })
  accion('15B-A05', 'S05-P01-S03', {
    tipo_registro: 'accion',
    descripcion: 'Permiso de trabajo en altura y capacitación obligatoria para el personal de los subcontratistas de la obra vial',
    factor_objetivo: 'p',
    mecanismo_causal: 'p: nadie trabaja en el borde sin el permiso del día y sin haber hecho la capacitación',
    cambio_esperado: 'p 5→4',
    estado: 'planificada', fecha_alta: '2026-10-02', fecha_proxima_revision: '2026-11-15',
    base: 'reported', evidencia: 'sin_evidencia',
  })

  // ── 5 · Decisión de tratamiento: aceptar, con fundamento y fecha de revisión ──
  accion('15B-A06', 'S32-R05', {
    tipo_registro: 'decision_tratamiento',
    descripcion: 'La dirección acepta el riesgo de golpe o atrapamiento en la maniobra con tubería con los controles actuales hasta la revisión',
    decision: 'aceptar',
    fundamento: 'La maniobra con tubería es parte del servicio y no se puede eliminar; los controles actuales (llave hidráulica y zona de exclusión) se mantienen y se revisan con la estadística de accidentes del primer trimestre de 2027',
    fecha_alta: '2026-10-05', fecha_proxima_revision: '2027-03-31',
    base: 'reported', evidencia: 'EV-S32-15B-01 (acta de directorio, 2026-10-05)',
  })

  // ── 6 · Una acción con dos factores y un mecanismo para cada uno (D16): S06-R01 ──
  accion('15B-A07', 'S06-R01', {
    tipo_registro: 'accion',
    descripcion: 'Análisis trimestral de vibraciones del compresor central y compresor de respaldo conectado en paralelo',
    factor_objetivo: 'p;v_rec',
    mecanismo_causal: 'p: el análisis de vibraciones detecta el desgaste de rodamientos antes de la falla; v_rec: el compresor de respaldo retoma el frío en horas en lugar de esperar el repuesto',
    cambio_esperado: 'p 5→4; v_rec 4→2',
    estado: 'planificada', fecha_alta: '2026-10-03',
    base: 'reported', evidencia: 'EV-S06-15B-01 (presupuesto del compresor de respaldo, 2026-10)',
  })

  // ── 7 · Una acción real sobre dos riesgos: dos registros (EMI-17) ──────────
  for (const [n, rid] of [['15B-A08', 'S29-R04'], ['15B-A09', 'S29-P01-S02']] as const) {
    accion(n, rid, {
      tipo_registro: 'accion',
      descripcion: 'Bóveda de credenciales privilegiadas con doble aprobación y sesiones grabadas (misma acción en dos riesgos)',
      factor_objetivo: 'p',
      mecanismo_causal: rid === 'S29-R04'
        ? 'p: nadie usa una credencial privilegiada sin una segunda aprobación, y cada sesión queda grabada'
        : 'p: un atacante que obtiene una credencial no llega a la infraestructura de producción sin la segunda aprobación',
      cambio_esperado: 'p 3→2',
      estado: 'en_curso', fecha_alta: '2026-10-04',
      base: 'reported', evidencia: 'EV-S29-15B-01 (plan del proyecto de bóveda, 2026-10)',
    })
  }

  // ── 8 · Acción cancelada: S15-R03 ───────────────────────────────────────────
  accion('15B-A10', 'S15-R03', {
    tipo_registro: 'accion',
    descripcion: 'Perforación de un pozo propio para complementar el turno de riego',
    factor_objetivo: 'v_cont',
    mecanismo_causal: 'v_cont: con agua propia, una reducción del turno no deja sin riego a las fincas',
    cambio_esperado: 'v_cont 3→2',
    estado: 'cancelada', fecha_alta: '2026-10-01',
    base: 'reported', evidencia: 'EV-S15-15B-01 (rechazo del permiso de perforación, 2026-10)',
  })

  // ── Reevaluación por información nueva: el hijo deja de ser evaluable ──────
  // S29-P01-S01 queda con P unknown, así que el padre S29-P01 queda prioridad_provisional (§1.4.5).
  reevaluar('S29-P01-S01', '15B-R04', '2026-10-07', 'informacion_nueva', {
    p_estado: 'unknown', p_valor: '', p_min: '3', p_max: '5',
    p_observacion: 'Información nueva (2026-10-07): el proveedor informó que las dos regiones comparten el servicio de identidad. No publica cuántas fallas de ese servicio alcanzaron a las dos regiones, así que el ancla de 4 (fallas por región) ya no sostiene la frecuencia conjunta. Falta ese historial.',
    p_evidencia: 'EV-S29-15B-02',
    necesidad_validacion: 'Pedir al proveedor el historial de incidentes del servicio de identidad compartido entre regiones (2023–2026).',
    motivo_no_evaluable: 'P unknown: falta la frecuencia de fallas del servicio de identidad que comparten las dos regiones',
    uncertainty: 'high', uncertainty_nota: 'Frecuencia de fallas del servicio de identidad compartido; si es baja, P vuelve a 4.',
    justificacion: 'Reevaluación por información nueva: el dato que anclaba P no describe el evento conjunto. P queda unknown con rango 3–5 (§9.2).',
  }, ['EV-S29-15B-02'])

  // ── Reevaluación por cambio de contexto: dos hijos empatados ───────────────
  // S05-P01-S01 pasa a la misma contención y recuperación que S05-P01-S03: empatan en el primer
  // lugar y el padre muestra los dos (§1.4.4).
  reevaluar('S05-P01-S01', '15B-R05', '2026-10-10', 'cambio_contexto', {
    v_cont_valor: '4', v_cont_min: '4', v_cont_max: '5', v_rec_valor: '3', v_rec_min: '', v_rec_max: '',
    v_cont_observacion: 'Cambio de contexto (2026-10-10): la obra 1 pasó a la etapa de fachada con andamios colgantes y trabajo en el borde de losa sin la baranda perimetral, que se desmontó para la fachada. La contención queda como en la obra vial.',
    v_rec_observacion: 'El rescate desde un andamio colgante necesita la grúa de la obra, que no siempre está disponible: la recuperación queda como en la obra vial.',
    v_cont_evidencia: 'EV-S05-15B-02', v_rec_evidencia: 'EV-S05-15B-02',
    justificacion: 'Reevaluación por cambio de contexto: la etapa de fachada cambia la contención y la recuperación, no la frecuencia ni el daño.',
  }, ['EV-S05-15B-02'])

  // ── Un riesgo identificado y todavía sin evaluar (siete unknown, §9.3.1) ───
  const nuevo = e.rsk('15B-S28-N01')
  const unknown: Fila = {}
  for (const f of FACTORES) {
    Object.assign(unknown, { [`${f}_estado`]: 'unknown', [`${f}_valor`]: '', [`${f}_min`]: '', [`${f}_max`]: '', [`${f}_base`]: '', [`${f}_evidencia`]: '', [`${f}_observacion`]: 'Sin información todavía: el riesgo se identificó en la visita de 2026-10-09 y no se relevó.' })
  }
  risks.push({
    risk_id: nuevo, organizacion_id: e.org('S28'), tipo_objeto: 'riesgo', titulo: 'Inundación del centro de distribución por una tormenta',
    id_origen: '15B-S28-N01', lote_origen: LOTE_15B,
    evaluacion_id: idDe('EVA', '2026-10-09', `${LOTE_15B}/15B-R06`), evaluacion_id_origen: '15B-R06', tipo_evaluacion: 'inicial',
    fecha: '2026-10-09', version_metodologia: VERSION, evaluador: EVALUADOR, actor: 'ai', base: 'assumed', evidencia: 'sin_evidencia',
    riesgo_causa: 'Tormenta intensa con desborde del canal que pasa junto al predio', riesgo_evento: 'El agua entra a la nave del centro de distribución',
    riesgo_consecuencia: 'Stock dañado y centro detenido hasta secar y limpiar',
    ...unknown,
    uncertainty: 'high', uncertainty_nota: 'No se relevó nada todavía: ni antecedentes de anegamiento, ni cota del predio, ni drenajes.',
    necesidad_validacion: 'Relevar antecedentes de anegamiento del predio, cota respecto del canal, drenajes y stock en planta baja.',
    motivo_no_evaluable: 'Los siete factores unknown: el riesgo está identificado y sin evaluar',
    justificacion: 'Riesgo identificado en la visita y todavía sin información: entra a la cola de validación (§9.3.1, §9.5).',
    review_status: 'pending',
  })
  mapeo.push({ entidad: 'riesgo', id_nuevo: nuevo, lote_origen: LOTE_15B, id_origen: '15B-S28-N01', risk_id_origen: '', estado: 'nueva', motivo: 'riesgo identificado sin evaluar (caso válido nuevo, 10a)', fuente: 'v0/fase-15/sinteticos/nuevos.ts' })
  mapeo.push({ entidad: 'evaluacion', id_nuevo: risks.at(-1)?.evaluacion_id ?? '', lote_origen: LOTE_15B, id_origen: '15B-R06', risk_id_origen: '15B-S28-N01', estado: 'nueva', motivo: 'evaluación inicial con los siete factores unknown', fuente: 'v0/fase-15/sinteticos/nuevos.ts' })

  // ── Evento de póliza: consumo del límite, sin reevaluación (§11.3, D17) ────
  const cobertura = e.transferencias.find((t) => t.risk_id === e.rsk('S36-R02') && t.poliza_ref === 'POL-S36-1')
  if (cobertura === undefined) throw new Error('S36-R02 sin cobertura de responsabilidad civil')
  const evento: Fila = {
    tipo_registro: 'evento', evento_id: idDe('EVT', '2026-10-06', `${LOTE_15B}/15B-E01`), risk_id: cobertura.risk_id ?? '',
    transferencia_ref: cobertura.transferencia_id ?? '', id_origen: '15B-E01', lote_origen: LOTE_15B,
    tipo_evento: 'consumo_limite', fecha_evento: '2026-10-06', monto_evento: '1000', moneda: 'USD',
    nota_evento: 'Acuerdo de USD 6 mil por la fractura de un alumno en educación física (2026-09); la aseguradora pagó USD 1 mil después del deducible, imputados al agregado anual',
    actor: 'ai', base: 'reported', evidencia: 'EV-S36-15B-03 (nota de pago de la aseguradora, 2026-10-06)',
  }
  mapeo.push({ entidad: 'evento', id_nuevo: evento.evento_id ?? '', lote_origen: LOTE_15B, id_origen: '15B-E01', risk_id_origen: 'S36-R02', estado: 'nueva', motivo: 'evento de póliza sintético (consumo del límite)', fuente: 'v0/fase-15/sinteticos/nuevos.ts' })

  return { risks, acciones, transferencias: [evento], mapeo }
}
