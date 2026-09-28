import assert from 'node:assert/strict'
import test from 'node:test'
import { calcular, mediana } from '../vs01/informe-aceptacion.mjs'

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
