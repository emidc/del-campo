// De un lote sin rechazos a filas del esquema: lo importado queda como está en el archivo
// (T-0029, ## Outcome) y una celda con valor sin columna en el esquema se informa.

import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { leerContrato } from '../application/importar.ts'
import { aLote, filasBase, idsBase, leerCarpeta, SINTETICOS } from '../testing/lotes.ts'
import { columnasSinDestino, filasParaEscribir, TABLAS_IMPORTACION } from './importacion.ts'

const contrato = leerContrato()

describe('filas para escribir', () => {
  it('las 8 sintéticas: 60 riesgos de 84 filas, 82 evaluaciones, 10 registros del plan, 32 coberturas y 1 evento', () => {
    const f = filasParaEscribir(leerCarpeta(SINTETICOS))
    assert.deepEqual(Object.fromEntries(TABLAS_IMPORTACION.map((t) => [t, f[t].length])), {
      riesgo: 60, miembro_escenario: 2, accion: 10, evaluacion: 82, accion_estado: 9, transferencia: 32, evento_poliza: 1, revision_humana: 1,
    })
  })

  it('nada se acepta ni se completa: review_status pending no deja revisión; los demás, una con el texto de revisado_por', () => {
    const b = filasBase()
    Object.assign(b['risks.csv'][5] ?? {}, { review_status: 'needs_revision', revisado_por: 'Revisora sintética', revisado_por_actor: 'ai', fecha_revision: '2026-10-05' })
    const f = filasParaEscribir(aLote(contrato, b))
    assert.deepEqual(f.revision_humana, [{
      evaluacion_id: idsBase(b).get('E-R2'), estado: 'needs_revision', revisado_por_actor: 'ai', revisado_por_origen: 'Revisora sintética',
      fecha_revision: '2026-10-05', origen: 'importacion',
    }])
    // Ningún derivado ni campo que no venga del archivo.
    for (const e of f.evaluacion) assert.ok(!Object.keys(e).some((k) => /c_raw|banda|safety|extrema|posicion|techo/.test(k)), Object.keys(e).join(','))
  })

  it('celdas vacías como null, listas como arreglos y el resto tal cual', () => {
    const f = filasParaEscribir(aLote(contrato, filasBase()))
    const esc = f.riesgo.find((r) => r.tipo_objeto === 'escenario')
    assert.equal(esc?.unidad_id, null)
    assert.equal(f.miembro_escenario.length, 2)
    const a1 = f.accion.find((a) => a.id_origen === 'A1')
    assert.ok(a1 !== undefined)
    assert.deepEqual(a1.factor_objetivo, ['p'])
    assert.equal(a1.cambio_esperado, 'p 3→2')
    assert.deepEqual(f.accion_estado.map((e) => e.estado), ['cumplida', 'planificada'], 'la decisión de tratamiento no tiene estado')
    const padre = f.riesgo.find((r) => r.tipo_objeto === 'padre')
    assert.equal(padre?.consecuencia_comun, 'Línea de envasado detenida')
  })

  it('padres antes que sus hijos, escenarios al final, y cada reevaluación después de su anterior', () => {
    const b = filasBase()
    b['risks.csv'].reverse()
    const f = filasParaEscribir(aLote(contrato, b))
    assert.deepEqual([...new Set(f.riesgo.map((r) => r.tipo_objeto))], ['padre', 'riesgo', 'sub_riesgo', 'escenario'])
    const ids = f.evaluacion.map((e) => e.id)
    for (const [i, e] of f.evaluacion.entries()) {
      if (e.evaluacion_anterior_id !== null) assert.ok(ids.indexOf(e.evaluacion_anterior_id) < i)
    }
  })
})

describe('celdas sin columna en el esquema', () => {
  it('el lote base y las sintéticas no tienen ninguna', () => {
    assert.deepEqual(columnasSinDestino(aLote(contrato, filasBase())), [])
    assert.deepEqual(columnasSinDestino(leerCarpeta(SINTETICOS)), [])
  })

  it('la incertidumbre o la revisión de un evento y la ejecución de una decisión de tratamiento', () => {
    const b = filasBase()
    Object.assign(b['risk-transfer.csv'][1] ?? {}, { uncertainty: 'medium', uncertainty_nota: 'Falta el acta', review_status: 'accepted', revisado_por: 'X', revisado_por_actor: 'human', fecha_revision: '2026-10-05' })
    Object.assign(b['action-plan.csv'][1] ?? {}, { estado: 'cumplida' })
    const id = idsBase(b)
    assert.deepEqual(columnasSinDestino(aLote(contrato, b)), [
      { archivo: 'action-plan.csv', fila: 3, id: id.get('A2'), columna: 'estado' },
      { archivo: 'risk-transfer.csv', fila: 3, id: id.get('EV1'), columna: 'uncertainty' },
      { archivo: 'risk-transfer.csv', fila: 3, id: id.get('EV1'), columna: 'uncertainty_nota' },
      { archivo: 'risk-transfer.csv', fila: 3, id: id.get('EV1'), columna: 'revisado_por' },
      { archivo: 'risk-transfer.csv', fila: 3, id: id.get('EV1'), columna: 'revisado_por_actor' },
      { archivo: 'risk-transfer.csv', fila: 3, id: id.get('EV1'), columna: 'fecha_revision' },
      { archivo: 'risk-transfer.csv', fila: 3, id: id.get('EV1'), columna: 'review_status' },
    ])
  })

  it('un evento con review_status pending no pierde nada', () => {
    const b = filasBase()
    Object.assign(b['risk-transfer.csv'][1] ?? {}, { review_status: 'pending' })
    assert.deepEqual(columnasSinDestino(aLote(contrato, b)), [])
  })
})
