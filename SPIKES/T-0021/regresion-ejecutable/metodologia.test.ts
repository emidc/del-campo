// Reglas de metodologia v0.2 contra oráculos que no salen de esta implementación: los
// ejemplos escritos en la metodología y en el log de adjudicación, los números de los casos
// de propiedad, y las propiedades de §14 recorridas exhaustivamente sobre la escala 1–5.

import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { ORDEN_PERFILES_V, PERFILES_V, PREFERENCIAS_NO_ORDENADAS, type Respuesta } from './casos.ts'
import { fichasF5, porId } from './fichas.ts'
import {
  ajustarP, compararD10, criticidad, DIMENSIONES, evaluar, iEfectivo, NIVELES, nivelContinuidad, nivelEconomico,
  nivelPorAntecedentes, nivelPorComparablesOSector, posicionPadre, rangoEconomicoSinMargen, rankingD10, safetyCritical,
  consecuenciaExtrema, techoPlausible, valorDefendible, vPorDimension,
  type Dimension, type Factor, type Factores, type FactoresConocidos, type ItemRanking, type Nivel, type Recuperacion,
} from './metodologia.ts'

const F5 = porId(fichasF5())
function ficha(id: string) {
  const f = F5.get(id)
  if (f === undefined) throw new Error(`falta ${id}`)
  return f
}

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

/** Todas las combinaciones de factores conocidos (5 × 5⁴ × 5 × 6 = 93.750). */
function* todasLasCombinaciones(): Generator<FactoresConocidos> {
  const recs: Recuperacion[] = [...NIVELES, 'no_aplica']
  for (const p of NIVELES) for (const e of NIVELES) for (const pe of NIVELES) for (const c of NIVELES) for (const l of NIVELES)
    for (const vc of NIVELES) for (const vr of recs) yield conocidos(p, [e, pe, c, l], vc, vr)
}

const sube = (n: Nivel): Nivel | null => (n === 5 ? null : ((n + 1) as Nivel))

/** Las combinaciones vecinas que suben un solo factor un nivel. */
function vecinosPeores(k: FactoresConocidos): FactoresConocidos[] {
  const out: FactoresConocidos[] = []
  const p = sube(k.p)
  if (p !== null) out.push({ ...k, p })
  for (const d of DIMENSIONES) {
    const n = sube(k.i[d])
    if (n !== null) out.push({ ...k, i: { ...k.i, [d]: n } })
  }
  const c = sube(k.vCont)
  if (c !== null) out.push({ ...k, vCont: c })
  if (k.vRec !== 'no_aplica') {
    const r = sube(k.vRec)
    if (r !== null) out.push({ ...k, vRec: r })
  }
  return out
}

// ── §5.5 · V secuencial contra los perfiles PV-1 a PV-5 ──────────────────────

