import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { CLASES_DE_FALLO, MOTIVO_POR_CLASE } from './failure-classes.ts'

describe('failure-classes', () => {
  it('declara un motivo no vacío para cada clase, sin excepciones silenciosas', () => {
    for (const clase of CLASES_DE_FALLO) {
      const motivo = MOTIVO_POR_CLASE[clase]
      assert.ok(motivo.length > 0, `falta motivo para ${clase}`)
    }
  })

  it('no tiene clases duplicadas', () => {
    assert.equal(new Set(CLASES_DE_FALLO).size, CLASES_DE_FALLO.length)
  })
})
