// Capa de referencia de metodologia v1 candidate (`v0/fase-11/metodologia-v1-candidate-borrador.md`):
// la v0.3 (`v0/metodologia-v0.md`) más las correcciones que Emiliano aprobó en la Fase 11a,
// marcadas [F11-n]. La v0.2 sigue disponible donde hace falta comparar contra fichas que se
// registraron con ella (`Reglas`).
//
// Funciones puras, una por regla mecánica de la metodología. No es código de producto:
// es el oráculo contra el que se comparan las fichas registradas y las adjudicaciones.
// Cada función cita la sección que transcribe; si una regla exige juicio profesional,
// acá no se implementa (ver README, "Reglas que no se automatizan").

export type Nivel = 1 | 2 | 3 | 4 | 5
export const NIVELES: readonly Nivel[] = [1, 2, 3, 4, 5]

export const DIMENSIONES = ['econ', 'pers', 'cont', 'legal'] as const
export type Dimension = (typeof DIMENSIONES)[number]

export type Recuperacion = Nivel | 'no_aplica'

/**
 * Qué versión de las reglas aplica una función que cambió entre versiones. Las fichas de la
 * Fase 5 se registraron con v0.2: se comparan contra v0.2, no contra la candidata.
 */
export type Reglas = 'v0.2' | 'v0.3' | 'v1 candidate'

/** Un factor con valor, o `unknown` (§9.2). `min`/`max` son el rango registrado, si hay. */
export interface Factor<T> {
  readonly valor: T | 'unknown'
  readonly min?: Nivel
  readonly max?: Nivel
}

export interface Factores {
  readonly p: Factor<Nivel>
  readonly i: Readonly<Record<Dimension, Factor<Nivel>>>
  readonly vCont: Factor<Nivel>
  readonly vRec: Factor<Recuperacion>
}

/** Factores todos conocidos: la forma que entra a la fórmula. */
export interface FactoresConocidos {
  readonly p: Nivel
  readonly i: Readonly<Record<Dimension, Nivel>>
  readonly vCont: Nivel
  readonly vRec: Recuperacion
}

// ── §5.5 · V por dimensión, combinación secuencial [F5-2] ────────────────────

/** `V_d` de §5.5: personas y legal = contención; continuidad = min(c, r); económico = min(c, ⌈(c+r)/2⌉). */
export function vPorDimension(cont: Nivel, rec: Recuperacion): Record<Dimension, Nivel> {
  if (rec === 'no_aplica') return { econ: cont, pers: cont, cont, legal: cont }
  return {
    econ: Math.min(cont, Math.ceil((cont + rec) / 2)) as Nivel,
    pers: cont,
    cont: Math.min(cont, rec) as Nivel,
    legal: cont,
  }
}

/** `v_aspectos_aplicables` (protocolo v0.2 §2.3): qué aspectos entraron en cada `V_d` y cómo. */
export function aspectosAplicables(rec: Recuperacion | 'unknown'): string {
  const r = rec === 'no_aplica' ? '' : ',rec(secuencial)'
  return `econ:cont${r};pers:cont;cont:cont${r};legal:cont`
}

// ── §6 · Criticidad ──────────────────────────────────────────────────────────

export interface Criticidad {
  readonly cPorDimension: Record<Dimension, number>
  readonly cRaw: number
  /** Las dimensiones que dan el máximo; si empatan, todas (§6.2). */
  readonly determinantes: Dimension[]
}

/** `C_d = P × I_d × V_d`, `C_raw = max_d C_d` y dimensión determinante (§6.1, §6.2). */
export function criticidad(f: FactoresConocidos): Criticidad {
  const v = vPorDimension(f.vCont, f.vRec)
  const cPorDimension = {} as Record<Dimension, number>
  for (const d of DIMENSIONES) cPorDimension[d] = f.p * f.i[d] * v[d]
  const cRaw = Math.max(...DIMENSIONES.map((d) => cPorDimension[d]))
  return { cPorDimension, cRaw, determinantes: DIMENSIONES.filter((d) => cPorDimension[d] === cRaw) }
}

