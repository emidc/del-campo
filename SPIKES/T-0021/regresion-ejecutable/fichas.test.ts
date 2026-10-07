// Las 51 fichas de F5-REG-01 contra la capa de referencia: cada derivado registrado se
// recalcula desde los factores registrados. Los factores no se recalculan (son juicio del
// evaluador); lo que se exige es que lo derivado salga de ellos con las reglas de v0.2.

import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { fichasF5, historialF4, RUTA_FICHAS_F4, leerCsv, type Ficha } from './fichas.ts'
import { DIMENSIONES, evaluar, vPorDimension, type Nivel } from './metodologia.ts'
import { discrepancias, mismosFactores, rankingPrincipal, type Discrepancia } from './verificacion.ts'

const fichas = fichasF5()
const historial = historialF4()

function ficha(id: string): Ficha {
  const f = fichas.find((x) => x.evaluacionId === id)
  if (f === undefined) throw new Error(`falta ${id}`)
  return f
}

/**
 * Derivados registrados que no coinciden con lo que la regla da. Se conservan como evidencia:
 * no se corrige la ficha ni se relaja la regla. Si aparece una nueva, o una de éstas
 * desaparece, el test falla y hay que mirarla.
 */
const DISCREPANCIAS_CONOCIDAS: readonly (Discrepancia & { porque: string })[] = [
  {
    evaluacionId: 'EV-0066', campo: 'consecuenciaExtremaDimensiones', registrado: 'cont', calculado: 'econ;cont',
    porque: 'F5-1 llevó i_econ de unknown a 5 y la lista de dimensiones no se actualizó; el booleano está bien (cont ya era 5).',
  },
  {
    evaluacionId: 'EV-0067', campo: 'consecuenciaExtremaDimensiones', registrado: 'cont', calculado: 'econ;cont',
    porque: 'Ídem EV-0066 (CP-06 R2).',
  },
  {
    evaluacionId: 'EV-0071', campo: 'vAspectosAplicables', registrado: 'econ:cont,rec;pers:cont;cont:cont,rec;legal:cont',
    calculado: 'econ:cont,rec(secuencial);pers:cont;cont:cont,rec(secuencial);legal:cont',
    porque: 'CP-08 R2 (no evaluable, V unknown) conserva el formato de protocolo v0.1; protocolo v0.2 §2.3 pide "(secuencial)". Sin efecto en ningún resultado.',
  },
]

describe('F5-REG-01: forma de la corrida', () => {
  it('51 fichas, todas de metodologia v0.2, con motivo cambio_version_metodologia y pendientes de revisión', () => {
    assert.equal(fichas.length, 51)
    for (const f of fichas) {
      assert.equal(f.versionMetodologia, 'metodologia v0.2 (candidata)', f.evaluacionId)
      assert.equal(f.motivo, 'cambio_version_metodologia', f.evaluacionId)
      assert.equal(f.crudo.review_status, 'pending', f.evaluacionId)
    }
  })

  it('§14 propiedad 6 · historial: cada ficha nueva apunta a la de F4 del mismo riesgo y ninguna la sobrescribe', () => {
    const f4 = new Map(historial.map((h) => [h.evaluacionId, h]))
    assert.equal(f4.size, 51)
    const ids = new Set(fichas.map((f) => f.evaluacionId))
    assert.equal(ids.size, fichas.length, 'evaluacion_id únicos')
    for (const f of fichas) {
      assert.ok(!f4.has(f.evaluacionId), `${f.evaluacionId} no reutiliza un id de F4`)
      const anterior = f4.get(f.evaluacionAnteriorId)
      assert.ok(anterior, `${f.evaluacionId} → ${f.evaluacionAnteriorId}`)
      assert.equal(anterior.riskId, f.riskId)
      assert.equal(anterior.versionMetodologia, 'metodologia v0.1')
    }
  })

  it('el CSV de F4 sigue intacto: 51 filas, ninguna de v0.2', () => {
    const filas = leerCsv(RUTA_FICHAS_F4)
    assert.equal(filas.length, 51)
    assert.ok(filas.every((x) => x.version_metodologia === 'metodologia v0.1'))
  })
})

