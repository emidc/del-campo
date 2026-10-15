// De un lote ya validado (cero rechazos) a las filas del esquema `risk`. Puro: no escribe; lo
// hace `src/persistence/importacion.ts` en una transacción.
//
// Lo importado queda como está en el archivo (T-0029, ## Outcome): nada se acepta, se calcula
// ni se completa. Una celda vacía (o sólo espacios, que el validador lee como vacía) es `null`;
// una lista separada por `;` es un arreglo; lo demás va tal cual. `review_status` no es una
// columna de la evaluación, la acción ni la cobertura: si no es `pending`, es una fila de
// `revision_humana` con el texto de `revisado_por` (T-0028). Los derivados no se guardan
// (decisión 6a).
//
// Si una celda con valor no tiene dónde guardarse en el esquema, el lote no se escribe:
// `columnasSinDestino` las lista para que el owner decida (T-0029, ## Risks). Hoy son las
// columnas de ejecución de una decisión de tratamiento y la incertidumbre y la revisión de un
// evento de póliza, que el contrato tolera y el esquema de T-0028 no tiene.

import { ARCHIVOS, porArchivo, type Archivo } from './contrato.ts'
import { comoFilas, leerCsv } from './csv.ts'
import type { Existentes } from './validador.ts'

export type Valor = string | number | readonly string[] | null
export type FilaDb = Readonly<Record<string, Valor>>

/** Las tablas que escribe una importación, en el orden en que se escriben. */
export const TABLAS_IMPORTACION = [
  'riesgo', 'miembro_escenario', 'accion', 'evaluacion', 'accion_estado', 'transferencia', 'evento_poliza', 'revision_humana',
] as const
export type TablaImportacion = (typeof TABLAS_IMPORTACION)[number]

export type FilasParaEscribir = Readonly<Record<TablaImportacion, readonly FilaDb[]>>

export interface SinDestino {
  readonly archivo: Archivo
  readonly fila: number
  readonly id: string
  readonly columna: string
}

type Fila = Readonly<Record<string, string>>
interface Registro { readonly n: number; readonly f: Fila }

const FACTORES = ['p', 'i_econ', 'i_pers', 'i_cont', 'i_legal', 'v_cont', 'v_rec'] as const
const ORIGEN = 'importacion'

const vacio = (v: string | undefined): boolean => (v ?? '').trim() === ''
const texto = (v: string | undefined): string | null => (vacio(v) ? null : (v ?? ''))
const lista = (v: string | undefined): string[] | null => {
  const l = (v ?? '').split(';').map((x) => x.trim()).filter((x) => x !== '')
  return l.length === 0 ? null : l
}
const nivel = (v: string | undefined): number | null => (vacio(v) ? null : Number(v))

/** Columnas de cada tipo de fila que no tienen columna en el esquema. */
const SIN_COLUMNA: Readonly<Record<string, readonly string[]>> = {
  'action-plan.csv decision_tratamiento': ['estado', 'fecha_cumplida', 'evidencia_ejecucion', 'efecto', 'efecto_nota', 'evaluacion_efecto_id'],
  'risk-transfer.csv evento': ['uncertainty', 'uncertainty_nota', 'revisado_por', 'revisado_por_actor', 'fecha_revision'],
}

function registros(contenido: Uint8Array, archivo: Archivo): Registro[] {
  const l = leerCsv(contenido)
  // Sólo se llega acá con un lote sin rechazos: la estructura ya se validó.
  if (!l.ok) throw new Error(`${archivo}: se esperaba un archivo ya validado`)
  return comoFilas(l).map((f, i) => ({ n: i + 2, f }))
}

