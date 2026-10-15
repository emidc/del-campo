// Reglas de la metodología v1 contra oráculos que no salen de esta implementación: los ejemplos
// escritos en la metodología y en el log de adjudicación (PV-1 a PV-5, AN-0158, AN-0159), y las
// propiedades de §14 recorridas exhaustivamente sobre la escala 1–5. Portado de
// `SPIKES/T-0021/regresion-ejecutable/metodologia.test.ts` y `sinteticos.test.ts`: se quitaron
// los casos de reglas que no se portaron (§3.3, §4.2, §4.4, §9.2, guía del evaluador) y los que
// comparan contra v0.2 o v0.3; donde un caso cita una ficha registrada, se dejó el número que la
// ficha registró.

import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  banda, BANDAS, colaValidacion, compararD10, consecuenciaExtrema, criticidad, DIMENSIONES, evaluar, iEfectivo, NIVELES,
  posicionPadre, rankingD10, safetyCritical, techoPlausible, vPorDimension,
  type Dimension, type Factor, type Factores, type FactoresConocidos, type ItemRanking, type Nivel, type Recuperacion,
} from './metodologia.ts'

const conocidos = (p: Nivel, i: readonly [Nivel, Nivel, Nivel, Nivel], vCont: Nivel, vRec: Recuperacion): FactoresConocidos => ({
  p, i: { econ: i[0], pers: i[1], cont: i[2], legal: i[3] }, vCont, vRec,
})

const aFactores = (k: FactoresConocidos): Factores => ({
  p: { valor: k.p },
  i: { econ: { valor: k.i.econ }, pers: { valor: k.i.pers }, cont: { valor: k.i.cont }, legal: { valor: k.i.legal } },
  vCont: { valor: k.vCont },
  vRec: { valor: k.vRec },
})

const item = (id: string, k: FactoresConocidos): ItemRanking => {
  const f = aFactores(k)
  return { id, cRaw: criticidad(k).cRaw, iEfectivo: iEfectivo(f.i), iPers: k.i.pers }
}

type F = Nivel | Factor<Nivel>
const k = (x: F): Factor<Nivel> => (typeof x === 'number' ? { valor: x } : x)
/** `unknown`, con `max` registrado o sin él. */
const u = (max?: Nivel): Factor<Nivel> => (max === undefined ? { valor: 'unknown' } : { valor: 'unknown', max })
function fx(p: F, i: readonly [F, F, F, F], vCont: F, vRec: Recuperacion | Factor<Nivel>): Factores {
  return { p: k(p), i: { econ: k(i[0]), pers: k(i[1]), cont: k(i[2]), legal: k(i[3]) }, vCont: k(vCont), vRec: typeof vRec === 'object' ? vRec : { valor: vRec } }
}

/** Todas las combinaciones de factores conocidos (5 × 5⁴ × 5 × 6 = 93.750). */
function* todasLasCombinaciones(): Generator<FactoresConocidos> {
  const recs: Recuperacion[] = [...NIVELES, 'no_aplica']
  for (const p of NIVELES) for (const e of NIVELES) for (const pe of NIVELES) for (const c of NIVELES) for (const l of NIVELES)
    for (const vc of NIVELES) for (const vr of recs) yield conocidos(p, [e, pe, c, l], vc, vr)
}

const sube = (n: Nivel): Nivel | null => (n === 5 ? null : ((n + 1) as Nivel))

/** Las combinaciones vecinas que suben un solo factor un nivel. */
function vecinosPeores(x: FactoresConocidos): FactoresConocidos[] {
  const out: FactoresConocidos[] = []
  const p = sube(x.p)
  if (p !== null) out.push({ ...x, p })
  for (const d of DIMENSIONES) {
    const n = sube(x.i[d])
    if (n !== null) out.push({ ...x, i: { ...x.i, [d]: n } })
  }
  const c = sube(x.vCont)
  if (c !== null) out.push({ ...x, vCont: c })
  if (x.vRec !== 'no_aplica') {
    const r = sube(x.vRec)
    if (r !== null) out.push({ ...x, vRec: r })
  }
  return out
}

// ── Factores con partes unknown, para las propiedades de §9.3 ──────────────

type Parte = Dimension | 'vCont' | 'vRec'
const PARTES_V_I: readonly Parte[] = [...DIMENSIONES, 'vCont', 'vRec']
interface Rango { readonly min?: Nivel; readonly max?: Nivel }
interface Desconocida extends Rango { readonly parte: Parte }

function valorDe(x: FactoresConocidos, parte: Parte): Recuperacion {
  return parte === 'vCont' ? x.vCont : parte === 'vRec' ? x.vRec : x.i[parte]
}

