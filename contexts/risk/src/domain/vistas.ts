// Las vistas de Risk OS v1 (T-0030; RO01 §2 y §3; decisión 4 del owner), armadas a partir de lo
// registrado de **una** organización. Funciones puras: lo que la app muestra y lo que entregan
// sus endpoints sale de acá, y los tests de presentación prueban estas salidas.
//
// Reglas de RO01 §3 que este archivo hace cumplir por construcción:
//
//   1. `C_raw` aparece sólo en el detalle (H6), en `CriticidadDetalle`, que lleva en el mismo
//      registro el vector completo y las dos banderas. Ninguna otra vista tiene `C_raw`.
//   2. Ninguna función suma, promedia, resta ni divide `C_raw`, ni lo agrega o lo compara entre
//      riesgos u organizaciones. El movimiento por dimensión muestra niveles antes y después,
//      nunca una diferencia.
//   3. El techo plausible sólo está en el detalle y en la cola de validación, rotulado aparte.
//   4. Cada vista es de una organización. El filtro por unidad conserva las posiciones del
//      ranking de la organización (con huecos) y no ordena de nuevo.
//   6. Cada fila dice qué evaluación usa, y si no está aceptada lo rotula.
//   7. Lo calculado lleva la versión de las funciones; los eventos de póliza se rotulan como
//      observación local (D-0067).

import {
  colaDeValidacion, derivados, historia, numeroDePosicion, rankingOrganizacion, vigente,
  type Derivados, type RankingOrganizacion,
} from './lectura.ts'
import { iEfectivoTexto, type Banda, type Dimension, type MotivoNoEvaluable, type Uncertainty } from './metodologia.ts'
import { exigirVersion, type Evaluacion, type ReviewStatus, type TipoObjeto, type VersionFunciones } from './modelo.ts'
import {
  aEvaluacion, aRiesgo, exigirUnaOrganizacion, FACTORES, reviewStatusDe,
  type AccionRegistrada, type CoberturaRegistrada, type DatosOrganizacion, type EvaluacionRegistrada, type EventoRegistrado,
  type FactorRegistrado, type NombreFactor, type Procedencia, type RevisionPendienteRegistrada,
  type RevisionRegistrada, type RiesgoRegistrado,
} from './organizacion.ts'

// ── Piezas comunes ───────────────────────────────────────────────────────────

/** Un factor del vector, con estado y valor. Un `unknown` se entrega como tal, sin valor (§9). */
export interface FactorVista {
  readonly factor: NombreFactor
  readonly estado: 'known' | 'unknown' | 'no_aplica'
  readonly valor: number | null
  readonly min: number | null
  readonly max: number | null
}

export interface Banderas {
  readonly consecuenciaExtrema: boolean
  /** Las dimensiones de I que la disparan. */
  readonly dimensionesExtremas: readonly Dimension[]
  readonly safetyCritical: boolean
}

/** Qué evaluación usa una fila (RO01 §3, regla 6; decisión 8a). */
export interface EvaluacionUsada {
  readonly id: string
  readonly fecha: string
  readonly versionMetodologia: string
  readonly reviewStatus: ReviewStatus
  /** `aceptada`, o `pendiente de revisión` si la vigente no está aceptada. */
  readonly rotulo: 'aceptada' | 'pendiente de revisión'
  /** Evaluaciones posteriores de la cadena que no la reemplazan (una `pending` después de una `accepted`, o rechazadas). */
  readonly posteriores: readonly { readonly id: string; readonly reviewStatus: ReviewStatus }[]
}

export interface Calculado {
  /** La versión de las funciones que lo calcularon (RO01 §3, regla 7). */
  readonly version: VersionFunciones
}

export interface Identidad {
  readonly riskId: string
  readonly tipoObjeto: TipoObjeto
  readonly titulo: string
  readonly idOrigen: string | null
  readonly unidadId: string | null
}

const MOTIVOS_NO_EVALUABLE: Readonly<Record<MotivoNoEvaluable, string>> = {
  p_unknown: 'P es unknown',
  sin_dimension_conocida: 'ninguna dimensión tiene todos sus factores conocidos',
  cota_supera_c_raw: 'la cota de una dimensión con partes unknown podría superar lo conocido (§9.3)',
}

export function vectorDe(e: EvaluacionRegistrada): FactorVista[] {
  return FACTORES.map((f) => vectorFactor(f, e.factores[f]))
}

function vectorFactor(factor: NombreFactor, f: FactorRegistrado): FactorVista {
  return { factor, estado: f.estado, valor: f.estado === 'known' ? f.valor : null, min: f.min, max: f.max }
}

function banderasDe(d: Derivados): Banderas {
  return { consecuenciaExtrema: d.consecuenciaExtrema.length > 0, dimensionesExtremas: d.consecuenciaExtrema, safetyCritical: d.safetyCritical }
}

const identidad = (r: RiesgoRegistrado): Identidad => ({
  riskId: r.id, tipoObjeto: r.tipoObjeto, titulo: r.titulo, idOrigen: r.idOrigen, unidadId: r.unidadId,
})

/** Orden estable de lectura (por id de origen, título e id). No es prioridad. */
const porOrigen = (a: { idOrigen: string | null; titulo: string; riskId: string }, b: { idOrigen: string | null; titulo: string; riskId: string }): number =>
  (a.idOrigen ?? '').localeCompare(b.idOrigen ?? '') || a.titulo.localeCompare(b.titulo) || a.riskId.localeCompare(b.riskId)

// ── Lo calculado de una organización ─────────────────────────────────────────

