// Lectura de una organización de punta a punta: historia, vigente (8a), ranking (D10, padre,
// no evaluables) y las propiedades de §14 y reglas de RO01 §3 que dependen de más de un riesgo.
// Los casos de D10, unknown y padre vienen de `regresion-ejecutable/sinteticos.test.ts` del
// spike: cada esperado está escrito con su aritmética en el comentario, no sale de las funciones.

import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { colaDeValidacion, derivados, historia, numeroDePosicion, rankingOrganizacion, vigente } from './lectura.ts'
import { banda, type Factor, type Factores, type Nivel, type Recuperacion, type Uncertainty } from './metodologia.ts'
import { VERSION_METODOLOGIA, type Evaluacion, type ReviewStatus, type Riesgo, type TipoObjeto, type VersionFunciones } from './modelo.ts'
import { leerArchivo, LOTE_EMI41, loteDe, SINTETICOS } from '../testing/sinteticos.ts'

const V1 = VERSION_METODOLOGIA

type F = Nivel | Factor<Nivel>
const k = (x: F): Factor<Nivel> => (typeof x === 'number' ? { valor: x } : x)
const u = (max?: Nivel): Factor<Nivel> => (max === undefined ? { valor: 'unknown' } : { valor: 'unknown', max })
function fx(p: F, i: readonly [F, F, F, F], vCont: F, vRec: Recuperacion | Factor<Nivel>): Factores {
  return { p: k(p), i: { econ: k(i[0]), pers: k(i[1]), cont: k(i[2]), legal: k(i[3]) }, vCont: k(vCont), vRec: typeof vRec === 'object' ? vRec : { valor: vRec } }
}

const ORG = 'ORG-A'
const riesgo = (id: string, tipoObjeto: TipoObjeto = 'riesgo', o: { padre?: string; miembros?: string[]; org?: string } = {}): Riesgo =>
  ({ id, organizacionId: o.org ?? ORG, tipoObjeto, riesgoPadreId: o.padre ?? null, miembros: o.miembros ?? [] })
const ev = (id: string, riskId: string, factores: Factores, o: { anterior?: string; review?: ReviewStatus; uncertainty?: Uncertainty } = {}): Evaluacion => ({
  id, riskId, factores, tipo: o.anterior === undefined ? 'inicial' : 'reevaluacion', anteriorId: o.anterior ?? null,
  uncertainty: o.uncertainty ?? 'low', reviewStatus: o.review ?? 'pending',
})

/** Una organización de riesgos con una sola evaluación cada uno. */
function org(casos: readonly (readonly [Riesgo, Factores | null])[]): { riesgos: Riesgo[]; evaluaciones: Evaluacion[] } {
  return {
    riesgos: casos.map(([r]) => r),
    evaluaciones: casos.flatMap(([r, f]) => (f === null ? [] : [ev(`EV-${r.id}`, r.id, f)])),
  }
}
const ordenar = (posiciones: readonly { ids: string[]; provisional: boolean }[]) =>
  posiciones.map((p) => ({ ids: [...p.ids].sort(), provisional: p.provisional }))
/** El ranking con la entrada invertida tiene que ser el mismo: no depende del orden de carga. */
function rankingEstable(casos: readonly (readonly [Riesgo, Factores | null])[]) {
  const a = org(casos)
  const b = org([...casos].reverse())
  const r = ordenar(rankingOrganizacion(V1, a.riesgos, a.evaluaciones).posiciones)
  assert.deepEqual(ordenar(rankingOrganizacion(V1, b.riesgos, b.evaluaciones).posiciones), r, 'el orden de entrada cambió el ranking')
  return r
}
const P = (...ids: string[]) => ({ ids: [...ids].sort(), provisional: false })
const PROV = (...ids: string[]) => ({ ids: [...ids].sort(), provisional: true })

// ── Historia y vigente ───────────────────────────────────────────────────────

