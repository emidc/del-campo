// La cabecera del lote (SLICES/VS01.md §2): la fecha siempre, y la marca del lote
// sintético cuando lo es, sin leer las notas del lote (migración 0011).

import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { describe, it } from 'node:test'
import { fileURLToPath } from 'node:url'

import { batchLabel, MANIFIESTO_SINTETICO, MARCA_SINTETICA, type BatchStamp } from './batch.ts'

const lote = (cambios: Partial<BatchStamp>): BatchStamp => ({
  known: true, importedAt: '2026-09-21T12:00:00.000Z', manifestPrefix: 'abcdefabcdef', synthetic: false, ...cambios,
})

describe('batchLabel', () => {
  it('un lote real: la fecha, sin marca', () => {
    assert.equal(batchLabel(lote({})), 'Datos del lote importado el 2026-09-21')
  })

  it('el lote sintético: la fecha y la marca que lo distingue de datos de la correduría', () => {
    assert.equal(batchLabel(lote({ synthetic: true })), `Datos del lote importado el 2026-09-21 · ${MARCA_SINTETICA}`)
  })

  it('sin lote: lo dice', () => {
    assert.match(batchLabel({ known: false, importedAt: null, manifestPrefix: null, synthetic: false }), /Lote desconocido/)
  })

  it('el seed sintético registra su lote con la huella y la marca que la app reconoce', () => {
    const seed = readFileSync(fileURLToPath(new URL('../../../../scripts/vs01/seed-sintetico.mjs', import.meta.url)), 'utf8')
    assert.equal(MANIFIESTO_SINTETICO, '0'.repeat(64))
    assert.match(seed, /values \(now\(\), \$\{'0'\.repeat\(64\)\}, \$\{MARCA_SINTETICA\}\)/)
    assert.ok(seed.includes(`const MARCA_SINTETICA = '${MARCA_SINTETICA}'`))
  })
})
