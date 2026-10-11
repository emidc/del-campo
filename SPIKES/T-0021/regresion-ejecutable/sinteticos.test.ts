// Casos sintéticos de la remediación (REMEDIATION.md): cada uno distingue la regla de v0.2 de
// una implementación incorrecta concreta que la suite anterior dejaba pasar (COLD-REVIEW §8).
// Entran por el mismo camino que usaría Risk OS: fichas con `Factores` → `rankingPrincipal`,
// `derivadosCalculados` y `juzgar`. Ningún esperado sale de `metodologia.ts`: la aritmética
// está escrita en el comentario de cada caso.
//
// Lo que la metodología deja ambiguo no se afirma: va en el bloque final con `todo`, que corre
// y muestra la lectura actual del arnés sin decidir el veredicto de la suite. Desde la Fase 11b
// sólo quedan ahí los criterios del juez que Emiliano dejó fuera de v1 (EV-44).

import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import type { Ficha, TipoObjeto } from './fichas.ts'
import {
  banda, BANDAS, colaValidacion, compararD10, evaluar, iEfectivo, nivelContinuidad, nivelPorAntecedentes,
  rangoEconomicoSinMargen, rangoRegistrado, valorDefendible, type EntradaCola, type Factor, type Factores, type Nivel, type Recuperacion,
} from './metodologia.ts'
import { derivadosCalculados, juzgar, rankingPrincipal, type Expectativa, type RankingPrincipal } from './verificacion.ts'

// ── Fichas sintéticas ────────────────────────────────────────────────────────

type F = Nivel | Factor<Nivel>
const k = (x: F): Factor<Nivel> => (typeof x === 'number' ? { valor: x } : x)
/** `unknown`, con `max` registrado o sin él. */
const u = (max?: Nivel): Factor<Nivel> => (max === undefined ? { valor: 'unknown' } : { valor: 'unknown', max })

function fx(p: F, i: readonly [F, F, F, F], vCont: F, vRec: Recuperacion | Factor<Nivel>): Factores {
  return {
    p: k(p),
    i: { econ: k(i[0]), pers: k(i[1]), cont: k(i[2]), legal: k(i[3]) },
    vCont: k(vCont),
    vRec: typeof vRec === 'object' ? vRec : { valor: vRec },
  }
}

/** Una ficha mínima. `registrado` no se usa en estos tests (no hay corrida registrada que comparar). */
function ficha(
  riskId: string,
  factores: Factores,
  o: { tipo?: TipoObjeto; padre?: string; empresa?: string; motivo?: string; uncertainty?: Ficha['uncertainty'] } = {},
): Ficha {
  return {
    evaluacionId: `SX-${riskId}`,
    riskId,
    casoEmpresa: o.empresa ?? 'SX',
    tipoObjeto: o.tipo ?? 'riesgo',
    riesgoPadreId: o.padre ?? '',
    miembros: [],
    evaluacionAnteriorId: '',
    motivo: '',
    versionMetodologia: 'metodologia v1 candidate',
    factores,
    bases: { p: '', econ: '', pers: '', cont: '', legal: '', vCont: '', vRec: '' },
    uncertainty: o.uncertainty ?? 'low',
    registrado: {
      evaluable: false, cRaw: null, cDimensionDeterminante: '', iEfectivo: '', iEfectivoDimensiones: '', vAspectosAplicables: '',
      consecuenciaExtrema: false, consecuenciaExtremaDimensiones: '', safetyCritical: false, techoPlausible: 0, banda: '',
    },
    crudo: { motivo_no_evaluable: o.motivo ?? '' },
  }
}

/** La ficha como entrada de la cola de validación (§9.5). */
const entrada = (f: Ficha): EntradaCola => ({ id: f.riskId, factores: f.factores, uncertainty: f.uncertainty })

/** Posiciones con los ids de cada una ordenados (el orden dentro de un empate no representa prioridad, §7.2). */
const posiciones = (r: RankingPrincipal) => r.posiciones.map((p) => ({ ids: [...p.ids].sort(), provisional: p.provisional }))
const ranking = (fichas: readonly Ficha[], todas: readonly Ficha[] = fichas) => posiciones(rankingPrincipal(fichas, todas))
/** El mismo ranking con la entrada invertida: el resultado no puede depender del orden de carga. */
function rankingEstable(fichas: readonly Ficha[], todas: readonly Ficha[] = fichas) {
  const r = ranking(fichas, todas)
  assert.deepEqual(ranking([...fichas].reverse(), [...todas].reverse()), r, 'el orden de entrada cambió el ranking')
  return r
}
const P = (...ids: string[]) => ({ ids: [...ids].sort(), provisional: false })
const PROV = (...ids: string[]) => ({ ids: [...ids].sort(), provisional: true })

// ── A · D10 después de C_raw (O01, O02, O03) ─────────────────────────────────