describe('§5.5 V por dimensión: perfiles PV-1 a PV-5 (casos de origen, log grupo 2)', () => {
  const PV = { p: 3 as Nivel, i: [4, 4, 4, 4] as const }

  for (const perfil of PERFILES_V) {
    it(`${perfil.id} (c ${String(perfil.contencion)} / r ${String(perfil.recuperacion)}): V_d y C_raw de la tabla del log`, () => {
      const v = vPorDimension(perfil.contencion, perfil.recuperacion)
      assert.deepEqual({ pers: v.pers, econ: v.econ, cont: v.cont, legal: v.legal }, perfil.v)
      assert.equal(criticidad(conocidos(PV.p, PV.i, perfil.contencion, perfil.recuperacion)).cRaw, perfil.cRaw)
    })
  }

  it('orden aprobado PV-5 = PV-2 > PV-3 > PV-1 = PV-4 (sin desempate por preparación)', () => {
    const items = PERFILES_V.map((x) => item(x.id, conocidos(PV.p, PV.i, x.contencion, x.recuperacion)))
    assert.deepEqual(rankingD10(items).map((p) => [...p.ids].sort()), ORDEN_PERFILES_V.map((g) => [...g].sort()))
  })

  it('las preferencias PV-5 > PV-2 y PV-1 > PV-4 no ordenan, pero quedan visibles en los campos de V', () => {
    for (const [a, b] of PREFERENCIAS_NO_ORDENADAS) {
      const [pa, pb] = [PERFILES_V.find((x) => x.id === a), PERFILES_V.find((x) => x.id === b)]
      assert.ok(pa && pb)
      assert.equal(pa.cRaw, pb.cRaw, `${a} y ${b} empatan en C_raw`)
      assert.notDeepEqual([pa.contencion, pa.recuperacion], [pb.contencion, pb.recuperacion], `${a} y ${b} se distinguen en V`)
    }
  })

  it('las respuestas de Emiliano son ordinalmente consistentes con V_d (casi protegida < a mitad < casi expuesta)', () => {
    // Juicio cualitativo contra la regla: si una respuesta es "más expuesta" que otra, su V_d es mayor; si es igual, igual.
    const rango: Record<Respuesta, number> = { 'casi protegida': 0, 'a mitad': 1, 'casi igual de expuesta': 2 }
    const celdas = PERFILES_V.flatMap((x) => (['pers', 'econ', 'cont', 'legal'] as const).map((d) => ({
      r: rango[x.respuestas[d]], v: vPorDimension(x.contencion, x.recuperacion)[d], donde: `${x.id} ${d}`,
    })))
    for (const a of celdas) for (const b of celdas) {
      if (a.r < b.r) assert.ok(a.v < b.v, `${a.donde} (${String(a.v)}) < ${b.donde} (${String(b.v)})`)
      if (a.r === b.r) assert.equal(a.v, b.v, `${a.donde} = ${b.donde}`)
    }
  })

  it('mejora de un solo aspecto (respuesta 2c–2d de Emiliano)', () => {
    const c = (vc: Nivel, vr: Nivel) => criticidad(conocidos(PV.p, PV.i, vc, vr))
    // PV-5 → PV-1: "baja claramente".
    assert.ok(c(1, 5).cRaw < c(5, 5).cRaw)
    // PV-5 → PV-2: bajan V_cont y parte de V_econ; C_raw puede no bajar porque personas y legal determinan.
    const [v5, v2] = [vPorDimension(5, 5), vPorDimension(5, 1)]
    assert.ok(v2.cont < v5.cont && v2.econ < v5.econ && v2.econ > v2.cont)
    assert.equal(c(5, 1).cRaw, c(5, 5).cRaw)
    assert.deepEqual(c(5, 1).determinantes, ['pers', 'legal'])
    // PV-1 + recuperación parcial (5 → 3): "puede quedar en el mismo nivel, pero tiene que verse": V_d no cambia.
    assert.deepEqual(vPorDimension(1, 3), vPorDimension(1, 5))
  })

  it('recuperación no_aplica: V_d = contención en las cuatro dimensiones', () => {
    for (const c of NIVELES) assert.deepEqual(vPorDimension(c, 'no_aplica'), { econ: c, pers: c, cont: c, legal: c })
  })
})

// ── §6 · Fórmula ─────────────────────────────────────────────────────────────

describe('§6 C_d = P × I_d × V_d, C_raw = max_d, dimensión determinante', () => {
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
})

// ── §4.2 · Económico ─────────────────────────────────────────────────────────

