// Fase 15b de T-0021: escribe los CSV sintéticos de Risk OS en los formatos aprobados en la 15a.
//
//   node generar.ts            escribe risks.csv, action-plan.csv, risk-transfer.csv,
//                              mapeo-ids.csv y no-cupo.csv en esta carpeta
//   node generar.ts --check    no escribe: falla si algún archivo difiere de lo que genera
//
// Lee sin tocar: las listas fijas y las fichas de transferencia de EMI-41, las evaluaciones del
// experimento (Fases 8, 11 y 12) y el contrato. Las empresas son las que aprobó Emiliano (10a).
// Lo que agrega la 15b (acciones, reevaluaciones, un riesgo sin evaluar y un evento de póliza)
// está en `nuevos.ts` y sale con `lote_origen = T-0021/15b`. Nada de esto calcula derivados:
// el contrato no los tiene (decisión 6a).

import { createHash } from 'node:crypto'
import { readdirSync, readFileSync, writeFileSync } from 'node:fs'

import { comoFilas, escribirCsv, leerCsv } from '../validador/csv.ts'
import { nuevos15b, type Nuevos } from './nuevos.ts'

const AQUI = new URL('./', import.meta.url)
const FASE15 = new URL('../', AQUI)
const RAIZ = new URL('../../../', AQUI)

export const EMPRESAS = ['S05', 'S06', 'S07', 'S15', 'S28', 'S29', 'S32', 'S36'] as const
export const LOTE_EMI41 = 'T-0021/EMI-41'
export const LOTE_15B = 'T-0021/15b'
export const FACTORES = ['p', 'i_econ', 'i_pers', 'i_cont', 'i_legal', 'v_cont', 'v_rec'] as const
const ORDEN_BASE = ['observed', 'reported', 'inferred', 'assumed']

export type Fila = Record<string, string>

export function leer(ruta: URL): Fila[] {
  const l = leerCsv(readFileSync(ruta))
  if (!l.ok) throw new Error(`${ruta.pathname}: ${l.motivo} (línea ${String(l.linea)})`)
  return comoFilas(l)
}

export function columnasContrato(archivo: 'risks' | 'action-plan' | 'risk-transfer'): string[] {
  return leer(new URL(`contrato/columnas-${archivo}.csv`, FASE15)).map((c) => c.columna ?? '')
}

// ── Ids: prefijo de entidad y ULID (decisión 1a) ─────────────────────────────

const CROCKFORD = '0123456789ABCDEFGHJKMNPQRSTVWXYZ'

/**
 * ULID determinista: los 48 bits de tiempo son la fecha del registro a las 00:00 UTC y los 80
 * bits restantes salen del SHA-256 de su origen. Así el script es reproducible y el id sigue
 * siendo un ULID válido (26 caracteres de Crockford, ordenable por fecha).
 */
export function ulid(fecha: string, semilla: string): string {
  let t = BigInt(Date.parse(`${fecha}T00:00:00Z`))
  const h = createHash('sha256').update(semilla).digest()
  let r = 0n
  for (let i = 0; i < 10; i++) r = (r << 8n) | BigInt(h[i] ?? 0)
  let s = ''
  for (let i = 0; i < 16; i++) { s = (CROCKFORD[Number(r & 31n)] ?? '') + s; r >>= 5n }
  let ts = ''
  for (let i = 0; i < 10; i++) { ts = (CROCKFORD[Number(t & 31n)] ?? '') + ts; t >>= 5n }
  return ts + s
}

export const idDe = (prefijo: string, fecha: string, semilla: string): string => `${prefijo}-${ulid(fecha, `${prefijo}|${semilla}`)}`
const FECHA_DATASET = '2026-09-30'

// ── Fuentes ──────────────────────────────────────────────────────────────────

const V0 = new URL('v0/', RAIZ)
const FUENTES: [string, URL][] = [
  ...readdirSync(new URL('fase-8/agente/', V0)).sort().map((d): [string, URL] => ['agente', new URL(`fase-8/agente/${d}/fichas.csv`, V0)]),
  ['emiliano', new URL('fase-8/emiliano/fichas-emiliano.csv', V0)],
  ['agente', new URL('fase-11/reevaluacion/fichas-reevaluadas.csv', V0)],
  ['agente', new URL('fase-11/reevaluacion/fichas-ronda-2.csv', V0)],
  ['piloto-f12', new URL('fase-12/piloto-emiliano/etapa-b/fichas-emiliano-cerradas.csv', V0)],
]