describe('§7.2 D10: orden exacto de los pasos después de C_raw', () => {
  // A: P 4 × econ 5 × V 3 = 60; I efectivo 5; I-personas 1.
  const A = ficha('A', fx(4, [5, 1, 1, 1], 3, 'no_aplica'))
  // B: P 3 × pers 4 × V 5 = 60; I efectivo 4; I-personas 4.
  const B = ficha('B', fx(3, [1, 4, 1, 1], 5, 'no_aplica'))

  it('igual C_raw, criterios cruzados: I efectivo (paso 3) decide antes que I-personas (paso 4)', () => {
    assert.deepEqual(rankingEstable([B, A]), [P('A'), P('B')])
  })

  it('el paso 3 usa I efectivo (máximo de las dimensiones), no el I de la dimensión determinante', () => {
    // G: P 3, I (5, 4, 1, 1), contención 5, recuperación 1. V econ = min(5, ⌈6/2⌉) = 3.
    //   econ 3×5×3 = 45, pers 3×4×5 = 60 → C_raw 60 por personas (I 4), pero I efectivo 5 (econ).
    const G = ficha('G', fx(3, [5, 4, 1, 1], 5, 1))
    // B: C_raw 60 por personas, I efectivo 4, I-personas 4: con el I de la determinante empatarían.
    assert.deepEqual(rankingEstable([B, G]), [P('G'), P('B')])
  })

  // Los tres con P 3, V 3 (no_aplica): C_raw 36 por una dimensión en 4, I efectivo 4.
  // Ancho: econ, cont y legal en 4 (tres dimensiones en el máximo), I-personas 1.
  const ancho = ficha('ancho', fx(3, [4, 1, 4, 4], 3, 'no_aplica'))
  // Angosto: sólo econ en 4, I-personas 1.
  const angosto = ficha('angosto', fx(3, [4, 1, 1, 1], 3, 'no_aplica'))
  // Personas: sólo econ en 4, I-personas 2 (pers 3 × 2 × 3 = 18 < 36).
  const personas = ficha('personas', fx(3, [4, 2, 1, 1], 3, 'no_aplica'))

  it('sin desempate por amplitud: igual C_raw, I efectivo e I-personas con distinta amplitud es empate legítimo', () => {
    assert.deepEqual(rankingEstable([ancho, angosto]), [P('ancho', 'angosto')])
  })

  it('cerca del mismo caso, sólo I-personas rompe el empate, aunque el otro tenga más amplitud', () => {
    assert.deepEqual(rankingEstable([ancho, personas]), [P('personas'), P('ancho')])
    assert.deepEqual(rankingEstable([ancho, angosto, personas]), [P('personas'), P('ancho', 'angosto')])
  })
})

// ── B · unknown, ≥ n y §9.3 de punta a punta (O13, D04, U01) ─────────────────

describe('§9.3 y §7.2 [F5-6]: unknown desde los Factores hasta el ranking', () => {
  // U: P 3, I (4, 1, unknown máx 5, 1), contención 5, recuperación 1.
  //   V: econ min(5, ⌈6/2⌉) = 3, pers 5, cont min(5, 1) = 1, legal 5.
  //   Conocidas: econ 3×4×3 = 36, pers 3×1×5 = 15, legal 15. Cota de cont: 3×5×1 = 15 < 36.
  const U = ficha('U', fx(3, [4, 1, u(5), 1], 5, 1))
  // K: P 3, I (4, 1, 1, 1), contención 3, recuperación 3 → econ 3×4×3 = 36; I efectivo 4 completo.
  const K = ficha('K', fx(3, [4, 1, 1, 1], 3, 3))
  // L: P 4, I (3, 1, 1, 1), contención 3 → 36; I efectivo 3.
  const L = ficha('L', fx(4, [3, 1, 1, 1], 3, 'no_aplica'))

  it('un riesgo evaluable puede tener un unknown: C_raw de las conocidas, determinante sólo la conocida', () => {
    const e = evaluar(U.factores)
    assert.ok(e.evaluable)
    assert.equal(e.cRaw, 36)
    assert.deepEqual(e.determinantes, ['econ'])
    assert.equal(rankingPrincipal([U], [U]).noEvaluables.length, 0)
  })

  it('I efectivo se muestra ≥ n con n = máximo de las conocidas; el máx del unknown no es su valor', () => {
    assert.deepEqual(iEfectivo(U.factores.i), { n: 4, completo: false, dimensiones: ['econ'] })
    const d = derivadosCalculados(U)
    assert.equal(d.iEfectivo, '≥ 4')
    assert.equal(d.iEfectivoDimensiones, 'econ')
    // Con otro máx registrado, ni C_raw ni n cambian: el techo sólo entra en la cota de §9.3.
    // [F11-6] Con máx 2 ≤ 4, lo desconocido no puede superar n: se muestra `4` (en v0.3, `≥ 4`).
    const U2 = ficha('U2', fx(3, [4, 1, u(2), 1], 5, 1))
    assert.equal(derivadosCalculados(U2).iEfectivo, '4')
    assert.equal(derivadosCalculados(U2, 'v0.3').iEfectivo, '≥ 4')
    assert.equal(derivadosCalculados(U2).cRaw, '36')
  })

  it('≥ 4 contra 4 completo con igual C_raw: paso 3 indeterminado → posición común provisional', () => {
    assert.deepEqual(rankingEstable([K, U]), [PROV('K', 'U')])
  })

  it('≥ 4 contra 3 con igual C_raw: decide sin depender de lo desconocido, no provisional', () => {
    assert.deepEqual(rankingEstable([L, U]), [P('U'), P('L')])
  })

  it('≥ n sin máx registrado puede llegar a 5: ≥ 3 contra 5 completo con igual C_raw es indeterminado', () => {
    // H: P 5, I (3, 1, unknown sin máx, 1), contención 5, recuperación 1.
    //   econ 5×3×3 = 45, pers y legal 5×1×5 = 25; cota de cont 5×5×1 = 25 ≤ 45 → evaluable, ≥ 3.
    const H = ficha('H', fx(5, [3, 1, u(), 1], 5, 1))
    // N: P 3 × econ 5 × V 3 = 45; I efectivo 5. Si el unknown vale 5, el paso 3 empata y decide el 4.
    const N = ficha('N', fx(3, [5, 1, 1, 1], 3, 'no_aplica'))
    assert.equal(derivadosCalculados(H).iEfectivo, '≥ 3')
    assert.deepEqual(rankingEstable([N, H]), [PROV('H', 'N')])
  })

  it('el bloque provisional no arrastra a los riesgos de otro C_raw', () => {
    // M: P 5 × econ 4 × V 2 = 40.
    const M = ficha('M', fx(5, [4, 1, 1, 1], 2, 'no_aplica'))
    assert.deepEqual(rankingEstable([K, U, M]), [P('M'), PROV('K', 'U')])
  })

  // E: P 3, I (3, 2, 2, unknown máx 3), contención 3, recuperación 3 (V 3 en todas).
  //   Conocidas: econ 27, pers 18, cont 18. Cota legal: 3×3×3 = 27 = C_raw.
  it('borde de §9.3: una cota igual a C_raw es evaluable ("≤")', () => {
    const E = ficha('E', fx(3, [3, 2, 2, u(3)], 3, 3))
    const r = rankingPrincipal([E], [E])
    assert.deepEqual(r.noEvaluables, [])
    assert.equal(r.items.get('E')?.cRaw, 27)
    // [F11-6] máx 3 = n: se muestra `3` (en v0.3, `≥ 3`).
    assert.equal(derivadosCalculados(E).iEfectivo, '3')
    assert.equal(derivadosCalculados(E, 'v0.3').iEfectivo, '≥ 3')
  })

  it('un nivel más de máx: la cota supera C_raw → lista no evaluable con motivo', () => {
    // Cota legal 3×4×3 = 36 > 27.
    const E4 = ficha('E4', fx(3, [3, 2, 2, u(4)], 3, 3))
    const r = rankingPrincipal([E4], [E4])
    assert.deepEqual(r.noEvaluables, [{ riskId: 'E4', motivo: 'cota_supera_c_raw' }])
    assert.equal(r.posiciones.length, 0)
  })

  // R: P 3, I (3, 3, 1, 1), contención 3, recuperación unknown.
  //   Personas (no depende de r): 3×3×3 = 27. Cota econ: V = min(3, ⌈(3+r)/2⌉) = 3 para r ≥ 3 → 27.
  it('borde de §9.3 por un aspecto de V: la contención acota econ, aun sin máx registrado', () => {
    for (const rec of [u(3), u()]) {
      const e = evaluar(fx(3, [3, 3, 1, 1], 3, rec))
      assert.ok(e.evaluable, `recuperación ${JSON.stringify(rec)}`)
      assert.equal(e.cRaw, 27)
    }
    // Lo que falta es un aspecto de V, no una dimensión de I: I efectivo queda completo.
    assert.equal(derivadosCalculados(ficha('R', fx(3, [3, 3, 1, 1], 3, u()))).iEfectivo, '3')
  })

  // T: P 2, I (unknown máx 2, 4, 1, unknown …), contención 2. Conocidas: pers 2×4×2 = 16, cont 4.
  it('dos unknown: evaluable sólo si las dos cotas quedan ≤ C_raw', () => {
    // econ 2×2×2 = 8; legal sin máx 2×5×2 = 20 > 16.
    assert.deepEqual(evaluar(fx(2, [u(2), 4, 1, u()], 2, 'no_aplica')), { evaluable: false, motivo: 'cota_supera_c_raw' })
    // legal máx 4: 2×4×2 = 16 = C_raw.
    const T = ficha('T', fx(2, [u(2), 4, 1, u(4)], 2, 'no_aplica'))
    const e = evaluar(T.factores)
    assert.ok(e.evaluable)
    assert.equal(e.cRaw, 16)
    // [F11-6] los dos máx (2 y 4) son ≤ 4: completo (en v0.3, `≥ 4`).
    assert.deepEqual(iEfectivo(T.factores.i), { n: 4, completo: true, dimensiones: ['pers'] })
    assert.deepEqual(iEfectivo(T.factores.i, 'v0.3'), { n: 4, completo: false, dimensiones: ['pers'] })
  })
})