// ── §6.5 · Bandas [F9] ───────────────────────────────────────────────────────

export type Banda = 'Baja' | 'Media' | 'Alta' | 'Crítica'
export const BANDAS: readonly Banda[] = ['Baja', 'Media', 'Alta', 'Crítica']

/** Cortes de §6.5 (CH-093): Media desde 20, Alta desde 50, Crítica desde 75. */
export const CORTES_BANDA = { media: 20, alta: 50, critica: 75 } as const

/** Banda de un `C_raw` (§6.5). Un valor justo en el corte va a la banda superior. */
export function banda(cRaw: number): Banda {
  if (cRaw >= CORTES_BANDA.critica) return 'Crítica'
  if (cRaw >= CORTES_BANDA.alta) return 'Alta'
  if (cRaw >= CORTES_BANDA.media) return 'Media'
  return 'Baja'
}

/** Valor de un factor para una cota: el valor si es conocido; si es `unknown`, su `max` o 5 (§9.3.2). */
function cota<T extends Nivel | Recuperacion>(f: Factor<T>): T | Nivel {
  return f.valor === 'unknown' ? (f.max ?? 5) : f.valor
}

/** Valor para el techo: `<f>_max` donde hay rango, `<f>_valor` donde no (§6.6); `unknown` como en §9.3. */
function techo<T extends Nivel | Recuperacion>(f: Factor<T>): T | Nivel {
  if (f.valor === 'unknown') return f.max ?? 5
  return f.max ?? f.valor
}

function conocido<T>(f: Factor<T>): f is Factor<T> & { valor: T } {
  return f.valor !== 'unknown'
}

// ── §9.3 · Criticidad con partes `unknown` ───────────────────────────────────

export type Evaluacion =
  | ({ readonly evaluable: true } & Criticidad)
  | { readonly evaluable: false; readonly motivo: 'p_unknown' | 'sin_dimension_conocida' | 'cota_supera_c_raw' }

/**
 * §9.3. P `unknown` → no evaluable. Con una dimensión o un aspecto de V `unknown`, `C_raw`
 * sale de las dimensiones cuyos factores son todos conocidos; cada dimensión con una parte
 * `unknown` tiene una cota (esa parte en su `max`, o 5). Si alguna cota supera `C_raw`, o no
 * hay dimensión conocida, el riesgo no es evaluable.
 */
export function evaluar(f: Factores): Evaluacion {
  if (!conocido(f.p)) return { evaluable: false, motivo: 'p_unknown' }
  const p = f.p.valor
  const vCota = vPorDimension(cota(f.vCont), cota(f.vRec))
  // Qué aspectos entran en cada dimensión (§5.5): la recuperación sólo en econ y cont.
  const usaRec: Record<Dimension, boolean> = { econ: true, pers: false, cont: true, legal: false }
  const conocidas: Dimension[] = []
  const cotas: number[] = []
  const cPorDimension = {} as Record<Dimension, number>
  for (const d of DIMENSIONES) {
    const id = f.i[d]
    const vConocida = conocido(f.vCont) && (!usaRec[d] || f.vRec.valor === 'no_aplica' || conocido(f.vRec))
    const c = p * cota(id) * vCota[d]
    cPorDimension[d] = c
    if (conocido(id) && vConocida) conocidas.push(d)
    else cotas.push(c)
  }
  if (conocidas.length === 0) return { evaluable: false, motivo: 'sin_dimension_conocida' }
  const cRaw = Math.max(...conocidas.map((d) => cPorDimension[d]))
  if (cotas.some((c) => c > cRaw)) return { evaluable: false, motivo: 'cota_supera_c_raw' }
  return {
    evaluable: true,
    cPorDimension,
    cRaw,
    determinantes: conocidas.filter((d) => cPorDimension[d] === cRaw),
  }
}

