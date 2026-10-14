// Validador de un lote de importación de Risk OS v1 (`risks.csv`, `action-plan.csv`,
// `risk-transfer.csv`). Sale del contrato aprobado en la 15a: las columnas, los enums, los textos
// de error y la severidad se leen de `../contrato/`; la lógica de cada regla transcribe su
// descripción en `reglas-validacion.csv`. No corrige nada: devuelve, por fila, cada rechazo y cada
// aviso con su `regla_id` y su mensaje.
//
// Dos etapas. Primero la estructura del archivo (RV-ARCH-01 a 04): si algún archivo falla, se
// informan sólo esos rechazos, porque sin columnas confiables ninguna regla de fila tiene sentido.
// Después, las reglas de fila y las referencias entre filas y entre archivos.
//
// Precedencia documentada (una sola, para que cada defecto se informe una vez): si una acción trae
// efecto sin estar cumplida (RV-ACC-09), la reevaluación que la mide no repite el defecto como
// RV-EVA-05 «acción no cumplida».

import {
  evaluar, safetyCritical,
  type Dimension, type Factor, type Factores, type Nivel, type Recuperacion,
} from '../../../regresion-ejecutable/metodologia.ts'
import { ARCHIVOS, columnas, mensaje, reglas, type Archivo, type Columna, type Regla } from './contrato.ts'
import { leerCsv, type Lectura } from './csv.ts'

export interface Hallazgo {
  readonly regla_id: string
  readonly severidad: 'rechazo' | 'aviso'
  readonly archivo: Archivo
  /** Fila del archivo (el encabezado es la 1); vacío en un hallazgo de archivo. */
  readonly fila: number | null
  /** Id del registro, si la fila lo trae. */
  readonly id: string
  /** id_origen / evaluacion_id_origen de la fila, para leer el hallazgo sin la tabla de ids. */
  readonly origen: string
  readonly mensaje: string
}

/** Lo que ya existe en Risk OS, para las reglas que aceptan referencias «del lote o de Risk OS». */
export interface Existentes {
  readonly ids?: ReadonlySet<string>
  readonly riesgos?: ReadonlyMap<string, { readonly tipo_objeto: string; readonly organizacion_id: string }>
}

export interface Opciones {
  /** Fecha contra la que se miran vencimientos (RV-TRF-09, RV-ACC-11). AAAA-MM-DD. */
  readonly fechaCorte: string
  readonly existentes?: Existentes
}

type Fila = Readonly<Record<string, string>>
interface Registro { readonly n: number; readonly f: Fila }

const FACTORES = ['p', 'i_econ', 'i_pers', 'i_cont', 'i_legal', 'v_cont', 'v_rec'] as const
const ORDEN_BASE = ['observed', 'reported', 'inferred', 'assumed']
const PREFIJO: Record<string, string> = { RSK: 'riesgo', EVA: 'evaluación', ACC: 'acción', TRF: 'transferencia', EVT: 'evento' }
/** Columnas de un riesgo que no son de la evaluación (RV-RSK-06): identidad, origen y la consecuencia común del padre. */
const IDENTIDAD = new Set(['risk_id', 'organizacion_id', 'tipo_objeto', 'riesgo_padre_id', 'miembros', 'titulo', 'id_origen', 'lote_origen', 'riesgo_consecuencia'])
const COLUMNAS_COBERTURA = ['transferencia_id', 'poliza_ref', 'cobertura', 'vigencia_desde', 'vigencia_hasta', 'limite_monto', 'sublimite_aplicable_monto', 'sublimites_texto', 'deducible_monto', 'deducible_texto', 'exclusiones', 'exposicion_retenida_monto', 'exposicion_retenida_nota', 'suficiencia', 'suficiencia_nota']
const COLUMNAS_EVENTO = ['evento_id', 'transferencia_ref', 'tipo_evento', 'fecha_evento', 'monto_evento', 'nota_evento']
const MONTOS_TRANSFERENCIA = ['limite_monto', 'sublimite_aplicable_monto', 'deducible_monto', 'exposicion_retenida_monto', 'monto_evento']
const NOTAS = ['uncertainty_nota', 'necesidad_validacion', 'motivo_no_evaluable', 'justificacion', ...FACTORES.map((f) => `${f}_observacion`), 'efecto_nota', 'fundamento', 'suficiencia_nota', 'exposicion_retenida_nota', 'nota_evento']