// ── C · Riesgo padre (P01, P02, P03, D08) ────────────────────────────────────

describe('§1.4 [F5-3] padre: se muestra con el hijo que gana por D10, sin score propio', () => {
  const PADRE = 'PX'
  // La fila del padre trae factores propios distintos de los de todos sus hijos (P 1 × 2 × 2 = 8).
  // Una implementación que lo rankee con ellos lo manda al fondo.
  const padre = ficha(PADRE, fx(1, [2, 2, 2, 2], 2, 'no_aplica'), { tipo: 'padre' })
  const hijo = (id: string, f: Factores) => ficha(id, f, { tipo: 'sub_riesgo', padre: PADRE })
  // h1: P 4 × econ 5 × V 3 = 60; I efectivo 5; I-personas 1.
  const h1 = hijo('h1', fx(4, [5, 1, 1, 1], 3, 'no_aplica'))
  // h2: P 3 × pers 4 × V 5 = 60; I efectivo 4; I-personas 4. Empata con h1 en C_raw.
  const h2 = hijo('h2', fx(3, [1, 4, 1, 1], 5, 'no_aplica'))
  // h3: P 1 × pers 5 × V 4 = 20. El mayor I y la mayor I-personas, el menor C_raw.
  // El roll-up prohibido (máx P 4 × máx I 5 × máx V 5) daría 100.
  const h3 = hijo('h3', fx(1, [1, 5, 1, 1], 4, 'no_aplica'))
  // Riesgos simples de la misma organización.
  const arriba = ficha('arriba', fx(3, [5, 1, 1, 1], 5, 'no_aplica')) // 75
  // 60 por econ, I efectivo 5, I-personas 2 (pers 4×2×3 = 24): va antes del padre sólo por el paso 4.
  const par = ficha('par', fx(4, [5, 2, 1, 1], 3, 'no_aplica'))
  const abajo = ficha('abajo', fx(3, [3, 1, 1, 1], 5, 'no_aplica')) // 45
  // Los hijos se cargan con h1 al final: elegir "el primero" por orden de carga no da h1.
  const todas = [arriba, par, padre, abajo, h2, h3, h1]
  const principal = [arriba, par, padre, abajo]

  it('el hijo prioritario sale de D10 entre hijos de igual C_raw (paso 3), no de C_raw sólo ni del orden de carga', () => {
    const r = rankingPrincipal(principal, todas)
    assert.deepEqual(r.padres.get(PADRE), { hijosPrioritarios: ['h1'], prioridadProvisional: false })
  })

  it('el padre compite con el ítem exacto de su hijo prioritario (C_raw, I efectivo e I-personas)', () => {
    const r = rankingPrincipal(principal, todas)
    assert.deepEqual(r.items.get(PADRE), { id: PADRE, cRaw: 60, iEfectivo: { n: 5, completo: true, dimensiones: ['econ'] }, iPers: 1 })
    // Precondición del caso: la fila del padre, leída como riesgo, daría otro score.
    const propio = evaluar(padre.factores)
    assert.ok(propio.evaluable && propio.cRaw !== 60)
  })

  it('posición: debajo del par de igual C_raw e I efectivo con más I-personas; ni roll-up ni factores propios', () => {
    assert.deepEqual(rankingEstable(principal, todas), [P('arriba'), P('par'), P(PADRE), P('abajo')])
  })

  it('paso 4 entre hijos: igual C_raw e I efectivo, gana el de mayor I-personas', () => {
    const q = (id: string, f: Factores) => ficha(id, f, { tipo: 'sub_riesgo', padre: 'PQ' })
    // Los dos 3 × 4 × 3 = 36 con I efectivo 4; I-personas 1 y 2.
    const hijos = [q('q2', fx(3, [4, 2, 1, 1], 3, 'no_aplica')), q('q1', fx(3, [4, 1, 1, 1], 3, 'no_aplica'))]
    const pq = ficha('PQ', fx(5, [5, 5, 5, 5], 5, 'no_aplica'), { tipo: 'padre' })
    assert.deepEqual(rankingPrincipal([pq], [pq, ...hijos]).padres.get('PQ'), { hijosPrioritarios: ['q2'], prioridadProvisional: false })
  })

  it('hijos que sólo difieren en amplitud empatan: el padre los muestra a los dos', () => {
    const w = (id: string, f: Factores) => ficha(id, f, { tipo: 'sub_riesgo', padre: 'PW' })
    const hijos = [w('w-ancho', fx(3, [4, 1, 4, 4], 3, 'no_aplica')), w('w-angosto', fx(3, [4, 1, 1, 1], 3, 'no_aplica'))]
    const pw = ficha('PW', fx(1, [1, 1, 1, 1], 1, 'no_aplica'), { tipo: 'padre' })
    const pos = rankingPrincipal([pw], [pw, ...hijos]).padres.get('PW')
    assert.deepEqual([...(pos?.hijosPrioritarios ?? [])].sort(), ['w-ancho', 'w-angosto'].sort())
    assert.equal(pos?.prioridadProvisional, false)
  })

  it('hijos con paso 3 indeterminado (≥ 4 contra 4): los dos se muestran y la prioridad queda provisional', () => {
    const v = (id: string, f: Factores) => ficha(id, f, { tipo: 'sub_riesgo', padre: 'PV' })
    // Los mismos U y K del bloque de unknown: C_raw 36, ≥ 4 contra 4.
    const hijos = [v('v-u', fx(3, [4, 1, u(5), 1], 5, 1)), v('v-k', fx(3, [4, 1, 1, 1], 3, 3))]
    const pv = ficha('PV', fx(1, [1, 1, 1, 1], 1, 'no_aplica'), { tipo: 'padre' })
    const pos = rankingPrincipal([pv], [pv, ...hijos]).padres.get('PV')
    assert.deepEqual([...(pos?.hijosPrioritarios ?? [])].sort(), ['v-k', 'v-u'])
    assert.equal(pos?.prioridadProvisional, true)
  })
})