describe('historia y evaluación vigente (decisiones 8 y 8a)', () => {
  const f = fx(3, [3, 1, 1, 1], 3, 3)
  const e1 = ev('E1', 'R', f, { review: 'accepted' })
  const e2 = ev('E2', 'R', f, { anterior: 'E1' })
  const e3 = ev('E3', 'R', f, { anterior: 'E2', review: 'rejected' })

  it('la historia es la cadena desde la inicial, sin importar el orden de carga', () => {
    assert.deepEqual(historia([e3, e1, e2], 'R').map((e) => e.id), ['E1', 'E2', 'E3'])
  })

  it('una historia ramificada, dos iniciales o una evaluación suelta son un error', () => {
    assert.throws(() => historia([e1, e2, ev('E2b', 'R', f, { anterior: 'E1' })], 'R'), /ramificada en E1/)
    assert.throws(() => historia([e1, ev('E0', 'R', f)], 'R'), /2 evaluaciones iniciales/)
    assert.throws(() => historia([e1, ev('E9', 'R', f, { anterior: 'NO' })], 'R'), /fuera de la cadena/)
  })

  it('vigente: la última accepted; una posterior pending no la reemplaza', () => {
    assert.equal(vigente(historia([e1, e2], 'R'))?.id, 'E1')
  })

  it('vigente: sin accepted, la última no rechazada', () => {
    const a = ev('A1', 'S', f)
    const b = ev('A2', 'S', f, { anterior: 'A1' })
    const c = ev('A3', 'S', f, { anterior: 'A2', review: 'rejected' })
    assert.equal(vigente(historia([a, b, c], 'S'))?.id, 'A2')
    assert.equal(vigente([ev('X', 'T', f, { review: 'rejected' })]), undefined)
  })

  it('§14 propiedad 6: una reevaluación por cambio de versión no sobrescribe la anterior', () => {
    const antes = historia([e1, e2], 'R')
    const congelada = JSON.stringify(antes)
    const nueva = ev('E3v', 'R', fx(4, [3, 1, 1, 1], 3, 3), { anterior: 'E2' })
    const despues = historia([e1, e2, nueva], 'R')
    assert.deepEqual(despues.slice(0, 2), antes)
    assert.equal(JSON.stringify(antes), congelada)
    assert.equal(despues.at(-1), nueva)
  })
})

// ── Derivados y versión ──────────────────────────────────────────────────────

describe('derivados con la versión de las funciones (RO01 §3, reglas 1 y 7)', () => {
  it('cada resultado lleva la versión y el vector del que salió', () => {
    const f = fx(2, [5, 1, 1, 1], 5, 'no_aplica') // 2 × 5 × 5 = 50 → Alta
    const d = derivados(V1, f)
    assert.equal(d.version, 'metodologia v1')
    assert.equal(d.factores, f)
    assert.deepEqual([d.cRaw, d.banda, d.consecuenciaExtrema, d.safetyCritical], [50, 'Alta', ['econ'], false])
    const r = rankingOrganizacion(V1, [riesgo('A')], [ev('E', 'A', f)])
    assert.equal(r.version, 'metodologia v1')
  })

  it('un no evaluable no tiene C_raw ni banda', () => {
    const d = derivados(V1, fx(u(), [5, 1, 1, 1], 5, 'no_aplica'))
    assert.deepEqual([d.cRaw, d.banda, d.evaluabilidad.evaluable], [null, null, false])
  })

  it('una versión que no es la v1 no se calcula', () => {
    assert.throws(() => derivados('metodologia v0.3' as VersionFunciones, fx(1, [1, 1, 1, 1], 1, 1)), /versión de funciones desconocida/)
    assert.throws(() => rankingOrganizacion('v1.1' as VersionFunciones, [riesgo('A')], []), /versión de funciones desconocida/)
  })
})

// ── Una sola organización ────────────────────────────────────────────────────

