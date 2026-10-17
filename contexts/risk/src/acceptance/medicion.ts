// La medición de la aceptación de RO01 §6 (T-0032): de la foto de `lectura.ts` y el manifiesto,
// cada criterio que se mide contra la base (A6, A7, A8, A9 sobre las históricas y A12) con su
// valor y si cumple, y los disparadores de reapertura del dossier de la Fase 13, §5, como
// evidencia para EMI-44 y D14. Puro.
//
// Lo que devuelve sólo tiene códigos de empresa (H1 a H5) y de persona (R1, …), conteos, fechas,
// huellas e ids opacos (`RSK-…`, `REV-…`). Ningún título, texto, observación, monto, nombre de
// persona ni id de organización (R-19): un test lo comprueba con las sintéticas.

import { contarCiclos, DISPARADORES_A7, type ConteoCiclos, type RevisionParaContar } from '../domain/ciclos.ts'
import { reconstruirHistorial, type EntradaHistorial, type TablaHistorial } from '../domain/historial.ts'
import { rankingOrganizacion } from '../domain/lectura.ts'
import { VERSION_METODOLOGIA } from '../domain/modelo.ts'
import { aEvaluacion, aRiesgo, type DatosOrganizacion } from '../domain/organizacion.ts'
import { armarActividad, armarDetalle, armarEscenarios, armarLista, armarPlan, armarTransferencia, type FilaRanking } from '../domain/vistas.ts'
import type { LecturaAceptacion } from './lectura.ts'
import { EMPRESAS, type CodigoEmpresa, type EstadoIntento, type Manifiesto } from './manifiesto.ts'

const V = VERSION_METODOLOGIA

// ── A6 ───────────────────────────────────────────────────────────────────────

export interface A6Empresa {
  readonly empresa: CodigoEmpresa
  readonly enLaBase: boolean
  readonly intentos: number
  readonly porEstado: Readonly<Partial<Record<EstadoIntento, number>>>
  /** Rechazos por `regla_id`, sumados en todos los intentos. */
  readonly rechazosPorRegla: Readonly<Record<string, number>>
  /** El último intento que dejó el lote cargado, y lo que la base registró de ese lote. */
  readonly cargado: {
    readonly fecha: string
    readonly huella: string
    readonly importadoEn: string
    readonly filas: { readonly risks: number; readonly actionPlan: number; readonly riskTransfer: number }
    readonly avisos: number
    readonly avisosPorRegla: Readonly<Record<string, number>>
    readonly escritas: Readonly<Record<string, number>>
  } | null
  /** Lotes de la base con filas de esta empresa que el manifiesto no declara como importados. */
  readonly lotesNoDeclarados: number
  /** Lotes de esta empresa que además escribieron filas de otra organización. */
  readonly lotesMezclados: number
  readonly cumple: boolean
  readonly faltas: readonly string[]
}

const sumar = (xs: readonly Readonly<Record<string, number>>[]): Record<string, number> => {
  const n: Record<string, number> = {}
  for (const x of xs) for (const [k, v] of Object.entries(x)) n[k] = (n[k] ?? 0) + v
  return n
}

