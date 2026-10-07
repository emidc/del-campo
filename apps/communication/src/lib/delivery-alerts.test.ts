import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { deliveryAlerts } from './delivery-alerts.ts'

describe('la UI no aparenta estar al día (T-0026)', () => {
  it('sin failed, atascadas ni ignoradas, no hay alerta', () => {
    assert.deepEqual(deliveryAlerts({ failed: 0, stalled: 0, ignored: 0 }), [])
  })

  it('procesamiento detenido: las atascadas solas alertan', () => {
    assert.deepEqual(deliveryAlerts({ failed: 0, stalled: 1, ignored: 0 }), ['backlog'])
  })

  it('una entrega que falla siempre, o un atraso de failed, alerta', () => {
    assert.deepEqual(deliveryAlerts({ failed: 1, stalled: 0, ignored: 0 }), ['backlog'])
    assert.deepEqual(deliveryAlerts({ failed: 40, stalled: 3, ignored: 0 }), ['backlog'])
  })

  it('entregas recientes con todo de otro número alertan aparte, también sin atraso', () => {
    assert.deepEqual(deliveryAlerts({ failed: 0, stalled: 0, ignored: 1 }), ['ignored'])
    assert.deepEqual(deliveryAlerts({ failed: 1, stalled: 0, ignored: 2 }), ['backlog', 'ignored'])
  })
})