/** Lo que todas las vistas de una organización comparten: el ranking y lo registrado, indexado. */
interface Org {
  readonly version: VersionFunciones
  readonly datos: DatosOrganizacion
  readonly ranking: RankingOrganizacion
  readonly riesgo: ReadonlyMap<string, RiesgoRegistrado>
  readonly evaluacion: ReadonlyMap<string, EvaluacionRegistrada>
  readonly evaluaciones: readonly Evaluacion[]
}

function organizacion(version: VersionFunciones, d: DatosOrganizacion): Org {
  exigirVersion(version)
  exigirUnaOrganizacion(d)
  const evaluaciones = d.evaluaciones.map(aEvaluacion)
  return {
    version,
    datos: d,
    ranking: rankingOrganizacion(version, d.riesgos.map(aRiesgo), evaluaciones),
    riesgo: new Map(d.riesgos.map((r) => [r.id, r])),
    evaluacion: new Map(d.evaluaciones.map((e) => [e.id, e])),
    evaluaciones,
  }
}

function evaluacionUsada(o: Org, riskId: string): EvaluacionUsada | null {
  const v = o.ranking.vigentes.get(riskId)
  const r = v === undefined ? undefined : o.evaluacion.get(v.id)
  if (v === undefined || r === undefined) return null
  const h = historia(o.evaluaciones, riskId)
  const despues = h.slice(h.findIndex((e) => e.id === v.id) + 1)
  return {
    id: v.id,
    fecha: r.fecha,
    versionMetodologia: r.versionMetodologia,
    reviewStatus: v.reviewStatus,
    rotulo: v.reviewStatus === 'accepted' ? 'aceptada' : 'pendiente de revisión',
    posteriores: despues.map((e) => ({ id: e.id, reviewStatus: e.reviewStatus })),
  }
}

/** Los derivados de la evaluación vigente de un riesgo, o `null` si no tiene. */
function derivadosVigentes(o: Org, riskId: string): Derivados | null {
  const v = o.ranking.vigentes.get(riskId)
  return v === undefined ? null : derivados(o.version, v.factores)
}

function vectorVigente(o: Org, riskId: string): FactorVista[] | null {
  const v = o.ranking.vigentes.get(riskId)
  const r = v === undefined ? undefined : o.evaluacion.get(v.id)
  return r === undefined ? null : vectorDe(r)
}

/** Banda, I efectivo, determinantes, vector y banderas de un objeto evaluado: lo que muestra la lista, sin `C_raw` (H6). */
export interface Lectura {
  readonly evaluable: boolean
  readonly motivoNoEvaluable: string | null
  readonly banda: Banda | null
  readonly iEfectivo: string
  readonly dimensionDeterminante: readonly Dimension[]
  readonly vector: readonly FactorVista[]
  readonly banderas: Banderas
  readonly evaluacion: EvaluacionUsada
}

function lectura(o: Org, riskId: string): Lectura | null {
  const d = derivadosVigentes(o, riskId)
  const vector = vectorVigente(o, riskId)
  const evaluacion = evaluacionUsada(o, riskId)
  if (d === null || vector === null || evaluacion === null) return null
  return {
    evaluable: d.evaluabilidad.evaluable,
    motivoNoEvaluable: d.evaluabilidad.evaluable ? null : MOTIVOS_NO_EVALUABLE[d.evaluabilidad.motivo],
    banda: d.banda,
    iEfectivo: iEfectivoTexto(d.iEfectivo),
    dimensionDeterminante: d.evaluabilidad.evaluable ? d.evaluabilidad.determinantes : [],
    vector,
    banderas: banderasDe(d),
    evaluacion,
  }
}

// ── Lista por organización (§7, §1.4, §8.2, §9.4, §9.5) ──────────────────────

export interface HijoEnLista extends Identidad {
  readonly prioritario: boolean
  readonly lectura: Lectura | null
}

export interface FilaRanking extends Identidad {
  /** Riesgos por delante + 1, como `regresion-emi41.csv`. Un empate comparte el número. */
  readonly posicion: number
  readonly empate: boolean
  /** D10 no pudo decidir por un `unknown` (§7.2): la posición es provisional. */
  readonly provisional: boolean
  /** En un padre, la lectura de su (primer) hijo prioritario: el padre no tiene evaluación (§1.4). */
  readonly lectura: Lectura
  readonly padre: { readonly prioridadProvisional: boolean; readonly hijos: readonly HijoEnLista[] } | null
}

export interface Tratamiento {
  readonly accionesEnCurso: readonly { readonly id: string; readonly descripcion: string }[]
  readonly decision: { readonly id: string; readonly decision: string; readonly fechaProximaRevision: string | null; readonly fundamento: string | null } | null
}

export interface FilaSeguridad extends Identidad {
  readonly lectura: Lectura
  readonly tratamiento: Tratamiento
  /** Sin acción en curso ni decisión registrada (§8.2). */
  readonly alerta: boolean
}

export interface FilaNoEvaluable extends Identidad {
  readonly motivo: string
  readonly necesidadValidacion: string | null
  /** `null` en un padre (no tiene evaluación) o si no hay evaluación vigente. */
  readonly lectura: Lectura | null
}

export interface FilaCola extends Identidad {
  /** Orden en la cola de la organización (§9.5); no es una posición del ranking. */
  readonly orden: number
  readonly entra: readonly ('no evaluable' | 'factor unknown' | 'uncertainty high')[]
  readonly uncertainty: Uncertainty
  readonly necesidadValidacion: string | null
  readonly lectura: Lectura
  /** §6.6: sólo acá y en el detalle; nunca entra al ranking (RO01 §3, regla 3). */
  readonly techoPlausible: { readonly valor: number; readonly rotulo: string }
}