/** Las celdas con valor que no tienen dónde guardarse. Vacío si el lote entra entero. */
export function columnasSinDestino(contenidos: Readonly<Record<Archivo, Uint8Array>>): SinDestino[] {
  const sinDestino: SinDestino[] = []
  for (const archivo of ARCHIVOS) {
    for (const { n, f } of registros(contenidos[archivo], archivo)) {
      const tipo = archivo === 'risks.csv' ? (f.tipo_objeto ?? '') : (f.tipo_registro ?? '')
      for (const columna of SIN_COLUMNA[`${archivo} ${tipo}`] ?? []) {
        if (!vacio(f[columna])) sinDestino.push({ archivo, fila: n, id: (f.accion_id ?? '') !== '' ? (f.accion_id ?? '') : (f.evento_id ?? ''), columna })
      }
      // `pending` es «nadie revisó»: no deja fila de revisión, así que en un evento no se pierde nada.
      if (archivo === 'risk-transfer.csv' && tipo === 'evento' && !vacio(f.review_status) && f.review_status !== 'pending') {
        sinDestino.push({ archivo, fila: n, id: f.evento_id ?? '', columna: 'review_status' })
      }
    }
  }
  return sinDestino
}

function procedencia(f: Fila): Record<string, Valor> {
  return { actor: f.actor ?? '', base: f.base ?? '', evidencia: lista(f.evidencia) }
}

function revision(f: Fila, objeto: 'evaluacion_id' | 'accion_id' | 'transferencia_id', id: string): FilaDb | null {
  if (vacio(f.review_status) || f.review_status === 'pending') return null
  return {
    [objeto]: id,
    estado: f.review_status ?? '',
    revisado_por_actor: f.revisado_por_actor ?? '',
    revisado_por_origen: texto(f.revisado_por),
    fecha_revision: texto(f.fecha_revision),
    origen: ORIGEN,
  }
}

/**
 * Las reevaluaciones después de su anterior: el esquema exige que la anterior ya esté registrada
 * cuando llega la nueva. Las que no se pueden ordenar (un ciclo, que el validador no rechaza
 * si no hay inicial) quedan al final en el orden del archivo, y la base las rechaza.
 */
function enOrdenDeCadena(evaluaciones: readonly Registro[]): Registro[] {
  const delLote = new Set(evaluaciones.map((r) => r.f.evaluacion_id ?? ''))
  const escritas = new Set<string>()
  const orden: Registro[] = []
  let pendientes = [...evaluaciones]
  for (;;) {
    const listas = pendientes.filter((r) => {
      const a = r.f.evaluacion_anterior_id ?? ''
      return vacio(a) || !delLote.has(a) || escritas.has(a)
    })
    if (listas.length === 0) break
    for (const r of listas) { orden.push(r); escritas.add(r.f.evaluacion_id ?? '') }
    pendientes = pendientes.filter((r) => !escritas.has(r.f.evaluacion_id ?? ''))
  }
  return [...orden, ...pendientes]
}