/**
 * Techo plausible (§6.6): `max_d (P_max × I_d_max × V_d_max)`. [F11-10] Se usa en el detalle,
 * en la vista y la cola de validación (§9.5) y como soporte de las banderas; nunca en el ranking.
 */
export function techoPlausible(f: Factores): number {
  const p = techo(f.p)
  const v = vPorDimension(techo(f.vCont), techo(f.vRec))
  return Math.max(...DIMENSIONES.map((d) => p * techo(f.i[d]) * v[d]))
}

// ── §4.1.1 y §7.2 · I efectivo ───────────────────────────────────────────────

/**
 * I efectivo (D5): máximo de las dimensiones conocidas; `completo = false` se muestra `≥ n`
 * (§7.2 [F5-6]). [F11-6] Si toda dimensión `unknown` tiene `<f>_max` registrado ≤ `n`, lo
 * desconocido no puede superarlo y se muestra `n` (`completo = true`).
 */
export interface IEfectivo {
  readonly n: Nivel
  readonly completo: boolean
  readonly dimensiones: Dimension[]
}

export function iEfectivo(i: Readonly<Record<Dimension, Factor<Nivel>>>, reglas: Reglas = 'v1 candidate'): IEfectivo {
  const conocidas = DIMENSIONES.filter((d) => conocido(i[d]))
  const valores = conocidas.map((d) => i[d].valor as Nivel)
  const n = Math.max(...valores) as Nivel
  const desconocidas = DIMENSIONES.filter((d) => !conocido(i[d]))
  const acotadas = reglas === 'v1 candidate' && desconocidas.every((d) => i[d].max !== undefined && i[d].max <= n)
  return {
    n,
    completo: desconocidas.length === 0 || acotadas,
    dimensiones: conocidas.filter((d) => i[d].valor === n),
  }
}

// ── §8 · Banderas ────────────────────────────────────────────────────────────

/**
 * Una dimensión alcanza un umbral si su **valor** lo alcanza (D20), o si es `unknown` y su
 * `<f>_max` registrado lo alcanza. Un `unknown` sin `<f>_max` no dispara (lo prioriza la cola, §9.5).
 * - v1 candidate [F11-5]: la regla del `unknown` vale sea el riesgo evaluable o no. [F11-7, opción c]
 *   Si el peor creíble de un factor con valor queda fuera del rango de tres niveles
 *   (`<f>_max − (<f>_min o valor) > 2`), dispara con su `<f>_max`, como un `unknown`. Un rango de
 *   hasta tres niveles no dispara por su máx.
 * - v0.2 (lectura del arnés): la regla del `unknown`, evaluable o no; sin la opción c.
 * - v0.3 (CH-092): la regla del `unknown` sólo en un riesgo no evaluable.
 */
function alcanza(f: Factor<Nivel>, umbral: Nivel, reglas: Reglas, evaluable: boolean): boolean {
  if (f.valor === 'unknown') return (reglas !== 'v0.3' || !evaluable) && f.max !== undefined && f.max >= umbral
  if (reglas === 'v1 candidate' && peorCreibleFueraDeRango(f)) return (f.max ?? f.valor) >= umbral
  return f.valor >= umbral
}

/** [F11-7] El `<f>_max` de un factor con valor está a más de tres niveles del piso de la duda plausible. */
export function peorCreibleFueraDeRango(f: Factor<Nivel>): boolean {
  if (f.valor === 'unknown' || f.max === undefined) return false
  return f.max - (f.min ?? f.valor) > 2
}

/**
 * `consecuencia_extrema` (§8.1, §8.2 [F11-5], [F11-7] opción c): alguna dimensión de I en 5. Devuelve las que la
 * disparan. `evaluable` sólo importa con las reglas v0.3.
 */