export interface Fuente { readonly fila: Fila; readonly ruta: string }

export function evaluacionesDelExperimento(): Map<string, Fuente[]> {
  const porRiesgo = new Map<string, Fuente[]>()
  for (const [, ruta] of FUENTES) {
    for (const fila of leer(ruta)) {
      const rid = fila.risk_id ?? ''
      if (!EMPRESAS.some((e) => rid.startsWith(`${e}-`))) continue
      const lista = porRiesgo.get(rid) ?? []
      lista.push({ fila, ruta: ruta.pathname.slice(RAIZ.pathname.length) })
      porRiesgo.set(rid, lista)
    }
  }
  return porRiesgo
}

/**
 * Una sola historia por riesgo (decisión 8a): la cadena del agente, salvo S15-R04, donde la
 * historia es la de Emiliano con la propuesta aceptada EV-11-0064 (criterio K8 de la 15a). Las
 * evaluaciones paralelas del experimento no se importan; quedan en `mapeo-ids.csv`.
 */
export const HISTORIA_DE_EMILIANO = new Set(['S15-R04'])

export function cadena(rid: string, todas: Fuente[]): { elegidas: Fuente[]; fuera: Fuente[] } {
  const inicialDe = (quien: 'human' | 'ai'): Fuente | undefined =>
    todas.find((x) => x.fila.tipo_evaluacion === 'inicial' && x.fila.actor === quien && x.ruta.includes('fase-8/'))
  const inicio = inicialDe(HISTORIA_DE_EMILIANO.has(rid) ? 'human' : 'ai')
  if (inicio === undefined) throw new Error(`${rid}: sin evaluación inicial del experimento`)
  const elegidas = [inicio]
  for (;;) {
    const ultima = elegidas.at(-1)?.fila.evaluacion_id
    const sig = todas.filter((x) => x.fila.evaluacion_anterior_id === ultima)
    if (sig.length > 1) throw new Error(`${rid}: historia ramificada en ${String(ultima)}`)
    const s = sig[0]
    if (s === undefined) break
    elegidas.push(s)
  }
  return { elegidas, fuera: todas.filter((x) => !elegidas.includes(x)) }
}

// ── Conversión de una ficha de evaluación ────────────────────────────────────

export interface NoCupo {
  tipo: 'no_cupo' | 'cupo_parcial' | 'asignado_por_conversion'
  archivo_destino: string
  campo: string
  ficha: string
  risk_id: string
  dato: string
  por_que: string
  salida_propuesta: string
}

const refs = (e: string): string[] => e.split(';').map((x) => x.trim()).filter((x) => x !== '')

/** Base y evidencia del registro (EMI-17) a partir de las de sus factores con valor (regla de conversión). */
export function procedenciaDelRegistro(fila: Fila): { base: string; evidencia: string } {
  // «Con valor» como en RV-PRO-05 y RV-PRO-06: known, o unknown con rango registrado.
  const conValor = (f: string): boolean => fila[`${f}_estado`] === 'known' || (fila[`${f}_estado`] === 'unknown' && ((fila[`${f}_min`] ?? '') !== '' || (fila[`${f}_max`] ?? '') !== ''))
  const bases = FACTORES.filter(conValor).map((f) => fila[`${f}_base`] ?? '').filter((b) => ORDEN_BASE.includes(b))
  const base = bases.length === 0 ? 'assumed' : ORDEN_BASE[Math.max(...bases.map((b) => ORDEN_BASE.indexOf(b)))] ?? 'assumed'
  const todas = [...new Set(FACTORES.flatMap((f) => refs(fila[`_${f}_evidencia_original`] ?? fila[`${f}_evidencia`] ?? '')).filter((x) => x !== 'sin_evidencia'))]
  return { base, evidencia: todas.length === 0 ? 'sin_evidencia' : todas.join(';') }
}