/** Las filas del esquema para un lote sin rechazos ni columnas sin destino. */
export function filasParaEscribir(contenidos: Readonly<Record<Archivo, Uint8Array>>, existentes: Existentes = {}): FilasParaEscribir {
  const de = porArchivo((a) => registros(contenidos[a], a))
  const tipoDe = new Map<string, string>()
  for (const [id, r] of existentes.riesgos ?? []) tipoDe.set(id, r.tipo_objeto)
  for (const { f } of de['risks.csv']) if (!tipoDe.has(f.risk_id ?? '')) tipoDe.set(f.risk_id ?? '', f.tipo_objeto ?? '')
  const tipo = (riskId: string | undefined): string => tipoDe.get(riskId ?? '') ?? ''

  // Riesgos nuevos: la identidad es la de su primera fila (RV-RSK-01 ya la comparó con las demás).
  // Padres primero, escenarios al final, para que cada referencia ya esté en la tabla.
  const primeras = new Map<string, Fila>()
  for (const { f } of de['risks.csv']) {
    const id = f.risk_id ?? ''
    if (!existentes.riesgos?.has(id) && !primeras.has(id)) primeras.set(id, f)
  }
  const ordenTipo = ['padre', 'riesgo', 'sub_riesgo', 'escenario']
  const nuevos = [...primeras.values()].sort((a, b) => ordenTipo.indexOf(a.tipo_objeto ?? '') - ordenTipo.indexOf(b.tipo_objeto ?? ''))
  const riesgo = nuevos.map((f): FilaDb => ({
    id: f.risk_id ?? '',
    organizacion_id: f.organizacion_id ?? '',
    unidad_id: texto(f.unidad_id),
    tipo_objeto: f.tipo_objeto ?? '',
    riesgo_padre_id: texto(f.riesgo_padre_id),
    titulo: f.titulo ?? '',
    consecuencia_comun: f.tipo_objeto === 'padre' ? texto(f.riesgo_consecuencia) : null,
    id_origen: texto(f.id_origen),
    lote_origen: texto(f.lote_origen),
    origen: ORIGEN,
  }))
  const miembro_escenario = nuevos.filter((f) => f.tipo_objeto === 'escenario').flatMap((f) =>
    (lista(f.miembros) ?? []).map((m): FilaDb => ({
      escenario_id: f.risk_id ?? '', miembro_id: m, miembro_tipo: tipo(m), organizacion_id: f.organizacion_id ?? '',
    })))

  const revisiones: FilaDb[] = []

  const accion: FilaDb[] = []
  const accion_estado: FilaDb[] = []
  for (const { f } of de['action-plan.csv']) {
    const id = f.accion_id ?? ''
    const esAccion = f.tipo_registro === 'accion'
    accion.push({
      id,
      risk_id: f.risk_id ?? '',
      riesgo_tipo: tipo(f.risk_id),
      tipo_registro: f.tipo_registro ?? '',
      descripcion: f.descripcion ?? '',
      factor_objetivo: lista(f.factor_objetivo),
      mecanismo_causal: texto(f.mecanismo_causal),
      cambio_esperado: texto(f.cambio_esperado),
      decision: texto(f.decision),
      fundamento: texto(f.fundamento),
      fecha_proxima_revision: texto(f.fecha_proxima_revision),
      fecha_alta: f.fecha_alta ?? '',
      ...procedencia(f),
      id_origen: texto(f.id_origen),
      lote_origen: texto(f.lote_origen),
      origen: ORIGEN,
    })
    if (esAccion) {
      accion_estado.push({
        accion_id: id,
        estado: f.estado ?? '',
        fecha_cumplida: texto(f.fecha_cumplida),
        evidencia_ejecucion: lista(f.evidencia_ejecucion),
        efecto: texto(f.efecto),
        efecto_nota: texto(f.efecto_nota),
        evaluacion_efecto_id: texto(f.evaluacion_efecto_id),
        origen: ORIGEN,
      })
    }
    const r = revision(f, 'accion_id', id)
    if (r !== null) revisiones.push(r)
  }

  const evaluacion: FilaDb[] = []
  const revisionesDeEvaluacion: FilaDb[] = []
  for (const { f } of enOrdenDeCadena(de['risks.csv'].filter((r) => r.f.tipo_objeto !== 'padre'))) {
    const id = f.evaluacion_id ?? ''
    const factores: Record<string, Valor> = {}
    for (const x of FACTORES) {
      factores[`${x}_estado`] = f[`${x}_estado`] ?? ''
      factores[`${x}_valor`] = nivel(f[`${x}_valor`])
      factores[`${x}_min`] = nivel(f[`${x}_min`])
      factores[`${x}_max`] = nivel(f[`${x}_max`])
      factores[`${x}_observacion`] = texto(f[`${x}_observacion`])
      factores[`${x}_base`] = texto(f[`${x}_base`])
      factores[`${x}_evidencia`] = lista(f[`${x}_evidencia`])
    }
    evaluacion.push({
      id,
      risk_id: f.risk_id ?? '',
      riesgo_tipo: tipo(f.risk_id),
      tipo_evaluacion: f.tipo_evaluacion ?? '',
      evaluacion_anterior_id: texto(f.evaluacion_anterior_id),
      motivo: texto(f.motivo),
      accion_id: texto(f.accion_id),
      fecha: f.fecha ?? '',
      version_metodologia: f.version_metodologia ?? '',
      evaluador: texto(f.evaluador),
      ...procedencia(f),
      riesgo_causa: texto(f.riesgo_causa),
      riesgo_evento: texto(f.riesgo_evento),
      riesgo_consecuencia: texto(f.riesgo_consecuencia),
      ...factores,
      i_econ_monto_bruto: texto(f.i_econ_monto_bruto),
      moneda: texto(f.moneda),
      uncertainty: f.uncertainty ?? '',
      uncertainty_nota: texto(f.uncertainty_nota),
      necesidad_validacion: texto(f.necesidad_validacion),
      motivo_no_evaluable: texto(f.motivo_no_evaluable),
      justificacion: texto(f.justificacion),
      reglas_aplicadas: lista(f.reglas_aplicadas),
      id_origen: texto(f.evaluacion_id_origen),
      lote_origen: texto(f.lote_origen),
      origen: ORIGEN,
    })
    const r = revision(f, 'evaluacion_id', id)
    if (r !== null) revisionesDeEvaluacion.push(r)
  }

  const transferencia: FilaDb[] = []
  const evento_poliza: FilaDb[] = []
  for (const { f } of de['risk-transfer.csv']) {
    if (f.tipo_registro === 'cobertura') {
      const id = f.transferencia_id ?? ''
      transferencia.push({
        id,
        risk_id: f.risk_id ?? '',
        riesgo_tipo: tipo(f.risk_id),
        poliza_ref: f.poliza_ref ?? '',
        cobertura: f.cobertura ?? '',
        vigencia_desde: f.vigencia_desde ?? '',
        vigencia_hasta: f.vigencia_hasta ?? '',
        limite_monto: texto(f.limite_monto),
        sublimite_aplicable_monto: texto(f.sublimite_aplicable_monto),
        sublimites_texto: texto(f.sublimites_texto),
        deducible_monto: texto(f.deducible_monto),
        deducible_texto: texto(f.deducible_texto),
        exclusiones: texto(f.exclusiones),
        exposicion_retenida_monto: texto(f.exposicion_retenida_monto),
        exposicion_retenida_nota: texto(f.exposicion_retenida_nota),
        suficiencia: f.suficiencia ?? '',
        suficiencia_nota: texto(f.suficiencia_nota),
        moneda: texto(f.moneda),
        ...procedencia(f),
        uncertainty: f.uncertainty ?? '',
        uncertainty_nota: texto(f.uncertainty_nota),
        id_origen: texto(f.id_origen),
        lote_origen: texto(f.lote_origen),
        origen: ORIGEN,
      })
      const r = revision(f, 'transferencia_id', id)
      if (r !== null) revisiones.push(r)
    } else {
      evento_poliza.push({
        id: f.evento_id ?? '',
        risk_id: f.risk_id ?? '',
        transferencia_ref: f.transferencia_ref ?? '',
        tipo_evento: f.tipo_evento ?? '',
        fecha_evento: f.fecha_evento ?? '',
        monto_evento: texto(f.monto_evento),
        moneda: texto(f.moneda),
        nota_evento: texto(f.nota_evento),
        ...procedencia(f),
        id_origen: texto(f.id_origen),
        lote_origen: texto(f.lote_origen),
        origen: ORIGEN,
      })
    }
  }

  return {
    riesgo,
    miembro_escenario,
    accion,
    evaluacion,
    accion_estado,
    transferencia,
    evento_poliza,
    revision_humana: [...revisionesDeEvaluacion, ...revisiones],
  }
}