describe('el orden es siempre dentro de una organización (§7.1.4, RO01 §3, regla 4)', () => {
  it('un ranking con riesgos de dos organizaciones falla', () => {
    const f = fx(3, [3, 1, 1, 1], 3, 3)
    assert.throws(() => rankingOrganizacion(V1, [riesgo('A'), riesgo('B', 'riesgo', { org: 'ORG-B' })], [ev('EA', 'A', f), ev('EB', 'B', f)]),
      /una sola organización/)
  })

  it('una evaluación de un riesgo que no está en la organización falla', () => {
    assert.throws(() => rankingOrganizacion(V1, [riesgo('A')], [ev('EB', 'B', fx(3, [3, 1, 1, 1], 3, 3))]), /no está en la organización/)
  })
})

// ── §7.2 D10 de punta a punta ────────────────────────────────────────────────

describe('§7.2 D10: orden exacto de los pasos después de C_raw', () => {
  // A: P 4 × econ 5 × V 3 = 60; I efectivo 5; I-personas 1.
  const A = [riesgo('A'), fx(4, [5, 1, 1, 1], 3, 'no_aplica')] as const
  // B: P 3 × pers 4 × V 5 = 60; I efectivo 4; I-personas 4.
  const B = [riesgo('B'), fx(3, [1, 4, 1, 1], 5, 'no_aplica')] as const

  it('igual C_raw, criterios cruzados: I efectivo (paso 3) decide antes que I-personas (paso 4)', () => {
    assert.deepEqual(rankingEstable([B, A]), [P('A'), P('B')])
  })

  it('el paso 3 usa I efectivo (máximo de las dimensiones), no el I de la dimensión determinante', () => {
    // G: econ 3×5×3 = 45, pers 3×4×5 = 60 → C_raw 60 por personas (I 4), pero I efectivo 5.
    const G = [riesgo('G'), fx(3, [5, 4, 1, 1], 5, 1)] as const
    assert.deepEqual(rankingEstable([B, G]), [P('G'), P('B')])
  })

  // P 3, V 3: C_raw 36 por una dimensión en 4, I efectivo 4.
  const ancho = [riesgo('ancho'), fx(3, [4, 1, 4, 4], 3, 'no_aplica')] as const
  const angosto = [riesgo('angosto'), fx(3, [4, 1, 1, 1], 3, 'no_aplica')] as const
  const personas = [riesgo('personas'), fx(3, [4, 2, 1, 1], 3, 'no_aplica')] as const

  it('sin desempate por amplitud: empate legítimo', () => {
    assert.deepEqual(rankingEstable([ancho, angosto]), [P('ancho', 'angosto')])
  })

  it('sólo I-personas rompe el empate, aunque el otro tenga más amplitud', () => {
    assert.deepEqual(rankingEstable([ancho, angosto, personas]), [P('personas'), P('ancho', 'angosto')])
  })

  it('numeroDePosicion cuenta los riesgos por delante, como regresion-emi41.csv', () => {
    const o = org([ancho, angosto, personas, A])
    const r = rankingOrganizacion(V1, o.riesgos, o.evaluaciones)
    assert.deepEqual(['A', 'personas', 'ancho', 'angosto', 'x'].map((id) => numeroDePosicion(r, id)), [1, 2, 3, 3, null])
  })
})