const vacio = (v: string | undefined): boolean => (v ?? '').trim() === ''
const lista = (v: string | undefined): string[] => (v ?? '').split(';').map((x) => x.trim()).filter((x) => x !== '')
const esUlid = (v: string): boolean => /^[0-9A-HJKMNP-TV-Z]{26}$/.test(v)
const esIdDe = (v: string, prefijo: string): boolean => v.startsWith(`${prefijo}-`) && esUlid(v.slice(prefijo.length + 1))
const esEntero15 = (v: string): boolean => /^[1-5]$/.test(v)
const esMonto = (v: string): boolean => /^\d+(\.\d+)?$/.test(v)
const esMoneda = (v: string): boolean => /^[A-Z]{3}$/.test(v)
function esFecha(v: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return false
  const d = new Date(`${v}T00:00:00Z`)
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v
}
/** Un porcentaje de confianza no calibrado (RV-UNC-03), no cualquier porcentaje: «2% de la suma asegurada» no cuenta. */
const PORCENTAJE_CONFIANZA = /(confianza|certeza|seguridad|segur[oa] al)\D{0,20}\d{1,3}\s*%|\d{1,3}\s*%\s*(de\s+)?(confianza|certeza|seguridad|segur[oa])/i

export function validarLote(contenidos: Readonly<Record<Archivo, Uint8Array>>, opciones: Opciones): Hallazgo[] {
  const R = reglas()
  const hallazgos: Hallazgo[] = []
  const regla = (id: string): Regla => {
    const r = R.get(id)
    if (r === undefined) throw new Error(`regla ${id} no está en el contrato`)
    return r
  }
  const informar = (id: string, archivo: Archivo, n: number | null, fila: Fila | null, valores: Record<string, string | number>): void => {
    const r = regla(id)
    const idFila = fila === null ? '' : idDeFila(archivo, fila)
    hallazgos.push({
      regla_id: id, severidad: r.severidad, archivo, fila: n, id: idFila,
      origen: fila === null ? '' : (fila.evaluacion_id_origen || fila.id_origen || ''),
      mensaje: mensaje(r, { archivo, n: n ?? '', id: idFila, ...fila, ...valores }),
    })
  }

  // ── Etapa 1: estructura ─────────────────────────────────────────────────────
  const tablas = {} as Record<Archivo, Registro[]>
  const contrato = {} as Record<Archivo, Columna[]>
  for (const archivo of ARCHIVOS) {
    contrato[archivo] = columnas(archivo)
    const l: Lectura = leerCsv(contenidos[archivo])
    if (!l.ok) { informar('RV-ARCH-01', archivo, null, null, { n: l.linea }); continue }
    const esperadas = contrato[archivo].map((c) => c.nombre)
    for (const c of esperadas) if (!l.encabezado.includes(c)) informar('RV-ARCH-03', archivo, 1, null, { columna: c })
    for (const c of l.encabezado) if (!esperadas.includes(c)) informar('RV-ARCH-04', archivo, 1, null, { columna: c })
    for (const r of l.registros) {
      if (r.valores.length !== l.encabezado.length) informar('RV-ARCH-02', archivo, r.fila, null, { n: r.fila, k: r.valores.length, m: l.encabezado.length })
    }
    tablas[archivo] = l.registros.map((r) => ({ n: r.fila, f: Object.fromEntries(l.encabezado.map((c, j) => [c, r.valores[j] ?? ''])) }))
  }
  if (hallazgos.length > 0) return ordenar(hallazgos)

  const risks = tablas['risks.csv']
  const acciones = tablas['action-plan.csv']
  const transferencias = tablas['risk-transfer.csv']
  const ex = opciones.existentes ?? {}

  // ── Reglas comunes de columna ──────────────────────────────────────────────
  /** RV-ARCH-05: tipo de las columnas que el contrato le asigna (enum, fecha y texto obligatorio). */
  function tipos(archivo: Archivo, { n, f }: Registro, aplica: (c: Columna) => boolean): void {
    for (const c of contrato[archivo]) {
      if (!c.reglas.includes('RV-ARCH-05') || !aplica(c)) continue
      const v = f[c.nombre] ?? ''
      const obligatoria = obligatoriaPorTipo(archivo, c.nombre, f)
      if (vacio(v)) {
        if (obligatoria) informar('RV-ARCH-05', archivo, n, f, { columna: c.nombre, valor: v, tipo: c.tipo === 'texto' ? 'texto no vacío' : c.tipo })
        continue
      }
      const ok = c.tipo === 'enum' ? c.valores.includes(v) : c.tipo === 'fecha' ? esFecha(v) : true
      if (!ok) informar('RV-ARCH-05', archivo, n, f, { columna: c.nombre, valor: v, tipo: c.tipo === 'enum' ? `uno de ${c.valores.join(' | ')}` : 'una fecha AAAA-MM-DD' })
    }
  }

  function procedencia(archivo: Archivo, { n, f }: Registro): void {
    if (vacio(f.base) || !ORDEN_BASE.includes(f.base ?? '')) informar('RV-PRO-01', archivo, n, f, { valor: f.base ?? '' })
    const ev = lista(f.evidencia)
    if (ev.length === 0) informar('RV-PRO-02', archivo, n, f, {})
    const celdas = [f.evidencia, ...(archivo === 'risks.csv' ? FACTORES.map((x) => f[`${x}_evidencia`]) : [])]
    if (celdas.some((c) => { const l = lista(c); return l.includes('sin_evidencia') && l.length > 1 })) informar('RV-PRO-03', archivo, n, f, {})
    if (!['human', 'ai', 'import'].includes(f.actor ?? '')) informar('RV-PRO-04', archivo, n, f, { valor: f.actor ?? '' })
  }

  function incertidumbre(archivo: Archivo, { n, f }: Registro): void {
    const u = f.uncertainty ?? ''
    if (!['low', 'medium', 'high'].includes(u)) informar('RV-UNC-01', archivo, n, f, {})
    else if (u !== 'low' && vacio(f.uncertainty_nota)) informar('RV-UNC-02', archivo, n, f, { valor: u })
  }

  function revision(archivo: Archivo, { n, f }: Registro): void {
    const s = f.review_status ?? ''
    if (!['pending', 'accepted', 'needs_revision', 'rejected'].includes(s)) { informar('RV-REV-01', archivo, n, f, { valor: s }); return }
    if (s === 'pending') {
      if (!vacio(f.revisado_por)) informar('RV-REV-04', archivo, n, f, {})
      return
    }
    if (vacio(f.revisado_por) || !['human', 'ai'].includes(f.revisado_por_actor ?? '') || vacio(f.fecha_revision)) informar('RV-REV-02', archivo, n, f, {})
    else if (s === 'accepted' && f.revisado_por_actor !== 'human') informar('RV-REV-03', archivo, n, f, { valor: f.revisado_por_actor ?? '' })
  }

  function notas(archivo: Archivo, { n, f }: Registro): void {
    for (const c of NOTAS) if (c in f && PORCENTAJE_CONFIANZA.test(f[c] ?? '')) informar('RV-UNC-03', archivo, n, f, { columna: c })
  }

  /** RV-ID-01 sobre una columna de id propio. Vacío también es «no es un id». */
  function formatoId(archivo: Archivo, { n, f }: Registro, columna: string, prefijo: string): boolean {
    const v = f[columna] ?? ''
    if (esIdDe(v, prefijo)) return true
    informar('RV-ID-01', archivo, n, f, { columna, valor: v, entidad: PREFIJO[prefijo] ?? prefijo })
    return false
  }

  /** RV-ID-02: un id repetido en el lote o ya existente en Risk OS. Se informa en la segunda fila. */
  function unicos(archivo: Archivo, filas: readonly Registro[], columna: string): void {
    const vistos = new Map<string, number>()
    for (const { n, f } of filas) {
      const v = f[columna] ?? ''
      if (vacio(v)) continue
      const antes = vistos.get(v)
      if (antes !== undefined) informar('RV-ID-02', archivo, n, f, { id: v, n1: antes, n2: n })
      else if (ex.ids?.has(v) === true) informar('RV-ID-02', archivo, n, f, { id: v, n1: 'Risk OS', n2: n })
      else vistos.set(v, n)
    }
  }

  /** RV-ID-03: el par (lote_origen, columna de origen) identifica una sola entidad. */
  function origenes(archivo: Archivo, filas: readonly Registro[], columnaOrigen: string, entidad: (f: Fila) => string): void {
    const pares = new Map<string, string>()
    for (const { n, f } of filas) {
      const o = f[columnaOrigen] ?? ''
      if (vacio(o)) continue
      const lote = f.lote_origen ?? ''
      if (vacio(lote)) { informar('RV-ID-03', archivo, n, f, { lote_origen: '(sin lote)', id_origen: o }); continue }
      const clave = `${lote}\u0000${o}`
      const e = entidad(f)
      const previa = pares.get(clave)
      if (previa === undefined) pares.set(clave, e)
      else if (previa !== e) informar('RV-ID-03', archivo, n, f, { lote_origen: lote, id_origen: o })
    }
  }

  // ── risks.csv ───────────────────────────────────────────────────────────────
  const AR: Archivo = 'risks.csv'
  const tipoDe = new Map<string, { tipo_objeto: string; organizacion_id: string }>(ex.riesgos ?? [])
  for (const { f } of risks) if (!tipoDe.has(f.risk_id ?? '')) tipoDe.set(f.risk_id ?? '', { tipo_objeto: f.tipo_objeto ?? '', organizacion_id: f.organizacion_id ?? '' })
  const evaluaciones = risks.filter((r) => r.f.tipo_objeto !== 'padre')
  const evaPorId = new Map<string, Registro>()
  for (const r of evaluaciones) if (!vacio(r.f.evaluacion_id) && !evaPorId.has(r.f.evaluacion_id ?? '')) evaPorId.set(r.f.evaluacion_id ?? '', r)
  const accionPorId = new Map<string, Registro>()
  for (const r of acciones) if (!accionPorId.has(r.f.accion_id ?? '')) accionPorId.set(r.f.accion_id ?? '', r)

  for (const reg of risks) {
    const { n, f } = reg
    formatoId(AR, reg, 'risk_id', 'RSK')
    const padre = f.tipo_objeto === 'padre'
    tipos(AR, reg, (c) => !padre || IDENTIDAD.has(c.nombre))
    if ((f.tipo_objeto === 'sub_riesgo') === vacio(f.riesgo_padre_id)) informar('RV-RSK-02', AR, n, f, {})
    const miembros = lista(f.miembros)
    if ((f.tipo_objeto === 'escenario') !== (miembros.length >= 2) || (f.tipo_objeto !== 'escenario' && !vacio(f.miembros))) informar('RV-RSK-04', AR, n, f, {})
    if (padre) {
      const propia = Object.keys(f).find((c) => !IDENTIDAD.has(c) && !vacio(f[c]))
      if (propia !== undefined) informar('RV-RSK-06', AR, n, f, { columna: propia })
      continue
    }
    if (vacio(f.evaluacion_id)) { informar('RV-RSK-09', AR, n, f, {}); continue }
    formatoId(AR, reg, 'evaluacion_id', 'EVA')
    evaluacion(reg)
  }

  function evaluacion(reg: Registro): void {
    const { n, f } = reg
    const t = f.tipo_evaluacion ?? ''
    if ((t === 'inicial' && (!vacio(f.evaluacion_anterior_id) || !vacio(f.motivo))) || (t === 'reevaluacion' && (vacio(f.evaluacion_anterior_id) || vacio(f.motivo)))) {
      informar('RV-EVA-01', AR, n, f, { tipo_evaluacion: t })
    }
    if ((f.motivo === 'accion_ejecutada') === vacio(f.accion_id)) informar('RV-EVA-04', AR, n, f, {})
    if (!vacio(f.accion_id)) {
      const a = accionPorId.get(f.accion_id ?? '')
      const cumplida = a?.f.estado === 'cumplida'
      const yaInformada = a !== undefined && !cumplida && !vacio(a.f.efecto)
      if (a === undefined || a.f.risk_id !== f.risk_id || (!cumplida && !yaInformada)) informar('RV-EVA-05', AR, n, f, {})
    }
    if (!vacio(f.evaluacion_anterior_id)) {
      const ant = evaPorId.get(f.evaluacion_anterior_id ?? '')
      if (ant === undefined || ant.f.risk_id !== f.risk_id) informar('RV-EVA-02', AR, n, f, {})
      else if (esFecha(f.fecha ?? '') && esFecha(ant.f.fecha ?? '') && (f.fecha ?? '') < (ant.f.fecha ?? '')) informar('RV-EVA-06', AR, n, f, {})
    }
    const v = f.version_metodologia ?? ''
    if (['metodologia v0.1', 'metodologia v0.2', 'metodologia v0.3'].includes(v)) informar('RV-EVA-08', AR, n, f, { version: v })
    if (vacio(f.riesgo_evento)) informar('RV-EVA-09', AR, n, f, {})
    for (const c of ['riesgo_causa', 'riesgo_consecuencia']) if (vacio(f[c])) informar('RV-EVA-10', AR, n, f, { columna: c })
    if (vacio(f.justificacion)) informar('RV-EVA-11', AR, n, f, {})

    procedencia(AR, reg)
    const factoresValidos = factores(reg)
    if (factoresValidos) {
      const r = evaluar(factoresDe(f))
      if (!r.evaluable && vacio(f.motivo_no_evaluable)) informar('RV-FAC-08', AR, n, f, {})
    }
    if (!vacio(f.i_econ_monto_bruto) && (!esMonto(f.i_econ_monto_bruto ?? '') || !esMoneda(f.moneda ?? ''))) informar('RV-ECO-01', AR, n, f, {})
    incertidumbre(AR, reg)
    revision(AR, reg)
    notas(AR, reg)
  }

  /** RV-FAC-01 a 07 y RV-PRO-05/06. Devuelve si los factores quedaron en una forma calculable. */
  function factores({ n, f }: Registro): boolean {
    let calculable = true
    let hayUnknown = false
    const basesConValor: [string, string][] = []
    for (const x of FACTORES) {
      const estado = f[`${x}_estado`] ?? ''
      const valor = f[`${x}_valor`] ?? ''
      const min = f[`${x}_min`] ?? ''
      const max = f[`${x}_max`] ?? ''
      const base = f[`${x}_base`] ?? ''
      const v = { f: x, valor, min, max }
      if (!['known', 'unknown', 'no_aplica'].includes(estado)) { informar('RV-FAC-01', AR, n, f, v); calculable = false; continue }
      if (estado === 'no_aplica' && x !== 'v_rec') { informar('RV-FAC-03', AR, n, f, v); calculable = false; continue }
      if ((estado === 'known' && !esEntero15(valor)) || (estado !== 'known' && !vacio(valor))) { informar('RV-FAC-02', AR, n, f, v); calculable = false }
      const rangoMal = (!vacio(min) && !esEntero15(min)) || (!vacio(max) && !esEntero15(max))
        || (esEntero15(min) && esEntero15(max) && Number(min) > Number(max))
        || (esEntero15(valor) && ((esEntero15(min) && Number(valor) < Number(min)) || (esEntero15(max) && Number(valor) > Number(max))))
        || (estado === 'no_aplica' && (!vacio(min) || !vacio(max)))
      if (rangoMal) { informar('RV-FAC-04', AR, n, f, { ...v, min: min || '·', valor: valor || '·', max: max || '·' }); calculable = false }
      const obs = vacio(f[`${x}_observacion`])
      if (estado === 'unknown') {
        hayUnknown = true
        if (obs) informar('RV-FAC-05', AR, n, f, v)
      }
      if (estado === 'known' && obs) informar('RV-FAC-07', AR, n, f, v)
      if (!vacio(base)) {
        const conValor = estado === 'known' || (estado === 'unknown' && (!vacio(min) || !vacio(max)))
        if (!ORDEN_BASE.includes(base) || !conValor) informar('RV-PRO-05', AR, n, f, { f: x, valor: base })
        else basesConValor.push([x, base])
      }
    }
    if (hayUnknown && vacio(f.necesidad_validacion)) informar('RV-FAC-06', AR, n, f, {})
    const b = ORDEN_BASE.indexOf(f.base ?? '')
    if (b >= 0 && basesConValor.length > 0) {
      const [fd, debil] = basesConValor.reduce((a, c) => (ORDEN_BASE.indexOf(c[1]) > ORDEN_BASE.indexOf(a[1]) ? c : a))
      if (b < ORDEN_BASE.indexOf(debil)) informar('RV-PRO-06', AR, n, f, { base: f.base ?? '', f: fd, fb: debil })
    }
    return calculable
  }

  // Referencias entre filas de risks.csv.
  const filasDe = new Map<string, Registro[]>()
  for (const r of risks) filasDe.set(r.f.risk_id ?? '', [...(filasDe.get(r.f.risk_id ?? '') ?? []), r])
  for (const [rid, filas] of filasDe) {
    const [primera, ...resto] = filas
    if (primera === undefined) continue
    for (const r of resto) {
      const distinta = ['organizacion_id', 'tipo_objeto', 'riesgo_padre_id', 'miembros', 'titulo'].find((c) => (r.f[c] ?? '') !== (primera.f[c] ?? ''))
      if (distinta !== undefined) informar('RV-RSK-01', AR, r.n, r.f, { columna: distinta })
    }
    const tipo = primera.f.tipo_objeto
    if (tipo === 'padre') {
      for (const r of resto) informar('RV-RSK-07', AR, r.n, r.f, {})
      if (!risks.some((h) => h.f.tipo_objeto === 'sub_riesgo' && h.f.riesgo_padre_id === rid)) informar('RV-RSK-08', AR, primera.n, primera.f, {})
    }
    if (tipo === 'sub_riesgo' && !vacio(primera.f.riesgo_padre_id)) {
      const p = tipoDe.get(primera.f.riesgo_padre_id ?? '')
      if (p === undefined || p.tipo_objeto !== 'padre' || p.organizacion_id !== primera.f.organizacion_id) informar('RV-RSK-03', AR, primera.n, primera.f, {})
    }
    if (tipo === 'escenario') {
      const vistos = new Set<string>()
      for (const m of lista(primera.f.miembros)) {
        const t = tipoDe.get(m)
        const mal = t === undefined || vistos.has(m) || t.organizacion_id !== primera.f.organizacion_id || t.tipo_objeto === 'padre' || t.tipo_objeto === 'escenario'
        if (mal) informar('RV-RSK-05', AR, primera.n, primera.f, { miembro: m, tipo: t?.tipo_objeto ?? 'inexistente' })
        vistos.add(m)
      }
    }
    const evas = filas.filter((r) => !vacio(r.f.evaluacion_id))
    const iniciales = evas.filter((r) => r.f.tipo_evaluacion === 'inicial')
    if (iniciales.length > 1) informar('RV-EVA-03', AR, iniciales[1]?.n ?? primera.n, iniciales[1]?.f ?? primera.f, { ids: iniciales.map((r) => r.f.evaluacion_id).join(', ') })
    const porAnterior = new Map<string, Registro>()
    for (const r of evas) {
      const a = r.f.evaluacion_anterior_id ?? ''
      if (vacio(a)) continue
      const otra = porAnterior.get(a)
      if (otra !== undefined) informar('RV-EVA-07', AR, r.n, r.f, { id1: otra.f.evaluacion_id ?? '', id2: r.f.evaluacion_id ?? '', anterior: a })
      else porAnterior.set(a, r)
    }
  }
  unicos(AR, evaluaciones, 'evaluacion_id')
  origenes(AR, risks, 'id_origen', (f) => `riesgo ${f.risk_id ?? ''}`)
  origenes(AR, evaluaciones, 'evaluacion_id_origen', (f) => `evaluación ${f.evaluacion_id ?? ''}`)

  // ── action-plan.csv ─────────────────────────────────────────────────────────
  const AA: Archivo = 'action-plan.csv'
  for (const reg of acciones) {
    const { n, f } = reg
    formatoId(AA, reg, 'accion_id', 'ACC')
    tipos(AA, reg, (c) => c.nombre !== 'estado' || f.tipo_registro === 'accion')
    const t = tipoDe.get(f.risk_id ?? '')
    if (t === undefined || t.tipo_objeto === 'padre') informar('RV-ACC-01', AA, n, f, {})
    else if (t.tipo_objeto === 'escenario') informar('RV-ACC-02', AA, n, f, {})
    if (f.tipo_registro === 'accion') {
      const fs = lista(f.factor_objetivo)
      if (fs.length === 0 || fs.some((x) => !(FACTORES as readonly string[]).includes(x))) informar('RV-ACC-03', AA, n, f, { valor: f.factor_objetivo ?? '' })
      if (vacio(f.mecanismo_causal)) informar('RV-ACC-04', AA, n, f, {})
      else if (fs.length > 1 && !fs.every((x) => new RegExp(`(^|[\\s;.,(])${x}\\s*:`).test(f.mecanismo_causal ?? ''))) informar('RV-ACC-05', AA, n, f, {})
      if (f.estado === 'cumplida' && (!esFecha(f.fecha_cumplida ?? '') || lista(f.evidencia_ejecucion).filter((x) => x !== 'sin_evidencia').length === 0)) informar('RV-ACC-06', AA, n, f, {})
    }
    const efecto = f.efecto ?? ''
    if (vacio(efecto) !== vacio(f.evaluacion_efecto_id) || (!vacio(efecto) && !['efecto_total', 'efecto_parcial', 'sin_efecto_medible'].includes(efecto)) || (!vacio(efecto) && efecto !== 'efecto_total' && vacio(f.efecto_nota))) {
      informar('RV-ACC-07', AA, n, f, {})
    }
    if (!vacio(f.evaluacion_efecto_id)) {
      const e = evaPorId.get(f.evaluacion_efecto_id ?? '')
      if (e === undefined || e.f.risk_id !== f.risk_id || e.f.motivo !== 'accion_ejecutada' || e.f.accion_id !== f.accion_id) informar('RV-ACC-08', AA, n, f, {})
    }
    if (!vacio(efecto) && f.estado !== 'cumplida') informar('RV-ACC-09', AA, n, f, {})
    if (f.tipo_registro === 'decision_tratamiento' && (!['tratar', 'aceptar', 'transferir'].includes(f.decision ?? '') || !esFecha(f.fecha_proxima_revision ?? '') || (f.decision === 'aceptar' && vacio(f.fundamento)))) {
      informar('RV-ACC-10', AA, n, f, {})
    }
    procedencia(AA, reg)
    revision(AA, reg)
    notas(AA, reg)
  }
  unicos(AA, acciones, 'accion_id')
  origenes(AA, acciones, 'id_origen', (f) => f.accion_id ?? '')

  // ── risk-transfer.csv ───────────────────────────────────────────────────────
  const AT: Archivo = 'risk-transfer.csv'
  const coberturas = transferencias.filter((r) => r.f.tipo_registro === 'cobertura')
  const eventos = transferencias.filter((r) => r.f.tipo_registro === 'evento')
  const coberturaPorId = new Map(coberturas.map((r) => [r.f.transferencia_id ?? '', r]))
  for (const reg of transferencias) {
    const { n, f } = reg
    const tipo = f.tipo_registro ?? ''
    tipos(AT, reg, (c) => c.nombre !== 'suficiencia' || tipo === 'cobertura')
    const t = tipoDe.get(f.risk_id ?? '')
    if (tipo === 'cobertura') {
      formatoId(AT, reg, 'transferencia_id', 'TRF')
      if (t === undefined || t.tipo_objeto === 'padre') informar('RV-TRF-01', AT, n, f, {})
      const propia = COLUMNAS_EVENTO.find((c) => !vacio(f[c]))
      if (propia !== undefined) informar('RV-TRF-06', AT, n, f, { columna: propia, tipo })
      if (['poliza_ref', 'cobertura'].some((c) => vacio(f[c])) || !esFecha(f.vigencia_desde ?? '') || !esFecha(f.vigencia_hasta ?? '') || (f.vigencia_desde ?? '') > (f.vigencia_hasta ?? '')) {
        informar('RV-TRF-02', AT, n, f, {})
      }
      if (f.suficiencia !== 'no_evaluada' && !vacio(f.suficiencia) && vacio(f.suficiencia_nota)) informar('RV-TRF-08', AT, n, f, {})
      incertidumbre(AT, reg)
      revision(AT, reg)
    } else if (tipo === 'evento') {
      formatoId(AT, reg, 'evento_id', 'EVT')
      if (t === undefined || t.tipo_objeto === 'padre') informar('RV-TRF-01', AT, n, f, { transferencia_id: f.evento_id ?? '' })
      const propia = COLUMNAS_COBERTURA.find((c) => !vacio(f[c]))
      if (propia !== undefined) informar('RV-TRF-06', AT, n, f, { columna: propia, tipo })
      const c = coberturaPorId.get(f.transferencia_ref ?? '')
      if (c === undefined || c.f.risk_id !== f.risk_id) informar('RV-TRF-04', AT, n, f, {})
      const te = f.tipo_evento ?? ''
      if (!['firma', 'ampliacion', 'renovacion', 'consumo_limite', 'vencimiento', 'cancelacion'].includes(te) || !esFecha(f.fecha_evento ?? '') || (te === 'consumo_limite' && vacio(f.monto_evento))) {
        informar('RV-TRF-05', AT, n, f, {})
      }
      if (!vacio(f.uncertainty)) incertidumbre(AT, reg)
      if (!vacio(f.review_status)) revision(AT, reg)
    }
    for (const m of MONTOS_TRANSFERENCIA) {
      if (vacio(f[m])) continue
      if (!esMonto(f[m] ?? '') || !esMoneda(f.moneda ?? '')) informar('RV-TRF-03', AT, n, f, { columna: m })
    }
    procedencia(AT, reg)
    notas(AT, reg)
  }
  unicos(AT, coberturas, 'transferencia_id')
  unicos(AT, eventos, 'evento_id')
  origenes(AT, transferencias, 'id_origen', (f) => f.transferencia_id || f.evento_id || '')
  const porPoliza = new Map<string, Registro>()
  const polizasAvisadas = new Set<string>()
  for (const r of coberturas) {
    const p = r.f.poliza_ref ?? ''
    if (vacio(p)) continue
    const primera = porPoliza.get(p)
    if (primera === undefined) { porPoliza.set(p, r); continue }
    const distinta = ['limite_monto', 'moneda', 'vigencia_desde', 'vigencia_hasta'].some((c) => (r.f[c] ?? '') !== (primera.f[c] ?? ''))
    if (distinta && !polizasAvisadas.has(p)) { polizasAvisadas.add(p); informar('RV-TRF-07', AT, r.n, r.f, {}) }
  }
  for (const r of coberturas) {
    const hasta = r.f.vigencia_hasta ?? ''
    if (!esFecha(hasta) || hasta >= opciones.fechaCorte) continue
    const cerrada = eventos.some((e) => e.f.transferencia_ref === r.f.transferencia_id && ['renovacion', 'vencimiento'].includes(e.f.tipo_evento ?? ''))
    if (!cerrada) informar('RV-TRF-09', AT, r.n, r.f, {})
  }

  // ── Reglas sobre la evaluación vigente (decisión 8a) ────────────────────────
  for (const [rid, filas] of filasDe) {
    const vig = vigente(filas)
    if (vig === undefined) continue
    if (coberturas.some((c) => c.f.risk_id === rid) && vacio(vig.f.i_econ_monto_bruto)) informar('RV-ECO-02', AR, vig.n, vig.f, {})
    const fac = factoresDe(vig.f)
    if (!safetyCritical(fac.i, { evaluable: evaluar(fac).evaluable })) continue
    const cubierto = acciones.some((a) => a.f.risk_id === rid && (
      (a.f.tipo_registro === 'accion' && a.f.estado === 'en_curso')
      || (a.f.tipo_registro === 'decision_tratamiento' && (a.f.fecha_proxima_revision ?? '') > opciones.fechaCorte)))
    if (!cubierto) informar('RV-ACC-11', AR, vig.n, vig.f, {})
  }

  return ordenar(hallazgos)
}

