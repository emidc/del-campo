// El lector de CSV portado de la 15b (H7): el mismo código que el del spike, debajo de su
// encabezado, y su comportamiento ante lo que el contrato rechaza (RV-ARCH-01 y RV-ARCH-02).
// La regresión sobre los archivos de la 15b está en `validador.test.ts`: los 55 casos dan su
// mensaje exacto, con la línea que informa este lector.

import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { describe, it } from 'node:test'

import { comoFilas, escribirCsv, leerCsv } from './csv.ts'

const enc = (t: string): Uint8Array => new TextEncoder().encode(t)
const cuerpo = (texto: string): string => texto.slice(texto.indexOf('\nexport interface Registro'))

describe('lector de CSV portado (H7)', () => {
  it('es el código del spike sin cambios debajo del encabezado', () => {
    const spike = readFileSync(new URL('../../../../SPIKES/T-0021/v0/fase-15/validador/csv.ts', import.meta.url), 'utf8')
    const portado = readFileSync(new URL('./csv.ts', import.meta.url), 'utf8')
    assert.equal(cuerpo(portado), cuerpo(spike))
  })

  it('lee comillas, comillas escapadas, saltos dentro de comillas, CRLF y BOM', () => {
    const l = leerCsv(enc('﻿a,b\r\n"x, y","di ""hola"""\n"línea\nsegunda",z\n'))
    assert.ok(l.ok)
    assert.deepEqual(l.encabezado, ['a', 'b'])
    assert.deepEqual(l.registros, [{ fila: 2, valores: ['x, y', 'di "hola"'] }, { fila: 3, valores: ['línea\nsegunda', 'z'] }])
    assert.deepEqual(comoFilas(l), [{ a: 'x, y', b: 'di "hola"' }, { a: 'línea\nsegunda', b: 'z' }])
  })

  it('no aborta: devuelve el error de lectura con su línea', () => {
    assert.deepEqual(leerCsv(enc('a,b\n1,2\n3,"sin cerrar\n')), { ok: false, linea: 3, motivo: 'comilla sin cerrar' })
    assert.deepEqual(leerCsv(enc('a,b\n1,x"y\n')), { ok: false, linea: 2, motivo: 'comilla dentro de un campo sin comillas' })
    assert.deepEqual(leerCsv(enc('a,b\n"1"x,2\n')), { ok: false, linea: 2, motivo: 'texto después de una comilla de cierre' })
    assert.deepEqual(leerCsv(enc('')), { ok: false, linea: 1, motivo: 'archivo vacío' })
    assert.deepEqual(leerCsv(new Uint8Array([0x61, 0x0a, 0x62, 0x0a, 0xff])), { ok: false, linea: 3, motivo: 'no es UTF-8' })
  })

  it('devuelve los registros con su número de campos, sin igualarlos al encabezado', () => {
    const l = leerCsv(enc('a,b\n1,2,3\n4\n'))
    assert.ok(l.ok)
    assert.deepEqual(l.registros.map((r) => r.valores.length), [3, 1])
  })

  it('escribirCsv y leerCsv son inversos', () => {
    const filas = [{ a: 'con, coma', b: 'con "comillas"' }, { a: 'salto\nde línea', b: '' }]
    const l = leerCsv(enc(escribirCsv(['a', 'b'], filas)))
    assert.ok(l.ok)
    assert.deepEqual(comoFilas(l), filas)
  })
})