describe('§9.3 y §7.2 [F5-6]: unknown desde los factores hasta el ranking', () => {
  // U: P 3, I (4, 1, unknown máx 5, 1), c 5, r 1. Conocidas: econ 3×4×3 = 36. Cota de cont 3×5×1 = 15.
  const U = [riesgo('U'), fx(3, [4, 1, u(5), 1], 5, 1)] as const
  // K: econ 3×4×3 = 36; I efectivo 4 completo.
  const K = [riesgo('K'), fx(3, [4, 1, 1, 1], 3, 3)] as const
  // L: P 4 × econ 3 × V 3 = 36; I efectivo 3.
  const L = [riesgo('L'), fx(4, [3, 1, 1, 1], 3, 'no_aplica')] as const

  it('≥ 4 contra 4 completo con igual C_raw: posición común provisional', () => {
    assert.deepEqual(rankingEstable([K, U]), [PROV('K', 'U')])
  })

  it('≥ 4 contra 3 con igual C_raw: decide sin depender de lo desconocido', () => {
    assert.deepEqual(rankingEstable([L, U]), [P('U'), P('L')])
  })

  it('el bloque provisional no arrastra a los riesgos de otro C_raw', () => {
    const M = [riesgo('M'), fx(5, [4, 1, 1, 1], 2, 'no_aplica')] as const // 5×4×2 = 40
    assert.deepEqual(rankingEstable([K, U, M]), [P('M'), PROV('K', 'U')])
  })

  it('un no evaluable va a la lista aparte, con su motivo', () => {
    const E4 = [riesgo('E4'), fx(3, [3, 2, 2, u(4)], 3, 3)] as const // cota legal 36 > 27
    const N = [riesgo('N'), null] as const
    const o = org([E4, N, K])
    const r = rankingOrganizacion(V1, o.riesgos, o.evaluaciones)
    assert.deepEqual(r.noEvaluables, [{ riskId: 'E4', motivo: 'cota_supera_c_raw' }, { riskId: 'N', motivo: 'sin evaluación vigente' }])
    assert.deepEqual(ordenar(r.posiciones), [P('K')])
  })
})

// ── §1.4 padre (§14 propiedad 2) ─────────────────────────────────────────────

describe('§1.4 [F5-3] padre: se muestra con el hijo que gana por D10, sin score propio', () => {
  const sub = (id: string, padre = 'PX') => riesgo(id, 'sub_riesgo', { padre })
  // h1: 4×5×3 = 60, I efectivo 5, I-personas 1. h2: 3×4×5 = 60, I efectivo 4. h3: 1×5×4 = 20.
  // El roll-up prohibido (máx P 4 × máx I 5 × máx V 5) daría 100.
  const casos: [Riesgo, Factores | null][] = [
    [riesgo('arriba'), fx(3, [5, 1, 1, 1], 5, 'no_aplica')], // 75
    [riesgo('par'), fx(4, [5, 2, 1, 1], 3, 'no_aplica')], // 60, I 5, I-personas 2
    [riesgo('PX', 'padre'), null],
    [riesgo('abajo'), fx(3, [3, 1, 1, 1], 5, 'no_aplica')], // 45
    [sub('h2'), fx(3, [1, 4, 1, 1], 5, 'no_aplica')],
    [sub('h3'), fx(1, [1, 5, 1, 1], 4, 'no_aplica')],
    [sub('h1'), fx(4, [5, 1, 1, 1], 3, 'no_aplica')],
  ]

  it('el hijo prioritario sale de D10 (paso 3), y el padre compite con su ítem exacto', () => {
    const o = org(casos)
    const r = rankingOrganizacion(V1, o.riesgos, o.evaluaciones)
    assert.deepEqual(r.padres.get('PX'), { hijosPrioritarios: ['h1'], prioridadProvisional: false })
    assert.deepEqual(r.items.get('PX'), { id: 'PX', cRaw: 60, iEfectivo: { n: 5, completo: true, dimensiones: ['econ'] }, iPers: 1 })
  })

  it('posición: debajo del par de igual C_raw e I efectivo con más I-personas; los sub-riesgos no entran (§14 propiedad 5)', () => {
    assert.deepEqual(rankingEstable(casos), [P('arriba'), P('par'), P('PX'), P('abajo')])
  })

  it('un padre con evaluación propia es un error (§1.4)', () => {
    const o = org(casos)
    assert.throws(() => rankingOrganizacion(V1, o.riesgos, [...o.evaluaciones, ev('EPX', 'PX', fx(1, [1, 1, 1, 1], 1, 1))]), /un padre no tiene evaluación propia/)
  })

  it('hijos con paso 3 indeterminado: los dos se muestran y la prioridad queda provisional', () => {
    const o = org([[riesgo('PV', 'padre'), null], [sub('v-u', 'PV'), fx(3, [4, 1, u(5), 1], 5, 1)], [sub('v-k', 'PV'), fx(3, [4, 1, 1, 1], 3, 3)]])
    const pos = rankingOrganizacion(V1, o.riesgos, o.evaluaciones).padres.get('PV')
    assert.deepEqual([...(pos?.hijosPrioritarios ?? [])].sort(), ['v-k', 'v-u'])
    assert.equal(pos?.prioridadProvisional, true)
  })

  it('§1.4.5: el hijo no evaluable va a la lista no evaluable y el padre queda provisional', () => {
    const o = org([[riesgo('PZ', 'padre'), null], [sub('PZ-a', 'PZ'), fx(3, [4, 1, 1, 1], 3, 3)], [sub('PZ-b', 'PZ'), fx(u(), [5, 1, 1, 1], 3, 3)]])
    const r = rankingOrganizacion(V1, o.riesgos, o.evaluaciones)
    assert.deepEqual(r.noEvaluables, [{ riskId: 'PZ-b', motivo: 'p_unknown' }])
    assert.deepEqual(r.padres.get('PZ'), { hijosPrioritarios: ['PZ-a'], prioridadProvisional: true })
    assert.equal(r.items.get('PZ')?.cRaw, 36)
  })

  it('si ningún hijo es evaluable, entran los hijos y el padre, sin posición', () => {
    const o = org([[riesgo('PW', 'padre'), null], [sub('PW-a', 'PW'), fx(u(), [5, 1, 1, 1], 3, 3)]])
    const r = rankingOrganizacion(V1, o.riesgos, o.evaluaciones)
    assert.deepEqual(r.noEvaluables.map((x) => x.riskId), ['PW-a', 'PW'])
    assert.equal(r.posiciones.length, 0)
  })
})

