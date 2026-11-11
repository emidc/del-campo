import assert from 'node:assert/strict'
import { test } from 'node:test'

import type { RenewalItem, ServiceCaseSummary, TaskSummary } from '@del-campo/db'

import { resumirInicio } from './indicadores.ts'

const gestion = (id: string, cambios: Partial<ServiceCaseSummary>): ServiceCaseSummary => ({
  id, kind: 'OTRO', title: id, status: 'ABIERTA', partyId: 'p', partyName: null, policyId: null, policyNumber: null,
  assignedEmail: null, assignedToMe: false, dueDate: null, createdAt: '', updatedAt: '', closedAt: null, claimStage: null, quote: null,
  ...cambios,
})

const renovacion = (id: string, cambios: Partial<RenewalItem>): RenewalItem => ({
  policyId: id, policyNumber: id, insurerName: 'A', holderPartyId: 'h', holderName: null, productReference: null,
  termEndDate: '2026-11-20', renewalMode: 'MANUAL', state: 'PENDIENTE', successorPolicyId: null,
  successorPolicyNumber: null, caseId: null, caseStatus: null, caseAssignedEmail: null, ...cambios,
})

const tarea = (id: string, cambios: Partial<TaskSummary>): TaskSummary => ({
  id, title: id, status: 'PENDIENTE', partyId: 'p', partyName: null, policyId: null, policyNumber: null,
  serviceCaseId: null, serviceCaseTitle: null, assignedEmail: null, assignedToMe: false, dueDate: null,
  createdAt: '', updatedAt: '', doneAt: null, ...cambios,
})

const valor = (inicio: ReturnType<typeof resumirInicio>, id: string): number => {
  const indicador = inicio.indicadores.find((i) => i.id === id)
  assert.ok(indicador, id)
  return indicador.valor
}

test('cada indicador cuenta lo que su definición dice', () => {
  const r = resumirInicio({
    hoy: '2026-11-11',
    abiertas: [
      gestion('a', { assignedToMe: true, assignedEmail: 'yo@x', dueDate: '2026-11-01' }),
      gestion('b', { assignedToMe: true, assignedEmail: 'yo@x', dueDate: '2026-12-01' }),
      gestion('c', { assignedToMe: true, assignedEmail: 'yo@x' }),
      gestion('d', { assignedEmail: 'otro@x', dueDate: '2026-11-01' }),
      gestion('e', {}),
    ],
    proximas: [
      renovacion('m1', {}),
      renovacion('m2', { state: 'CON_GESTION' }),
      renovacion('a1', { renewalMode: 'AUTOMATIC' }),
      renovacion('a2', { renewalMode: 'AUTOMATIC', state: 'RENOVADA' }),
    ],
    vencidas: [renovacion('v1', {}), renovacion('v2', { state: 'RENOVADA' })],
    carga: [],
    tareas: [
      tarea('t1', { assignedToMe: true, dueDate: '2026-11-10' }),
      tarea('t2', { assignedToMe: true, status: 'TRABADA', dueDate: '2026-11-30' }),
      tarea('t3', { assignedToMe: true }),
      tarea('t4', { status: 'TRABADA', dueDate: '2026-11-01' }),
    ],
  })
  assert.equal(valor(r, 'mias-vencidas'), 1)
  assert.equal(valor(r, 'mias-abiertas'), 3)
  assert.equal(valor(r, 'sin-responsable'), 1)
  assert.equal(valor(r, 'renovaciones-manuales'), 1)
  assert.equal(valor(r, 'renovaciones-automaticas'), 1)
  assert.equal(valor(r, 'renovaciones-vencidas'), 1)
  assert.equal(valor(r, 'mis-tareas-vencidas'), 1)
  assert.equal(valor(r, 'tareas-trabadas'), 2)
  assert.deepEqual(r.misTareas.map((t) => t.id), ['t1', 't2', 't3'])
  assert.match(r.indicadores.find((i) => i.id === 'tareas-trabadas')?.definicion ?? '', /De las 4 tareas/)
  // A atender: las mías, vencidas primero y después por vencimiento, sin fecha al final.
  assert.deepEqual(r.aAtender.map((g) => g.id), ['a', 'b', 'c'])
  // Cada definición nombra su denominador.
  assert.match(r.indicadores.find((i) => i.id === 'sin-responsable')?.definicion ?? '', /De las 5 gestiones/)
})

test('la carga del equipo va en orden alfabético, no por cantidad: sin ranking', () => {
  const r = resumirInicio({
    hoy: '2026-11-11', abiertas: [], proximas: [], vencidas: [], tareas: [],
    carga: [
      { userId: '1', email: 'zoe@x', open: 9, overdue: 3 },
      { userId: null, email: null, open: 4, overdue: 0 },
      { userId: '2', email: 'ana@x', open: 1, overdue: 0 },
    ],
  })
  assert.deepEqual(r.equipo.map((c) => c.email), ['ana@x', 'zoe@x'])
})
