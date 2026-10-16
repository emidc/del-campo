// Conteo de A7 (decisión 7): diez ciclos cerrados desde una sesión, en todas las empresas
// históricas, con tres tipos de disparador. Las abiertas y las de los CSV no cuentan.

import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { contarCiclos, informeCiclos, type RevisionParaContar } from './ciclos.ts'

const EMPRESAS = ['ORG-A', 'ORG-B', 'ORG-C', 'ORG-D', 'ORG-E']
const TIPOS = ['accion_ejecutada', 'informacion_nueva', 'cambio_contexto']
const ciclo = (n: number, x: Partial<RevisionParaContar> = {}): RevisionParaContar => ({
  id: `REV-${String(n)}`, organizacionId: EMPRESAS[n % 5] ?? '', disparador: TIPOS[n % 3] ?? '', referencia: null, origen: 'sesion',
  abiertaEn: '2026-10-20T10:00:00Z',
  cierre: { resultado: 'sin_cambio', evaluacionId: null, cerradaPor: 'PER-1', cerradaEn: `2026-10-${String(20 + n)}T12:00:00Z` }, ...x,
})
const diez = Array.from({ length: 10 }, (_, n) => ciclo(n))

describe('A7', () => {
  it('un recorrido de diez ciclos en las cinco empresas con tres tipos cumple', () => {
    const c = contarCiclos(diez, EMPRESAS)
    assert.equal(c.ciclos, 10)
    assert.equal(c.cumpleA7, true, c.faltas.join('; '))
    assert.deepEqual(c.porEmpresa.map((e) => [e.organizacionId, e.ciclos, e.primerCierre, e.ultimoCierre]), [
      ['ORG-A', 2, '2026-10-20', '2026-10-25'], ['ORG-B', 2, '2026-10-21', '2026-10-26'], ['ORG-C', 2, '2026-10-22', '2026-10-27'],
      ['ORG-D', 2, '2026-10-23', '2026-10-28'], ['ORG-E', 2, '2026-10-24', '2026-10-29'],
    ])
  })
  it('no cumple si falta una empresa', () => {
    const c = contarCiclos([...diez, ciclo(10)], [...EMPRESAS, 'ORG-F'])
    assert.equal(c.cumpleA7, false)
    assert.deepEqual(c.empresasSinCiclo, ['ORG-F'])
  })
  it('no cumple con sólo dos tipos de disparador', () => {
    const c = contarCiclos(diez.map((x) => (x.disparador === 'cambio_contexto' ? { ...x, disparador: 'informacion_nueva' } : x)), EMPRESAS)
    assert.equal(c.cumpleA7, false)
    assert.match(c.faltas.join('\n'), /2 tipos de disparador/)
  })
  it('no cumple si se indican menos de las cinco empresas históricas', () => {
    const c = contarCiclos(diez, EMPRESAS.slice(0, 1))
    assert.equal(c.cumpleA7, false)
    assert.match(c.faltas.join('\n'), /A7 pide las 5 empresas históricas; se indicaron 1/)
  })
  it('separa los cierres con reevaluación aceptada de los sin cambio', () => {
    const c = contarCiclos(diez.map((x, n) => (n < 3 && x.cierre !== null ? { ...x, cierre: { ...x.cierre, resultado: 'reevaluacion_aceptada' as const, evaluacionId: 'EVA-1' } } : x)), EMPRESAS)
    assert.deepEqual(c.porResultado, { reevaluacion_aceptada: 3, sin_cambio: 7 })
    assert.match(informeCiclos(c).join('\n'), /reevaluación aceptada: 3; sin cambio: 7/)
  })
  it('una revisión abierta no cuenta', () => {
    const c = contarCiclos([...diez.slice(0, 9), ciclo(9, { cierre: null })], EMPRESAS)
    assert.equal(c.ciclos, 9)
    assert.equal(c.noCuentan.abiertas, 1)
    assert.equal(c.cumpleA7, false)
  })
  it('un ciclo que viene de los CSV no cuenta', () => {
    const c = contarCiclos([...diez.slice(0, 9), ciclo(9, { origen: 'importacion' })], EMPRESAS)
    assert.equal(c.ciclos, 9)
    assert.equal(c.noCuentan.deLosCsv, 1)
    assert.equal(c.cumpleA7, false)
  })
  it('el informe tiene sólo códigos de empresa, conteos y fechas', () => {
    const texto = informeCiclos(contarCiclos(diez, EMPRESAS)).join('\n')
    assert.doesNotMatch(texto, /REV-|PER-/)
    assert.match(texto, /A7: cumplido/)
  })
})
