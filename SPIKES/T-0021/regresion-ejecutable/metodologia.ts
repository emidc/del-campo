// Capa de referencia de metodologia v0.2 (`v0/metodologia-v0.md`, congelada para la Fase 8).
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

/** Techo plausible (§6.6): `max_d (P_max × I_d_max × V_d_max)`. No participa del ranking. */
export function techoPlausible(f: Factores): number {
  const p = techo(f.p)
  const v = vPorDimension(techo(f.vCont), techo(f.vRec))
  return Math.max(...DIMENSIONES.map((d) => p * techo(f.i[d]) * v[d]))
}

// ── §4.1.1 y §7.2 · I efectivo ───────────────────────────────────────────────

/** I efectivo (D5): máximo de las dimensiones conocidas; `completo = false` se muestra `≥ n` (§7.2 [F5-6]). */
export interface IEfectivo {
  readonly n: Nivel
  readonly completo: boolean
  readonly dimensiones: Dimension[]
}

export function iEfectivo(i: Readonly<Record<Dimension, Factor<Nivel>>>): IEfectivo {
  const conocidas = DIMENSIONES.filter((d) => conocido(i[d]))
  const valores = conocidas.map((d) => i[d].valor as Nivel)
  const n = Math.max(...valores) as Nivel
  return {
    n,
    completo: conocidas.length === DIMENSIONES.length,
    dimensiones: conocidas.filter((d) => i[d].valor === n),
  }
}

// ── §8 · Banderas ────────────────────────────────────────────────────────────

/** Una dimensión alcanza un umbral si su valor lo alcanza, o si es `unknown` y su `max` lo alcanza (§8.2). */
function alcanza(f: Factor<Nivel>, umbral: Nivel): boolean {
  return f.valor === 'unknown' ? f.max !== undefined && f.max >= umbral : f.valor >= umbral
}

/** `consecuencia_extrema` (§8.1): alguna dimensión de I en 5. Devuelve las dimensiones que la disparan. */
export function consecuenciaExtrema(i: Readonly<Record<Dimension, Factor<Nivel>>>): Dimension[] {
  return DIMENSIONES.filter((d) => alcanza(i[d], 5))
}

/** `safety_critical` (§8.2): `i_pers ≥ 4`. */
export function safetyCritical(i: Readonly<Record<Dimension, Factor<Nivel>>>): boolean {
  return alcanza(i.pers, 4)
}

// ── §9.2 · Cuándo un factor es `unknown` [F5-1] ──────────────────────────────

/** Tabla de §9.2: el tamaño del rango es condición necesaria, no suficiente. */
export function valorDefendible(rango: { min: Nivel; max: Nivel } | null, hayValorMasPlausible: boolean): 'evaluable' | 'unknown' {
  if (rango === null || rango.max - rango.min > 2) return 'unknown'
  return hayValorMasPlausible ? 'evaluable' : 'unknown'
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
 */
export function nivelContinuidad(d: Duracion, opciones: { degradacionMenorALaMitad?: boolean } = {}): Nivel | 'ambiguo' {
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
 * menos una por año en los últimos tres años (o en el período con registro, si es menor); 4
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
 * Compara dos riesgos evaluables de la misma organización con D10 v0.2 (§7.2):
 * banda → `C_raw` → I efectivo → I-personas → empate legítimo. La banda queda vacía hasta la
 * Fase 9 (§6.5), así que el paso 1 no decide. No hay desempate por preparación [F5-6].
 * Con `≥ n`, un paso decide sólo si lo desconocido no puede cambiarlo; si no, `indeterminado`.
 */
export function compararD10(a: ItemRanking, b: ItemRanking): Comparacion {
  if (a.cRaw !== b.cRaw) return a.cRaw > b.cRaw ? 'antes' : 'despues'
  const paso3 = compararAcotado(a.iEfectivo.n, a.iEfectivo.completo, b.iEfectivo.n, b.iEfectivo.completo)
  if (paso3 !== 'empate') return paso3
  const pa = a.iPers, pb = b.iPers
  return compararAcotado(pa === 'unknown' ? 1 : pa, pa !== 'unknown', pb === 'unknown' ? 1 : pb, pb !== 'unknown')
}

/** Un valor incompleto es `≥ n`: puede valer de `n` a 5. Decide sólo si los intervalos no se tocan. */
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