function medirA6(m: Manifiesto, l: LecturaAceptacion): A6Empresa[] {
  return EMPRESAS.map((empresa): A6Empresa => {
    const e = m.empresas[empresa]
    const org = e.organizacionId
    const enLaBase = l.organizaciones.includes(org)
    const porEstado: Partial<Record<EstadoIntento, number>> = {}
    for (const i of e.intentos) porEstado[i.estado] = (porEstado[i.estado] ?? 0) + 1
    const declarados = new Set(e.intentos.filter((i) => i.estado === 'importado').map((i) => i.huella))
    const deLaEmpresa = l.lotes.filter((x) => x.organizaciones.includes(org))
    const ultimo = [...e.intentos].reverse().find((i) => i.estado === 'importado' || i.estado === 'ya_importado')
    const lote = ultimo === undefined ? undefined : deLaEmpresa.find((x) => x.huella === ultimo.huella)
    const faltas: string[] = []
    if (!enLaBase) faltas.push('la organización no tiene riesgos en la base')
    if (ultimo === undefined) faltas.push('ningún intento quedó importado')
    else if (lote === undefined) faltas.push('el lote del último intento importado no está en la base con filas de esta empresa')
    const lotesNoDeclarados = deLaEmpresa.filter((x) => !declarados.has(x.huella)).length
    if (lotesNoDeclarados > 0) faltas.push(`${String(lotesNoDeclarados)} lotes de la base con filas de esta empresa no están en el manifiesto`)
    const lotesMezclados = deLaEmpresa.filter((x) => x.organizaciones.length > 1).length
    if (lotesMezclados > 0) faltas.push(`${String(lotesMezclados)} lotes escribieron además filas de otra organización`)
    return {
      empresa, enLaBase, intentos: e.intentos.length, porEstado, rechazosPorRegla: sumar(e.intentos.map((i) => i.rechazos)),
      cargado: ultimo === undefined || lote === undefined ? null : {
        fecha: ultimo.fecha, huella: lote.huella, importadoEn: lote.importadoEn, filas: lote.filas, avisos: lote.avisos,
        // Los avisos, del intento que lo importó: un `ya_importado` no valida y no trae avisos.
        avisosPorRegla: e.intentos.find((i) => i.estado === 'importado' && i.huella === lote.huella)?.avisos ?? {}, escritas: lote.escritas,
      },
      lotesNoDeclarados, lotesMezclados, cumple: faltas.length === 0, faltas,
    }
  })
}

// ── A7 ───────────────────────────────────────────────────────────────────────

export interface A7Empresa {
  readonly empresa: CodigoEmpresa
  readonly ciclos: number
  readonly porDisparador: Readonly<Record<string, number>>
  readonly primerCierre: string | null
  readonly ultimoCierre: string | null
}

export interface A7 {
  readonly ciclos: number
  readonly porDisparador: Readonly<Record<string, number>>
  readonly porResultado: Readonly<Record<string, number>>
  readonly porEmpresa: readonly A7Empresa[]
  readonly noCuentan: ConteoCiclos['noCuentan']
  readonly tiposA7: readonly string[]
  /** Por qué no se cumple, con los códigos H1 a H5 en lugar de los ids de organización. */
  readonly faltas: readonly string[]
  /** Ciclos que cuentan sin disparador con referencia, sin quién cerró o sin la evaluación que lo cerró. */
  readonly sinTrazabilidad: readonly string[]
  readonly cumple: boolean
}

const cuenta = (r: RevisionParaContar): boolean => r.origen === 'sesion' && r.cierre !== null

function medirA7(m: Manifiesto, revisiones: readonly RevisionParaContar[]): A7 {
  const orgs = EMPRESAS.map((e) => m.empresas[e].organizacionId)
  const deEmpresas = revisiones.filter((r) => orgs.includes(r.organizacionId))
  const c = contarCiclos(deEmpresas, orgs)
  const sinTrazabilidad = deEmpresas.filter(cuenta).filter((r) =>
    r.referencia === null || r.abiertaEn === '' || r.cierre === null || r.cierre.cerradaPor === '' || r.cierre.cerradaEn === '' ||
    (r.cierre.resultado === 'reevaluacion_aceptada') !== (r.cierre.evaluacionId !== null)).map((r) => r.id)
  const codigo = (texto: string): string => EMPRESAS.reduce((t, e) => t.replaceAll(m.empresas[e].organizacionId, e), texto)
  return {
    ciclos: c.ciclos, porDisparador: c.porDisparador, porResultado: c.porResultado,
    porEmpresa: EMPRESAS.map((empresa): A7Empresa => {
      const x = c.porEmpresa.find((p) => p.organizacionId === m.empresas[empresa].organizacionId)
      return { empresa, ciclos: x?.ciclos ?? 0, porDisparador: x?.porDisparador ?? {}, primerCierre: x?.primerCierre ?? null, ultimoCierre: x?.ultimoCierre ?? null }
    }),
    noCuentan: c.noCuentan, tiposA7: c.tiposA7, faltas: c.faltas.map(codigo), sinTrazabilidad,
    cumple: c.cumpleA7 && sinTrazabilidad.length === 0,
  }
}

// ── A8 y los disparadores de reapertura ──────────────────────────────────────