// ── D · Banderas con unknown (D03) ───────────────────────────────────────────

describe('§8.2 banderas de un riesgo no evaluable con una dimensión unknown', () => {
  // P unknown → no evaluable (§9.3.1). Econ unknown con máx registrado.
  it('consecuencia_extrema: unknown con máx registrado 5 la dispara, por esa dimensión', () => {
    const d = derivadosCalculados(ficha('X5', fx(u(), [u(5), 1, 1, 1], 3, 3)))
    assert.equal(d.evaluable, 'false')
    assert.equal(d.consecuenciaExtrema, 'true')
    assert.equal(d.consecuenciaExtremaDimensiones, 'econ')
  })

  it('consecuencia_extrema: unknown con máx registrado 4 no alcanza el umbral', () => {
    const d = derivadosCalculados(ficha('X4', fx(u(), [u(4), 1, 1, 1], 3, 3)))
    assert.equal(d.consecuenciaExtrema, 'false')
  })
})

// ── E · Rango económico sin margen: costos directos en el máximo (D01) ──────

describe('§4.2.3 [F5-1] los costos directos entran también en el máximo del rango', () => {
  // RO 2 M, facturación anual 22 M, facturación perdida 1,5 M (75% del RO → 4 sin costos).
  it('1,5 M + 0,5 M de multa = 100% del RO → el máximo es 5 (el corte va arriba)', () => {
    // Mínimo: 0,5 M + 1,5 M × 2/22 ≈ 0,64 M = 32% → 4.
    assert.deepEqual(rangoEconomicoSinMargen({ facturacionPerdida: 1500, costosDirectos: 500, ro: 2000, facturacionAnual: 22000 }), { min: 4, max: 5 })
  })

  it('un peso menos de multa queda en 4: el corte lo cruzan los costos directos', () => {
    assert.deepEqual(rangoEconomicoSinMargen({ facturacionPerdida: 1500, costosDirectos: 499, ro: 2000, facturacionAnual: 22000 }), { min: 4, max: 4 })
  })
})

// ── F · Oráculo de veredicto: una prueba por rama de `juzgar` ────────────────