export function convertirFactores(origen: Fila, ficha: string, noCupo: NoCupo[]): Fila {
  const out: Fila = {}
  for (const f of FACTORES) {
    const v = origen[`${f}_valor`] ?? ''
    const estado = v === 'unknown' ? 'unknown' : v === 'no_aplica' ? 'no_aplica' : 'known'
    out[`${f}_estado`] = estado
    out[`${f}_valor`] = estado === 'known' ? v : ''
    out[`${f}_min`] = origen[`${f}_min`] ?? ''
    out[`${f}_max`] = origen[`${f}_max`] ?? ''
    out[`${f}_observacion`] = origen[`${f}_observacion`] ?? ''
    const base = origen[`${f}_base`] ?? ''
    const evidencia = origen[`${f}_evidencia`] ?? ''
    out[`_${f}_evidencia_original`] = evidencia
    const sinRango = out[`${f}_min`] === '' && out[`${f}_max`] === ''
    if (base !== '' && (estado === 'no_aplica' || (estado === 'unknown' && sinRango))) {
      out[`${f}_base`] = ''
      noCupo.push({
        tipo: 'no_cupo', archivo_destino: 'risks.csv', campo: `${f}_base`, ficha, risk_id: origen.risk_id ?? '',
        dato: `${f}_base = ${base} con ${f} ${estado}${estado === 'unknown' ? ' sin rango' : ''}`,
        por_que: 'RV-PRO-05: la base por factor sólo vale en un factor con valor o rango',
        salida_propuesta: 'a) queda fuera, como ahora (la base del registro no cambia); b) que RV-PRO-05 acepte base en no_aplica, porque afirma un hecho (no hay etapa de recuperación)',
      })
    } else out[`${f}_base`] = base
    if (evidencia.includes('sin_evidencia') && refs(evidencia).length > 1) {
      out[`${f}_evidencia`] = ''
      noCupo.push({
        tipo: 'no_cupo', archivo_destino: 'risks.csv', campo: `${f}_evidencia`, ficha, risk_id: origen.risk_id ?? '',
        dato: `${f}_evidencia = ${evidencia}`,
        por_que: 'RV-PRO-03: sin_evidencia no se combina con referencias en la misma celda',
        salida_propuesta: 'a) queda fuera, como ahora (las referencias siguen en la evidencia del registro); b) que la ficha diga qué parte del dato no tiene evidencia en la observación del factor',
      })
    } else out[`${f}_evidencia`] = evidencia
  }
  return out
}

// ── risks.csv ────────────────────────────────────────────────────────────────

export interface Resultado {
  readonly archivos: Record<string, string>
  readonly risks: Fila[]
  readonly acciones: Fila[]
  readonly transferencias: Fila[]
  readonly mapeo: Fila[]
  readonly noCupo: NoCupo[]
}

