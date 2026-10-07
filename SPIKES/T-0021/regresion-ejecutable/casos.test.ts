// Los 20 casos de propiedad: adjudicación de Emiliano contra lo que la metodología v0.2
// produce con las fichas de F5-REG-01. El test no exige PASS: exige que el veredicto sea el
// aprobado en la Fase 5. Un FAIL aprobado (CP-01, CP-07, CP-12, CP-16) es evidencia que el
// arnés tiene que seguir viendo; si un cambio lo vuelve PASS, eso también tiene que saltar.

import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { CASOS, type Banda } from './casos.ts'
import { fichasF5, historialF4, type Ficha } from './fichas.ts'
import { evaluar, techoPlausible, vPorDimension, type Nivel } from './metodologia.ts'
import { juzgar, mismosFactores, rankingPrincipal, type Veredicto } from './verificacion.ts'

const fichas = fichasF5()
const historial = historialF4()

function ficha(id: string): Ficha {
  const f = fichas.find((x) => x.evaluacionId === id)
  if (f === undefined) throw new Error(`falta ${id}`)
  return f
}

function resumen(v: Veredicto): string {
  return v.resultados.filter((r) => r.estado !== 'cumple').map((r) => `${r.estado}: ${r.detalle}`).join('; ') || 'todo cumple'
}

describe('veredicto de cada caso = veredicto aprobado de F5-REG-01 (reporte-regresion §2)', () => {
  it('son los 20 casos de propiedad', () => {
    assert.deepEqual(CASOS.map((c) => c.id), Array.from({ length: 20 }, (_, i) => `CP-${String(i + 1).padStart(2, '0')}`))
  })

  for (const caso of CASOS) {
    it(`${caso.id}: ${caso.aprobado.categoria}`, () => {
      const v = juzgar(caso.adjudicacion, caso.momentos, fichas)
      assert.equal(v.categoria, caso.aprobado.categoria, resumen(v))
      assert.deepEqual(v.secundarias, caso.aprobado.secundarias, resumen(v))
    })
  }

  for (const caso of CASOS.filter((c) => c.revision !== undefined)) {
    it(`${caso.id}: contra la adjudicación original, ${caso.revision?.aprobadoOriginal.categoria ?? ''} (protocolo v0.2 §13)`, () => {
      assert.ok(caso.revision)
      const v = juzgar(caso.revision.adjudicacion, caso.momentos, fichas)
      assert.equal(v.categoria, caso.revision.aprobadoOriginal.categoria, resumen(v))
    })
  }

  it('conteo: 16 PASS y 4 FAIL (CP-01, CP-12, CP-16 combinación; CP-07 ranking)', () => {
    const veredictos = CASOS.map((c) => [c.id, juzgar(c.adjudicacion, c.momentos, fichas).categoria] as const)
    assert.equal(veredictos.filter(([, v]) => v === 'PASS').length, 16)
    assert.deepEqual(veredictos.filter(([, v]) => v !== 'PASS'), [
      ['CP-01', 'FAIL — combinación'], ['CP-07', 'FAIL — ranking'], ['CP-12', 'FAIL — combinación'], ['CP-16', 'FAIL — combinación'],
    ])
  })

  it('ningún criterio adjudicado juzgable queda indeterminado', () => {
    for (const caso of CASOS) {
      const v = juzgar(caso.adjudicacion, caso.momentos, fichas)
      assert.ok(v.resultados.every((r) => r.estado !== 'indeterminado'), `${caso.id}: ${resumen(v)}`)
    }
  })
})

describe('orden de cada momento = orden registrado en F5-REG-01', () => {
  for (const caso of CASOS) {
    for (const [momento, esperado] of Object.entries(caso.ordenRegistrado)) {
      it(`${caso.id} ${momento}`, () => {
        const ids = caso.momentos[momento]
        assert.ok(ids)
        const r = rankingPrincipal(ids.map(ficha), fichas)
        assert.deepEqual(r.posiciones.map((p) => [...p.ids].sort()), esperado.map((g) => [...g].sort()))
        assert.ok(r.posiciones.every((p) => !p.provisional))
      })
    }
  }
})