describe('derivados registrados = derivados recalculados (§5.5, §6, §8, §9.3, protocolo §2.3)', () => {
  it('sólo quedan las discrepancias conocidas', () => {
    const halladas = fichas.flatMap(discrepancias)
    assert.deepEqual(halladas, DISCREPANCIAS_CONOCIDAS.map(({ porque: _porque, ...d }) => d))
  })

  it('C_raw: los 50 evaluables coinciden exactamente', () => {
    const evaluables = fichas.filter((f) => f.registrado.evaluable)
    assert.equal(evaluables.length, 50)
    for (const f of evaluables) {
      const e = evaluar(f.factores)
      assert.ok(e.evaluable, f.evaluacionId)
      assert.equal(e.cRaw, f.registrado.cRaw, f.evaluacionId)
    }
  })

  it('§6.5: ninguna ficha tiene banda hasta la Fase 9', () => {
    for (const f of fichas) assert.equal(f.registrado.banda, '', f.evaluacionId)
  })
})

describe('§9 rangos, unknown y no evaluables', () => {
  it('§9.2: todo rango registrado tiene como máximo tres niveles y contiene el valor', () => {
    for (const f of fichas) {
      const todos = [
        ['p', f.factores.p], ...DIMENSIONES.map((d) => [d, f.factores.i[d]] as const), ['vCont', f.factores.vCont], ['vRec', f.factores.vRec],
      ] as const
      for (const [nombre, x] of todos) {
        if (x.min === undefined && x.max === undefined) continue
        const [min, max] = [x.min ?? 1, x.max ?? 5]
        assert.ok(max - min <= 2, `${f.evaluacionId} ${nombre}: ${String(min)}–${String(max)}`)
        if (x.valor !== 'unknown' && x.valor !== 'no_aplica') assert.ok(min <= x.valor && x.valor <= max, `${f.evaluacionId} ${nombre}`)
      }
    }
  })

  it('[F5-1] los 14 i_econ que F4 dejó unknown: base assumed/inferred, valor en el rango, uncertainty ≥ medium si el rango cruza niveles', () => {
    const anterior = new Map(leerCsv(RUTA_FICHAS_F4).map((x) => [x.evaluacion_id, x]))
    const convertidas = fichas.filter((f) => anterior.get(f.evaluacionAnteriorId)?.i_econ_valor === 'unknown')
    assert.equal(convertidas.length, 14, 'reporte-regresion §1: "14 i_econ que eran unknown"')
    for (const f of convertidas) {
      const econ = f.factores.i.econ
      assert.notEqual(econ.valor, 'unknown', f.evaluacionId)
      assert.ok(f.bases.econ === 'assumed' || f.bases.econ === 'inferred', `${f.evaluacionId} base ${f.bases.econ}`)
      if (econ.min !== undefined && econ.max !== undefined && econ.min !== econ.max) {
        assert.notEqual(f.uncertainty, 'low', `${f.evaluacionId}: rango ${String(econ.min)}–${String(econ.max)} con uncertainty low`)
      }
    }
  })

  it('§9.4: el único no evaluable (CP-08 R2) tiene motivo y necesidad de validación, sin C_raw ni banda', () => {
    const noEvaluables = fichas.filter((f) => !f.registrado.evaluable)
    assert.deepEqual(noEvaluables.map((f) => f.evaluacionId), ['EV-0071'])
    const [f] = noEvaluables
    assert.ok(f)
    assert.notEqual(f.crudo.motivo_no_evaluable, '')
    assert.notEqual(f.crudo.necesidad_validacion, '')
    assert.equal(f.registrado.cRaw, null)
    // §8.2: las banderas aplican aunque no sea evaluable.
    assert.equal(f.registrado.safetyCritical, true)
  })
})

describe('§1.4, §10, §7.1 · objetos que no compiten en el ranking', () => {
  it('§1.4 / protocolo v0.2 §2.1: el padre CP-12 R1-B lleva los factores de su hijo prioritario R1c, sin factores propios', () => {
    const r = rankingPrincipal([ficha('EV-0079')], fichas)
    assert.deepEqual(r.padres.get('CP-12-R1-B'), { hijosPrioritarios: ['CP-12-R1c'], prioridadProvisional: false })
    assert.ok(mismosFactores(ficha('EV-0079'), ficha('EV-0082')))
  })

  it('§14 propiedad 5 · un sub-riesgo nunca entra al ranking principal', () => {
    assert.throws(() => rankingPrincipal([ficha('EV-0080'), ficha('EV-0083')], fichas), /sub_riesgo no compite/)
  })

  it('§10.4: el escenario por causa común no entra al ranking principal', () => {
    assert.throws(() => rankingPrincipal([ficha('EV-0102'), ficha('EV-0099')], fichas), /escenario no compite/)
  })

  it('§10.2–§10.3: el escenario CP-20 E1 tiene miembros de su organización y es material en alguna dimensión', () => {
    const e1 = ficha('EV-0102')
    assert.deepEqual(e1.miembros, ['CP-20-R1', 'CP-20-R2'])
    const miembros = e1.miembros.map((id) => {
      const m = fichas.find((f) => f.riskId === id)
      assert.ok(m?.casoEmpresa === e1.casoEmpresa && m.tipoObjeto === 'riesgo', id)
      return m
    })
    const nivel = (f: Ficha, d: (typeof DIMENSIONES)[number]) => f.factores.i[d].valor as Nivel
    // Material: la consecuencia conjunta supera, en alguna dimensión, a cualquiera de los miembros.
    assert.ok(DIMENSIONES.some((d) => nivel(e1, d) > Math.max(...miembros.map((m) => nivel(m, d)))))
    // Legal es el máximo de los miembros (§10.3.3).
    assert.equal(nivel(e1, 'legal'), Math.max(...miembros.map((m) => nivel(m, 'legal'))))
  })

  it('§7.1.4 (CH-075): no existe un ranking con riesgos de organizaciones distintas', () => {
    assert.throws(() => rankingPrincipal([ficha('EV-0076'), ficha('EV-0077')], fichas), /CH-075/)
  })
})

