// C4-03b: el texto de la sección «Riesgos» para cada resultado del cliente de Risk OS. Con
// cualquier resultado que no sea `vinculada`, no hay filas: la ficha no aparenta datos.

import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import type { ResultadoRiesgos } from '@del-campo/api'

import { describirRiesgos } from './riesgos.ts'

const RIESGOS = [{ riskId: 'RSK-01M3QSRT00DSK3VYVBFPTPJXM6', titulo: 'Incendio en depósito', tipoObjeto: 'riesgo', unidad: null, posicion: 1, empate: false, provisional: false, banda: 'Alta' }]
const VINCULADA: ResultadoRiesgos = {
  estado: 'vinculada',
  organizacion: { id: 'ORG-01M3QSRT00VT0W3XH3JG6NDTEX', sector: null, tamano: null, zonas: [] },
  version: 'metodologia v1',
  generadoEn: '2026-11-11T21:05:00.000Z',
  riesgos: RIESGOS,
  noEvaluables: 2,
  enCola: 3,
  urlRisk: 'http://localhost:3200/o/ORG-01M3QSRT00VT0W3XH3JG6NDTEX',
}

describe('describirRiesgos (C4-03b)', () => {
  it('vinculada: las filas, las cantidades, la hora de Risk OS en Argentina y el enlace', () => {
    assert.deepEqual(describirRiesgos(VINCULADA), {
      forma: 'TABLA',
      filas: RIESGOS,
      resumen: '2 no evaluables · 3 en cola de validación',
      consultado: 'Consultado en Risk OS a las 18:05',
      enlace: 'http://localhost:3200/o/ORG-01M3QSRT00VT0W3XH3JG6NDTEX',
    })
  })

  it('cada otro resultado tiene su texto y ninguna fila', () => {
    const textos = {
      pendiente: 'La vinculación con Risk OS está pendiente de verificación.',
      sin_vinculo: 'Esta empresa no tiene una organización evaluada vinculada, o no la tenés asignada.',
      sin_acceso: 'No tenés acceso a Risk OS.',
      no_disponible: 'Risk OS no responde. No se muestran riesgos.',
      no_configurado: 'Riesgos no está configurado en este entorno.',
    } as const
    for (const [estado, texto] of Object.entries(textos)) {
      assert.deepEqual(describirRiesgos({ estado } as ResultadoRiesgos), { forma: 'MENSAJE', texto }, estado)
    }
  })
})
