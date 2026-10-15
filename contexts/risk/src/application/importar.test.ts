// `contrato/` del contexto es el de la 15b byte a byte, y la huella de un lote depende de los
// bytes de sus tres archivos y de nada más (H3).

import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { describe, it } from 'node:test'

import { ARCHIVOS_CONTRATO } from '../domain/contrato.ts'
import { CONTRATO_SPIKE, leerCarpeta, SINTETICOS } from '../testing/lotes.ts'
import { CONTRATO_DIR, huellas } from './importar.ts'

describe('contrato del contexto', () => {
  for (const a of ARCHIVOS_CONTRATO) {
    it(`${a} es copia byte a byte de SPIKES/T-0021/v0/fase-15/contrato/`, () => {
      assert.deepEqual(readFileSync(new URL(a, CONTRATO_DIR)), readFileSync(new URL(a, CONTRATO_SPIKE)))
    })
  }
})

describe('huella de un lote', () => {
  const lote = leerCarpeta(SINTETICOS)
  it('es la misma para los mismos bytes y cambia con un byte de cualquier archivo', () => {
    const h = huellas(lote)
    assert.match(h.lote, /^[0-9a-f]{64}$/)
    assert.deepEqual(huellas(leerCarpeta(SINTETICOS)), h)
    for (const a of ['risks.csv', 'action-plan.csv', 'risk-transfer.csv'] as const) {
      const otro = { ...lote, [a]: new Uint8Array([...lote[a], 0x0a]) }
      assert.notEqual(huellas(otro).lote, h.lote, a)
    }
  })

  it('distingue qué archivo trae qué: intercambiar dos archivos cambia la huella', () => {
    const cambiado = { ...lote, 'action-plan.csv': lote['risk-transfer.csv'], 'risk-transfer.csv': lote['action-plan.csv'] }
    assert.notEqual(huellas(cambiado).lote, huellas(lote).lote)
  })
})