export interface VistaLista extends Calculado {
  readonly organizacionId: string
  readonly unidades: readonly string[]
  readonly unidad: string | null
  readonly ranking: readonly FilaRanking[]
  readonly seguridad: readonly FilaSeguridad[]
  readonly noEvaluables: readonly FilaNoEvaluable[]
  readonly cola: readonly FilaCola[]
}

export const ROTULO_TECHO = 'techo plausible: no entra al ranking'

function tratamiento(o: Org, riskId: string): Tratamiento {
  const acciones = o.datos.acciones.filter((a) => a.riskId === riskId)
  const enCurso = acciones.filter((a) => a.tipoRegistro === 'accion' && a.estados.at(-1)?.estado === 'en_curso')
  const decisiones = acciones
    .filter((a) => a.tipoRegistro === 'decision_tratamiento')
    .sort((a, b) => a.fechaAlta.localeCompare(b.fechaAlta) || a.registradaEn.localeCompare(b.registradaEn))
  const d = decisiones.at(-1)
  return {
    accionesEnCurso: enCurso.map((a) => ({ id: a.id, descripcion: a.descripcion })),
    decision: d === undefined ? null : { id: d.id, decision: d.decision ?? '', fechaProximaRevision: d.fechaProximaRevision, fundamento: d.fundamento },
  }
}

const deUnidad = (unidad: string | null) => (x: { unidadId: string | null }): boolean => unidad === null || x.unidadId === unidad

export function armarLista(version: VersionFunciones, d: DatosOrganizacion, unidad: string | null = null): VistaLista {
  const o = organizacion(version, d)
  const unidades = [...new Set(d.riesgos.flatMap((r) => (r.unidadId === null ? [] : [r.unidadId])))].sort()
  if (unidad !== null && !unidades.includes(unidad)) throw new Error(`la organización no tiene la unidad ${unidad}`)

  const ranking: FilaRanking[] = []
  for (const p of o.ranking.posiciones) {
    for (const id of [...p.ids].sort()) {
      const r = o.riesgo.get(id)
      const posicion = numeroDePosicion(o.ranking, id)
      if (r === undefined || posicion === null) throw new Error(`${id} está en el ranking sin estar registrado`)
      const padre = o.ranking.padres.get(id)
      const prioritario = padre?.hijosPrioritarios[0]
      const l = lectura(o, prioritario ?? id)
      if (l === null) throw new Error(`${id} está en el ranking sin evaluación vigente`)
      const hijos = padre === undefined
        ? null
        : d.riesgos.filter((h) => h.riesgoPadreId === id).map((h): HijoEnLista => ({
          ...identidad(h), prioritario: padre.hijosPrioritarios.includes(h.id), lectura: lectura(o, h.id),
        })).sort((a, b) => Number(b.prioritario) - Number(a.prioritario) || porOrigen(a, b))
      ranking.push({
        ...identidad(r), posicion, empate: p.ids.length > 1, provisional: p.provisional, lectura: l,
        padre: padre === undefined || hijos === null ? null : { prioridadProvisional: padre.prioridadProvisional, hijos },
      })
    }
  }

  const seguridad = d.riesgos
    .filter((r) => r.tipoObjeto !== 'padre')
    .flatMap((r): FilaSeguridad[] => {
      const l = lectura(o, r.id)
      if (!l?.banderas.safetyCritical) return []
      const t = tratamiento(o, r.id)
      return [{ ...identidad(r), lectura: l, tratamiento: t, alerta: t.accionesEnCurso.length === 0 && t.decision === null }]
    })
    .sort(porOrigen)

  const noEvaluables = o.ranking.noEvaluables.map((n): FilaNoEvaluable => {
    const r = o.riesgo.get(n.riskId)
    if (r === undefined) throw new Error(`${n.riskId} no está registrado`)
    const v = o.ranking.vigentes.get(n.riskId)
    return {
      ...identidad(r), motivo: (MOTIVOS_NO_EVALUABLE as Readonly<Partial<Record<string, string>>>)[n.motivo] ?? n.motivo,
      necesidadValidacion: v === undefined ? null : (o.evaluacion.get(v.id)?.necesidadValidacion ?? null),
      lectura: lectura(o, n.riskId),
    }
  })

  const cola = colaDeValidacion(version, o.ranking).map((id, n): FilaCola => {
    const r = o.riesgo.get(id)
    const v = o.ranking.vigentes.get(id)
    const reg = v === undefined ? undefined : o.evaluacion.get(v.id)
    const l = lectura(o, id)
    if (r === undefined || v === undefined || reg === undefined || l === null) throw new Error(`${id} está en la cola sin evaluación vigente`)
    const entra: FilaCola['entra'][number][] = []
    if (!l.evaluable) entra.push('no evaluable')
    if (l.vector.some((f) => f.estado === 'unknown')) entra.push('factor unknown')
    if (v.uncertainty === 'high') entra.push('uncertainty high')
    return {
      ...identidad(r), orden: n + 1, entra, uncertainty: v.uncertainty, necesidadValidacion: reg.necesidadValidacion, lectura: l,
      techoPlausible: { valor: derivados(version, v.factores).techoPlausible, rotulo: ROTULO_TECHO },
    }
  })

  const filtro = deUnidad(unidad)
  return {
    version,
    organizacionId: d.organizacionId,
    unidades,
    unidad,
    // Un padre se lee por sus hijos (§1.4): queda en la unidad propia y en la de cualquiera de sus
    // hijos, para que la unidad no pierda a su riesgo más alto si el padre está en otra.
    ranking: ranking.filter((f) => filtro(f) || (f.padre?.hijos.some(filtro) ?? false)),
    seguridad: seguridad.filter(filtro),
    noEvaluables: noEvaluables.filter(filtro),
    cola: cola.filter(filtro),
  }
}