export function generar(): Resultado {
  const lista = readdirSync(new URL('emi41/', V0)).filter((f) => /^lista-riesgos-.*\.csv$/.test(f)).sort()
    .flatMap((f) => leer(new URL(`emi41/${f}`, V0)))
    .filter((r) => EMPRESAS.includes((r.empresa ?? '') as (typeof EMPRESAS)[number]))
  const evals = evaluacionesDelExperimento()
  const noCupo: NoCupo[] = []
  const mapeo: Fila[] = []

  const org = (s: string): string => idDe('ORG', FECHA_DATASET, `${LOTE_EMI41}/${s}`)
  const rsk = (rid: string): string => idDe('RSK', FECHA_DATASET, `${LOTE_EMI41}/${rid}`)
  for (const s of EMPRESAS) mapeo.push({ entidad: 'organizacion', id_nuevo: org(s), lote_origen: LOTE_EMI41, id_origen: s, risk_id_origen: '', estado: 'importada', motivo: 'id opaco, sin Party (decisión 1a, D-0063)', fuente: `v0/emi41/fichas/${s}/empresa.md` })

  const identidad = (r: Fila): Fila => ({
    risk_id: rsk(r.risk_id ?? ''),
    organizacion_id: org(r.empresa ?? ''),
    tipo_objeto: r.tipo_objeto ?? '',
    riesgo_padre_id: r.riesgo_padre_id ? rsk(r.riesgo_padre_id) : '',
    miembros: r.tipo_objeto === 'escenario' ? refs(r.miembros ?? '').map(rsk).join(';') : '',
    titulo: r.titulo ?? '',
    id_origen: r.risk_id ?? '',
    lote_origen: LOTE_EMI41,
  })

  const risks: Fila[] = []
  const evaPorOrigen = new Map<string, Fila>()
  for (const r of lista) {
    const rid = r.risk_id ?? ''
    mapeo.push({ entidad: 'riesgo', id_nuevo: rsk(rid), lote_origen: LOTE_EMI41, id_origen: rid, risk_id_origen: rid, estado: 'importada', motivo: '', fuente: `v0/emi41/fichas/${r.empresa ?? ''}/${rid}.md` })
    const todas = evals.get(rid) ?? []
    if (r.tipo_objeto === 'padre') {
      // Decisión 7a: el padre es una fila sin evaluación; sólo trae la consecuencia común.
      const f = todas[0]
      if (f === undefined) throw new Error(`${rid}: padre sin ficha`)
      risks.push({ ...identidad(r), riesgo_consecuencia: f.fila.riesgo_consecuencia ?? '' })
      for (const x of todas) mapeo.push({ entidad: 'evaluacion', id_nuevo: '', lote_origen: LOTE_EMI41, id_origen: x.fila.evaluacion_id ?? '', risk_id_origen: rid, estado: 'no_importada', motivo: 'ficha de padre: el padre no tiene evaluación ni factores (decisión 7a); su consecuencia común va a la fila del padre', fuente: x.ruta })
      continue
    }
    const { elegidas, fuera } = cadena(rid, todas)
    for (const x of elegidas) {
      const o = x.fila
      const ficha = `${x.ruta} ${o.evaluacion_id ?? ''}`
      const id = idDe('EVA', o.fecha ?? '', `${LOTE_EMI41}/${o.evaluacion_id ?? ''}/${rid}`)
      const anterior = o.evaluacion_anterior_id ? evaPorOrigen.get(`${o.evaluacion_anterior_id}/${rid}`)?.evaluacion_id ?? '' : ''
      if (o.evaluacion_anterior_id && anterior === '') throw new Error(`${ficha}: anterior fuera de la historia`)
      const factores = convertirFactores(o, ficha, noCupo)
      const fila: Fila = {
        ...identidad(r),
        evaluacion_id: id,
        evaluacion_id_origen: o.evaluacion_id ?? '',
        tipo_evaluacion: o.tipo_evaluacion ?? '',
        evaluacion_anterior_id: anterior,
        motivo: o.motivo ?? '',
        accion_id: '',
        fecha: o.fecha ?? '',
        version_metodologia: o.version_metodologia ?? '',
        evaluador: o.evaluador ?? '',
        actor: o.actor ?? '',
        riesgo_causa: o.riesgo_causa ?? '',
        riesgo_evento: o.riesgo_evento ?? '',
        riesgo_consecuencia: o.riesgo_consecuencia ?? '',
        ...factores,
        uncertainty: o.uncertainty ?? '',
        uncertainty_nota: o.uncertainty_nota ?? '',
        necesidad_validacion: o.necesidad_validacion ?? '',
        motivo_no_evaluable: o.motivo_no_evaluable ?? '',
        justificacion: o.justificacion ?? '',
        reglas_aplicadas: o.reglas_aplicadas ?? '',
        review_status: o.review_status ?? '',
        revisado_por: o.revisado_por ?? '',
        // La plantilla no tenía revisado_por_actor: las dos aceptaciones del experimento son de Emiliano.
        revisado_por_actor: o.review_status && o.review_status !== 'pending' ? (o.revisado_por === 'emiliano' ? 'human' : '') : '',
        fecha_revision: o.fecha_revision ?? '',
      }
      Object.assign(fila, procedenciaDelRegistro(fila))
      evaPorOrigen.set(`${o.evaluacion_id ?? ''}/${rid}`, fila)
      risks.push(fila)
      mapeo.push({ entidad: 'evaluacion', id_nuevo: id, lote_origen: LOTE_EMI41, id_origen: o.evaluacion_id ?? '', risk_id_origen: rid, estado: 'importada', motivo: '', fuente: x.ruta })
    }
    for (const x of fuera) {
      const motivo = x.ruta.includes('fase-12/')
        ? 'evaluación paralela del piloto de la Fase 12: una sola historia por riesgo (decisión 8a)'
        : 'evaluación paralela del experimento (otro evaluador sobre el mismo riesgo): una sola historia por riesgo (decisión 8a)'
      mapeo.push({ entidad: 'evaluacion', id_nuevo: '', lote_origen: LOTE_EMI41, id_origen: x.fila.evaluacion_id ?? '', risk_id_origen: rid, estado: 'no_importada', motivo, fuente: x.ruta })
    }
  }

  // ── risk-transfer.csv ──────────────────────────────────────────────────────
  const transferencias = convertirTransferencias(rsk, noCupo, mapeo)

  // ── lo que agrega la 15b ───────────────────────────────────────────────────
  const n: Nuevos = nuevos15b({ risks, transferencias, rsk, org })
  risks.push(...n.risks)
  transferencias.push(...n.transferencias)
  for (const m of n.mapeo) mapeo.push(m)

  const colR = columnasContrato('risks')
  const colA = columnasContrato('action-plan')
  const colT = columnasContrato('risk-transfer')
  const colM = ['entidad', 'id_nuevo', 'lote_origen', 'id_origen', 'risk_id_origen', 'estado', 'motivo', 'fuente']
  const colN = ['n', 'tipo', 'archivo_destino', 'campo', 'ficha', 'risk_id', 'dato', 'por_que', 'salida_propuesta']
  const archivos = {
    'risks.csv': escribirCsv(colR, risks),
    'action-plan.csv': escribirCsv(colA, n.acciones),
    'risk-transfer.csv': escribirCsv(colT, transferencias),
    'mapeo-ids.csv': escribirCsv(colM, mapeo),
    'no-cupo.csv': escribirCsv(colN, noCupo.map((x, i) => ({ n: String(i + 1), ...x }))),
  }
  return { archivos, risks, acciones: n.acciones, transferencias, mapeo, noCupo }
}