// ── Sobre las 8 sintéticas ───────────────────────────────────────────────────

const lote = loteDe(leerArchivo(new URL('risks.csv', SINTETICOS)))
const organizaciones = [...new Set(lote.riesgos.map((r) => r.organizacionId))]
function rankingDe(orgId: string, evaluaciones = lote.evaluaciones, riesgos = lote.riesgos) {
  const rs = riesgos.filter((r) => r.organizacionId === orgId)
  const ids = new Set(rs.map((r) => r.id))
  return rankingOrganizacion(V1, rs, evaluaciones.filter((e) => ids.has(e.riskId)))
}
/** Lo que el ranking muestra: posiciones con su provisionalidad, y la banda de cada riesgo con posición. */
function foto(orgId: string, evaluaciones = lote.evaluaciones) {
  const r = rankingDe(orgId, evaluaciones)
  return { posiciones: ordenar(r.posiciones), bandas: [...r.items].map(([id, x]) => [id, banda(x.cRaw)]).sort() }
}
/** Cambia, en cada factor con valor de cada evaluación, sólo su rango registrado. */
function conRangos(cambio: (valor: Nivel) => { min?: Nivel; max?: Nivel }): Evaluacion[] {
  const r = (f: Factor<Nivel>): Factor<Nivel> => (f.valor === 'unknown' ? f : { valor: f.valor, ...cambio(f.valor) })
  return lote.evaluaciones.map((e) => {
    const f = e.factores
    const vRec = f.vRec.valor === 'unknown' || f.vRec.valor === 'no_aplica' ? f.vRec : { valor: f.vRec.valor, ...cambio(f.vRec.valor) }
    return { ...e, factores: { p: r(f.p), i: { econ: r(f.i.econ), pers: r(f.i.pers), cont: r(f.i.cont), legal: r(f.i.legal) }, vCont: r(f.vCont), vRec } }
  })
}