// ── Escenarios agregados (§10.4) ─────────────────────────────────────────────

export interface FilaEscenario extends Identidad {
  readonly lectura: Lectura | null
  readonly miembros: readonly (Identidad & { readonly lectura: Lectura | null })[]
}

export interface VistaEscenarios extends Calculado {
  readonly organizacionId: string
  readonly escenarios: readonly FilaEscenario[]
}

export function armarEscenarios(version: VersionFunciones, d: DatosOrganizacion): VistaEscenarios {
  const o = organizacion(version, d)
  const escenarios = d.riesgos
    .filter((r) => r.tipoObjeto === 'escenario')
    .map((r): FilaEscenario => ({
      ...identidad(r),
      lectura: lectura(o, r.id),
      miembros: r.miembros.map((m) => {
        const x = o.riesgo.get(m)
        if (x === undefined) throw new Error(`${m}, miembro de ${r.id}, no está en la organización`)
        return { ...identidad(x), lectura: lectura(o, m) }
      }).sort(porOrigen),
    }))
    .sort(porOrigen)
  return { version, organizacionId: d.organizacionId, escenarios }
}

// ── Plan de acción (§8.2, §11.2; D16) ────────────────────────────────────────

export interface EvaluacionCitada {
  readonly id: string
  readonly fecha: string
  readonly tipo: 'inicial' | 'reevaluacion'
  readonly motivo: string | null
}

export interface EstadoAccionVista {
  readonly estado: string
  readonly fechaCumplida: string | null
  readonly evidenciaEjecucion: readonly string[] | null
  readonly efecto: string | null
  readonly efectoNota: string | null
  /** La reevaluación que observó el efecto (§11.2). */
  readonly evaluacionEfecto: EvaluacionCitada | null
  readonly origen: string
  readonly autor: string | null
  readonly registradoEn: string
}

export interface AccionVista {
  readonly id: string
  readonly riskId: string
  readonly tipoRegistro: 'accion' | 'decision_tratamiento'
  readonly descripcion: string
  readonly factorObjetivo: readonly string[] | null
  readonly mecanismoCausal: string | null
  /** Hipótesis: nunca es el valor de un factor (D16). */
  readonly cambioEsperado: { readonly texto: string; readonly rotulo: string } | null
  readonly decision: string | null
  readonly fundamento: string | null
  readonly fechaProximaRevision: string | null
  readonly fechaAlta: string
  /** El estado vigente: el del último cambio. Una decisión de tratamiento no tiene. */
  readonly estado: string | null
  readonly estados: readonly EstadoAccionVista[]
  readonly eficacia: { readonly efecto: string; readonly nota: string | null; readonly evaluacionEfecto: EvaluacionCitada | null } | null
  readonly procedencia: Procedencia
  readonly idOrigen: string | null
  readonly reviewStatus: ReviewStatus
  readonly revisiones: readonly RevisionRegistrada[]
}

export interface RiesgoEnPlan extends Identidad {
  readonly padreId: string | null
  readonly hijos: readonly string[]
  readonly acciones: readonly AccionVista[]
}

export interface VistaPlan {
  readonly organizacionId: string
  readonly riesgos: readonly RiesgoEnPlan[]
}

export const ROTULO_CAMBIO_ESPERADO = 'cambio esperado (hipótesis): no es el valor de ningún factor'

function citada(o: Pick<Org, 'evaluacion'>, id: string | null): EvaluacionCitada | null {
  const e = id === null ? undefined : o.evaluacion.get(id)
  return e === undefined ? null : { id: e.id, fecha: e.fecha, tipo: e.tipo, motivo: e.motivo }
}

function accionVista(o: Pick<Org, 'evaluacion'>, a: AccionRegistrada): AccionVista {
  const estados = a.estados.map((s): EstadoAccionVista => ({
    estado: s.estado, fechaCumplida: s.fechaCumplida, evidenciaEjecucion: s.evidenciaEjecucion, efecto: s.efecto, efectoNota: s.efectoNota,
    evaluacionEfecto: citada(o, s.evaluacionEfectoId), origen: s.origen, autor: s.autor, registradoEn: s.registradoEn,
  }))
  const conEfecto = [...estados].reverse().find((s) => s.efecto !== null)
  return {
    id: a.id, riskId: a.riskId, tipoRegistro: a.tipoRegistro, descripcion: a.descripcion, factorObjetivo: a.factorObjetivo,
    mecanismoCausal: a.mecanismoCausal,
    cambioEsperado: a.cambioEsperado === null ? null : { texto: a.cambioEsperado, rotulo: ROTULO_CAMBIO_ESPERADO },
    decision: a.decision, fundamento: a.fundamento, fechaProximaRevision: a.fechaProximaRevision, fechaAlta: a.fechaAlta,
    estado: estados.at(-1)?.estado ?? null,
    estados,
    eficacia: conEfecto?.efecto == null ? null : { efecto: conEfecto.efecto, nota: conEfecto.efectoNota, evaluacionEfecto: conEfecto.evaluacionEfecto },
    procedencia: a.procedencia, idOrigen: a.idOrigen, reviewStatus: reviewStatusDe(a.revisiones), revisiones: a.revisiones,
  }
}

const indice = (d: DatosOrganizacion): Pick<Org, 'evaluacion'> => ({ evaluacion: new Map(d.evaluaciones.map((e) => [e.id, e])) })