describe('comprobaciones propias de cada caso', () => {
  it('CP-01 FAIL: R5 sobre R1 y R4 por C_raw; R2 sobre R4 por I efectivo (AN-0157, AN-0158)', () => {
    const v = juzgar(CASOS[0]?.adjudicacion ?? [], CASOS[0]?.momentos ?? {}, fichas)
    const fallas = v.resultados.filter((r) => r.estado === 'falla').map((r) =>
      r.expectativa.tipo === 'orden' ? `${r.expectativa.alto}>${r.expectativa.bajo}:${r.categoria ?? ''}` : `otra: ${r.detalle}`)
    assert.deepEqual(fallas, ['CP-01-R1>CP-01-R5:combinación', 'CP-01-R4>CP-01-R5:combinación', 'CP-01-R4>CP-01-R2:ranking'])
  })

  it('CP-04: la acción ejecutada (sitio alternativo) mejora recuperación 4 → 1 con efecto total; contención igual', () => {
    const [antes, despues] = [ficha('EV-0061'), ficha('EV-0062')]
    assert.deepEqual([antes.factores.vRec.valor, despues.factores.vRec.valor], [4, 1])
    assert.equal(antes.factores.vCont.valor, despues.factores.vCont.valor)
    const accion = historial.find((h) => h.evaluacionId === despues.evaluacionAnteriorId)
    assert.equal(accion?.motivo, 'accion_ejecutada')
    assert.equal(accion.accionEfecto, 'efecto_total')
  })

  it('CP-08: R1 se ordena por C_raw (60), no por el techo (100); R2 va a la lista no evaluable, sin banda', () => {
    const r = rankingPrincipal(['EV-0070', 'EV-0071', 'EV-0072'].map(ficha), fichas)
    assert.equal(r.items.get('CP-08-R1')?.cRaw, 60)
    assert.equal(techoPlausible(ficha('EV-0070').factores), 100)
    assert.deepEqual(r.noEvaluables, [{ riskId: 'CP-08-R2', motivo: 'p_unknown' }])
  })

  it('CP-09 y CP-17 (D17, §11.3): la póliza, su firma o su consumo no generan ficha ni cambian factores', () => {
    for (const riesgo of ['CP-09-R1', 'CP-17-R1']) {
      assert.equal(fichas.filter((f) => f.riskId === riesgo).length, 1, riesgo)
      assert.equal(historial.filter((h) => h.riskId === riesgo).length, 1, riesgo)
    }
    assert.ok(mismosFactores(ficha('EV-0073'), ficha('EV-0092')), 'CP-17 tiene los mismos factores que CP-09: el seguro no reduce I')
  })

  it('CP-10: acción cumplida con efecto parcial; el riesgo queda menor que antes y mayor que el residual esperado (§11.2)', () => {
    const [antes, despues] = [ficha('EV-0074'), ficha('EV-0075')]
    const accion = historial.find((h) => h.evaluacionId === despues.evaluacionAnteriorId)
    assert.equal(accion?.motivo, 'accion_ejecutada')
    assert.equal(accion.accionEfecto, 'efecto_parcial')
    // Esperado escrito en la acción: "v_cont: de débil a buena (4 -> 2)". Obtenido: 3. El factor toma el reevaluado.
    assert.equal(accion.accionCambioEsperado, 'v_cont: de débil a buena (4 -> 2)')
    assert.deepEqual([antes.factores.vCont.valor, despues.factores.vCont.valor], [4, 3])
    const esperado = { ...despues.factores, vCont: { valor: 2 as Nivel } }
    const [cAntes, cDespues, cEsperado] = [evaluar(antes.factores), evaluar(despues.factores), evaluar(esperado)]
    assert.ok(cAntes.evaluable && cDespues.evaluable && cEsperado.evaluable)
    assert.ok(cEsperado.cRaw < cDespues.cRaw && cDespues.cRaw < cAntes.cRaw, `${String(cEsperado.cRaw)} < ${String(cDespues.cRaw)} < ${String(cAntes.cRaw)}`)
  })

  it('CP-11: el nivel económico refleja la escala de cada empresa y la bandera queda sólo en B; no hay orden entre empresas', () => {
    const [a, b] = [ficha('EV-0076'), ficha('EV-0077')]
    assert.ok(a.factores.i.econ.valor !== 'unknown' && b.factores.i.econ.valor !== 'unknown')
    assert.ok(b.factores.i.econ.valor > a.factores.i.econ.valor)
    assert.deepEqual([a.registrado.consecuenciaExtrema, b.registrado.consecuenciaExtrema], [false, true])
    assert.notEqual(a.casoEmpresa, b.casoEmpresa)
  })

  it('CP-12: los hijos se ordenan R1c > R1b > R1a, sin empate; el padre se muestra con R1c y no compite con la forma A', () => {
    const hijos = rankingPrincipal([ficha('EV-0079')], fichas)
    assert.deepEqual(hijos.padres.get('CP-12-R1-B')?.hijosPrioritarios, ['CP-12-R1c'])
    const cHijos = ['EV-0080', 'EV-0081', 'EV-0082'].map((id) => evaluar(ficha(id).factores))
    assert.deepEqual(cHijos.map((e) => (e.evaluable ? e.cRaw : null)), [10, 40, 50])
  })

  it('CP-14 (adjudicación revisada): contención y recuperación quedan separadas y con perfiles opuestos; R1 visible', () => {
    const [r1, r2] = [ficha('EV-0086'), ficha('EV-0087')]
    assert.deepEqual([r1.factores.vCont.valor, r1.factores.vRec.valor], [1, 5])
    assert.deepEqual([r2.factores.vCont.valor, r2.factores.vRec.valor], [5, 3])
    assert.equal(r1.registrado.consecuenciaExtrema, true)
    // R1 es el perfil PV-1: casi protegido en las cuatro dimensiones.
    assert.deepEqual(vPorDimension(1, 5), { econ: 1, pers: 1, cont: 1, legal: 1 })
  })

  it('CP-15: R1 safety_critical sin que la bandera fuerce banda ni posición (§8.2)', () => {
    const r1 = ficha('EV-0088')
    assert.equal(r1.registrado.safetyCritical, true)
    assert.equal(r1.registrado.banda, '')
    const r = rankingPrincipal(['EV-0088', 'EV-0089'].map(ficha), fichas)
    assert.deepEqual(r.posiciones.map((p) => p.ids), [['CP-15-R2'], ['CP-15-R1']])
  })

  it('CP-18: la acción saca a la gente del radio (personas 5 → 1); la planta sigue expuesta', () => {
    const [antes, despues] = [ficha('EV-0093'), ficha('EV-0094')]
    assert.deepEqual([antes.factores.i.pers.valor, despues.factores.i.pers.valor], [5, 1])
    const [ca, cd] = [evaluar(antes.factores), evaluar(despues.factores)]
    assert.ok(ca.evaluable && cd.evaluable)
    assert.deepEqual([ca.cPorDimension.pers, cd.cPorDimension.pers], [45, 9])
    assert.equal(ca.cRaw, cd.cRaw)
    assert.equal(despues.registrado.safetyCritical, false)
  })

  it('CP-19: cada cambio con su motivo (§11.1) y sin ficha para la escala hipotética de septiembre', () => {
    const cadena = ['EV-0044', 'EV-0045', 'EV-0046', 'EV-0047'].map((id) => historial.find((h) => h.evaluacionId === id))
    assert.deepEqual(cadena.map((h) => h?.motivo), ['', 'informacion_nueva', 'correccion_evaluacion', 'cambio_contexto'])
    for (let i = 1; i < cadena.length; i++) assert.equal(cadena[i]?.evaluacionAnteriorId, cadena[i - 1]?.evaluacionId)
    assert.equal(fichas.filter((f) => f.riskId === 'CP-19-R1').length, 4)
    // Ninguno es "acción ejecutada" (incorrecto adjudicado).
    assert.ok(cadena.every((h) => h?.accionId === ''))
  })

  it('CP-20: R1 = R2 es empate legítimo (mismos C_raw, I efectivo e I-personas); el escenario no toca a sus miembros', () => {
    const r = rankingPrincipal(['EV-0099', 'EV-0100', 'EV-0101'].map(ficha), fichas)
    assert.deepEqual([...(r.posiciones[0]?.ids ?? [])].sort(), ['CP-20-R1', 'CP-20-R2'])
    const e1 = evaluar(ficha('EV-0102').factores)
    assert.ok(e1.evaluable)
    assert.ok(e1.cRaw > Math.max(...['CP-20-R1', 'CP-20-R2'].map((id) => r.items.get(id)?.cRaw ?? 0)))
  })
})