export interface A8Empresa {
  readonly empresa: CodigoEmpresa
  readonly ordenPrevio: {
    readonly registradoEn: string
    readonly items: number
    readonly conBanda: number
  } | null
  /** Primer acceso del revisor a una vista con ranking, bandas o `C_raw` de esta empresa. */
  readonly primerAcceso: string | null
  readonly previoAntesDelAcceso: boolean
  readonly enRanking: number
  readonly vigentes: number
  readonly vigentesRevisadas: number
  readonly revisionesPorEstado: Readonly<Record<string, number>>
  readonly ultimaRevision: string | null
  readonly reordenamientos: number
  readonly reordenamientosPorCausa: Readonly<Record<string, number>>
  readonly reordenamientosSinFundamento: number
  /** Evaluaciones iniciales cuyo evaluador es el revisor: tiene que ser 0 (decisión 6 del owner). */
  readonly inicialesDelRevisor: number
  readonly cumpleA: boolean
  readonly cumpleB: boolean
  readonly cumpleC: boolean
}

export interface ComparacionEmpresa {
  readonly empresa: CodigoEmpresa
  /** Pares que el revisor ordenó antes de ver Risk OS y que los dos ordenan. */
  readonly paresComparables: number
  /** Los que Risk OS invierte: candidatos al disparador 1, que hay que adjudicar. */
  readonly paresInvertidos: readonly { readonly arribaRevisor: string; readonly arribaRiskOs: string }[]
  readonly bandasComparables: number
  readonly bandasCoinciden: number
  /** Riesgos `safety_critical` en el top-3 del revisor que Risk OS deja debajo de un riesgo sólo económico. */
  readonly safetyBajoEconomico: readonly string[]
  readonly reordenamientosFamiliaS06: number
  readonly reordenamientosSafetyBajoEconomico: number
}

export interface Disparadores {
  readonly porEmpresa: readonly ComparacionEmpresa[]
  readonly tercerCaso: { readonly candidatos: number; readonly nota: string }
  readonly familiaS06: { readonly empresas: readonly CodigoEmpresa[]; readonly dispara: boolean }
  readonly bandas: { readonly n: number; readonly coinciden: number; readonly porcentaje: number | null; readonly dispara: boolean }
  readonly seguridad: { readonly casos: number; readonly dispara: boolean }
}

const normal = (s: string): string => s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/\s+/g, ' ').trim()

/** Sólo económico: no es `safety_critical` y su única dimensión determinante es la económica. */
const soloEconomico = (f: FilaRanking): boolean =>
  !f.lectura.banderas.safetyCritical && f.lectura.dimensionDeterminante.length === 1 && f.lectura.dimensionDeterminante[0] === 'econ'