export function armarPlan(d: DatosOrganizacion): VistaPlan {
  exigirUnaOrganizacion(d)
  const o = indice(d)
  const riesgos = d.riesgos.map((r): RiesgoEnPlan => ({
    ...identidad(r),
    padreId: r.riesgoPadreId,
    hijos: d.riesgos.filter((h) => h.riesgoPadreId === r.id).map((h) => h.id),
    acciones: d.acciones
      .filter((a) => a.riskId === r.id)
      .sort((a, b) => a.fechaAlta.localeCompare(b.fechaAlta) || a.id.localeCompare(b.id))
      .map((a) => accionVista(o, a)),
  })).sort(porOrigen)
  return { organizacionId: d.organizacionId, riesgos }
}

// ── Transferencia (§11.3, D17, D-0067) ───────────────────────────────────────

export const ROTULO_EVENTO = 'observación local de Risk OS, con su procedencia; no es un dato de Broker OS (D-0067)'

export interface EventoVista {
  readonly id: string
  readonly tipo: string
  readonly fecha: string
  readonly monto: string | null
  readonly moneda: string | null
  readonly nota: string | null
  readonly procedencia: Procedencia
  readonly idOrigen: string | null
  readonly rotulo: string
}

export interface LimiteDisponible extends Calculado {
  readonly calculado: true
  /** Límite − consumos + ampliaciones con monto, o `null` si no se puede calcular. */
  readonly valor: string | null
  readonly moneda: string | null
  readonly motivo: string | null
  readonly regla: string
}

export interface CoberturaVista {
  readonly id: string
  readonly riskId: string
  readonly polizaRef: string
  readonly cobertura: string
  readonly vigenciaDesde: string
  readonly vigenciaHasta: string
  readonly moneda: string | null
  readonly limite: string | null
  readonly sublimite: string | null
  readonly sublimitesTexto: string | null
  readonly deducible: string | null
  readonly deducibleTexto: string | null
  readonly exclusiones: string | null
  /** `no evaluada` cuando lo está (decisión 8 del owner): nunca se completa. */
  readonly suficiencia: string
  readonly suficienciaNota: string | null
  /** `null` se muestra `sin estimar` (decisión 8 del owner). */
  readonly exposicionRetenida: string | null
  readonly exposicionRetenidaNota: string | null
  readonly procedencia: Procedencia
  readonly uncertainty: Uncertainty
  readonly uncertaintyNota: string | null
  readonly idOrigen: string | null
  readonly reviewStatus: ReviewStatus
  readonly eventos: readonly EventoVista[]
  readonly limiteDisponible: LimiteDisponible
}

export interface RiesgoEnTransferencia extends Identidad {
  readonly coberturas: readonly CoberturaVista[]
}

export interface VistaTransferencia extends Calculado {
  readonly organizacionId: string
  readonly riesgos: readonly RiesgoEnTransferencia[]
}

export const SUFICIENCIA: Readonly<Record<string, string>> = {
  suficiente: 'suficiente', parcial: 'parcial', insuficiente: 'insuficiente', sin_cobertura: 'sin cobertura', no_evaluada: 'no evaluada',
}

// Montos como decimales exactos: escala común y BigInt. No es aritmética de `C_raw` (RO01 §3,
// regla 2): son montos de póliza.
const decimales = (m: string): number => m.split('.')[1]?.length ?? 0
function aEscala(m: string, escala: number): bigint {
  const [ent = '0', dec = ''] = m.split('.')
  return BigInt(ent + dec.padEnd(escala, '0'))
}
function deEscala(n: bigint, escala: number): string {
  const negativo = n < 0n
  const s = (negativo ? -n : n).toString().padStart(escala + 1, '0')
  const texto = escala === 0 ? s : `${s.slice(0, -escala)}.${s.slice(-escala)}`
  return negativo ? `-${texto}` : texto
}

const REGLA_LIMITE = 'límite − consumos del límite + ampliaciones con monto, de los eventos registrados de esta cobertura'

/** Límite disponible de una cobertura (metodología §13, columna `monto_evento` del contrato). */
export function limiteDisponible(version: VersionFunciones, c: CoberturaRegistrada): LimiteDisponible {
  exigirVersion(version)
  const sin = (motivo: string): LimiteDisponible => ({ version, calculado: true, valor: null, moneda: c.moneda, motivo, regla: REGLA_LIMITE })
  if (c.limite === null) return sin('sin límite registrado')
  const conMonto = c.eventos.filter((e) => e.monto !== null && (e.tipo === 'consumo_limite' || e.tipo === 'ampliacion'))
  if (conMonto.some((e) => e.moneda !== c.moneda)) return sin('un evento tiene otra moneda que la cobertura')
  const escala = Math.max(decimales(c.limite), ...conMonto.map((e) => decimales(e.monto ?? '0')))
  let n = aEscala(c.limite, escala)
  for (const e of conMonto) n += (e.tipo === 'consumo_limite' ? -1n : 1n) * aEscala(e.monto ?? '0', escala)
  return { version, calculado: true, valor: deEscala(n, escala), moneda: c.moneda, motivo: null, regla: REGLA_LIMITE }
}

function eventoVista(e: EventoRegistrado): EventoVista {
  return {
    id: e.id, tipo: e.tipo, fecha: e.fecha, monto: e.monto, moneda: e.moneda, nota: e.nota, procedencia: e.procedencia, idOrigen: e.idOrigen,
    rotulo: ROTULO_EVENTO,
  }
}