export function consecuenciaExtrema(
  i: Readonly<Record<Dimension, Factor<Nivel>>>,
  opciones: { reglas?: Reglas; evaluable?: boolean } = {},
): Dimension[] {
  return DIMENSIONES.filter((d) => alcanza(i[d], 5, opciones.reglas ?? 'v1 candidate', opciones.evaluable ?? false))
}

/** `safety_critical` (§8.2 [F11-5], [F11-7] opción c): `i_pers ≥ 4`. `evaluable` sólo importa con las reglas v0.3. */
export function safetyCritical(
  i: Readonly<Record<Dimension, Factor<Nivel>>>,
  opciones: { reglas?: Reglas; evaluable?: boolean } = {},
): boolean {
  return alcanza(i.pers, 4, opciones.reglas ?? 'v1 candidate', opciones.evaluable ?? false)
}

// ── §9.2 · Cuándo un factor es `unknown` [F5-1] ──────────────────────────────

/**
 * Tabla de §9.2: el tamaño del rango es condición necesaria, no suficiente. `rango` es la duda
 * sobre el **valor plausible**. [F11-7] El peor creíble (§4.1.4) no cuenta para el límite de tres
 * niveles: si está más lejos, el factor sigue evaluable y el peor creíble va a `<f>_max`
 * (`rangoRegistrado`), que alimenta el techo y las banderas (opción c, `alcanza`), no el ranking.
 */
export function valorDefendible(rango: { min: Nivel; max: Nivel } | null, hayValorMasPlausible: boolean): 'evaluable' | 'unknown' {
  if (rango === null || rango.max - rango.min > 2) return 'unknown'
  return hayValorMasPlausible ? 'evaluable' : 'unknown'
}

/** [F11-7] Rango que se registra para un factor evaluable: la duda plausible, extendida hasta el peor creíble. */
export function rangoRegistrado(rango: { min: Nivel; max: Nivel }, peorCreible?: Nivel): { min: Nivel; max: Nivel } {
  return { min: rango.min, max: Math.max(rango.max, peorCreible ?? rango.max) as Nivel }
}

// ── §4.2 · Económico ─────────────────────────────────────────────────────────

/** Nivel económico por pérdida / RO (§4.2). Un porcentaje justo en el corte va al nivel superior. */
export function nivelEconomico(perdida: number, ro: number): Nivel {
  if (!(ro > 0)) throw new Error('§4.2: la magnitud de referencia tiene que ser positiva')
  // Se compara `perdida × 100` contra `corte × RO` para no depender del redondeo de una división.
  const cortes: readonly [number, Nivel][] = [[100, 5], [30, 4], [10, 3], [2, 2]]
  for (const [corte, nivel] of cortes) if (perdida * 100 >= corte * ro) return nivel
  return 1
}

/**
 * §4.2.3 [F5-1]: sin margen de contribución, `i_econ_min` sale con el margen operativo
 * (RO / facturación anual) y `i_econ_max` con la facturación perdida entera. Los costos que
 * no dependen del margen (multas, daño directo) entran en los dos extremos. El valor dentro
 * del rango es juicio (§9.1): no se calcula acá.
 */
export function rangoEconomicoSinMargen(m: {
  facturacionPerdida: number
  costosDirectos?: number
  ro: number
  facturacionAnual: number
}): { min: Nivel; max: Nivel } {
  const directos = m.costosDirectos ?? 0
  return {
    // Se multiplica antes de dividir: con montos enteros, el corte exacto no depende del redondeo.
    min: nivelEconomico(directos + (m.facturacionPerdida * m.ro) / m.facturacionAnual, m.ro),
    max: nivelEconomico(directos + m.facturacionPerdida, m.ro),
  }
}

// ── §4.4 · Continuidad ───────────────────────────────────────────────────────

export interface Duracion {
  readonly cantidad: number
  readonly unidad: 'horas' | 'dias' | 'semanas' | 'meses'
}