describe('protocolo §8: ramas de juzgar con fichas sintéticas', () => {
  // T1 = T2: 3 × 4 × 3 = 36, I efectivo 4, I-personas 1 → empate legítimo.
  const T1 = ficha('T1', fx(3, [4, 1, 1, 1], 3, 'no_aplica'))
  const T2 = ficha('T2', fx(3, [4, 1, 1, 1], 3, 'no_aplica'))
  // SC: 1 × 4 × 1 = 4, safety_critical (pers 4), sin consecuencia_extrema.
  const SC = ficha('SC', fx(1, [1, 4, 1, 1], 1, 'no_aplica'))
  // LOW: 1, sin banderas. LOW2: 2 × 1 × 1 = 2.
  const LOW = ficha('LOW', fx(1, [1, 1, 1, 1], 1, 'no_aplica'))
  const LOW2 = ficha('LOW2', fx(2, [1, 1, 1, 1], 1, 'no_aplica'))
  // NV: P unknown, con motivo registrado. NV0: lo mismo, sin motivo registrado.
  const NV = ficha('NV', fx(u(), [1, 1, 1, 1], 1, 'no_aplica'), { motivo: 'P desconocida' })
  const NV0 = ficha('NV0', fx(u(), [1, 1, 1, 1], 1, 'no_aplica'))
  const todas = [T1, T2, SC, LOW, LOW2, NV, NV0]
  const m = { m: ['SX-T1', 'SX-T2', 'SX-SC', 'SX-LOW', 'SX-NV', 'SX-NV0'] }
  const orden = (empate: 'permitido' | 'no_permitido' | 'no_especificado'): Expectativa => ({ tipo: 'orden', momento: 'm', alto: 'T1', bajo: 'T2', empate })
  const uno = (x: Expectativa) => {
    const v = juzgar([x], m, todas)
    const [r] = v.resultados
    assert.ok(r)
    return { v, r }
  }

  it('precondición: T1 y T2 comparten posición', () => {
    assert.deepEqual(ranking([T1, T2]), [P('T1', 'T2')])
  })

  it('empate no permitido → falla de ranking (los dos tienen igual C_raw)', () => {
    const { v, r } = uno(orden('no_permitido'))
    assert.equal(r.estado, 'falla')
    assert.equal(r.categoria, 'ranking')
    assert.equal(v.categoria, 'FAIL — ranking')
  })

  it('empate que la adjudicación no especifica → INDETERMINADO, nunca PASS', () => {
    const { v, r } = uno(orden('no_especificado'))
    assert.equal(r.estado, 'indeterminado')
    assert.equal(v.categoria, 'INDETERMINADO')
  })

  it('empate permitido → cumple', () => {
    assert.equal(uno(orden('permitido')).r.estado, 'cumple')
  })

  it('orden invertido con C_raw distinto → combinación', () => {
    const { r } = uno({ tipo: 'orden', momento: 'm', alto: 'SC', bajo: 'T1', empate: 'no_permitido' })
    assert.equal(r.estado, 'falla')
    assert.equal(r.categoria, 'combinación')
  })

  it('visible sólo por safety_critical → cumple (protocolo §8, vista de seguridad)', () => {
    assert.equal(uno({ tipo: 'visible', momento: 'm', riesgo: 'SC' }).r.estado, 'cumple')
  })

  it('visible por la lista no evaluable sólo si tiene motivo', () => {
    assert.equal(uno({ tipo: 'visible', momento: 'm', riesgo: 'NV' }).r.estado, 'cumple')
    const { r } = uno({ tipo: 'visible', momento: 'm', riesgo: 'NV0' })
    assert.equal(r.estado, 'falla')
    assert.equal(r.categoria, 'ranking')
  })

  it('sin bandera ni lista no evaluable → no visible: falla de ranking', () => {
    const { r } = uno({ tipo: 'visible', momento: 'm', riesgo: 'LOW' })
    assert.equal(r.estado, 'falla')
    assert.equal(r.categoria, 'ranking')
  })

  it('safety_critical esperado y ausente → falla', () => {
    assert.equal(uno({ tipo: 'safety_critical', momento: 'm', riesgo: 'LOW' }).r.estado, 'falla')
    assert.equal(uno({ tipo: 'safety_critical', momento: 'm', riesgo: 'SC' }).r.estado, 'cumple')
  })

  it('movimiento: "igual" no acepta "baja"; "baja" y "sube" sólo en su sentido', () => {
    const mov = (desde: Ficha, hasta: Ficha, sentido: 'baja' | 'sube' | 'igual') =>
      uno({ tipo: 'movimiento', desde: desde.evaluacionId, hasta: hasta.evaluacionId, medida: 'c_raw', sentido }).r.estado
    assert.equal(mov(LOW2, LOW, 'igual'), 'falla')
    assert.equal(mov(LOW2, LOW, 'baja'), 'cumple')
    assert.equal(mov(LOW2, LOW, 'sube'), 'falla')
    assert.equal(mov(LOW, LOW2, 'sube'), 'cumple')
    assert.equal(mov(T1, T2, 'igual'), 'cumple')
    assert.equal(mov(T1, T2, 'baja'), 'falla')
  })

  it('movimiento con una ficha no evaluable → indeterminado', () => {
    const { r } = uno({ tipo: 'movimiento', desde: 'SX-NV', hasta: 'SX-LOW', medida: 'c_raw', sentido: 'baja' })
    assert.equal(r.estado, 'indeterminado')
  })

  // Q1…Q4: C_raw 5, 4, 3, 2 (P 1, econ k, V 1); Q5 1; Q6 2 × 5 × 1 = 10.
  const Q = [5, 4, 3, 2, 1].map((n, j) => ficha(`Q${String(j + 1)}`, fx(1, [n as Nivel, 1, 1, 1], 1, 'no_aplica')))
  const Q0 = ficha('Q0', fx(2, [5, 1, 1, 1], 1, 'no_aplica'))
  const mitad = (ids: readonly Ficha[], riesgo: string) =>
    juzgar([{ tipo: 'no_en_mitad_inferior', momento: 'q', riesgo }], { q: ids.map((f) => f.evaluacionId) }, ids).resultados[0]?.estado

  it('mitad inferior con 4 riesgos: el segundo está arriba, el tercero ya está abajo', () => {
    const cuatro = Q.slice(0, 4)
    assert.equal(mitad(cuatro, 'Q2'), 'cumple')
    assert.equal(mitad(cuatro, 'Q3'), 'falla')
  })

  it('mitad inferior con 6 riesgos: el tercero está arriba, el cuarto ya está abajo', () => {
    const seis = [Q0, ...Q]
    assert.equal(mitad(seis, 'Q2'), 'cumple') // tercero: Q0, Q1 delante
    assert.equal(mitad(seis, 'Q3'), 'falla') // cuarto
  })

  it('categoría principal y secundarias en el orden de protocolo §8', () => {
    const v = juzgar([
      orden('no_especificado'),
      { tipo: 'orden', momento: 'm', alto: 'SC', bajo: 'T1', empate: 'no_permitido' },
      { tipo: 'visible', momento: 'm', riesgo: 'LOW' },
    ], m, todas)
    assert.equal(v.categoria, 'FAIL — combinación')
    assert.deepEqual(v.secundarias, ['FAIL — ranking', 'INDETERMINADO'])
  })

  it('sin criterios ejecutables, el PASS se reporta como no juzgado (sin_orden no cuenta como criterio)', () => {
    const vacio = juzgar([], m, todas)
    assert.equal(vacio.categoria, 'PASS')
    assert.equal(vacio.evidencia, 'sin_criterio_ejecutable')
    const soloSinOrden = juzgar([{ tipo: 'sin_orden', momento: 'm', a: 'T1', b: 'SC' }], m, todas)
    assert.equal(soloSinOrden.categoria, 'PASS')
    assert.equal(soloSinOrden.evidencia, 'sin_criterio_ejecutable')
    assert.equal(soloSinOrden.resultados[0]?.estado, 'no_juzgado')
    assert.equal(juzgar([orden('permitido')], m, todas).evidencia, 'criterios_juzgados')
  })
})