function conUnknown(x: FactoresConocidos, partes: readonly Desconocida[]): Factores {
  let f = aFactores(x)
  for (const { parte, min, max } of partes) {
    const y: Factor<Nivel> = { valor: 'unknown', ...(min === undefined ? {} : { min }), ...(max === undefined ? {} : { max }) }
    if (parte === 'vCont') f = { ...f, vCont: y }
    else if (parte === 'vRec') f = { ...f, vRec: y }
    else f = { ...f, i: { ...f.i, [parte]: y } }
  }
  return f
}

/** Cada valor posible de lo desconocido: cada parte toma cada nivel de `min` (o 1) a `max` (o 5). */
function completaciones(x: FactoresConocidos, partes: readonly Desconocida[]): FactoresConocidos[] {
  let out: FactoresConocidos[] = [x]
  for (const { parte, min, max } of partes) {
    const niveles = NIVELES.filter((n) => n >= (min ?? 1) && n <= (max ?? 5))
    out = out.flatMap((y) => niveles.map((n): FactoresConocidos =>
      parte === 'vCont' ? { ...y, vCont: n } : parte === 'vRec' ? { ...y, vRec: n } : { ...y, i: { ...y.i, [parte]: n } }))
  }
  return out
}

/**
 * Comprueba §9.3 sobre un caso. El esperado no usa la cota: recorre los valores posibles.
 * Evaluable ⇔ hay alguna dimensión conocida y todos los valores posibles dan el C_raw de las
 * conocidas. I efectivo: `≥ n` con n = máximo de las conocidas, nunca más que el real; `n`
 * completo sólo si todo máx registrado de lo desconocido es ≤ n [F11-6].
 */
function comprobarUnknown(x: FactoresConocidos, partes: readonly Desconocida[]): void {
  if (partes.some((y) => y.parte === 'vRec') && x.vRec === 'no_aplica') return
  const f = conUnknown(x, partes)
  const desconocidas = new Set(partes.map((y) => y.parte))
  const conocida = (d: Dimension) => !desconocidas.has(d) && !desconocidas.has('vCont') && !((d === 'econ' || d === 'cont') && desconocidas.has('vRec'))
  const conocidas = DIMENSIONES.filter(conocida)
  const reales = completaciones(x, partes)
  const posibles = reales.map(criticidad)
  const ref = posibles[0]
  assert.ok(ref)
  const cRawConocidas = Math.max(...conocidas.map((d) => ref.cPorDimension[d]))
  const invariante = posibles.every((c) => c.cRaw === cRawConocidas)
  const ev = evaluar(f)
  const falla = (que: string): never => assert.fail(`${que} · ${JSON.stringify(x)} con unknown ${JSON.stringify(partes)}`)
  if (ev.evaluable !== (conocidas.length > 0 && invariante)) falla(`evaluable ${String(ev.evaluable)}`)
  if (ev.evaluable && ev.cRaw !== cRawConocidas) falla(`C_raw ${String(ev.cRaw)} ≠ ${String(cRawConocidas)}`)
  if (ev.evaluable && ev.acotadas.join() !== DIMENSIONES.filter((d) => !conocida(d)).join()) falla(`acotadas ${ev.acotadas.join()}`)

  const ie = iEfectivo(f.i)
  const nConocidas = Math.max(...DIMENSIONES.filter((d) => !desconocidas.has(d)).map((d) => x.i[d]))
  const acotado = partes.filter((y) => (DIMENSIONES as readonly string[]).includes(y.parte)).every((y) => y.max !== undefined && y.max <= nConocidas)
  if (ie.completo !== acotado) falla(`I efectivo completo = ${String(ie.completo)}`)
  if (ie.n !== nConocidas) falla(`I efectivo ${String(ie.n)}, máximo de las conocidas ${String(nConocidas)}`)
  for (const y of reales) {
    const real = Math.max(y.i.econ, y.i.pers, y.i.cont, y.i.legal)
    if (ie.n > real) falla(`≥ ${String(ie.n)} supera el I efectivo de ${JSON.stringify(y.i)}`)
    if (ie.completo && ie.n !== real) falla(`I efectivo ${String(ie.n)} completo, pero ${JSON.stringify(y.i)} da ${String(real)}`)
  }
}

function itemDeFactores(id: string, f: Factores): ItemRanking | null {
  const e = evaluar(f)
  return e.evaluable ? { id, cRaw: e.cRaw, iEfectivo: iEfectivo(f.i), iPers: f.i.pers.valor } : null
}

// ── §5.5 · V secuencial contra los perfiles PV-1 a PV-5 ──────────────────────