describe('§4.2 nivel económico como % del RO', () => {
  it('ejemplo de §4.2: USD 600 mil / RO USD 2 M = 30% → 4 (el corte va al nivel superior)', () => {
    assert.equal(nivelEconomico(600, 2000), 4)
  })

  it('los cuatro cortes exactos van al nivel superior', () => {
    assert.deepEqual([2, 10, 30, 100].map((pct) => nivelEconomico(pct, 100)), [2, 3, 4, 5])
    assert.deepEqual([1.99, 9.99, 29.99, 99.99].map((pct) => nivelEconomico(pct, 100)), [1, 2, 3, 4])
  })

  it('CP-11: la misma pérdida de USD 1,5 M es 5% del RO de A (2) y 150% del de B (5), como registran las fichas', () => {
    assert.equal(nivelEconomico(1500, 30000), 2)
    assert.equal(nivelEconomico(1500, 1000), 5)
    assert.equal(ficha('EV-0076').factores.i.econ.valor, 2)
    assert.equal(ficha('EV-0077').factores.i.econ.valor, 5)
  })

  it('[F5-1] CP-13 R1 sin margen de contribución: multa 0,4 M + 1,5 M de facturación → rango 3–4, el de la ficha', () => {
    const r = rangoEconomicoSinMargen({ facturacionPerdida: 1500, costosDirectos: 400, ro: 2000, facturacionAnual: 22000 })
    assert.deepEqual(r, { min: 3, max: 4 })
    const econ = ficha('EV-0084').factores.i.econ
    assert.deepEqual({ min: econ.min, max: econ.max }, r)
  })

  it('[F5-1] CP-16 R1: 5 a 10 días sin facturar (USD 1,1–2,2 M), RO 4,5 M sobre 55 M → rango 2–4, el de la ficha', () => {
    const corto = rangoEconomicoSinMargen({ facturacionPerdida: 1100, ro: 4500, facturacionAnual: 55000 })
    const largo = rangoEconomicoSinMargen({ facturacionPerdida: 2200, ro: 4500, facturacionAnual: 55000 })
    assert.deepEqual({ min: corto.min, max: largo.max }, { min: 2, max: 4 })
    const econ = ficha('EV-0090').factores.i.econ
    assert.deepEqual({ min: econ.min, max: econ.max }, { min: 2, max: 4 })
  })

  it('la magnitud de referencia tiene que ser positiva (§4.2: si no hay, unknown)', () => {
    assert.throws(() => nivelEconomico(100, 0))
  })
})

// ── §4.4 · Continuidad ───────────────────────────────────────────────────────

describe('§4.4 nivel de continuidad por duración bruta', () => {
  it('ejemplos con duración escrita: panificadora 3 semanas (§2.4), CP-13 30 días, CP-14 9 meses, CP-16 5–10 días', () => {
    assert.equal(nivelContinuidad({ cantidad: 3, unidad: 'semanas' }), 4)
    assert.equal(nivelContinuidad({ cantidad: 30, unidad: 'dias' }), ficha('EV-0084').factores.i.cont.valor)
    assert.equal(nivelContinuidad({ cantidad: 9, unidad: 'meses' }), ficha('EV-0086').factores.i.cont.valor)
    assert.equal(nivelContinuidad({ cantidad: 5, unidad: 'dias' }), 3)
    assert.equal(nivelContinuidad({ cantidad: 10, unidad: 'dias' }), ficha('EV-0090').factores.i.cont.valor)
  })

  it('bordes: < 1 día, 1–3 días, hasta 2 semanas, hasta 3 meses, más de 3 meses', () => {
    assert.equal(nivelContinuidad({ cantidad: 23, unidad: 'horas' }), 1)
    assert.equal(nivelContinuidad({ cantidad: 1, unidad: 'dias' }), 2)
    assert.equal(nivelContinuidad({ cantidad: 3, unidad: 'dias' }), 2)
    assert.equal(nivelContinuidad({ cantidad: 3.5, unidad: 'dias' }), 3)
    assert.equal(nivelContinuidad({ cantidad: 2, unidad: 'semanas' }), 3)
    assert.equal(nivelContinuidad({ cantidad: 15, unidad: 'dias' }), 4)
    assert.equal(nivelContinuidad({ cantidad: 3, unidad: 'meses' }), 4)
    assert.equal(nivelContinuidad({ cantidad: 4, unidad: 'meses' }), 5)
  })

  it('"3 meses" en días no está definido: entre 89 y 92 días el arnés no elige', () => {
    assert.equal(nivelContinuidad({ cantidad: 90, unidad: 'dias' }), 'ambiguo')
    assert.equal(nivelContinuidad({ cantidad: 13, unidad: 'semanas' }), 'ambiguo')
  })

  it('una degradación menor a la mitad va un nivel abajo, nunca por debajo de 1', () => {
    assert.equal(nivelContinuidad({ cantidad: 3, unidad: 'semanas' }, { degradacionMenorALaMitad: true }), 3)
    assert.equal(nivelContinuidad({ cantidad: 2, unidad: 'horas' }, { degradacionMenorALaMitad: true }), 1)
  })
})