function medirA8(
  m: Manifiesto, l: LecturaAceptacion, listas: ReadonlyMap<string, FilaRanking[]>,
): { readonly porEmpresa: readonly A8Empresa[]; readonly disparadores: Disparadores; readonly cumple: boolean } {
  const revisor = m.personas.R1 ?? ''
  const nombreRevisor = normal(l.personas.find((p) => p.id === revisor)?.nombre ?? '')
  const porEmpresa: A8Empresa[] = []
  const comparaciones: ComparacionEmpresa[] = []
  for (const empresa of EMPRESAS) {
    const org = m.empresas[empresa].organizacionId
    const d = l.datos.get(org)
    const ranking = listas.get(org) ?? []
    const op = d?.ordenesPrevios.find((o) => o.revisorPersonaId === revisor) ?? null
    const primerAcceso = l.accesos.find((a) => a.personaId === revisor && a.organizacionId === org)?.ocurridoEn ?? null
    const vigentes = d === undefined ? [] : [...rankingOrganizacion(V, d.riesgos.map(aRiesgo), d.evaluaciones.map(aEvaluacion)).vigentes.values()]
    const delRevisor = l.revisionesHumanas.filter((h) => h.personaId === revisor && vigentes.some((v) => v.id === h.evaluacionId))
    const revisadas = vigentes.filter((v) => delRevisor.some((h) => h.evaluacionId === v.id)).length
    const porEstado: Record<string, number> = {}
    for (const h of delRevisor) porEstado[h.estado] = (porEstado[h.estado] ?? 0) + 1
    const reord = l.reordenamientos.filter((x) => x.organizacionId === org && x.autorPersonaId === revisor)
    const porCausa: Record<string, number> = {}
    for (const x of reord) porCausa[x.causa] = (porCausa[x.causa] ?? 0) + 1
    const inicialesDelRevisor = nombreRevisor === '' ? 0
      : (d?.evaluaciones ?? []).filter((e) => e.tipo === 'inicial' && normal(e.evaluador) === nombreRevisor).length
    const previoAntesDelAcceso = op !== null && (primerAcceso === null || op.registradoEn < primerAcceso)
    porEmpresa.push({
      empresa,
      ordenPrevio: op === null ? null : { registradoEn: op.registradoEn, items: op.items.length, conBanda: op.items.filter((i) => i.banda !== null).length },
      primerAcceso, previoAntesDelAcceso, enRanking: ranking.length, vigentes: vigentes.length, vigentesRevisadas: revisadas,
      revisionesPorEstado: porEstado, ultimaRevision: delRevisor.map((h) => h.registradaEn).sort().at(-1) ?? null,
      reordenamientos: reord.length, reordenamientosPorCausa: porCausa, reordenamientosSinFundamento: reord.filter((x) => !x.conFundamento).length,
      inicialesDelRevisor,
      cumpleA: previoAntesDelAcceso && op.items.length > 0,
      cumpleB: vigentes.length > 0 && revisadas === vigentes.length,
      cumpleC: reord.every((x) => x.conFundamento),
    })

    // Disparadores de reapertura (dossier de la Fase 13, §5), con el orden previo como el orden escrito antes de ver Risk OS.
    const fila = new Map(ranking.map((f) => [f.riskId, f]))
    const items = (op?.items ?? []).filter((i) => fila.has(i.riskId)).sort((a, b) => a.posicion - b.posicion)
    const invertidos: { arribaRevisor: string; arribaRiskOs: string }[] = []
    let comparables = 0
    for (const [i, a] of items.entries()) {
      for (const b of items.slice(i + 1)) {
        if (a.posicion === b.posicion) continue
        comparables++
        if ((fila.get(b.riskId)?.posicion ?? 0) < (fila.get(a.riskId)?.posicion ?? 0)) invertidos.push({ arribaRevisor: a.riskId, arribaRiskOs: b.riskId })
      }
    }
    const conBandas = items.filter((i) => i.banda !== null && fila.get(i.riskId)?.lectura.banda != null)
    const safetyBajoEconomico = items.filter((i) => i.posicion <= 3 && fila.get(i.riskId)?.lectura.banderas.safetyCritical === true)
      .filter((i) => ranking.some((x) => x.posicion < (fila.get(i.riskId)?.posicion ?? 0) && soloEconomico(x)))
      .map((i) => i.riskId)
    const deLaEmpresa = l.reordenamientos.filter((x) => x.organizacionId === org)
    comparaciones.push({
      empresa, paresComparables: comparables, paresInvertidos: invertidos,
      bandasComparables: conBandas.length, bandasCoinciden: conBandas.filter((i) => fila.get(i.riskId)?.lectura.banda === i.banda).length,
      safetyBajoEconomico,
      reordenamientosFamiliaS06: deLaEmpresa.filter((x) => x.patron === 'familia_s06').length,
      reordenamientosSafetyBajoEconomico: deLaEmpresa.filter((x) => x.patron === 'safety_bajo_economico').length,
    })
  }
  const n = comparaciones.reduce((s, c) => s + c.bandasComparables, 0)
  const coinciden = comparaciones.reduce((s, c) => s + c.bandasCoinciden, 0)
  const porcentaje = n === 0 ? null : Math.round((1000 * coinciden) / n) / 10
  const familia = comparaciones.filter((c) => c.reordenamientosFamiliaS06 > 0).map((c) => c.empresa)
  const casos = comparaciones.reduce((s, c) => s + c.safetyBajoEconomico.length, 0)
  return {
    porEmpresa,
    disparadores: {
      porEmpresa: comparaciones,
      tercerCaso: {
        candidatos: comparaciones.reduce((s, c) => s + c.paresInvertidos.length, 0),
        nota: 'cada par invertido es candidato: cuenta como tercer caso sólo si no se arregla con bandas, redacción de anclas ni desempates, y no es G3 ni de la familia S06 (lo adjudica el owner)',
      },
      familiaS06: { empresas: familia, dispara: familia.length >= 2 },
      bandas: { n, coinciden, porcentaje, dispara: n >= 23 && porcentaje !== null && porcentaje < 70 },
      seguridad: { casos, dispara: casos >= 2 },
    },
    cumple: porEmpresa.every((e) => e.cumpleA && e.cumpleB && e.cumpleC && e.inicialesDelRevisor === 0),
  }
}