function coberturaVista(version: VersionFunciones, c: CoberturaRegistrada): CoberturaVista {
  return {
    id: c.id, riskId: c.riskId, polizaRef: c.polizaRef, cobertura: c.cobertura, vigenciaDesde: c.vigenciaDesde, vigenciaHasta: c.vigenciaHasta,
    moneda: c.moneda, limite: c.limite, sublimite: c.sublimite, sublimitesTexto: c.sublimitesTexto, deducible: c.deducible,
    deducibleTexto: c.deducibleTexto, exclusiones: c.exclusiones, suficiencia: SUFICIENCIA[c.suficiencia] ?? c.suficiencia,
    suficienciaNota: c.suficienciaNota, exposicionRetenida: c.exposicionRetenida, exposicionRetenidaNota: c.exposicionRetenidaNota,
    procedencia: c.procedencia, uncertainty: c.uncertainty, uncertaintyNota: c.uncertaintyNota, idOrigen: c.idOrigen,
    reviewStatus: reviewStatusDe(c.revisiones), eventos: c.eventos.map(eventoVista), limiteDisponible: limiteDisponible(version, c),
  }
}

export function armarTransferencia(version: VersionFunciones, d: DatosOrganizacion): VistaTransferencia {
  exigirVersion(version)
  exigirUnaOrganizacion(d)
  const riesgos = d.riesgos
    .map((r): RiesgoEnTransferencia => ({
      ...identidad(r),
      coberturas: d.coberturas
        .filter((c) => c.riskId === r.id)
        .sort((a, b) => a.vigenciaDesde.localeCompare(b.vigenciaDesde) || a.id.localeCompare(b.id))
        .map((c) => coberturaVista(version, c)),
    }))
    .filter((r) => r.coberturas.length > 0)
    .sort(porOrigen)
  return { version, organizacionId: d.organizacionId, riesgos }
}

// ── Feed de actividad (dossier 15a §4) ───────────────────────────────────────

export type TipoActividad =
  | 'evaluacion' | 'revision_humana' | 'estado_accion' | 'evento_poliza' | 'revision_pendiente' | 'cierre_revision' | 'novedad'

export interface ItemActividad {
  /** AAAA-MM-DD, o el instante ISO de lo que se registró en Risk OS. */
  readonly fecha: string
  readonly tipo: TipoActividad
  readonly riskId: string
  readonly titulo: string
  readonly idOrigen: string | null
  readonly refId: string
  readonly detalle: string
}

export interface VistaActividad {
  readonly organizacionId: string
  readonly items: readonly ItemActividad[]
}

const ESTADOS_ACCION: Readonly<Record<string, string>> = { planificada: 'planificada', en_curso: 'en curso', cumplida: 'cumplida', cancelada: 'cancelada' }

export function armarActividad(d: DatosOrganizacion): VistaActividad {
  exigirUnaOrganizacion(d)
  const riesgo = new Map(d.riesgos.map((r) => [r.id, r]))
  const items: ItemActividad[] = []
  const add = (riskId: string, x: Omit<ItemActividad, 'riskId' | 'titulo' | 'idOrigen'>): void => {
    const r = riesgo.get(riskId)
    items.push({ ...x, riskId, titulo: r?.titulo ?? riskId, idOrigen: r?.idOrigen ?? null })
  }
  const revisiones = (riskId: string, refId: string, que: string, rs: readonly RevisionRegistrada[]): void => {
    for (const r of rs) add(riskId, { fecha: r.fecha, tipo: 'revision_humana', refId, detalle: `Revisión humana de ${que}: ${r.estado}, por ${r.revisor}` })
  }
  for (const e of d.evaluaciones) {
    add(e.riskId, {
      fecha: e.fecha, tipo: 'evaluacion', refId: e.id,
      detalle: e.tipo === 'inicial' ? 'Evaluación inicial' : `Reevaluación por ${e.motivo ?? 'motivo sin registrar'}`,
    })
    revisiones(e.riskId, e.id, 'la evaluación', e.revisiones)
  }
  for (const a of d.acciones) {
    for (const s of a.estados) {
      add(a.riskId, {
        fecha: s.fechaCumplida ?? s.registradoEn, tipo: 'estado_accion', refId: a.id,
        detalle: `Acción «${a.descripcion}»: ${ESTADOS_ACCION[s.estado] ?? s.estado}${s.efecto === null ? '' : `, ${s.efecto}`}`,
      })
    }
    revisiones(a.riskId, a.id, a.tipoRegistro === 'accion' ? 'la acción' : 'la decisión de tratamiento', a.revisiones)
  }
  for (const c of d.coberturas) {
    for (const e of c.eventos) {
      add(e.riskId, { fecha: e.fecha, tipo: 'evento_poliza', refId: e.id, detalle: `Evento de póliza ${c.polizaRef}: ${e.tipo} (observación local)` })
    }
    revisiones(c.riskId, c.id, 'la cobertura', c.revisiones)
  }
  for (const r of d.revisionesPendientes) {
    add(r.riskId, { fecha: r.abiertaEn, tipo: 'revision_pendiente', refId: r.id, detalle: `Revisión pendiente abierta por ${r.disparador}` })
    if (r.cierre !== null) {
      add(r.riskId, {
        fecha: r.cierre.cerradaEn, tipo: 'cierre_revision', refId: r.id,
        detalle: `Revisión cerrada: ${r.cierre.resultado === 'sin_cambio' ? 'sin cambio' : 'reevaluación aceptada'}, por ${r.cierre.cerradaPor}`,
      })
    }
  }
  for (const n of d.novedades) {
    add(n.riskId, { fecha: n.registradaEn, tipo: 'novedad', refId: n.id, detalle: `Novedad (${n.tipo}) de ${n.autor}: ${n.texto}` })
  }
  items.sort((a, b) => b.fecha.localeCompare(a.fecha) || a.tipo.localeCompare(b.tipo) || a.refId.localeCompare(b.refId))
  return { organizacionId: d.organizacionId, items }
}

// ── Detalle del riesgo con su historial (§6, §12, §13) ───────────────────────

