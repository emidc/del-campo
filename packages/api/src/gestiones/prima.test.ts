import assert from 'node:assert/strict'
import { test } from 'node:test'

import { leerPrima } from './prima.ts'

test('la prima se lee como se escribe en Argentina', () => {
  assert.equal(leerPrima('120.000,50'), '120000.50')
  assert.equal(leerPrima('120000,5'), '120000.5')
  assert.equal(leerPrima('120000.50'), '120000.50')
  assert.equal(leerPrima('1.234.567'), '1234567')
  assert.equal(leerPrima('$ 950'), '950')
  assert.equal(leerPrima('US$ 950,25'), '950.25')
})

test('lo que no es un monto positivo no es una prima', () => {
  for (const malo of ['', '0', '-5', 'abc', '1,234,5', '12.5.3', '1,999', '9999999999999']) {
    assert.equal(leerPrima(malo), null, malo)
  }
})
