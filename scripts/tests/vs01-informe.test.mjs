import assert from 'node:assert/strict'
import test from 'node:test'
import { CASOS_ESPERADOS, calcular, cotejarConCongelados, mediana } from '../vs01/informe-aceptacion.mjs'

const fila = (n, extra = {}) => ({ case_code: `C${String(n).padStart(2, '0')}`, base_segundos: String(100 + n),
  vs01_segundos: String(40 + n), poliza_encontrada: 'SI', coincidencia_falsa_inequivoca: 'NO',
  aperturas_esperadas: '1', aperturas_comprobadas: '1', ...extra })

test('mediana par e impar', () => {
  assert.equal(mediana([3, 1, 2]), 2)
  assert.equal(mediana([4, 1, 3, 2]), 2.5)
})

test('20 casos correctos cumplen los cuatro criterios', () => {
  const r = calcular(Array.from({ length: 20 }, (_, i) => fila(i + 1)))
  assert.deepEqual(Object.values(r.criterios), [true, true, true, true, true])
})

test('un fallo sin tiempo reduce los pares; con menos de 19 la medición no es válida', () => {
  const filas = Array.from({ length: 20 }, (_, i) => fila(i + 1))
  filas[0] = fila(1, { vs01_segundos: '', poliza_encontrada: 'NO' })
  filas[1] = fila(2, { base_segundos: '' })
  const r = calcular(filas)
  assert.equal(r.pares, 18)
  assert.equal(r.criterios.tiempoValido, false)
  assert.equal(r.criterios.encontradas, true)
})

test('sensibilidad: los casos con pista cuentan como no encontrados', () => {
  const filas = Array.from({ length: 20 }, (_, i) => fila(i + 1, { pista_boton: i < 2 ? 'SI' : 'NO' }))
  const r = calcular(filas, { excluir: new Set(['C01', 'C02']), fallarPista: true })
  assert.equal(r.encontradas, 18)
  assert.equal(r.criterios.encontradas, false)
})

test('el denominador son los casos congelados, no las filas medidas', () => {
  const r = calcular(Array.from({ length: 19 }, (_, i) => fila(i + 1)))
  assert.equal(r.casos, CASOS_ESPERADOS)
  assert.equal(r.medidos, 19)
  assert.equal(r.encontradas, 19)
  assert.equal(r.criterios.encontradas, true)
  // 19 filas nunca se imprimen como «19 de 19»
  assert.notEqual(r.casos, r.medidos)
})

test('una medición que no son los 20 casos congelados se rechaza', () => {
  const veinte = Array.from({ length: 20 }, (_, i) => `C${String(i + 1).padStart(2, '0')}`)
  assert.equal(cotejarConCongelados(veinte, veinte), null)
  assert.match(cotejarConCongelados(veinte.slice(0, 19), veinte), /sin medir: C20/)
  assert.match(cotejarConCongelados([...veinte, 'C21'], veinte), /no están congelados: C21/)
  assert.match(cotejarConCongelados([...veinte.slice(0, 19), 'C19'], veinte), /repetidos/)
  assert.match(cotejarConCongelados(veinte.slice(0, 19), veinte.slice(0, 19)), /19 casos congelados/)
})

test('el criterio documental es por caso: un caso sin aperturas esperadas no pasa por vacío', () => {
  const filas = Array.from({ length: 20 }, (_, i) => fila(i + 1))
  filas[0] = fila(1, { aperturas_esperadas: '', aperturas_comprobadas: '' })
  assert.equal(calcular(filas).criterios.vinculos, false)
  // ni un exceso en un caso compensa un faltante en otro
  const compensado = Array.from({ length: 20 }, (_, i) => fila(i + 1))
  compensado[0] = fila(1, { aperturas_esperadas: '2', aperturas_comprobadas: '1' })
  compensado[1] = fila(2, { aperturas_esperadas: '1', aperturas_comprobadas: '2' })
  const r = calcular(compensado)
  assert.equal(r.esperadas, r.comprobadas)
  assert.equal(r.criterios.vinculos, false)
})

test('el detalle por caso permite recalcular las medianas y no lleva texto libre', () => {
  const r = calcular(Array.from({ length: 20 }, (_, i) => fila(i + 1)))
  assert.equal(r.detalle.length, 20)
  assert.equal(mediana(r.detalle.filter((d) => d.enPares).map((d) => d.base)), r.medianaBase)
  assert.equal(mediana(r.detalle.filter((d) => d.enPares).map((d) => d.vs01)), r.medianaVs01)
  assert.deepEqual(Object.keys(r.detalle[0]).sort(),
    ['base', 'code', 'comprobadas', 'encontrada', 'enPares', 'esperadas', 'pista', 'vs01'].sort())
})