// ── A9 sobre las históricas ──────────────────────────────────────────────────

export interface A9Empresa {
  readonly empresa: CodigoEmpresa
  readonly salidas: number
  readonly conCRaw: number
  readonly sinVectorOBanderas: number
  readonly fueraDeLaCriticidad: number
  readonly noSeArmaron: number
}

/** Cada objeto con una clave `cRaw`, con su ruta. */
function conCRaw(v: unknown, ruta = ''): { ruta: string; o: Record<string, unknown> }[] {
  if (Array.isArray(v)) return v.flatMap((x, i) => conCRaw(x, `${ruta}[${String(i)}]`))
  if (typeof v !== 'object' || v === null) return []
  const o = v as Record<string, unknown>
  const propios = Object.keys(o).some((k) => /^c_?raw$/i.test(k)) ? [{ ruta, o }] : []
  return [...propios, ...Object.entries(o).flatMap(([k, x]) => conCRaw(x, `${ruta}.${k}`))]
}

const completo = (o: Record<string, unknown>): boolean => {
  const b = o.banderas as Record<string, unknown> | undefined
  return Array.isArray(o.vector) && o.vector.length === 7 && typeof b?.consecuenciaExtrema === 'boolean' && typeof b.safetyCritical === 'boolean'
}

function medirA9(empresa: CodigoEmpresa, d: DatosOrganizacion | undefined): A9Empresa {
  if (d === undefined) return { empresa, salidas: 0, conCRaw: 0, sinVectorOBanderas: 0, fueraDeLaCriticidad: 0, noSeArmaron: 0 }
  let salidas = 0, con = 0, sin = 0, fuera = 0, noSeArmaron = 0
  const revisar = (vista: unknown, esDetalle: boolean): void => {
    salidas++
    for (const x of conCRaw(JSON.parse(JSON.stringify(vista)) as unknown)) {
      con++
      if (!completo(x.o)) sin++
      if (!esDetalle || !/^\.historial\[\d+\]\.criticidad$/.test(x.ruta)) fuera++
    }
  }
  for (const vista of [armarLista(V, d), armarEscenarios(V, d), armarPlan(d), armarTransferencia(V, d), armarActividad(d)]) revisar(vista, false)
  for (const r of d.riesgos) {
    try {
      revisar(armarDetalle(V, d, r.id), true)
    } catch {
      noSeArmaron++
    }
  }
  return { empresa, salidas, conCRaw: con, sinVectorOBanderas: sin, fueraDeLaCriticidad: fuera, noSeArmaron }
}

// ── A12 ──────────────────────────────────────────────────────────────────────

export interface A12 {
  readonly ciclos: number
  readonly ciclosConHistorialCompleto: number
  /** Revisiones de ciclos que cuentan cuyo historial no muestra la apertura, el disparador, el cierre o la reevaluación. */
  readonly incompletos: readonly string[]
  readonly riesgos: number
  /** Filas de la base sin su entrada de historial (o entradas sin su fila), por tabla. */
  readonly diferencias: Readonly<Record<string, number>>
  readonly cumple: boolean
}