/** Perfiles de V del log de adjudicación, grupo 2 (`regresion-ejecutable/casos.ts`): V_d y C_raw con P 3, I 4 en todo. */
const PERFILES_V = [
  { id: 'PV-1', c: 1, r: 5, v: { pers: 1, econ: 1, cont: 1, legal: 1 }, cRaw: 12 },
  { id: 'PV-2', c: 5, r: 1, v: { pers: 5, econ: 3, cont: 1, legal: 5 }, cRaw: 60 },
  { id: 'PV-3', c: 3, r: 3, v: { pers: 3, econ: 3, cont: 3, legal: 3 }, cRaw: 36 },
  { id: 'PV-4', c: 1, r: 1, v: { pers: 1, econ: 1, cont: 1, legal: 1 }, cRaw: 12 },
  { id: 'PV-5', c: 5, r: 5, v: { pers: 5, econ: 5, cont: 5, legal: 5 }, cRaw: 60 },
] as const
/** Orden aprobado de §5.5 tras quitar el desempate de preparación (2026-10-07 01:54 UTC). */
const ORDEN_PERFILES_V = [['PV-5', 'PV-2'], ['PV-3'], ['PV-1', 'PV-4']]

describe('§5.5 V por dimensión: perfiles PV-1 a PV-5 (log grupo 2)', () => {
  for (const x of PERFILES_V) {
    it(`${x.id} (c ${String(x.c)} / r ${String(x.r)}): V_d y C_raw de la tabla del log`, () => {
      const v = vPorDimension(x.c, x.r)
      assert.deepEqual({ pers: v.pers, econ: v.econ, cont: v.cont, legal: v.legal }, x.v)
      assert.equal(criticidad(conocidos(3, [4, 4, 4, 4], x.c, x.r)).cRaw, x.cRaw)
    })
  }

  it('orden aprobado PV-5 = PV-2 > PV-3 > PV-1 = PV-4 (sin desempate por preparación)', () => {
    const items = PERFILES_V.map((x) => item(x.id, conocidos(3, [4, 4, 4, 4], x.c, x.r)))
    assert.deepEqual(rankingD10(items).map((p) => [...p.ids].sort()), ORDEN_PERFILES_V.map((g) => [...g].sort()))
  })

  it('mejora de un solo aspecto (respuesta 2c–2d de Emiliano)', () => {
    const c = (vc: Nivel, vr: Nivel) => criticidad(conocidos(3, [4, 4, 4, 4], vc, vr))
    assert.ok(c(1, 5).cRaw < c(5, 5).cRaw)
    const [v5, v2] = [vPorDimension(5, 5), vPorDimension(5, 1)]
    assert.ok(v2.cont < v5.cont && v2.econ < v5.econ && v2.econ > v2.cont)
    assert.equal(c(5, 1).cRaw, c(5, 5).cRaw)
    assert.deepEqual(c(5, 1).determinantes, ['pers', 'legal'])
    assert.deepEqual(vPorDimension(1, 3), vPorDimension(1, 5))
  })

  it('recuperación no_aplica: V_d = contención en las cuatro dimensiones', () => {
    for (const c of NIVELES) assert.deepEqual(vPorDimension(c, 'no_aplica'), { econ: c, pers: c, cont: c, legal: c })
  })
})

// ── §6 · Fórmula y bandas ────────────────────────────────────────────────────

describe('§6 C_d = P × I_d × V_d, C_raw = max_d, dimensión determinante, banda', () => {
  it('ejemplo de AN-0158: CP-01 R1 1×5×4 = 20, R5 3×2×5 = 30', () => {
    assert.equal(criticidad(conocidos(1, [5, 5, 5, 4], 4, 5)).cRaw, 20)
    assert.equal(criticidad(conocidos(3, [2, 1, 1, 1], 5, 5)).cRaw, 30)
  })

  it('ejemplo de AN-0159: CP-16 R2 4×4×4 = 64 por personas, R1 4×3×5 = 60 por económico', () => {
    const r2 = criticidad(conocidos(4, [1, 4, 1, 2], 4, 'no_aplica'))
    assert.equal(r2.cRaw, 64)
    assert.deepEqual(r2.determinantes, ['pers'])
    const r1 = criticidad(conocidos(4, [3, 1, 3, 1], 5, 4))
    assert.equal(r1.cRaw, 60)
    assert.deepEqual(r1.determinantes, ['econ'])
  })

  it('si dos dimensiones empatan en el máximo, las dos son determinantes (§6.2)', () => {
    assert.deepEqual(criticidad(conocidos(2, [5, 1, 5, 1], 3, 5)).determinantes, ['econ', 'cont'])
  })

  it('C_raw toma exactamente 30 valores distintos sobre la escala 1–5 (§6.3)', () => {
    const valores = new Set<number>()
    for (const p of NIVELES) for (const i of NIVELES) for (const v of NIVELES) valores.add(p * i * v)
    assert.equal(valores.size, 30)
  })

  it('§6.5 [F9] cortes 20/50/75: un C_raw justo en el corte va a la banda superior', () => {
    const casos: [number, string][] = [[1, 'Baja'], [19, 'Baja'], [20, 'Media'], [48, 'Media'], [50, 'Alta'], [64, 'Alta'], [75, 'Crítica'], [125, 'Crítica']]
    for (const [c, b] of casos) assert.equal(banda(c), b, `C_raw ${String(c)}`)
  })

  it('§7.2 el paso 1 (banda) nunca contradice al 2 (C_raw), en todos los productos posibles', () => {
    const productos = [...new Set(NIVELES.flatMap((p) => NIVELES.flatMap((i) => NIVELES.map((v) => p * i * v))))]
    const it_ = (cRaw: number): ItemRanking => ({ id: String(cRaw), cRaw, iEfectivo: { n: 1, completo: true, dimensiones: [] }, iPers: 1 })
    for (const a of productos) for (const b of productos) {
      if (a > b) assert.ok(BANDAS.indexOf(banda(a)) >= BANDAS.indexOf(banda(b)), `${String(a)} > ${String(b)}`)
      if (a !== b) assert.equal(compararD10(it_(a), it_(b)), a > b ? 'antes' : 'despues')
    }
  })
})

