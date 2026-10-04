import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { retentionCutoff } from './retention.ts'
import { isOutboundStatus, OUTBOUND_STATUSES, outranks } from './status.ts'

describe('regla de estados de un saliente', () => {
  it('avanza en el orden sent < delivered < read', () => {
    assert.equal(outranks('delivered', 'sent'), true)
    assert.equal(outranks('read', 'delivered'), true)
    assert.equal(outranks('read', 'sent'), true, 'read sin delivered: Meta no garantiza la secuencia completa')
  })

  it('un estado más antiguo que llega tarde no pisa a uno más avanzado', () => {
    assert.equal(outranks('delivered', 'read'), false)
    assert.equal(outranks('sent', 'read'), false)
    assert.equal(outranks('sent', 'delivered'), false)
  })

  it('failed es terminal y reemplaza a cualquier otro', () => {
    for (const s of ['sent', 'delivered', 'read'] as const) {
      assert.equal(outranks('failed', s), true)
      assert.equal(outranks(s, 'failed'), false)
    }
  })

  it('un empate no reemplaza', () => {
    for (const s of OUTBOUND_STATUSES) assert.equal(outranks(s, s), false)
  })

  it('reconoce solo los cuatro estados', () => {
    assert.deepEqual(OUTBOUND_STATUSES.filter(isOutboundStatus), [...OUTBOUND_STATUSES])
    assert.equal(isOutboundStatus('deleted'), false)
    assert.equal(isOutboundStatus('READ'), false)
  })
})

describe('retención', () => {
  it('el corte es 30 días exactos antes de ahora', () => {
    const now = new Date('2026-10-31T12:00:00Z')
    assert.equal(retentionCutoff(now).toISOString(), '2026-10-01T12:00:00.000Z')
  })
})