describe('§14 propiedad 8 · recodificación 1, 2, 3, 5, 8 (reporte-regresion §4, AN-0161)', () => {
  const CODIGO: Record<Nivel, number> = { 1: 1, 2: 2, 3: 3, 4: 5, 5: 8 }
  /**
   * C_raw con los niveles recodificados: P, I_d y el `V_d` de §5.5 (calculado en la escala
   * 1–5) pasan por el código. Es la lectura que reproduce los números del reporte.
   */
  function cRecodificado(f: Ficha): number {
    const { p, i, vCont, vRec } = f.factores
    if (p.valor === 'unknown' || vCont.valor === 'unknown' || vRec.valor === 'unknown') throw new Error(`${f.evaluacionId} tiene unknown`)
    const v = vPorDimension(vCont.valor, vRec.valor)
    return Math.max(...DIMENSIONES.map((d) => {
      const id = i[d].valor
      if (id === 'unknown') throw new Error(`${f.evaluacionId} ${d} unknown`)
      return CODIGO[p.valor as Nivel] * CODIGO[id] * CODIGO[v[d]]
    }))
  }
  const signo = (x: number) => Math.sign(x)
  // "48 fichas evaluables": las 50 evaluables menos el padre (sin score propio, §1.2) y el escenario (§10.4).
  const universo = fichas.filter((f) => f.registrado.evaluable && f.tipoObjeto !== 'padre' && f.tipoObjeto !== 'escenario')

  it('el universo del reporte son 48 fichas y 1128 pares', () => {
    assert.equal(universo.length, 48)
    assert.equal((universo.length * (universo.length - 1)) / 2, 1128)
  })

  it('125 de 1128 pares cambian de orden (incluidos los empates que se rompen)', () => {
    let cambian = 0
    for (let i = 0; i < universo.length; i++) for (let j = i + 1; j < universo.length; j++) {
      const [a, b] = [universo[i], universo[j]]
      assert.ok(a && b)
      if (signo((a.registrado.cRaw ?? 0) - (b.registrado.cRaw ?? 0)) !== signo(cRecodificado(a) - cRecodificado(b))) cambian++
    }
    assert.equal(cambian, 125)
  })

  it('dentro de los casos cambian exactamente los 6 pares de la tabla del reporte', () => {
    const caso = (f: Ficha) => f.casoEmpresa.slice(0, 5)
    const cambiados: string[] = []
    for (let i = 0; i < universo.length; i++) for (let j = i + 1; j < universo.length; j++) {
      const [a, b] = [universo[i], universo[j]]
      assert.ok(a && b)
      if (caso(a) !== caso(b) || a.riskId === b.riskId) continue
      if (signo((a.registrado.cRaw ?? 0) - (b.registrado.cRaw ?? 0)) !== signo(cRecodificado(a) - cRecodificado(b))) {
        cambiados.push(`${a.evaluacionId}/${b.evaluacionId}`)
      }
    }
    // CP-01 R1/R4 y R2/R4, CP-04 después R1/R2, CP-07 R1/R2, CP-12 forma A/R2 y R1c/R2 (el padre se muestra con R1c).
    assert.deepEqual(cambiados, ['EV-0052/EV-0055', 'EV-0053/EV-0055', 'EV-0062/EV-0063', 'EV-0068/EV-0069', 'EV-0078/EV-0083', 'EV-0082/EV-0083'])
  })
})
