import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { effectiveStatus, parseAmount, statusFromZoho } from './policy-edit.ts'

describe('datos de póliza', () => {
  it('lee importes como los escribe el equipo', () => {
    assert.equal(parseAmount('1.234,56'), '1234.56')
    assert.equal(parseAmount('$ 12.000'), '12000')
    assert.equal(parseAmount('1234.5'), '1234.5')
    assert.equal(parseAmount('AR$ 39,204,000.00'), '39204000.00')
    assert.equal(parseAmount('AR$ 81,526.36'), '81526.36')
    assert.equal(parseAmount('US$ 1.500,50'), '1500.50')
    assert.equal(parseAmount('125,5'), '125.5')
    assert.equal(parseAmount(''), null)
    assert.equal(parseAmount('doce'), undefined)
  })

  it('traduce el Estado de Zoho y deja lo desconocido como vino', () => {
    assert.equal(statusFromZoho('VIGENTE'), 'ACTIVE')
    assert.equal(statusFromZoho('Renovada'), 'RENEWED')
    assert.equal(statusFromZoho('Suspendida'), 'Suspendida')
    assert.equal(statusFromZoho(''), null)
  })

  it('una Vigente cuyo fin llegó se ve Vencida aunque el vencimiento no haya corrido', () => {
    assert.equal(effectiveStatus('ACTIVE', '2026-11-08', '2026-11-08'), 'EXPIRED')
    assert.equal(effectiveStatus('ACTIVE', '2026-11-08', '2026-11-07'), 'ACTIVE')
    assert.equal(effectiveStatus('RENEWED', '2026-11-08', '2026-12-01'), 'RENEWED')
  })
})