// ── Transferencia: desde las fichas, con las citas de `guion/` ───────────────

/** Monto en USD de la primera cifra de una cita: «USD 2,0 M», «USD 40 mil», «USD 8.500». */
export function montoUsd(cita: string): string {
  const m = /USD\s?(\d{1,3}(?:\.\d{3})*(?:,\d+)?|\d+(?:,\d+)?)\s?(M\b|mil\b)?/.exec(cita)
  if (m === null) throw new Error(`sin monto en USD: «${cita}»`)
  const n = Number((m[1] ?? '').replaceAll('.', '').replace(',', '.'))
  const mult = m[2] === 'M' ? 1_000_000 : m[2] === 'mil' ? 1_000 : 1
  return String(Math.round(n * mult))
}

const partes = (c: string): string[] => c.split(' || ').filter((x) => x !== '')

function convertirTransferencias(rsk: (rid: string) => string, noCupo: NoCupo[], mapeo: Fila[]): Fila[] {
  const polizas = new Map(leer(new URL('guion/polizas.csv', AQUI)).map((p) => [p.poliza_ref ?? '', p]))
  const alcance = leer(new URL('guion/alcance.csv', AQUI))
  const md = new Map<string, string>()
  const ficha = (s: string): string => `v0/emi41/fichas/${s}/transferencia.md`
  const textoDe = (s: string): string => {
    const t = md.get(s) ?? readFileSync(new URL(ficha(s), RAIZ), 'utf8')
    md.set(s, t)
    return t
  }
  /** Cada cita del guion tiene que estar literalmente en la ficha: nada se escribe que la ficha no diga. */
  const cita = (s: string, c: string): string => {
    for (const p of partes(c)) if (!textoDe(s).includes(p)) throw new Error(`${ficha(s)}: la cita «${p}» no está en la ficha`)
    return partes(c).join('; ')
  }
  const out: Fila[] = []
  for (const a of alcance) {
    const p = polizas.get(a.poliza_ref ?? '')
    if (p === undefined) throw new Error(`póliza ${String(a.poliza_ref)} sin guion`)
    const s = p.empresa ?? ''
    const rid = a.risk_id ?? ''
    const cobertura = cita(s, a.cobertura ?? '')
    if (a.incluir !== 'si') {
      const motivo = a.motivo ?? ''
      noCupo.push({
        tipo: 'no_cupo', archivo_destino: 'risk-transfer.csv',
        campo: motivo === 'no_responde' ? 'registro de cobertura' : 'vigencia_desde; vigencia_hasta',
        ficha: ficha(s), risk_id: rid, dato: `${p.poliza ?? ''}: ${cobertura}`,
        por_que: motivo === 'no_responde'
          ? 'la ficha dice que la póliza no responde por este riesgo: no es una cobertura; decir que no alcanza sería suficiencia = sin_cobertura, que es una evaluación profesional'
          : motivo === 'vigencia_sin_fecha'
            ? `la ficha da la vigencia sin fechas («${cita(s, VIGENCIA_SIN_FECHA[a.poliza_ref ?? ''] ?? '')}»); RV-TRF-02 exige vigencia_desde y vigencia_hasta`
            : 'la ficha no da la vigencia de esta póliza; RV-TRF-02 exige vigencia_desde y vigencia_hasta',
        salida_propuesta: motivo === 'no_responde'
          ? 'a) queda fuera, como ahora; b) registro de cobertura con suficiencia = sin_cobertura y la nota de la ficha'
          : 'a) queda fuera hasta que la ficha traiga fechas (los casos reales las tienen en la póliza); b) que la vigencia acepte un texto («anual», «hasta la recepción provisoria») con vigencia_hasta vacía, y RV-TRF-09 no se evalúe',
      })
      continue
    }
    const vig = cita(s, p.vigencia ?? '').match(/\d{4}-\d{2}-\d{2}/g) ?? []
    const desde = vig[0] ?? ''
    const hasta = vig.at(-1) ?? ''
    const id = idDe('TRF', desde, `${LOTE_EMI41}/${a.poliza_ref ?? ''}/${rid}`)
    const sinProcedencia = (p.base ?? '') === ''
    const queFalta = p.que_falta ?? ''
    const fila: Fila = {
      tipo_registro: 'cobertura',
      transferencia_id: id,
      risk_id: rsk(rid),
      id_origen: `${a.poliza_ref ?? ''}/${rid}`,
      lote_origen: LOTE_EMI41,
      poliza_ref: a.poliza_ref ?? '',
      cobertura: cobertura || cita(s, p.cobertura ?? ''),
      vigencia_desde: desde,
      vigencia_hasta: hasta,
      limite_monto: p.limite ? montoUsd(cita(s, p.limite)) : '',
      sublimite_aplicable_monto: a.sublimite_aplicable ? montoUsd(cita(s, a.sublimite_aplicable)) : '',
      sublimites_texto: cita(s, p.sublimites_texto ?? ''),
      deducible_monto: a.deducible_monto ? montoUsd(cita(s, a.deducible_monto)) : p.deducible_monto ? montoUsd(cita(s, p.deducible_monto)) : '',
      deducible_texto: cita(s, p.deducible_texto ?? ''),
      exclusiones: cita(s, p.exclusiones ?? ''),
      exposicion_retenida_monto: '',
      exposicion_retenida_nota: '',
      // La ficha describe la póliza; juzgar si alcanza es una conclusión profesional (non-scope de T-0021).
      suficiencia: 'no_evaluada',
      suficiencia_nota: '',
      moneda: 'USD',
      actor: 'import',
      base: sinProcedencia ? 'reported' : p.base ?? '',
      evidencia: sinProcedencia ? 'sin_evidencia' : p.evidencia ?? '',
      uncertainty: sinProcedencia || queFalta !== '' ? 'medium' : 'low',
      uncertainty_nota: sinProcedencia ? 'La ficha de transferencia no registra la procedencia de las condiciones de la póliza' : cita(s, queFalta),
      review_status: 'pending',
    }
    out.push(fila)
    mapeo.push({ entidad: 'transferencia', id_nuevo: id, lote_origen: LOTE_EMI41, id_origen: fila.id_origen ?? '', risk_id_origen: rid, estado: 'importada', motivo: '', fuente: ficha(s) })
    if (p.limite === '' || p.limite === undefined) {
      if (!noCupo.some((x) => x.campo === 'limite_monto' && x.dato.startsWith(p.poliza ?? '-'))) {
        noCupo.push({ tipo: 'cupo_parcial', archivo_destino: 'risk-transfer.csv', campo: 'limite_monto', ficha: ficha(s), risk_id: '(toda la póliza)', dato: `${p.poliza ?? ''}: suma asegurada distinta por equipo`, por_que: 'el límite depende del equipo dañado y el formato tiene un solo limite_monto por cobertura, sin texto de límite', salida_propuesta: 'a) limite_monto vacío y el detalle en la ficha, como ahora; b) agregar limite_texto al contrato' })
      }
    }
    if (partes(p.vigencia ?? '').length > 1 && !noCupo.some((x) => x.campo === 'vigencia_hasta' && x.ficha === ficha(s))) {
      noCupo.push({ tipo: 'cupo_parcial', archivo_destino: 'risk-transfer.csv', campo: 'vigencia_hasta', ficha: ficha(s), risk_id: rid, dato: cita(s, p.vigencia ?? ''), por_que: 'la vigencia termina en una fecha o en la cosecha, lo que ocurra primero; se registró la fecha y la condición no tiene columna', salida_propuesta: 'a) la fecha máxima, como ahora; b) que vigencia_hasta tenga una nota' })
    }
    if (sinProcedencia && !noCupo.some((x) => x.tipo === 'asignado_por_conversion' && x.ficha === ficha(s))) {
      noCupo.push({ tipo: 'asignado_por_conversion', archivo_destino: 'risk-transfer.csv', campo: 'base; evidencia; uncertainty', ficha: ficha(s), risk_id: '(toda la ficha)', dato: 'la ficha no tiene tabla de procedencia', por_que: 'base, evidencia y uncertainty son obligatorias en una cobertura (RV-PRO-01, RV-PRO-02, RV-UNC-01)', salida_propuesta: 'a) base = reported, evidencia = sin_evidencia y uncertainty = medium con nota, como ahora; b) dejar la ficha fuera hasta que tenga procedencia' })
    }
  }
  // Siniestros que la ficha cuenta y no son de la vigencia descrita: no hay cobertura a la que apuntar.
  for (const [s, dato] of SINIESTROS_PREVIOS) {
    noCupo.push({ tipo: 'no_cupo', archivo_destino: 'risk-transfer.csv', campo: 'evento (tipo_evento, fecha_evento, monto_evento)', ficha: ficha(s), risk_id: '', dato: cita(s, dato), por_que: 'es de una vigencia anterior que la ficha no describe como cobertura, y la ficha no dice a qué riesgo corresponde; un evento tiene que apuntar a una cobertura del mismo riesgo (RV-TRF-04)', salida_propuesta: 'a) queda fuera, como ahora; b) importar también la cobertura de la vigencia anterior, si el caso real la tiene' })
  }
  return out
}