/**
 * Nivel de continuidad por duración de la interrupción bruta (§4.4). Una degradación menor a
 * la mitad de la capacidad va un nivel abajo. La metodología no dice cuántos días son "3
 * meses": una duración en días o semanas entre 89 y 92 días devuelve `ambiguo` en vez de
 * elegir un número en silencio.
 *
 * [F11-4] Redundancia natural: si la función pierde una unidad entre muchas equivalentes y
 * sigue entregando su producto o servicio principal sin degradación material de capacidad,
 * throughput o nivel de servicio, no es degradación de una función crítica: nivel 1, sea cual
 * sea la duración. Decidir si hay redundancia natural es juicio del evaluador: entra como dato.
 */
export function nivelContinuidad(
  d: Duracion,
  opciones: { degradacionMenorALaMitad?: boolean; redundanciaNatural?: boolean } = {},
): Nivel | 'ambiguo' {
  if (opciones.redundanciaNatural === true) return 1
  const nivel = nivelPorDuracion(d)
  if (nivel === 'ambiguo' || opciones.degradacionMenorALaMitad !== true) return nivel
  return Math.max(1, nivel - 1) as Nivel
}

function nivelPorDuracion(d: Duracion): Nivel | 'ambiguo' {
  if (d.unidad === 'meses') {
    if (d.cantidad > 3) return 5
    if (d.cantidad >= 1) return 4 // un mes ya es más de dos semanas
    return 'ambiguo'
  }
  const dias = d.unidad === 'horas' ? d.cantidad / 24 : d.unidad === 'semanas' ? d.cantidad * 7 : d.cantidad
  if (dias < 1) return 1
  if (dias <= 3) return 2
  if (dias <= 14) return 3
  if (dias <= 89) return 4
  if (dias > 92) return 5
  return 'ambiguo'
}

// ── §3.3, §3.4 · Probabilidad [F5-4A] ────────────────────────────────────────

/**
 * Nivel que fija la historia propia por antecedentes (§3.3): 5 si la frecuencia media es al
 * menos una por año en los últimos tres años (36 meses, incluido el que ocurrió hace exactamente
 * 36 [F11-6]; o en el período con registro, si es menor); 4
 * si ocurrió en los últimos 36 meses, incluido el que ocurrió hace exactamente 36; 3 si
 * ocurrió hace más. Sin ocurrencias, la historia propia no indica nivel (§3.2): `null`.
 */
export function nivelPorAntecedentes(edadesEnMeses: readonly number[], mesesConRegistro: number): 3 | 4 | 5 | null {
  if (edadesEnMeses.length === 0) return null
  const ventana = Math.min(36, mesesConRegistro)
  const enVentana = edadesEnMeses.filter((e) => e <= ventana).length
  if (enVentana * 12 >= ventana) return 5
  if (edadesEnMeses.some((e) => e <= 36)) return 4
  return 3
}

/** Nivel por comparables o sector (§3.3, anclas 4 a 1), cuando no hay antecedentes propios. */
export function nivelPorComparablesOSector(h: {
  recurrenteEnComparables: boolean
  comparablesUltimos5Anios: boolean
  precursoresPropios: boolean
  sectorUltimos10Anios: boolean
}): Nivel {
  if (h.recurrenteEnComparables) return 4
  if (h.comparablesUltimos5Anios || h.precursoresPropios) return 3
  if (h.sectorUltimos10Anios) return 2
  return 1
}

/** Ajustes de §3.4 [H]: −1 y +1, como máximo uno por sentido, compensables, nunca fuera de 1–5. */
export function ajustarP(nivel: Nivel, ajustes: { controlesNuevos: boolean; condicionesAgravadas: boolean }): Nivel {
  const delta = (ajustes.condicionesAgravadas ? 1 : 0) - (ajustes.controlesNuevos ? 1 : 0)
  return Math.min(5, Math.max(1, nivel + delta)) as Nivel
}

