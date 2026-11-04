import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { datosBancariosEn, FORMATOS_BANCARIOS, TEXTO_CON_DATOS_BANCARIOS } from './bancarios.ts'

describe('detector de datos bancarios para los tests de auditoría', () => {
  it('encuentra cada formato del prototipo', () => {
    for (const f of FORMATOS_BANCARIOS) assert.ok(datosBancariosEn(`texto ${f} más texto`).length > 0, f)
    assert.ok(datosBancariosEn(TEXTO_CON_DATOS_BANCARIOS).length >= FORMATOS_BANCARIOS.length)
  })

  it('reconoce una tarjeta por Luhn aunque cambie el separador', () => {
    assert.ok(datosBancariosEn('4539-1488-0343-6467').includes('4539148803436467'))
    assert.ok(!datosBancariosEn('4539-1488-0343-6468').includes('4539148803436468'))
  })

  it('no confunde lo que sí puede quedar en la auditoría: ids, motivos, fechas, uuids', () => {
    const fila = JSON.stringify({
      id: '1234567',
      actor: '0b6f2c1e-8a4d-4c39-9d0e-5f1a2b3c4d5e',
      accion: 'riesgo.novedad',
      idObjeto: 'RSK-0001-0002',
      motivo: 'SIN_ORDEN_PREVIO',
      ocurrido: '2026-11-03T21:28:00.000Z',
    })
    assert.deepEqual(datosBancariosEn(fila), [])
  })

  it('no confunde un uuid cuyos grupos de dígitos, unidos, pasan Luhn', () => {
    // Salió de un `actor_user_id` real de la base de prueba de Communication OS, que no se
    // revierte: cada corrida suma uuids y, tarde o temprano, uno así hacía fallar AM-10b.
    assert.deepEqual(datosBancariosEn(JSON.stringify({ actor: '4d411132-2559-4605-8feb-b086c26ba31d' })), [])
    // Pero la misma tarjeta, escrita por un cliente con guiones, sigue apareciendo.
    assert.ok(datosBancariosEn('4539-1488-0343-6467').includes('4539148803436467'))
  })
})