// ── Reglas nuevas de v0.3 y de la v1 candidate [F9] [F11-n] ──────────────────
// Cada test falla con la regla anterior (lo dice el comentario).

describe('§6.5 [F9] bandas 20/50/75 y banda como paso 1 de D10 (CH-093)', () => {
  it('cortes: un C_raw justo en el corte va a la banda superior', () => {
    const casos: [number, string][] = [[1, 'Baja'], [19, 'Baja'], [20, 'Media'], [48, 'Media'], [50, 'Alta'], [64, 'Alta'], [75, 'Crítica'], [125, 'Crítica']]
    for (const [c, b] of casos) assert.equal(banda(c), b, `C_raw ${String(c)}`)
  })

  it('la ficha recibe banda si es evaluable y queda vacía si no (en v0.2 quedaba vacía siempre)', () => {
    // P 2 × econ 5 × V 5 = 50 → Alta.
    const A = ficha('A', fx(2, [5, 1, 1, 1], 5, 'no_aplica'))
    assert.equal(derivadosCalculados(A).banda, 'Alta')
    assert.equal(derivadosCalculados(A, 'v0.2').banda, '')
    const N = ficha('N', fx(u(), [5, 1, 1, 1], 5, 'no_aplica'))
    assert.equal(derivadosCalculados(N).banda, '')
  })

  it('el paso 1 nunca contradice al paso 2: en todos los productos posibles, mayor C_raw ⇒ banda no menor', () => {
    const productos = [...new Set([1, 2, 3, 4, 5].flatMap((p) => [1, 2, 3, 4, 5].flatMap((i) => [1, 2, 3, 4, 5].map((v) => p * i * v))))]
    const it = (cRaw: number) => ({ id: String(cRaw), cRaw, iEfectivo: { n: 1 as Nivel, completo: true, dimensiones: [] }, iPers: 1 as Nivel })
    for (const a of productos) for (const b of productos) {
      if (a > b) assert.ok(BANDAS.indexOf(banda(a)) >= BANDAS.indexOf(banda(b)), `${String(a)} > ${String(b)}`)
      if (a !== b) assert.equal(compararD10(it(a), it(b)), a > b ? 'antes' : 'despues')
    }
  })
})

describe('§4.4 [F11-4] redundancia natural: nivel 1 de continuidad', () => {
  it('una unidad entre muchas equivalentes, sin degradación material: 1, cualquiera sea la duración', () => {
    for (const d of [{ cantidad: 2, unidad: 'dias' }, { cantidad: 3, unidad: 'semanas' }, { cantidad: 6, unidad: 'meses' }] as const) {
      assert.equal(nivelContinuidad(d, { redundanciaNatural: true }), 1, JSON.stringify(d))
    }
    // Con la regla anterior, 3 semanas como degradación menor a la mitad: 4 − 1 = 3.
    assert.equal(nivelContinuidad({ cantidad: 3, unidad: 'semanas' }, { degradacionMenorALaMitad: true }), 3)
  })

  it('sin redundancia natural, la degradación sigue la regla de v0.3', () => {
    assert.equal(nivelContinuidad({ cantidad: 3, unidad: 'semanas' }, { redundanciaNatural: false, degradacionMenorALaMitad: true }), 3)
    assert.equal(nivelContinuidad({ cantidad: 3, unidad: 'semanas' }), 4)
  })
})

describe('§9.2 [F11-7] peor creíble más allá de tres niveles', () => {
  it('la duda plausible decide si es evaluable; el peor creíble va al máx aunque el rango supere tres niveles', () => {
    // Plausible 2–3 con valor más plausible; peor creíble 5.
    assert.equal(valorDefendible({ min: 2, max: 3 }, true), 'evaluable')
    assert.deepEqual(rangoRegistrado({ min: 2, max: 3 }, 5), { min: 2, max: 5 })
    // Con la regla anterior, el rango registrado 2–5 (cuatro niveles) dejaba el factor unknown.
    assert.equal(valorDefendible({ min: 2, max: 5 }, true), 'unknown')
  })

  it('si la duda plausible misma supera tres niveles, sigue unknown', () => {
    assert.equal(valorDefendible({ min: 1, max: 4 }, true), 'unknown')
    assert.deepEqual(rangoRegistrado({ min: 2, max: 4 }), { min: 2, max: 4 })
  })

  it('el factor con valor y máx lejano entra al ranking con su valor; el máx sólo sube el techo', () => {
    // P 3, econ 2 [2–5], V 3: C_raw 3×2×3 = 18 (Baja); techo 3×5×3 = 45.
    const W = ficha('W', fx(3, [{ valor: 2, min: 2, max: 5 }, 1, 1, 1], 3, 3))
    const d = derivadosCalculados(W)
    assert.deepEqual([d.evaluable, d.cRaw, d.banda, d.techoPlausible], ['true', '18', 'Baja', '45'])
    // Registrado como unknown [2–5] (regla anterior), el mismo riesgo no es evaluable: cota 45 > C_raw 9.
    const W03 = ficha('W03', fx(3, [{ valor: 'unknown', min: 2, max: 5 }, 1, 1, 1], 3, 3))
    assert.equal(derivadosCalculados(W03).evaluable, 'false')
  })
})