// ── §7.2 · Ranking D10 ───────────────────────────────────────────────────────

export interface ItemRanking {
  readonly id: string
  readonly cRaw: number
  readonly iEfectivo: IEfectivo
  readonly iPers: Nivel | 'unknown'
}

export type Comparacion = 'antes' | 'despues' | 'empate' | 'indeterminado'

/**
 * Compara dos riesgos evaluables de la misma organización con D10 (§7.2):
 * banda → `C_raw` → I efectivo → I-personas → empate legítimo. La banda sale de `C_raw` con
 * los cortes de §6.5, así que el paso 1 nunca contradice al 2: decide antes, no distinto. No
 * hay desempate por preparación [F5-6]. Con `≥ n`, un paso decide sólo si lo desconocido no
 * puede cambiarlo; si no, `indeterminado`.
 */
export function compararD10(a: ItemRanking, b: ItemRanking): Comparacion {
  const [ba, bb] = [BANDAS.indexOf(banda(a.cRaw)), BANDAS.indexOf(banda(b.cRaw))]
  if (ba !== bb) return ba > bb ? 'antes' : 'despues'
  if (a.cRaw !== b.cRaw) return a.cRaw > b.cRaw ? 'antes' : 'despues'
  const paso3 = compararAcotado(a.iEfectivo.n, a.iEfectivo.completo, b.iEfectivo.n, b.iEfectivo.completo)
  if (paso3 !== 'empate') return paso3
  const pa = a.iPers, pb = b.iPers
  return compararAcotado(pa === 'unknown' ? 1 : pa, pa !== 'unknown', pb === 'unknown' ? 1 : pb, pb !== 'unknown')
}

/**
 * Un valor incompleto es `≥ n`: puede valer de `n` a 5. Decide sólo si los intervalos no se tocan.
 * [F11-6] sólo cubre el `unknown` con `<f>_max` ≤ `n` (que ya llega como completo); con un
 * `<f>_max` mayor que `n`, la metodología no dice que el intervalo se acote, y no se acota.
 */
function compararAcotado(na: number, completoA: boolean, nb: number, completoB: boolean): Comparacion {
  const [aMin, aMax] = [na, completoA ? na : 5]
  const [bMin, bMax] = [nb, completoB ? nb : 5]
  if (aMin > bMax) return 'antes'
  if (bMin > aMax) return 'despues'
  if (completoA && completoB) return 'empate'
  return 'indeterminado'
}

export interface Posicion {
  readonly ids: string[]
  /** `true` si la posición compartida sale de un paso indeterminado (§7.2 [F5-6]). */
  readonly provisional: boolean
}

/**
 * Ranking principal de una organización: posiciones en orden, con los empates legítimos
 * compartiendo posición. Si un bloque de igual `C_raw` tiene un par indeterminado, el bloque
 * entero queda en una posición provisional común: la metodología define el caso de dos
 * riesgos; para bloques mayores no dice más, y el arnés no lo inventa (README).
 */
export function rankingD10(items: readonly ItemRanking[]): Posicion[] {
  const porCRaw = [...items].sort((a, b) => b.cRaw - a.cRaw)
  const bloques: ItemRanking[][] = []
  for (const item of porCRaw) {
    const ultimo = bloques.at(-1)
    if (ultimo?.[0]?.cRaw === item.cRaw) ultimo.push(item)
    else bloques.push([item])
  }
  const posiciones: Posicion[] = []
  for (const bloque of bloques) {
    const indeterminado = bloque.some((a, i) => bloque.slice(i + 1).some((b) => compararD10(a, b) === 'indeterminado'))
    if (indeterminado) {
      posiciones.push({ ids: bloque.map((x) => x.id), provisional: true })
      continue
    }
    const orden = [...bloque].sort((a, b) => {
      const c = compararD10(a, b)
      return c === 'antes' ? -1 : c === 'despues' ? 1 : 0
    })
    for (const item of orden) {
      const ultima = posiciones.at(-1)
      const primero = ultima?.ids[0]
      const par = primero === undefined ? undefined : bloque.find((x) => x.id === primero)
      if (ultima !== undefined && par !== undefined && compararD10(par, item) === 'empate') ultima.ids.push(item.id)
      else posiciones.push({ ids: [item.id], provisional: false })
    }
  }
  return posiciones
}