/**
 * Evaluación vigente (decisión 8a): la última `accepted` de la cadena; si no hay, la última no
 * rechazada. «Última» sigue la cadena de evaluacion_anterior_id desde la inicial.
 */
function vigente(filas: readonly Registro[]): Registro | undefined {
  const evas = filas.filter((r) => !vacio(r.f.evaluacion_id))
  const inicial = evas.find((r) => r.f.tipo_evaluacion === 'inicial')
  const cadena: Registro[] = []
  const visitadas = new Set<string>()
  for (let r = inicial; r !== undefined && !visitadas.has(r.f.evaluacion_id ?? '');) {
    cadena.push(r)
    visitadas.add(r.f.evaluacion_id ?? '')
    const actual: Registro = r
    r = evas.find((x) => x.f.evaluacion_anterior_id === actual.f.evaluacion_id)
  }
  return cadena.filter((r) => r.f.review_status === 'accepted').at(-1) ?? cadena.filter((r) => r.f.review_status !== 'rejected').at(-1)
}

/** Factores de una fila ya validada, en la forma del arnés de la metodología. */
export function factoresDe(f: Fila): Factores {
  const uno = (x: string): Factor<Nivel> => {
    const min = f[`${x}_min`] ?? ''
    const max = f[`${x}_max`] ?? ''
    return {
      valor: f[`${x}_estado`] === 'known' ? (Number(f[`${x}_valor`]) as Nivel) : 'unknown',
      ...(min === '' ? {} : { min: Number(min) as Nivel }),
      ...(max === '' ? {} : { max: Number(max) as Nivel }),
    }
  }
  const i = Object.fromEntries((['econ', 'pers', 'cont', 'legal'] as Dimension[]).map((d) => [d, uno(`i_${d}`)])) as Record<Dimension, Factor<Nivel>>
  const vRec: Factor<Recuperacion> = f.v_rec_estado === 'no_aplica' ? { valor: 'no_aplica' } : uno('v_rec')
  return { p: uno('p'), i, vCont: uno('v_cont'), vRec }
}