// ── §9 · Unknown y no evaluables ─────────────────────────────────────────────

describe('§9.3 criticidad con partes unknown', () => {
  const base = aFactores(conocidos(3, [3, 2, 2, 1], 3, 3))
  const conI = (d: Dimension, f: Factor<Nivel>): Factores => ({ ...base, i: { ...base.i, [d]: f } })

  it('P unknown → no evaluable (CP-08 R2)', () => {
    assert.deepEqual(evaluar({ ...base, p: { valor: 'unknown' } }), { evaluable: false, motivo: 'p_unknown' })
  })

  it('una dimensión unknown cuya cota no supera C_raw de las conocidas → evaluable con ese C_raw', () => {
    // Conocidas: econ 3×3×3 = 27. Legal unknown con max 2: cota 3×2×3 = 18 ≤ 27.
    const e = evaluar(conI('legal', { valor: 'unknown', max: 2 }))
    assert.ok(e.evaluable)
    assert.equal(e.cRaw, 27)
    assert.deepEqual(e.acotadas, ['legal'])
  })

  it('sin max, la cota usa 5: si supera C_raw, no evaluable', () => {
    assert.deepEqual(evaluar(conI('legal', { valor: 'unknown' })), { evaluable: false, motivo: 'cota_supera_c_raw' })
  })

  it('contención unknown deja sin dimensión conocida → no evaluable', () => {
    assert.deepEqual(evaluar({ ...base, vCont: { valor: 'unknown', max: 1 } }), { evaluable: false, motivo: 'sin_dimension_conocida' })
  })

  it('recuperación unknown sólo afecta econ y continuidad: personas y legal siguen conocidas', () => {
    const f = aFactores(conocidos(3, [1, 4, 1, 2], 3, 1))
    const e = evaluar({ ...f, vRec: { valor: 'unknown', max: 3 } })
    assert.ok(e.evaluable)
    assert.equal(e.cRaw, 36) // personas 3×4×3; econ y cont acotados por debajo
  })

  it('el rango de un factor conocido no mueve C_raw; sólo el techo (§9.1.2, §6.6)', () => {
    const conRango: Factores = { ...base, p: { valor: 3, min: 2, max: 4 } }
    const [a, b] = [evaluar(base), evaluar(conRango)]
    assert.ok(a.evaluable && b.evaluable)
    assert.equal(a.cRaw, b.cRaw)
    assert.ok(techoPlausible(conRango) > techoPlausible(base))
  })

  // E: P 3, I (3, 2, 2, unknown máx 3), V 3. Conocidas: econ 27. Cota legal: 3×3×3 = 27 = C_raw.
  it('borde: una cota igual a C_raw es evaluable ("≤"), y la dimensión acotada no es determinante [F11-6] (U07)', () => {
    const e = evaluar(fx(3, [3, 2, 2, u(3)], 3, 3))
    assert.ok(e.evaluable)
    assert.equal(e.cRaw, 27)
    assert.equal(e.cPorDimension.legal, e.cRaw)
    assert.deepEqual(e.determinantes, ['econ'])
    // Un nivel más de máx: cota 3×4×3 = 36 > 27.
    assert.deepEqual(evaluar(fx(3, [3, 2, 2, u(4)], 3, 3)), { evaluable: false, motivo: 'cota_supera_c_raw' })
  })

  // R: P 3, I (3, 3, 1, 1), contención 3, recuperación unknown. Personas 27; cota econ: V = min(3, ⌈(3+r)/2⌉) = 3.
  it('borde por un aspecto de V: la contención acota econ, aun sin máx registrado', () => {
    for (const rec of [u(3), u()]) {
      const e = evaluar(fx(3, [3, 3, 1, 1], 3, rec))
      assert.ok(e.evaluable, `recuperación ${JSON.stringify(rec)}`)
      assert.equal(e.cRaw, 27)
    }
    assert.deepEqual(iEfectivo(fx(3, [3, 3, 1, 1], 3, u()).i), { n: 3, completo: true, dimensiones: ['econ', 'pers'] })
  })

  it('dos unknown: evaluable sólo si las dos cotas quedan ≤ C_raw', () => {
    // Conocidas: pers 2×4×2 = 16. econ máx 2: 8; legal sin máx: 2×5×2 = 20 > 16.
    assert.deepEqual(evaluar(fx(2, [u(2), 4, 1, u()], 2, 'no_aplica')), { evaluable: false, motivo: 'cota_supera_c_raw' })
    // legal máx 4: 2×4×2 = 16 = C_raw.
    const f = fx(2, [u(2), 4, 1, u(4)], 2, 'no_aplica')
    const e = evaluar(f)
    assert.ok(e.evaluable)
    assert.equal(e.cRaw, 16)
    // [F11-6] los dos máx (2 y 4) son ≤ 4: completo.
    assert.deepEqual(iEfectivo(f.i), { n: 4, completo: true, dimensiones: ['pers'] })
  })

  it('I efectivo ≥ n con n = máximo de las conocidas; [F11-6] con máx ≤ n se muestra n', () => {
    assert.deepEqual(iEfectivo(fx(3, [4, 1, u(5), 1], 5, 1).i), { n: 4, completo: false, dimensiones: ['econ'] })
    assert.deepEqual(iEfectivo(fx(3, [4, 1, u(2), 1], 5, 1).i), { n: 4, completo: true, dimensiones: ['econ'] })
  })
})