/** La vigencia en palabras de las pólizas que la ficha no fecha (citas literales). */
const VIGENCIA_SIN_FECHA: Record<string, string> = {
  'POL-S05-1': 'Hasta la recepción provisoria',
  'POL-S32-3': 'Anual',
  'POL-S36-2': 'Año lectivo 2026',
}

const SINIESTROS_PREVIOS: [string, string][] = [
  ['S15', 'Granizo 2025-12-18 en finca B: 40 ha con 25% de daño; indemnización de USD 58 mil, cobrada en 2026-03'],
  ['S32', '2024-11, vuelco de la subestructura: daño USD 380 mil; indemnizados USD 254 mil (regla proporcional y deducible)'],
  ['S32', '2023-06, incendio de motor: USD 85 mil de daño, indemnizados USD 35 mil'],
  ['S36', '2023-07: la aseguradora de accidentes personales rechazó los gastos médicos del brote de 2023-06 por tratarse de una enfermedad'],
  ['S36', '2025-08: pago de responsabilidad civil por el acuerdo de USD 9 mil del traumatismo de cráneo de 2025-06 (USD 4 mil después del deducible)'],
]

// ── Línea de comandos ────────────────────────────────────────────────────────

if (import.meta.url === `file://${process.argv[1] ?? ''}`) {
  const { archivos, noCupo } = generar()
  const check = process.argv.includes('--check')
  let distintos = 0
  for (const [nombre, contenido] of Object.entries(archivos)) {
    const ruta = new URL(nombre, AQUI)
    if (check) {
      let actual = ''
      try { actual = readFileSync(ruta, 'utf8') } catch { /* no existe */ }
      if (actual !== contenido) { distintos++; console.error(`${nombre}: difiere de lo que genera el script`) }
    } else writeFileSync(ruta, contenido)
  }
  const filas = (t: string): number => t.split('\n').length - 2
  console.log(Object.entries(archivos).map(([k, v]) => `${k}: ${String(filas(v))} filas`).join('; '))
  console.log(`no-cupo: ${String(noCupo.length)}`)
  if (distintos > 0) process.exit(1)
}