describe('§1.4.5 hijo no evaluable de un padre con posición', () => {
  it('el hijo no evaluable entra en la lista "no evaluable" con su motivo, y el padre queda provisional', () => {
    const PADRE = 'PZ'
    const padre = ficha(PADRE, fx(u(), [u(), u(), u(), u()], u(), 'no_aplica'), { tipo: 'padre' })
    const h1 = ficha('PZ-a', fx(3, [4, 1, 1, 1], 3, 3), { tipo: 'sub_riesgo', padre: PADRE })
    const h2 = ficha('PZ-b', fx(u(), [5, 1, 1, 1], 3, 3), { tipo: 'sub_riesgo', padre: PADRE })
    const r = rankingPrincipal([padre], [padre, h1, h2])
    assert.deepEqual(r.noEvaluables, [{ riskId: 'PZ-b', motivo: 'p_unknown' }])
    assert.deepEqual(r.padres.get(PADRE), { hijosPrioritarios: ['PZ-a'], prioridadProvisional: true })
    assert.equal(r.items.get(PADRE)?.cRaw, 36)
  })

  it('si ningún hijo es evaluable, entran los hijos y el padre, sin posición', () => {
    const PADRE = 'PW'
    const padre = ficha(PADRE, fx(u(), [u(), u(), u(), u()], u(), 'no_aplica'), { tipo: 'padre' })
    const h = ficha('PW-a', fx(u(), [5, 1, 1, 1], 3, 3), { tipo: 'sub_riesgo', padre: PADRE })
    const r = rankingPrincipal([padre], [padre, h])
    assert.deepEqual(r.noEvaluables.map((x) => x.riskId), ['PW-a', PADRE])
    assert.equal(r.posiciones.length, 0)
  })
})

describe('§9.5 cola de validación (orden 1 safety posible → 2 cota de validación → 3 I-personas máximo)', () => {
  // Q1: no evaluable (P unknown), pers 2, econ 5 → no safety; cota 5×5×3 = 75.
  const Q1 = ficha('Q1', fx(u(), [5, 2, 1, 1], 3, 3))
  // Q2: evaluable con pers unknown máx 4 → safety posible; cota baja (1×4×1 = 4).
  const Q2 = ficha('Q2', fx(1, [4, u(4), 1, 1], 1, 1))
  // Q3: evaluable, todo conocido, uncertainty high, pers 1; cota 4×4×4 = 64.
  const Q3 = ficha('Q3', fx(4, [4, 1, 1, 1], 4, 4), { uncertainty: 'high' })
  // Q4: evaluable, todo conocido, uncertainty low → no entra.
  const Q4 = ficha('Q4', fx(5, [5, 5, 5, 5], 5, 5))
  // Q5: igual cota que Q3 (64) por legal, con pers máx 3 > 1 → va antes que Q3 en el paso 3.
  const Q5 = ficha('Q5', fx(4, [1, { valor: 2, min: 2, max: 3 }, 1, 4], 4, u(4)))

  it('entran los no evaluables y los evaluables con unknown o uncertainty high; se ordenan por los tres pasos', () => {
    assert.deepEqual(colaValidacion([Q4, Q3, Q1, Q5, Q2].map(entrada)), ['Q2', 'Q1', 'Q5', 'Q3'])
  })

  it('la cota de validación es el techo plausible (§6.6 [F11-10]) y no cambia el ranking', () => {
    const r = rankingPrincipal([Q3, Q5], [Q3, Q5])
    // Mismo C_raw (64) y misma banda: el orden del ranking no lo decide la cola.
    assert.equal(r.items.get('Q3')?.cRaw, 64)
    assert.equal(r.items.get('Q5')?.cRaw, 64)
  })
})

// ── [F11-6] [F11-5] Lecturas que Emiliano decidió en la 11a (2026-10-11 12:18 UTC) ──
// Eran `todo` del arnés v0.2 (REMEDIATION §8). Cada test afirma la regla decidida y, donde la
// regla anterior daba otro resultado, que la anterior lo daba: si se revierte, falla.