describe('bandas adjudicadas: no juzgables hasta la Fase 9 (protocolo §8); diagnóstico para la calibración', () => {
  const ORDEN_BANDA: Record<Banda, number> = { Baja: 0, Media: 1, Alta: 2, Crítica: 3 }
  const firmes = CASOS.flatMap((c) => c.bandas.flatMap((b) => {
    if (b.evaluacionId === null || b.admitidas === null) return []
    const e = evaluar(ficha(b.evaluacionId).factores)
    if (!e.evaluable) return []
    const nums = b.admitidas.map((x) => ORDEN_BANDA[x])
    return [{ caso: c.id, id: b.evaluacionId, cRaw: e.cRaw, min: Math.min(...nums), max: Math.max(...nums) }]
  }))

  /**
   * Condición necesaria si los umbrales de la Fase 9 sólo cortan `C_raw` (supuesto de §7.2,
   * paso 1): igual `C_raw` ⇒ alguna banda en común; mayor `C_raw` ⇒ banda no menor.
   */
  function conflictos(lista: typeof firmes) {
    const out: string[] = []
    for (const a of lista) for (const b of lista) {
      if (a.id >= b.id) continue
      const [hi, lo] = a.cRaw >= b.cRaw ? [a, b] : [b, a]
      const ok = hi.cRaw === lo.cRaw ? hi.min <= lo.max && lo.min <= hi.max : hi.max >= lo.min
      if (!ok) out.push(`${hi.id}(${String(hi.cRaw)})/${lo.id}(${String(lo.cRaw)})`)
    }
    return out
  }

  it('ninguna ficha tiene banda: el criterio de banda no decide ningún veredicto', () => {
    assert.ok(fichas.every((f) => f.registrado.banda === ''))
  })

  it('dentro de un caso, sólo CP-05 es incompatible con un corte de C_raw (R1 Media y R2 Alta con 64 = 64)', () => {
    const porCaso = conflictos(firmes).filter((par) => {
      const [x, y] = par.split('/').map((s) => firmes.find((f) => s.startsWith(f.id))?.caso)
      return x === y
    })
    assert.deepEqual(porCaso, ['EV-0064(64)/EV-0065(64)'])
  })

  it('entre todos los casos, las bandas firmes no admiten ningún corte monótono de C_raw (dato para la Fase 9)', () => {
    const todos = conflictos(firmes)
    assert.ok(todos.length > 0)
    // Ejemplo sin fichas en disputa: CP-01 R1 Alta con 20 contra CP-03 R2 Media con 48.
    assert.ok(todos.includes('EV-0060(48)/EV-0052(20)'))
  })
})