describe('§8 banderas', () => {
  const i = (pers: Factor<Nivel>, econ: Factor<Nivel> = { valor: 2 }) => ({ econ, pers, cont: { valor: 1 as Nivel }, legal: { valor: 1 as Nivel } })
  it('safety_critical si i_pers ≥ 4; el 3 no la dispara', () => {
    assert.equal(safetyCritical(i({ valor: 4 })), true)
    assert.equal(safetyCritical(i({ valor: 3 })), false)
  })
  it('unknown con max registrado en el umbral dispara; con max debajo del umbral, no', () => {
    assert.equal(safetyCritical(i({ valor: 'unknown', max: 4 })), true)
    assert.equal(safetyCritical(i({ valor: 'unknown', max: 3 })), false)
    assert.deepEqual(consecuenciaExtrema(i({ valor: 1 }, { valor: 'unknown', max: 5 })), ['econ'])
    assert.deepEqual(consecuenciaExtrema(i({ valor: 1 }, { valor: 'unknown', max: 4 })), [])
  })
  it('consecuencia_extrema por cualquier dimensión en 5, con la lista de dimensiones', () => {
    assert.deepEqual(consecuenciaExtrema(i({ valor: 5 }, { valor: 5 })), ['econ', 'pers'])
    assert.deepEqual(consecuenciaExtrema(i({ valor: 4 })), [])
  })
  it('a · [F11-5]: un unknown sin máx registrado no dispara banderas (lo prioriza la cola)', () => {
    const f = fx(u(), [u(), u(), 1, 1], 3, 3)
    assert.deepEqual([consecuenciaExtrema(f.i), safetyCritical(f.i)], [[], false])
  })
  it('a′ · [F11-5]: en un riesgo evaluable, un unknown con máx 5 dispara consecuencia_extrema', () => {
    // Evaluable: econ 1×4×3 = 12 (c 5, r 1); cota de cont 1×5×1 = 5.
    const f = fx(1, [4, 1, u(5), 1], 5, 1)
    assert.ok(evaluar(f).evaluable)
    assert.deepEqual(consecuenciaExtrema(f.i), ['cont'])
  })
  it('a′ · [F11-5]: en un riesgo evaluable, i_pers unknown con máx 4 dispara safety_critical', () => {
    // Evaluable: econ 2×4×3 = 24; cota de pers 2×4×3 = 24 ≤ 24.
    const f = fx(2, [4, u(4), 1, 1], 3, 3)
    assert.ok(evaluar(f).evaluable)
    assert.equal(safetyCritical(f.i), true)
  })
  it('[F11-7] opción c: el peor creíble fuera del rango de tres niveles dispara bandera; un rango de hasta tres no', () => {
    // econ 2 con peor creíble 5 (rango 2–5): dispara. pers 3 con máx 4 (rango 3–4): no (D20).
    const W = fx(3, [{ valor: 2, min: 2, max: 5 }, { valor: 3, min: 3, max: 4 }, 1, 1], 3, 3)
    const e = evaluar(W)
    assert.ok(e.evaluable)
    assert.equal(e.cRaw, 3 * 3 * 3) // C_raw por personas: la opción c no lo cambia
    assert.deepEqual(consecuenciaExtrema(W.i), ['econ'])
    assert.equal(safetyCritical(W.i), false)
    assert.equal(techoPlausible(W), 3 * 5 * 3)
    // Sin min registrado, el rango se mide desde el valor: pers 1 con máx 4 → dispara.
    assert.equal(safetyCritical(fx(3, [3, { valor: 1, max: 4 }, 1, 1], 3, 3).i), true)
  })
})