// ── §1.4 · Posición de un riesgo padre [F5-3] ────────────────────────────────

export interface HijoDePadre {
  readonly id: string
  /** `null` si el hijo no es evaluable. */
  readonly item: ItemRanking | null
}

export type PosicionPadre =
  | { readonly conPosicion: true; readonly hijosPrioritarios: string[]; readonly prioridadProvisional: boolean }
  | { readonly conPosicion: false; readonly prioridadProvisional: true }

/**
 * §1.4: el padre no tiene score propio. Se muestra con su hijo prioritario (el primero de sus
 * hijos evaluables por D10), o con todos los empatados en el primer lugar. Si algún hijo no es
 * evaluable, la posición es provisional; si ninguno lo es, el padre no tiene posición.
 */
export function posicionPadre(hijos: readonly HijoDePadre[]): PosicionPadre {
  const evaluables = hijos.flatMap((h) => (h.item === null ? [] : [h.item]))
  const provisional = evaluables.length < hijos.length
  const primera = rankingD10(evaluables)[0]
  if (primera === undefined) return { conPosicion: false, prioridadProvisional: true }
  return { conPosicion: true, hijosPrioritarios: primera.ids, prioridadProvisional: provisional || primera.provisional }
}

// ── §9.5 · Cola de validación ────────────────────────────────────────────────

export interface EntradaCola {
  readonly id: string
  readonly factores: Factores
  readonly uncertainty: 'low' | 'medium' | 'high'
}

function hayUnknown(f: Factores): boolean {
  return [f.p, f.vCont, f.vRec, ...DIMENSIONES.map((d) => f.i[d])].some((x) => x.valor === 'unknown')
}

/** §9.5, orden 1: podría ser `safety_critical` (`i_pers ≥ 4`, o `unknown` sin máx o con máx ≥ 4). */
function podriaSerSafety(f: Factores): boolean {
  const p = f.i.pers
  return p.valor === 'unknown' ? p.max === undefined || p.max >= 4 : p.valor >= 4
}

/** I-personas máximo posible: `<f>_max` donde hay rango, el valor donde no, 5 si es `unknown` sin rango. */
function iPersMaximo(f: Factores): number {
  return techo(f.i.pers)
}

/**
 * Cola de validación (§9.5): qué información conviene obtener primero. Entran los no evaluables
 * y los evaluables con algún factor `unknown` o `uncertainty = high`. Orden: primero los que
 * podrían ser `safety_critical`; después por cota de validación (el techo plausible, §6.6
 * [F11-10]); después por I-personas máximo. Más allá de eso la metodología no ordena: se conserva
 * el orden de entrada.
 */
export function colaValidacion(entradas: readonly EntradaCola[]): string[] {
  const entran = entradas.filter((x) => !evaluar(x.factores).evaluable || hayUnknown(x.factores) || x.uncertainty === 'high')
  const clave = (x: EntradaCola): [number, number, number] => [
    podriaSerSafety(x.factores) ? 1 : 0, techoPlausible(x.factores), iPersMaximo(x.factores),
  ]
  return entran
    .map((x, n) => ({ x, n, k: clave(x) }))
    .sort((a, b) => b.k[0] - a.k[0] || b.k[1] - a.k[1] || b.k[2] - a.k[2] || a.n - b.n)
    .map(({ x }) => x.id)
}