function medirA12(m: Manifiesto, l: LecturaAceptacion): A12 {
  const historiales = new Map<string, EntradaHistorial[]>()
  const historial = (d: DatosOrganizacion, riskId: string): EntradaHistorial[] => {
    const h = historiales.get(riskId) ?? reconstruirHistorial(d, riskId)
    historiales.set(riskId, h)
    return h
  }
  const incompletos: string[] = []
  let ciclos = 0
  for (const e of EMPRESAS) {
    const d = l.datos.get(m.empresas[e].organizacionId)
    if (d === undefined) continue
    for (const p of d.revisionesPendientes.filter((x) => x.origen === 'sesion' && x.cierre !== null)) {
      ciclos++
      const h = historial(d, p.riskId)
      const hay = (t: TablaHistorial, id: string | null, f: (x: EntradaHistorial) => boolean = () => true): boolean =>
        id !== null && h.some((x) => x.tabla === t && x.objetoId === id && x.quien.trim() !== '' && x.cuando !== '' && f(x))
      const apertura = hay('revision_pendiente', p.id)
      const cierre = hay('cierre_revision', p.id, (x) => x.antes === 'abierta')
      const disparador = p.disparador === 'accion_ejecutada'
        ? hay('accion_estado', p.accionId, (x) => x.antes !== null && x.despues.startsWith('cumplida'))
        : p.disparador === 'cambio_version_metodologia' || hay('novedad', p.novedadId)
      const evaluacion = p.cierre?.resultado !== 'reevaluacion_aceptada' || (
        hay('evaluacion', p.cierre.evaluacionId, (x) => x.antes !== null) &&
        hay('revision_humana', p.cierre.evaluacionId, (x) => x.despues === 'accepted'))
      if (!(apertura && cierre && disparador && evaluacion)) incompletos.push(p.id)
    }
  }
  const diferencias: Record<string, number> = {}
  let riesgos = 0
  for (const e of EMPRESAS) {
    const d = l.datos.get(m.empresas[e].organizacionId)
    for (const r of d?.riesgos ?? []) {
      if (d === undefined) continue
      riesgos++
      const h = historial(d, r.id)
      for (const [t, n] of Object.entries(l.filasPorRiesgo.get(r.id) ?? {})) {
        const dif = Math.abs(h.filter((x) => x.tabla === t).length - n)
        if (dif > 0) diferencias[t] = (diferencias[t] ?? 0) + dif
      }
    }
  }
  return {
    ciclos, ciclosConHistorialCompleto: ciclos - incompletos.length, incompletos, riesgos, diferencias,
    cumple: incompletos.length === 0 && Object.keys(diferencias).length === 0 && riesgos > 0,
  }
}

// ── Todo junto ───────────────────────────────────────────────────────────────

export interface MedicionAceptacion {
  readonly medidoEn: string
  readonly versionFunciones: typeof V
  readonly organizacionesEnLaBase: number
  /** Organizaciones con riesgos que no son ninguna de las cinco del manifiesto. */
  readonly otrasOrganizaciones: number
  readonly a6: { readonly porEmpresa: readonly A6Empresa[]; readonly cumple: boolean }
  readonly a7: A7
  readonly a8: { readonly porEmpresa: readonly A8Empresa[]; readonly cumple: boolean }
  readonly disparadores: Disparadores
  readonly a9: { readonly porEmpresa: readonly A9Empresa[]; readonly cumple: boolean }
  readonly a12: A12
  readonly cumplenTodos: boolean
}

export function medir(m: Manifiesto, l: LecturaAceptacion): MedicionAceptacion {
  const orgs = EMPRESAS.map((e) => m.empresas[e].organizacionId)
  const listas = new Map<string, FilaRanking[]>()
  for (const o of orgs) {
    const d = l.datos.get(o)
    if (d !== undefined) listas.set(o, [...armarLista(V, d).ranking])
  }
  const a6 = medirA6(m, l)
  const a7 = medirA7(m, l.revisiones)
  const a8 = medirA8(m, l, listas)
  const a9 = EMPRESAS.map((e) => medirA9(e, l.datos.get(m.empresas[e].organizacionId)))
  const a12 = medirA12(m, l)
  const r = {
    a6: { porEmpresa: a6, cumple: a6.every((x) => x.cumple) },
    a7,
    a8: { porEmpresa: a8.porEmpresa, cumple: a8.cumple },
    a9: { porEmpresa: a9, cumple: a9.every((x) => x.salidas > 0 && x.sinVectorOBanderas === 0 && x.fueraDeLaCriticidad === 0 && x.noSeArmaron === 0) },
    a12,
  }
  return {
    medidoEn: l.medidoEn, versionFunciones: V, organizacionesEnLaBase: l.organizaciones.length,
    otrasOrganizaciones: l.organizaciones.filter((o) => !orgs.includes(o)).length,
    ...r, disparadores: a8.disparadores,
    cumplenTodos: r.a6.cumple && r.a7.cumple && r.a8.cumple && r.a9.cumple && r.a12.cumple,
  }
}