describe('lecturas de v0.2 que la v1 candidate decide (EV-16, EV-18)', () => {
  it('B01 · §3.3 ancla 5 [F11-6]: la ocurrencia de hace exactamente 36 meses cuenta para la frecuencia', () => {
    // Tres ocurrencias en 36 meses, incluida la de hace 36 → una por año → 5.
    assert.equal(nivelPorAntecedentes([3, 15, 36], 120), 5)
    // La de hace 37 ya no cuenta para la frecuencia: dos en la ventana → 4.
    assert.equal(nivelPorAntecedentes([3, 15, 37], 120), 4)
  })

  it('a · §8.2 [F11-5]: un unknown sin máx registrado no dispara banderas (lo prioriza la cola)', () => {
    const Y = ficha('Y', fx(u(), [u(), u(), 1, 1], 3, 3))
    const d = derivadosCalculados(Y)
    assert.deepEqual([d.consecuenciaExtrema, d.safetyCritical], ['false', 'false'])
    // Y no es evaluable (P unknown) y podría ser safety_critical: entra primero a la cola (§9.5).
    const Z = ficha('Z', fx(1, [4, 1, u(5), 1], 5, 1))
    assert.deepEqual(colaValidacion([Z, Y].map(entrada)), ['Y', 'Z'])
  })

  it('a′ · §8.2 [F11-5]: en un riesgo evaluable, un unknown con máx 5 dispara consecuencia_extrema', () => {
    // Evaluable: econ 1×4×3 = 12 (c 5, r 1); cota de cont 1×5×1 = 5.
    const Z = ficha('Z', fx(1, [4, 1, u(5), 1], 5, 1))
    const d = derivadosCalculados(Z)
    assert.equal(d.evaluable, 'true')
    assert.equal(d.consecuenciaExtrema, 'true')
    assert.equal(d.consecuenciaExtremaDimensiones, 'cont')
    // Con la regla v0.3 (CH-092: sólo en no evaluables) no disparaba.
    assert.equal(derivadosCalculados(Z, 'v0.3').consecuenciaExtrema, 'false')
  })

  it('a′ · §8.2 [F11-5]: en un riesgo evaluable, i_pers unknown con máx 4 dispara safety_critical', () => {
    // Evaluable: econ 2×4×3 = 24; cota de pers 2×4×3 = 24 ≤ 24.
    const S = ficha('S', fx(2, [4, u(4), 1, 1], 3, 3))
    assert.equal(derivadosCalculados(S).evaluable, 'true')
    assert.equal(derivadosCalculados(S).safetyCritical, 'true')
    assert.equal(derivadosCalculados(S, 'v0.3').safetyCritical, 'false')
  })

  it('D20 · el máx de un factor con valor no dispara bandera: sólo el valor (o el máx de un unknown)', () => {
    // [F11-7] econ 2 con peor creíble 5 registrado en el máx: evaluable, techo 5, sin bandera.
    // Lectura aplicada mientras Emiliano decide el alcance de "y las banderas" de §9.2 (reporte-fase-11).
    const W = ficha('W', fx(3, [{ valor: 2, min: 2, max: 5 }, { valor: 3, min: 3, max: 4 }, 1, 1], 3, 3))
    const d = derivadosCalculados(W)
    assert.equal(d.evaluable, 'true')
    assert.equal(d.consecuenciaExtrema, 'false')
    assert.equal(d.safetyCritical, 'false')
    assert.equal(d.techoPlausible, String(3 * 5 * 3))
  })

  it('b · §6.2 [F11-6] (U07): con una cota igual a C_raw, la dimensión unknown no se lista como determinante', () => {
    // econ 3×3×3 = 27 = cota de legal 3×3×3.
    const e = evaluar(fx(3, [3, 2, 2, u(3)], 3, 3))
    assert.ok(e.evaluable)
    assert.equal(e.cPorDimension.legal, e.cRaw)
    assert.deepEqual(e.determinantes, ['econ'])
  })

  it('c · §7.2 [F11-6]: ≥ n se acota con el máx registrado del unknown; ≥ 4 con máx 3 contra 4 es empate legítimo', () => {
    const a = { id: 'a', cRaw: 36, iEfectivo: iEfectivo(fx(3, [4, 1, u(3), 1], 5, 1).i), iPers: 1 as Nivel }
    const b = { id: 'b', cRaw: 36, iEfectivo: { n: 4 as Nivel, completo: true, dimensiones: ['econ' as const] }, iPers: 1 as Nivel }
    assert.equal(compararD10(a, b), 'empate')
    // Con la regla v0.3, el mismo par era indeterminado (posición provisional).
    const a03 = { ...a, iEfectivo: iEfectivo(fx(3, [4, 1, u(3), 1], 5, 1).i, 'v0.3') }
    assert.equal(compararD10(a03, b), 'indeterminado')
    // Con máx mayor que n, sigue `≥ n` e indeterminado: [F11-6] sólo acota el máx ≤ n.
    const a5 = { ...a, iEfectivo: iEfectivo(fx(3, [4, 1, u(5), 1], 5, 1).i) }
    assert.equal(compararD10(a5, b), 'indeterminado')
  })
})

// ── Fuera de v1 (EV-44, salida d aprobada en bloque el 2026-10-11) ───────────
// Son criterios para juzgar casos de propiedad (protocolo §8), no reglas de la metodología.
// Quedan `todo`: corren y muestran la lectura actual del arnés sin decidir el veredicto.

describe('criterios del juez de casos fuera de v1 (EV-44): esperan una decisión de Emiliano sobre protocolo §8', () => {
  it('J01 · protocolo §8: con 5 riesgos, ¿el tercero está en la mitad inferior?', {
    todo: 'Fuera de v1 (EV-44). Espera que Emiliano decida protocolo §8, mitad inferior con n impar. El arnés lee "las dos últimas" (README #10); con floor serían las tres últimas. Con n par las dos lecturas coinciden y sí se afirma.',
  }, () => {
    const cinco = [5, 4, 3, 2, 1].map((n, j) => ficha(`C${String(j + 1)}`, fx(1, [n as Nivel, 1, 1, 1], 1, 'no_aplica')))
    const v = juzgar([{ tipo: 'no_en_mitad_inferior', momento: 'c', riesgo: 'C3' }], { c: cinco.map((f) => f.evaluacionId) }, cinco)
    assert.equal(v.resultados[0]?.estado, 'cumple')
  })

  it('e · protocolo §8: ¿qué categoría lleva una falla de "mitad inferior" o de "movimiento"?', {
    todo: 'Fuera de v1 (EV-44). Espera que Emiliano decida protocolo §8, categoría de estas fallas. §8 define combinación/ranking por c_raw entre dos riesgos ordenados; para estos criterios el arnés elige combinación (mitad) y c_raw igual/distinto (movimiento).',
  }, () => {
    const cuatro = [5, 4, 3, 2].map((n, j) => ficha(`D${String(j + 1)}`, fx(1, [n as Nivel, 1, 1, 1], 1, 'no_aplica')))
    const v = juzgar([{ tipo: 'no_en_mitad_inferior', momento: 'd', riesgo: 'D4' }], { d: cuatro.map((f) => f.evaluacionId) }, cuatro)
    assert.equal(v.resultados[0]?.categoria, 'combinación')
  })
})