// ── §7.2 · D10 ───────────────────────────────────────────────────────────────

describe('§7.2 D10: banda → C_raw → I efectivo → I-personas → empate', () => {
  const it_ = (id: string, cRaw: number, n: Nivel, completo: boolean, iPers: Nivel | 'unknown'): ItemRanking =>
    ({ id, cRaw, iEfectivo: { n, completo, dimensiones: [] }, iPers })

  it('C_raw decide antes que I efectivo e I-personas', () => {
    assert.equal(compararD10(it_('a', 40, 2, true, 1), it_('b', 30, 5, true, 5)), 'antes')
  })
  it('P no desempata: P 2 contra P 5 con igual C_raw, I efectivo e I-personas es empate', () => {
    assert.equal(compararD10(item('a', conocidos(2, [3, 1, 1, 1], 5, 5)), item('b', conocidos(5, [3, 1, 1, 1], 2, 2))), 'empate')
  })
  it('V no desempata: igual C_raw, I efectivo e I-personas con V distinta es empate legítimo', () => {
    const a = item('a', conocidos(3, [4, 4, 4, 4], 5, 5))
    const b = item('b', conocidos(3, [4, 4, 4, 4], 5, 1))
    assert.equal(compararD10(a, b), 'empate')
    assert.deepEqual(rankingD10([a, b]), [{ ids: ['a', 'b'], provisional: false }])
  })
  it('≥ n decide si el otro tiene I efectivo menor que n', () => {
    assert.equal(compararD10(it_('a', 36, 4, false, 1), it_('b', 36, 3, true, 1)), 'antes')
  })
  it('≥ n queda indeterminado si lo desconocido podría cambiar el orden; el techo nunca gana', () => {
    assert.equal(compararD10(it_('a', 36, 3, false, 1), it_('b', 36, 4, true, 1)), 'indeterminado')
    assert.equal(compararD10(it_('a', 36, 4, false, 1), it_('b', 36, 4, true, 1)), 'indeterminado')
    assert.deepEqual(rankingD10([it_('a', 36, 3, false, 1), it_('b', 36, 4, true, 1)]), [{ ids: ['a', 'b'], provisional: true }])
  })
  it('I-personas unknown: misma regla en el paso 4', () => {
    assert.equal(compararD10(it_('a', 36, 4, true, 'unknown'), it_('b', 36, 4, true, 2)), 'indeterminado')
  })
  it('c · [F11-6]: ≥ n se acota con el máx registrado; ≥ 4 con máx 3 contra 4 es empate legítimo', () => {
    const a = { id: 'a', cRaw: 36, iEfectivo: iEfectivo(fx(3, [4, 1, u(3), 1], 5, 1).i), iPers: 1 as Nivel }
    const b = it_('b', 36, 4, true, 1)
    assert.equal(compararD10(a, b), 'empate')
    // Con máx mayor que n, sigue `≥ n` e indeterminado: [F11-6] sólo acota el máx ≤ n.
    assert.equal(compararD10({ ...a, iEfectivo: iEfectivo(fx(3, [4, 1, u(5), 1], 5, 1).i) }, b), 'indeterminado')
  })
})

// ── §1.4 · Padre ─────────────────────────────────────────────────────────────