describe('propiedades y reglas de presentación sobre las 8 sintéticas', () => {
  it('8 organizaciones, ningún sub-riesgo ni escenario en un ranking (§14 propiedad 5)', () => {
    assert.equal(organizaciones.length, 8)
    for (const o of organizaciones) {
      const r = rankingDe(o)
      const ids = r.posiciones.flatMap((p) => p.ids)
      for (const id of ids) {
        assert.ok(['riesgo', 'padre'].includes(lote.riesgos.find((x) => x.id === id)?.tipoObjeto ?? ''), id)
      }
    }
  })

  it('un escenario por causa común nunca modifica a sus miembros (§14 propiedad 5)', () => {
    const escenarios = lote.riesgos.filter((r) => r.tipoObjeto === 'escenario')
    assert.ok(escenarios.length >= 1)
    for (const esc of escenarios) {
      assert.ok(esc.miembros.length >= 2)
      const con = rankingDe(esc.organizacionId)
      const sin = rankingDe(esc.organizacionId, lote.evaluaciones.filter((e) => e.riskId !== esc.id), lote.riesgos.filter((r) => r.id !== esc.id))
      assert.deepEqual(ordenar(sin.posiciones), ordenar(con.posiciones))
      for (const m of esc.miembros) assert.deepEqual(sin.vigentes.get(m), con.vigentes.get(m), m)
    }
  })

  it('RO01 §3 regla 3: cambiar el techo (los <f>_max de factores con valor) no cambia ninguna posición ni banda', () => {
    const variantes = [conRangos(() => ({})), conRangos((v) => ({ min: v, max: 5 })), conRangos((v) => ({ min: 1, max: v }))]
    let techosDistintos = 0
    for (const o of organizaciones) {
      const ref = foto(o)
      for (const evs of variantes) {
        assert.deepEqual(foto(o, evs), ref, o)
        const vig = rankingDe(o, evs).vigentes
        for (const [id, e] of rankingDe(o).vigentes) {
          const otra = vig.get(id)
          if (otra !== undefined && derivados(V1, otra.factores).techoPlausible !== derivados(V1, e.factores).techoPlausible) techosDistintos++
        }
      }
    }
    assert.ok(techosDistintos > 50, `precondición: las variantes cambian el techo (${String(techosDistintos)})`)
  })

  it('RO01 §3 regla 5: encender las banderas sin cambiar factores no cambia ninguna posición ni banda', () => {
    // [F11-7] opción c: un peor creíble a más de tres niveles del valor dispara las banderas.
    // Con min = valor y max = 5, todo valor ≤ 2 queda con un peor creíble de 5.
    const evs = conRangos((v) => ({ min: v, max: 5 }))
    let encendidas = 0
    for (const o of organizaciones) {
      assert.deepEqual(foto(o, evs), foto(o), o)
      const antes = rankingDe(o).vigentes
      for (const [id, e] of rankingDe(o, evs).vigentes) {
        const a = antes.get(id)
        if (a === undefined) continue
        const [da, de] = [derivados(V1, a.factores), derivados(V1, e.factores)]
        if (da.safetyCritical !== de.safetyCritical || da.consecuenciaExtrema.length !== de.consecuenciaExtrema.length) encendidas++
      }
    }
    assert.ok(encendidas > 20, `precondición: las banderas cambian (${String(encendidas)})`)
  })

  it('cola de validación: sólo de una organización, sobre sus vigentes', () => {
    for (const o of organizaciones) {
      const r = rankingDe(o)
      const cola = colaDeValidacion(V1, r)
      for (const id of cola) assert.equal(lote.riesgos.find((x) => x.id === id)?.organizacionId, o)
      for (const x of r.noEvaluables) if (r.vigentes.has(x.riskId)) assert.ok(cola.includes(x.riskId), `${x.riskId} no evaluable fuera de la cola`)
    }
  })

  it('las filas de EMI-41 siguen siendo el lote del oráculo', () => {
    const emi41 = loteDe(leerArchivo(new URL('risks.csv', SINTETICOS)).filter((f) => f.lote_origen === LOTE_EMI41))
    assert.equal(emi41.riesgos.length, 59)
  })
})