// ── §3.3, §3.4 · Probabilidad ────────────────────────────────────────────────

describe('§3.3–§3.4 anclas y ajustes de P [F5-4A]', () => {
  it('bordes del 5: frecuencia media de al menos una por año en los últimos tres años', () => {
    assert.equal(nivelPorAntecedentes([3, 15, 30], 120), 5)
    assert.equal(nivelPorAntecedentes([3, 30], 120), 4)
  })

  it('borde del 4: el que ocurrió hace exactamente tres años cuenta; un mes más, ya es 3', () => {
    assert.equal(nivelPorAntecedentes([36], 120), 4)
    assert.equal(nivelPorAntecedentes([37], 120), 3)
  })

  it('una historia propia sin ocurrencias no indica nivel (§3.2)', () => {
    assert.equal(nivelPorAntecedentes([], 120), null)
  })

  it('CP-12 (log 4A y fichas): R1a/R1c dos en dos años = 5, R1b una en dos años = 4, R2 hace tres años = 4', () => {
    // La narrativa informa "los últimos dos años": es el período con registro (ver README, ambigüedades).
    assert.equal(nivelPorAntecedentes([6, 18], 24), ficha('EV-0080').factores.p.valor)
    assert.equal(nivelPorAntecedentes([6, 18], 24), ficha('EV-0082').factores.p.valor)
    assert.equal(nivelPorAntecedentes([12], 24), ficha('EV-0081').factores.p.valor)
    assert.equal(nivelPorAntecedentes([36], 120), ficha('EV-0083').factores.p.valor)
  })

  it('CP-16 R1: una caída el año pasado → 4, como la ficha', () => {
    assert.equal(nivelPorAntecedentes([10], 60), ficha('EV-0090').factores.p.valor)
  })

  it('condición causal: nunca fija nivel, sólo +1 contra la fuente (CP-11 A y B, CP-19 marzo, CP-08 R1)', () => {
    const sectorSinComparables = { recurrenteEnComparables: false, comparablesUltimos5Anios: false, precursoresPropios: false, sectorUltimos10Anios: true }
    const base = nivelPorComparablesOSector(sectorSinComparables)
    assert.equal(base, 2)
    const agravado = ajustarP(base, { controlesNuevos: false, condicionesAgravadas: true })
    for (const id of ['EV-0076', 'EV-0077', 'EV-0096', 'EV-0070']) assert.equal(agravado, ficha(id).factores.p.valor, id)
    // CP-19 antes de marzo: el sector sin la condición todavía no registrada.
    assert.equal(base, ficha('EV-0095').factores.p.valor)
  })

  it('precursor sin antecedentes propios = ancla 3; con la condición presente, +1 (CP-13 R1)', () => {
    const precursor = nivelPorComparablesOSector({ recurrenteEnComparables: false, comparablesUltimos5Anios: false, precursoresPropios: true, sectorUltimos10Anios: true })
    assert.equal(precursor, 3)
    assert.equal(ajustarP(precursor, { controlesNuevos: false, condicionesAgravadas: true }), ficha('EV-0084').factores.p.valor)
  })

  it('ajustes: uno por sentido, compensables, nunca fuera de 1–5', () => {
    assert.equal(ajustarP(5, { controlesNuevos: false, condicionesAgravadas: true }), 5)
    assert.equal(ajustarP(1, { controlesNuevos: true, condicionesAgravadas: false }), 1)
    assert.equal(ajustarP(3, { controlesNuevos: true, condicionesAgravadas: true }), 3)
  })
})

// ── §9 · Unknown y no evaluables ─────────────────────────────────────────────