describe('§1.4 posición del padre [F5-3]', () => {
  const x = (cRaw: number): ItemRanking => ({ id: '', cRaw, iEfectivo: { n: 3, completo: true, dimensiones: [] }, iPers: 1 })
  it('se muestra con su hijo prioritario', () => {
    assert.deepEqual(posicionPadre([{ id: 'h1', item: { ...x(10), id: 'h1' } }, { id: 'h2', item: { ...x(50), id: 'h2' } }]),
      { conPosicion: true, hijosPrioritarios: ['h2'], prioridadProvisional: false })
  })
  it('hijos empatados en el primer lugar: se muestran todos', () => {
    const p = posicionPadre([{ id: 'h1', item: { ...x(50), id: 'h1' } }, { id: 'h2', item: { ...x(50), id: 'h2' } }])
    assert.ok(p.conPosicion)
    assert.deepEqual([...p.hijosPrioritarios].sort(), ['h1', 'h2'])
  })
  it('un hijo no evaluable vuelve provisional la posición', () => {
    assert.deepEqual(posicionPadre([{ id: 'h1', item: { ...x(10), id: 'h1' } }, { id: 'h2', item: null }]),
      { conPosicion: true, hijosPrioritarios: ['h1'], prioridadProvisional: true })
  })
  it('todos los hijos no evaluables: sin posición', () => {
    assert.deepEqual(posicionPadre([{ id: 'h1', item: null }]), { conPosicion: false, prioridadProvisional: true })
  })
})

// ── §9.5 · Cola de validación ────────────────────────────────────────────────

describe('§9.5 cola de validación (1 safety posible → 2 cota de validación → 3 I-personas máximo)', () => {
  // Q1: no evaluable (P unknown), pers 2, econ 5 → no safety; cota 5×5×3 = 75.
  const Q1 = { id: 'Q1', factores: fx(u(), [5, 2, 1, 1], 3, 3), uncertainty: 'low' as const }
  // Q2: evaluable con pers unknown máx 4 → safety posible; cota baja (1×4×1 = 4).
  const Q2 = { id: 'Q2', factores: fx(1, [4, u(4), 1, 1], 1, 1), uncertainty: 'low' as const }
  // Q3: evaluable, todo conocido, uncertainty high, pers 1; cota 4×4×4 = 64.
  const Q3 = { id: 'Q3', factores: fx(4, [4, 1, 1, 1], 4, 4), uncertainty: 'high' as const }
  // Q4: evaluable, todo conocido, uncertainty low → no entra.
  const Q4 = { id: 'Q4', factores: fx(5, [5, 5, 5, 5], 5, 5), uncertainty: 'low' as const }
  // Q5: igual cota que Q3 (64) por legal, con pers máx 3 > 1 → va antes que Q3 en el paso 3.
  const Q5 = { id: 'Q5', factores: fx(4, [1, { valor: 2, min: 2, max: 3 }, 1, 4], 4, u(4)), uncertainty: 'low' as const }

  it('entran los no evaluables y los evaluables con unknown o uncertainty high; se ordenan por los tres pasos', () => {
    assert.deepEqual(colaValidacion([Q4, Q3, Q1, Q5, Q2]), ['Q2', 'Q1', 'Q5', 'Q3'])
  })

  it('a · [F11-5]: el no evaluable que podría ser safety_critical entra primero', () => {
    const Y = { id: 'Y', factores: fx(u(), [u(), u(), 1, 1], 3, 3), uncertainty: 'low' as const }
    const Z = { id: 'Z', factores: fx(1, [4, 1, u(5), 1], 5, 1), uncertainty: 'low' as const }
    assert.deepEqual(colaValidacion([Z, Y]), ['Y', 'Z'])
  })
})

// ── §14 · Propiedades, recorridas sobre toda la escala ──────────────────────

