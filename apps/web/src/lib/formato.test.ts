import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { estadoDePoliza, importe, tipoDeEndoso } from './formato.ts'

describe('formato de póliza', () => {
  it('muestra el tipo de endoso sin importar cómo lo escribió el origen', () => {
    assert.equal(tipoDeEndoso('REFACTURACION'), 'Refacturación')
    assert.equal(tipoDeEndoso('Anulación'), 'Anulación')
    assert.equal(tipoDeEndoso('Cambio de cobertura'), 'Cambio de cobertura')
    assert.equal(tipoDeEndoso(null), '—')
    assert.equal(tipoDeEndoso('DESCONOCIDO'), '—')
  })

  it('importes en formato argentino y estado Renovada', () => {
    assert.equal(importe('12345.5', 'ARS'), '12.345,5 ARS')
    assert.equal(importe(null), '—')
    assert.equal(estadoDePoliza('RENEWED'), 'Renovada')
  })
})