function idDeFila(archivo: Archivo, f: Fila): string {
  if (archivo === 'risks.csv') return f.evaluacion_id || f.risk_id || ''
  if (archivo === 'action-plan.csv') return f.accion_id ?? ''
  return f.transferencia_id || f.evento_id || ''
}

/** Columnas con RV-ARCH-05 que no pueden ir vacías en esta fila. */
function obligatoriaPorTipo(archivo: Archivo, columna: string, f: Fila): boolean {
  if (archivo === 'risks.csv') {
    if (['tipo_objeto', 'titulo'].includes(columna)) return true
    if (['tipo_evaluacion', 'fecha', 'version_metodologia', 'evaluador'].includes(columna)) return f.tipo_objeto !== 'padre'
    return false
  }
  if (archivo === 'action-plan.csv') {
    if (['tipo_registro', 'descripcion', 'fecha_alta'].includes(columna)) return true
    if (columna === 'estado') return f.tipo_registro === 'accion'
    return false
  }
  if (columna === 'tipo_registro') return true
  if (columna === 'suficiencia') return f.tipo_registro === 'cobertura'
  return false
}

function ordenar(h: Hallazgo[]): Hallazgo[] {
  const orden = (a: Archivo): number => ARCHIVOS.indexOf(a)
  return h.sort((a, b) => orden(a.archivo) - orden(b.archivo) || (a.fila ?? 0) - (b.fila ?? 0) || a.regla_id.localeCompare(b.regla_id))
}