describe('§14 propiedades sobre las 93.750 combinaciones de factores', () => {
  it('1 · monotonía: subir P, una dimensión de I o un aspecto de V nunca baja C_raw ni la posición', () => {
    for (const x of todasLasCombinaciones()) {
      const antes = item('antes', x)
      for (const peor of vecinosPeores(x)) {
        const despues = item('despues', peor)
        if (despues.cRaw < antes.cRaw || compararD10(despues, antes) === 'despues') {
          assert.fail(`C_raw o posición bajan: ${JSON.stringify(x)} → ${JSON.stringify(peor)}`)
        }
      }
    }
  })

  it('1 · monotonía con ≥ n: subir un factor conocido de un riesgo con I unknown nunca baja C_raw ni la posición', () => {
    const recs: Recuperacion[] = [1, 3, 5, 'no_aplica']
    let n = 0
    for (const x of todasLasCombinaciones()) {
      if (!recs.includes(x.vRec)) continue
      for (const d of DIMENSIONES) {
        if (x.i[d] !== 1) continue
        for (const r of [{}, { max: 2 }, { max: 4 }] as Rango[]) {
          const antes = itemDeFactores('antes', conUnknown(x, [{ parte: d, ...r }]))
          if (antes === null) continue
          for (const peor of vecinosPeores(x)) {
            if (peor.i[d] !== x.i[d]) continue // sólo factores conocidos
            const despues = itemDeFactores('despues', conUnknown(peor, [{ parte: d, ...r }]))
            if (despues === null) continue // §9.3 puede sacarlo del ranking: punto abierto AN-0021/0023
            if (despues.cRaw < antes.cRaw || compararD10(despues, antes) === 'despues') {
              assert.fail(`C_raw o posición bajan: ${JSON.stringify(x)} con ${d} unknown ${JSON.stringify(r)} → ${JSON.stringify(peor)}`)
            }
            n++
          }
        }
      }
    }
    assert.equal(n, 477_514, 'transiciones con ambos evaluables')
  })

  it('3 · causalidad de V: la recuperación nunca cambia C_personas ni C_legal', () => {
    for (const x of todasLasCombinaciones()) {
      const ref = criticidad({ ...x, vRec: 'no_aplica' }).cPorDimension
      const c = criticidad(x).cPorDimension
      if (c.pers !== ref.pers || c.legal !== ref.legal) assert.fail(`la recuperación mueve personas o legal: ${JSON.stringify(x)}`)
    }
  })

  it('4 · unknown, una parte: evaluable ⇔ hay una dimensión conocida y ningún valor posible de lo desconocido cambia C_raw', () => {
    const rangos: Rango[] = [{}, { max: 1 }, { max: 2 }, { max: 3 }, { max: 4 }, { min: 2, max: 4 }]
    let n = 0
    for (const x of todasLasCombinaciones()) for (const parte of PARTES_V_I) {
      if (valorDe(x, parte) !== 1) continue // la parte unknown no depende de su valor base: una vez por combinación
      for (const r of rangos) { comprobarUnknown(x, [{ parte, ...r }]); n++ }
    }
    assert.equal(n, 656_250, 'tamaño del dominio')
  })

  it('4 · unknown, dos partes a la vez: la misma equivalencia, sobre niveles {1, 2, 4, 5}', () => {
    // P multiplica todas las C_d por igual: no cambia qué cota supera a C_raw. Bastan dos valores.
    const L: Nivel[] = [1, 2, 4, 5]
    const PS: Nivel[] = [2, 5]
    const recs: Recuperacion[] = [1, 2, 4, 5, 'no_aplica']
    const rangos: Rango[] = [{}, { max: 2 }, { max: 4 }, { min: 2, max: 4 }]
    let n = 0
    for (const p of PS) for (const e of L) for (const pe of L) for (const c of L) for (const l of L) for (const vc of L) for (const vr of recs) {
      const x = conocidos(p, [e, pe, c, l], vc, vr)
      for (let a = 0; a < PARTES_V_I.length; a++) for (let b = a + 1; b < PARTES_V_I.length; b++) {
        const [pa, pb] = [PARTES_V_I[a], PARTES_V_I[b]]
        if (pa === undefined || pb === undefined || valorDe(x, pa) !== 1 || valorDe(x, pb) !== 1) continue
        for (const ra of rangos) for (const rb of rangos) { comprobarUnknown(x, [{ parte: pa, ...ra }, { parte: pb, ...rb }]); n++ }
      }
    }
    assert.equal(n, 143_360, 'tamaño del dominio')
  })

  it('4 · P unknown: nunca evaluable, aunque lo demás no pueda cambiar nada', () => {
    for (const x of todasLasCombinaciones()) {
      if (evaluar({ ...aFactores(x), p: { valor: 'unknown', max: 1 } }).evaluable) assert.fail(`P unknown evaluable: ${JSON.stringify(x)}`)
    }
  })

  it('7 · sensible a la mejora: mejorar un aspecto baja algún V_d sobre el que actúa, salvo que el otro ya la deje mejor', () => {
    for (const c of NIVELES) for (const r of NIVELES) {
      const v = vPorDimension(c, r)
      if (c > 1) {
        const mejor = vPorDimension((c - 1) as Nivel, r)
        assert.ok(mejor.pers < v.pers && mejor.legal < v.legal, `contención ${String(c)}→${String(c - 1)} con r ${String(r)}`)
      }
      if (r > 1) {
        const rMejor = (r - 1) as Nivel
        const mejor = vPorDimension(c, rMejor)
        assert.ok(mejor.cont < v.cont || mejor.econ < v.econ || c <= rMejor, `recuperación ${String(r)}→${String(rMejor)} con c ${String(c)}`)
      }
    }
  })

  it('el techo plausible nunca es menor que C_raw', () => {
    for (const x of todasLasCombinaciones()) assert.ok(techoPlausible(aFactores(x)) >= criticidad(x).cRaw)
  })
})
