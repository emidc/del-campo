// La regla de responder en la app (decisión del owner del 2026-11-03, T-0035): responden
// el Administrador y el Operador Del Campo; el Revisor profesional no. Sin el permiso, el
// hilo llega con `mayReply: false` y la UI no muestra el formulario.

import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { puede, type ConversationThread } from '@del-campo/communication'

import { actorPuede } from './acceso.ts'
import { threadBody } from './handlers.ts'

const hilo: ConversationThread = {
  id: 1,
  label: { profileName: null, waIdLast4: '0001', bsuid: null },
  items: [],
  window: { open: true, closesAt: new Date('2026-11-03T20:00:00Z') },
  canReply: true,
  deliveries: { lastDeliveryAt: null, lastProcessedAt: null, failed: 0, stalled: 0, oldestUnprocessedAt: null, ignored: 0 },
}

describe('permiso de responder', () => {
  it('Administrador y Operador responden; el Revisor no', () => {
    assert.equal(puede('ADMINISTRADOR', 'conversacion.responder'), true)
    assert.equal(puede('OPERADOR', 'conversacion.responder'), true)
    assert.equal(puede('REVISOR', 'conversacion.responder'), false)
    assert.equal(puede('REVISOR', 'conversacion.consultar'), false)
  })

  it('actorPuede sigue al rol de la persona', () => {
    assert.equal(actorPuede({ autor: 'x', rol: 'OPERADOR' }, 'conversacion.responder'), true)
    assert.equal(actorPuede({ autor: 'x', rol: 'REVISOR' }, 'conversacion.responder'), false)
  })

  it('sin el permiso, el hilo no ofrece responder ni explica un bloqueo ajeno', () => {
    const sin = threadBody(hilo, true, false)
    assert.deepEqual({ mayReply: sin.mayReply, canReply: sin.canReply, reason: sin.replyBlockedReason }, {
      mayReply: false,
      canReply: false,
      reason: null,
    })
    const con = threadBody(hilo, true)
    assert.deepEqual({ mayReply: con.mayReply, canReply: con.canReply }, { mayReply: true, canReply: true })
  })
})