export interface FactorDetalle extends FactorVista {
  readonly observacion: string | null
  readonly base: string | null
  readonly evidencia: readonly string[] | null
}

/** `C_raw` con el vector completo y las dos banderas en el mismo registro (RO01 §3, regla 1; H6). */
export interface CriticidadDetalle extends Calculado {
  readonly evaluable: boolean
  readonly motivoNoEvaluable: string | null
  readonly cRaw: number | null
  readonly vector: readonly FactorVista[]
  readonly banderas: Banderas
  readonly banda: Banda | null
  readonly iEfectivo: string
  readonly dimensionDeterminante: readonly Dimension[]
  /** `V_d` por dimensión (§5.5); `null` si contención o recuperación es `unknown`. */
  readonly vPorDimension: Readonly<Record<Dimension, number>> | null
}

export interface Movimiento {
  /** La evaluación anterior aceptada; si no hay, la anterior de la cadena, rotulada. */
  readonly contraId: string
  readonly contraAceptada: boolean
  readonly factores: readonly { readonly factor: NombreFactor; readonly antes: FactorVista; readonly despues: FactorVista }[]
  readonly vPorDimension: { readonly antes: Readonly<Record<Dimension, number>> | null; readonly despues: Readonly<Record<Dimension, number>> | null }
  readonly banda: { readonly antes: Banda | null; readonly despues: Banda | null }
  readonly dimensionDeterminante: { readonly antes: readonly Dimension[]; readonly despues: readonly Dimension[] }
}

export interface EvaluacionDetalle {
  readonly id: string
  readonly tipo: 'inicial' | 'reevaluacion'
  readonly anteriorId: string | null
  readonly motivo: string | null
  readonly accionId: string | null
  readonly fecha: string
  readonly versionMetodologia: string
  readonly evaluador: string
  readonly procedencia: Procedencia
  readonly riesgoCausa: string | null
  readonly riesgoEvento: string
  readonly riesgoConsecuencia: string | null
  readonly factores: readonly FactorDetalle[]
  readonly montoBruto: string | null
  readonly moneda: string | null
  readonly uncertainty: Uncertainty
  readonly uncertaintyNota: string | null
  readonly necesidadValidacion: string | null
  readonly motivoNoEvaluableRegistrado: string | null
  readonly justificacion: string | null
  readonly reglasAplicadas: readonly string[] | null
  readonly idOrigen: string | null
  readonly reviewStatus: ReviewStatus
  readonly revisiones: readonly RevisionRegistrada[]
  readonly vigente: boolean
  readonly criticidad: CriticidadDetalle
  /** §6.6, rotulado aparte: nunca entra al ranking (RO01 §3, regla 3). */
  readonly techoPlausible: { readonly version: VersionFunciones; readonly valor: number; readonly rotulo: string }
  readonly movimiento: Movimiento | null
}

export interface NovedadVista {
  readonly id: string
  readonly tipo: string
  readonly texto: string
  readonly evidencia: readonly string[]
  readonly autor: string
  readonly registradaEn: string
  readonly destino: string
}

export interface RevisionPendienteVista {
  readonly id: string
  readonly disparador: string
  readonly referencia: string | null
  readonly abiertaEn: string
  readonly estado: 'abierta' | 'cerrada'
  readonly cierre: RevisionPendienteRegistrada['cierre']
}

export interface VistaDetalle {
  readonly version: VersionFunciones
  readonly organizacionId: string
  readonly riesgo: Identidad & {
    readonly loteOrigen: string | null
    readonly consecuenciaComun: string | null
    readonly padre: Identidad | null
    readonly hijos: readonly Identidad[]
    readonly miembros: readonly Identidad[]
    readonly escenarios: readonly Identidad[]
  }
  /** En el ranking principal de su organización; `null` si no compite (sub-riesgo, escenario, no evaluable). */
  readonly posicion: { readonly posicion: number; readonly empate: boolean; readonly provisional: boolean } | null
  readonly evaluacionUsada: EvaluacionUsada | null
  /**
   * Un padre no tiene evaluación: se lee por su hijo prioritario (§1.4), y su posición es la de
   * ese hijo. Acá va qué hijo y qué evaluación de él usa la posición (RO01 §3, regla 6).
   */
  readonly leePor: (Identidad & { readonly evaluacion: EvaluacionUsada | null; readonly prioridadProvisional: boolean }) | null
  /** De la inicial a la última. */
  readonly historial: readonly EvaluacionDetalle[]
  readonly acciones: readonly AccionVista[]
  readonly coberturas: readonly CoberturaVista[]
  readonly novedades: readonly NovedadVista[]
  readonly revisionesPendientes: readonly RevisionPendienteVista[]
}

function criticidadDe(version: VersionFunciones, e: EvaluacionRegistrada, d: Derivados): CriticidadDetalle {
  return {
    version,
    evaluable: d.evaluabilidad.evaluable,
    motivoNoEvaluable: d.evaluabilidad.evaluable ? null : MOTIVOS_NO_EVALUABLE[d.evaluabilidad.motivo],
    cRaw: d.cRaw,
    vector: vectorDe(e),
    banderas: banderasDe(d),
    banda: d.banda,
    iEfectivo: iEfectivoTexto(d.iEfectivo),
    dimensionDeterminante: d.evaluabilidad.evaluable ? d.evaluabilidad.determinantes : [],
    vPorDimension: d.vPorDimension,
  }
}

