// Oráculo externo de T-0028: los derivados de las 8 empresas sintéticas, calculados con las
// funciones de producto, contra `resultado_nuevo` de `v0/fase-11/regresion-emi41.csv` (RO01 §6,
// A1). Una diferencia se reporta con su objeto; el oráculo no se corrige.

import assert from 'node:assert/strict'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, it } from 'node:test'

import { compararConRegresion } from '../testing/regresion.ts'
import { leerArchivo, leerCsv, REGRESION_EMI41, SINTETICOS } from '../testing/sinteticos.ts'

const risks = leerArchivo(new URL('risks.csv', SINTETICOS))

describe('derivados de las 8 sintéticas contra regresion-emi41.csv', () => {
  it('los 59 objetos coinciden; S15 sin la posición (verificacion-15b.md §4)', () => {
    const c = compararConRegresion(risks, leerArchivo(REGRESION_EMI41))
    assert.deepEqual(c.diferencias, [])
    assert.equal(c.objetos, 59)
    assert.deepEqual(c.empresas, ['S05', 'S06', 'S07', 'S15', 'S28', 'S29', 'S32', 'S36'])
    assert.deepEqual(c.sinPosicion, ['S15'])
  })

  it('una copia de la regresión con un valor alterado hace fallar la comparación', () => {
    const original = readFileSync(REGRESION_EMI41, 'utf8')
    // S06-R01 (agente): `resultado_nuevo` es `C 75 · pos 3 · Crítica …`, seguido de `sin_cambio`.
    // Se cambia sólo el C de ese campo, no el de `resultado_anterior`.
    const linea = original.split('\n').find((l) => l.startsWith('S06-R01,agente,')) ?? ''
    assert.ok(linea.includes(',C 75 · pos 3 · Crítica · ext=true · sc=false · I 5,sin_cambio,'), 'precondición: la fila que se altera')
    const alterada = linea.replace(/,C 75 · pos 3 · ([^,]*),sin_cambio,/, ',C 76 · pos 3 · $1,sin_cambio,')
    assert.notEqual(alterada, linea)
    const dir = mkdtempSync(join(tmpdir(), 'risk-regresion-'))
    try {
      const copia = join(dir, 'regresion-emi41.csv')
      writeFileSync(copia, original.replace(linea, alterada))
      const c = compararConRegresion(risks, leerCsv(readFileSync(copia, 'utf8')))
      assert.equal(c.diferencias.length, 1)
      assert.match(c.diferencias[0] ?? '', /^S06-R01: C 75 · pos 3 .* ≠ C 76 · pos 3/)
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })
})