// ── Informe en texto ─────────────────────────────────────────────────────────

const conteo = (n: Readonly<Record<string, number>>): string =>
  Object.keys(n).sort().map((k) => `${k} ${String(n[k])}`).join(', ') || '—'
const si = (b: boolean): string => (b ? 'cumple' : 'no cumple')
// Con segundos: A8a compara el orden previo con el primer acceso, que pueden caer en el mismo minuto.
const dia = (iso: string | null): string => (iso === null ? '—' : iso.slice(0, 19).replace('T', ' '))

/** El informe que el owner pega en el acta: sólo códigos, conteos, fechas, huellas e ids opacos. */
export function informeAceptacion(r: MedicionAceptacion): string[] {
  const l: string[] = [
    `Risk OS v1 · aceptación de RO01 §6 · medido el ${dia(r.medidoEn)} UTC con las funciones de ${r.versionFunciones}`,
    `organizaciones en la base: ${String(r.organizacionesEnLaBase)} (${String(r.otrasOrganizaciones)} fuera del manifiesto)`,
    `resultado de lo que mide el script (A6, A7, A8, A9 y A12): ${r.cumplenTodos ? 'todos cumplen' : 'alguno no cumple'}`,
    '',
    `A6 históricas: ${si(r.a6.cumple)}`,
  ]
  for (const e of r.a6.porEmpresa) {
    l.push(`  ${e.empresa}: ${String(e.intentos)} intentos (${conteo(e.porEstado)}); rechazos por regla en todos los intentos: ${conteo(e.rechazosPorRegla)}`)
    const x = e.cargado
    l.push(x === null ? '    sin lote cargado'
      : `    cargado: lote ${x.huella.slice(0, 12)}…, intento del ${x.fecha}, importado el ${dia(x.importadoEn)}; filas risks ${String(x.filas.risks)}, ` +
        `action-plan ${String(x.filas.actionPlan)}, risk-transfer ${String(x.filas.riskTransfer)}; 0 rechazos; ${String(x.avisos)} avisos (${conteo(x.avisosPorRegla)})`)
    if (x !== null) l.push(`    escritas: ${conteo(x.escritas)}`)
    for (const f of e.faltas) l.push(`    - ${f}`)
  }

  const a7 = r.a7
  l.push('', `A7 ciclos: ${si(a7.cumple)}`,
    `  ${String(a7.ciclos)} revisiones cerradas después de la importación (${conteo(a7.porDisparador)}); con reevaluación aceptada ${String(a7.porResultado.reevaluacion_aceptada ?? 0)}, sin cambio ${String(a7.porResultado.sin_cambio ?? 0)}`,
    `  tipos de disparador: ${String(a7.tiposA7.length)} de ${String(DISPARADORES_A7.length)} (${a7.tiposA7.join(', ') || '—'}); no cuentan: ${String(a7.noCuentan.abiertas)} abiertas, ${String(a7.noCuentan.deLosCsv)} de los CSV`)
  for (const e of a7.porEmpresa) {
    l.push(`  ${e.empresa}: ${String(e.ciclos)} (${conteo(e.porDisparador)})${e.primerCierre === null ? '' : `, cierres del ${e.primerCierre} al ${e.ultimoCierre ?? ''}`}`)
  }
  for (const f of a7.faltas) l.push(`  - ${f}`)
  if (a7.sinTrazabilidad.length > 0) l.push(`  - sin disparador, cierre o evaluación trazables: ${a7.sinTrazabilidad.join(', ')}`)

  l.push('', `A8 revisión profesional (R1): ${si(r.a8.cumple)}`)
  for (const e of r.a8.porEmpresa) {
    const op = e.ordenPrevio
    l.push(`  ${e.empresa}: (a) ${si(e.cumpleA)}: ${op === null ? 'sin orden previo' : `orden previo del ${dia(op.registradoEn)} con ${String(op.items)} posiciones y ${String(op.conBanda)} bandas`}; ` +
      `primer acceso a resultados ${dia(e.primerAcceso)}; ${String(e.enRanking)} objetos en el ranking de Risk OS`)
    l.push(`      (b) ${si(e.cumpleB)}: ${String(e.vigentesRevisadas)} de ${String(e.vigentes)} evaluaciones vigentes con revisión de R1 (${conteo(e.revisionesPorEstado)}); la última el ${dia(e.ultimaRevision)}`)
    l.push(`      (c) ${si(e.cumpleC)}: ${String(e.reordenamientos)} reordenamientos de R1 (${conteo(e.reordenamientosPorCausa)}), ${String(e.reordenamientosSinFundamento)} sin fundamento; ` +
      `evaluaciones iniciales cuyo evaluador es R1: ${String(e.inicialesDelRevisor)}`)
  }

  const d = r.disparadores
  l.push('', 'Disparadores de reapertura (dossier de la Fase 13, §5), orden previo de R1 contra el ranking de Risk OS:')
  for (const e of d.porEmpresa) {
    l.push(`  ${e.empresa}: ${String(e.paresInvertidos.length)} de ${String(e.paresComparables)} pares invertidos; bandas ${String(e.bandasCoinciden)} de ${String(e.bandasComparables)} coinciden; ` +
      `safety en el top-3 de R1 debajo de un riesgo sólo económico: ${String(e.safetyBajoEconomico.length)}; reordenamientos familia S06 ${String(e.reordenamientosFamiliaS06)}, safety bajo económico ${String(e.reordenamientosSafetyBajoEconomico)}`)
    for (const p of e.paresInvertidos) l.push(`    invertido: R1 pone ${p.arribaRevisor} sobre ${p.arribaRiskOs}; Risk OS, al revés`)
    for (const x of e.safetyBajoEconomico) l.push(`    safety bajo económico: ${x}`)
  }
  l.push(`  1. tercer caso: ${String(d.tercerCaso.candidatos)} candidatos; ${d.tercerCaso.nota}`,
    `  2. familia S06 en dos empresas distintas: ${d.familiaS06.dispara ? 'dispara' : 'no dispara'} (${d.familiaS06.empresas.join(', ') || 'ninguna'})`,
    `  3. bandas: ${String(d.bandas.coinciden)} de ${String(d.bandas.n)} coinciden (${d.bandas.porcentaje === null ? '—' : `${String(d.bandas.porcentaje)}%`}); ${d.bandas.dispara ? 'dispara' : 'no dispara'} (umbral: menos de 70% con n de 23 o más)`,
    `  4. seguridad: ${String(d.seguridad.casos)} casos; ${d.seguridad.dispara ? 'dispara (dos o más: v1.1)' : 'no dispara'}`)

  l.push('', `A9 C_raw nunca solo, sobre las históricas: ${si(r.a9.cumple)}`)
  for (const e of r.a9.porEmpresa) {
    l.push(`  ${e.empresa}: ${String(e.salidas)} salidas, ${String(e.conCRaw)} objetos con C_raw; ${String(e.sinVectorOBanderas)} sin el vector o las banderas, ${String(e.fueraDeLaCriticidad)} fuera de la criticidad del detalle, ${String(e.noSeArmaron)} que no se pudieron armar`)
  }

  const a12 = r.a12
  l.push('', `A12 historial: ${si(a12.cumple)}`,
    `  ${String(a12.ciclosConHistorialCompleto)} de ${String(a12.ciclos)} ciclos con apertura, disparador, cierre y reevaluación en el historial`,
    `  ${String(a12.riesgos)} riesgos; filas de la base sin su entrada de historial: ${conteo(a12.diferencias)}`)
  if (a12.incompletos.length > 0) l.push(`  - incompletos: ${a12.incompletos.join(', ')}`)
  l.push('', 'Lo que este script no mide: A1 a A5, A9 y A10 en CI (salida de los tests), A11 y A13 (el owner) y la diferencia entre revisor y evaluador original más allá del nombre.')
  return l
}