export function armarDetalle(version: VersionFunciones, d: DatosOrganizacion, riskId: string): VistaDetalle {
  const o = organizacion(version, d)
  const r = o.riesgo.get(riskId)
  if (r === undefined) throw new Error(`${riskId} no está en ${d.organizacionId}`)
  const ident = (id: string): Identidad => {
    const x = o.riesgo.get(id)
    if (x === undefined) throw new Error(`${id} no está en ${d.organizacionId}`)
    return identidad(x)
  }

  const cadena = historia(o.evaluaciones, riskId)
  const usada = vigente(cadena)
  const historial = cadena.map((ev, i): EvaluacionDetalle => {
    const reg = o.evaluacion.get(ev.id)
    if (reg === undefined) throw new Error(`${ev.id} no está registrada`)
    const der = derivados(version, ev.factores)
    const anteriores = cadena.slice(0, i)
    const contra = anteriores.filter((x) => x.reviewStatus === 'accepted').at(-1) ?? anteriores.at(-1)
    const contraReg = contra === undefined ? undefined : o.evaluacion.get(contra.id)
    let movimiento: Movimiento | null = null
    if (contra !== undefined && contraReg !== undefined) {
      const antes = derivados(version, contra.factores)
      const va = vectorDe(contraReg)
      const vd = vectorDe(reg)
      movimiento = {
        contraId: contra.id,
        contraAceptada: contra.reviewStatus === 'accepted',
        factores: FACTORES.map((f, k) => ({ factor: f, antes: va[k] ?? vectorFactor(f, contraReg.factores[f]), despues: vd[k] ?? vectorFactor(f, reg.factores[f]) })),
        vPorDimension: { antes: antes.vPorDimension, despues: der.vPorDimension },
        banda: { antes: antes.banda, despues: der.banda },
        dimensionDeterminante: {
          antes: antes.evaluabilidad.evaluable ? antes.evaluabilidad.determinantes : [],
          despues: der.evaluabilidad.evaluable ? der.evaluabilidad.determinantes : [],
        },
      }
    }
    return {
      id: reg.id, tipo: reg.tipo, anteriorId: reg.anteriorId, motivo: reg.motivo, accionId: reg.accionId, fecha: reg.fecha,
      versionMetodologia: reg.versionMetodologia, evaluador: reg.evaluador, procedencia: reg.procedencia, riesgoCausa: reg.riesgoCausa,
      riesgoEvento: reg.riesgoEvento, riesgoConsecuencia: reg.riesgoConsecuencia,
      factores: FACTORES.map((f): FactorDetalle => ({
        ...vectorFactor(f, reg.factores[f]), observacion: reg.factores[f].observacion, base: reg.factores[f].base, evidencia: reg.factores[f].evidencia,
      })),
      montoBruto: reg.montoBruto, moneda: reg.moneda, uncertainty: reg.uncertainty, uncertaintyNota: reg.uncertaintyNota,
      necesidadValidacion: reg.necesidadValidacion, motivoNoEvaluableRegistrado: reg.motivoNoEvaluable, justificacion: reg.justificacion,
      reglasAplicadas: reg.reglasAplicadas, idOrigen: reg.idOrigen, reviewStatus: ev.reviewStatus, revisiones: reg.revisiones,
      vigente: usada?.id === ev.id,
      criticidad: criticidadDe(version, reg, der),
      techoPlausible: { version, valor: der.techoPlausible, rotulo: ROTULO_TECHO },
      movimiento,
    }
  })

  const enRanking = o.ranking.posiciones.find((p) => p.ids.includes(riskId))
  const numero = numeroDePosicion(o.ranking, riskId)
  const acciones = d.acciones.filter((a) => a.riskId === riskId)
  const novedades = d.novedades.filter((n) => n.riskId === riskId)
  return {
    version,
    organizacionId: d.organizacionId,
    riesgo: {
      ...identidad(r),
      loteOrigen: r.loteOrigen,
      consecuenciaComun: r.consecuenciaComun,
      padre: r.riesgoPadreId === null ? null : ident(r.riesgoPadreId),
      hijos: d.riesgos.filter((h) => h.riesgoPadreId === riskId).map(identidad).sort(porOrigen),
      miembros: r.miembros.map(ident).sort(porOrigen),
      escenarios: d.riesgos.filter((e) => e.miembros.includes(riskId)).map(identidad).sort(porOrigen),
    },
    posicion: enRanking === undefined || numero === null ? null : { posicion: numero, empate: enRanking.ids.length > 1, provisional: enRanking.provisional },
    evaluacionUsada: evaluacionUsada(o, riskId),
    leePor: (() => {
      const padre = o.ranking.padres.get(riskId)
      const hijo = padre?.hijosPrioritarios[0]
      if (padre === undefined || hijo === undefined) return null
      return { ...ident(hijo), evaluacion: evaluacionUsada(o, hijo), prioridadProvisional: padre.prioridadProvisional }
    })(),
    historial,
    acciones: acciones.sort((a, b) => a.fechaAlta.localeCompare(b.fechaAlta) || a.id.localeCompare(b.id)).map((a) => accionVista(o, a)),
    coberturas: d.coberturas.filter((c) => c.riskId === riskId).map((c) => coberturaVista(version, c)),
    novedades: novedades.map((n): NovedadVista => ({
      id: n.id, tipo: n.tipo, texto: n.texto, evidencia: n.evidencia, autor: n.autor, registradaEn: n.registradaEn,
      destino: n.accionId ?? n.transferenciaId ?? 'riesgo',
    })),
    revisionesPendientes: d.revisionesPendientes
      .filter((p) => p.riskId === riskId)
      .map((p): RevisionPendienteVista => ({
        id: p.id, disparador: p.disparador, referencia: p.accionId ?? p.novedadId ?? p.versionMetodologia, abiertaEn: p.abiertaEn,
        estado: p.cierre === null ? 'abierta' : 'cerrada', cierre: p.cierre,
      })),
  }
}