describe('§9.2 valor defendible [F5-1]', () => {
  it('rango ≤ 3 niveles con valor más plausible → evaluable', () => { assert.equal(valorDefendible({ min: 2, max: 4 }, true), 'evaluable'); })
  it('rango ≤ 3 niveles sin base para preferir → unknown', () => { assert.equal(valorDefendible({ min: 2, max: 4 }, false), 'unknown'); })
  it('rango > 3 niveles → unknown, aunque haya preferencia', () => { assert.equal(valorDefendible({ min: 1, max: 4 }, true), 'unknown'); })
  it('sin rango defendible → unknown', () => { assert.equal(valorDefendible(null, true), 'unknown'); })
})

describe('§9.3 criticidad con partes unknown', () => {
  const base = aFactores(conocidos(3, [3, 2, 2, 1], 3, 3))
  const conI = (d: Dimension, f: Factor<Nivel>): Factores => ({ ...base, i: { ...base.i, [d]: f } })

  it('P unknown → no evaluable (CP-08 R2)', () => {
    assert.deepEqual(evaluar({ ...base, p: { valor: 'unknown' } }), { evaluable: false, motivo: 'p_unknown' })
    assert.equal(evaluar(ficha('EV-0071').factores).evaluable, false)
  })

  it('una dimensión unknown cuya cota no supera C_raw de las conocidas → evaluable con ese C_raw', () => {
    // Conocidas: econ 3×3×3 = 27. Legal unknown con max 2: cota 3×2×3 = 18 ≤ 27.
    const e = evaluar(conI('legal', { valor: 'unknown', max: 2 }))
    assert.ok(e.evaluable)
    assert.equal(e.cRaw, 27)
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
})

describe('§8 banderas', () => {
  const i = (pers: Factor<Nivel>, econ: Factor<Nivel> = { valor: 2 }) => ({ econ, pers, cont: { valor: 1 as Nivel }, legal: { valor: 1 as Nivel } })
  it('safety_critical si i_pers ≥ 4; el 3 no la dispara', () => {
    assert.equal(safetyCritical(i({ valor: 4 })), true)
    assert.equal(safetyCritical(i({ valor: 3 })), false)
  })
  it('no evaluable: unknown con max registrado en el umbral dispara; unknown sin max, no', () => {
    assert.equal(safetyCritical(i({ valor: 'unknown', max: 4 })), true)
    assert.equal(safetyCritical(i({ valor: 'unknown' })), false)
  })
  it('consecuencia_extrema por cualquier dimensión en 5, con la lista de dimensiones', () => {
    assert.deepEqual(consecuenciaExtrema(i({ valor: 5 }, { valor: 5 })), ['econ', 'pers'])
    assert.deepEqual(consecuenciaExtrema(i({ valor: 4 })), [])
  })
})

// ── §7.2 · D10 ───────────────────────────────────────────────────────────────

describe('§7.2 D10 v0.2: banda → C_raw → I efectivo → I-personas → empate', () => {
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
})

// ── §1.4 · Padre ─────────────────────────────────────────────────────────────

describe('§1.4 posición del padre [F5-3]', () => {
  const k = (cRaw: number): ItemRanking => ({ id: '', cRaw, iEfectivo: { n: 3, completo: true, dimensiones: [] }, iPers: 1 })
  it('se muestra con su hijo prioritario', () => {
    assert.deepEqual(posicionPadre([{ id: 'h1', item: { ...k(10), id: 'h1' } }, { id: 'h2', item: { ...k(50), id: 'h2' } }]),
      { conPosicion: true, hijosPrioritarios: ['h2'], prioridadProvisional: false })
  })
  it('hijos empatados en el primer lugar: se muestran todos', () => {
    const p = posicionPadre([{ id: 'h1', item: { ...k(50), id: 'h1' } }, { id: 'h2', item: { ...k(50), id: 'h2' } }])
    assert.ok(p.conPosicion)
    assert.deepEqual([...p.hijosPrioritarios].sort(), ['h1', 'h2'])
  })
  it('un hijo no evaluable vuelve provisional la posición', () => {
    assert.deepEqual(posicionPadre([{ id: 'h1', item: { ...k(10), id: 'h1' } }, { id: 'h2', item: null }]),
      { conPosicion: true, hijosPrioritarios: ['h1'], prioridadProvisional: true })
  })
  it('todos los hijos no evaluables: sin posición', () => {
    assert.deepEqual(posicionPadre([{ id: 'h1', item: null }]), { conPosicion: false, prioridadProvisional: true })
  })
})

// ── §14 · Propiedades, recorridas sobre toda la escala ──────────────────────

describe('§14 propiedades sobre las 93.750 combinaciones de factores', () => {
  it('1 · monotonía: subir P, una dimensión de I o un aspecto de V nunca baja C_raw ni la posición', () => {
    for (const k of todasLasCombinaciones()) {
      const antes = item('antes', k)
      for (const peor of vecinosPeores(k)) {
        const despues = item('despues', peor)
        assert.ok(despues.cRaw >= antes.cRaw)
        assert.notEqual(compararD10(despues, antes), 'despues')
      }
    }
  })

  it('3 · causalidad de V: la recuperación nunca cambia C_personas ni C_legal', () => {
    for (const k of todasLasCombinaciones()) {
      const ref = criticidad({ ...k, vRec: 'no_aplica' }).cPorDimension
      const c = criticidad(k).cPorDimension
      assert.equal(c.pers, ref.pers)
      assert.equal(c.legal, ref.legal)
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
        const bajaAlguna = mejor.cont < v.cont || mejor.econ < v.econ
        // "Salvo que el otro aspecto ya la deje mejor": la contención ya es tan buena como la recuperación mejorada.
        assert.ok(bajaAlguna || c <= rMejor, `recuperación ${String(r)}→${String(rMejor)} con c ${String(c)}`)
      }
    }
  })

  it('4 · unknown: si el riesgo es evaluable, ningún valor posible de lo desconocido cambia C_raw', () => {
    // Una parte unknown a la vez, con y sin max, sobre I en {1, 3, 5} para acotar el recorrido.
    const tres: Nivel[] = [1, 3, 5]
    const recs: Recuperacion[] = [...NIVELES, 'no_aplica']
    for (const p of NIVELES) for (const e of tres) for (const pe of tres) for (const co of tres) for (const l of tres)
      for (const vc of NIVELES) for (const vr of recs) {
        const k = conocidos(p, [e, pe, co, l], vc, vr)
        const f = aFactores(k)
        const variantes: { f: Factores; posibles: FactoresConocidos[] }[] = []
        for (const max of [undefined, 1, 3, 5] as const) {
          const u = max === undefined ? { valor: 'unknown' as const } : { valor: 'unknown' as const, max }
          const hasta = NIVELES.filter((n) => n <= (max ?? 5))
          for (const d of DIMENSIONES) {
            if (max !== undefined && k.i[d] > max) continue
            variantes.push({ f: { ...f, i: { ...f.i, [d]: u } }, posibles: hasta.map((n) => ({ ...k, i: { ...k.i, [d]: n } })) })
          }
          if (max === undefined || k.vCont <= max) variantes.push({ f: { ...f, vCont: u }, posibles: hasta.map((n) => ({ ...k, vCont: n })) })
          if (vr !== 'no_aplica' && (max === undefined || vr <= max)) variantes.push({ f: { ...f, vRec: u }, posibles: hasta.map((n) => ({ ...k, vRec: n })) })
        }
        for (const { f: conUnknown, posibles } of variantes) {
          const ev = evaluar(conUnknown)
          if (!ev.evaluable) continue
          for (const real of posibles) assert.equal(criticidad(real).cRaw, ev.cRaw)
        }
      }
  })

  it('el techo plausible nunca es menor que C_raw', () => {
    for (const k of todasLasCombinaciones()) assert.ok(techoPlausible(aFactores(k)) >= criticidad(k).cRaw)
  })
})
