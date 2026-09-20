#!/usr/bin/env node
// Imprime el estado de las decisiones desde decisions.yaml.
// Existe para que ningún documento tenga que escribir ese resumen a mano: lo que no
// está escrito no puede contradecir al índice. → R-04

import { readFileSync } from 'node:fs'
import { parse } from 'yaml'

const ORDER = ['ACCEPTED', 'PROVISIONAL', 'OPEN', 'SUPERSEDED', 'REJECTED']

const doc = parse(readFileSync('decisions.yaml', 'utf8')) ?? {}
const decisions = Array.isArray(doc.decisions) ? doc.decisions : []

const byStatus = new Map(ORDER.map((status) => [status, []]))
for (const decision of decisions) {
  if (!byStatus.has(decision?.status)) byStatus.set(decision?.status ?? '(sin status)', [])
  byStatus.get(decision?.status ?? '(sin status)').push(decision)
}

console.log(`decisions.yaml — ${decisions.length} decisiones · actualizado ${doc.updated ?? '(sin fecha)'}\n`)

for (const [status, list] of byStatus) {
  if (!list.length) continue
  console.log(`${status} (${list.length})`)
  for (const decision of list) {
    console.log(`  ${decision.id}  ${decision.title}`)
    if (status === 'PROVISIONAL' && decision.falsified_by)
      console.log(`           falsa si: ${String(decision.falsified_by).trim().replace(/\s+/g, ' ')}`)
    if (status === 'OPEN' && decision.unblocked_by)
      console.log(`           desbloquea: ${decision.unblocked_by}`)
    for (const entry of decision.superseded_in_part_by ?? [])
      console.log(`           reemplazado en parte por ${entry.by}: ${entry.clause}`)
  }
  console.log()
}

const withAdr = decisions.filter((decision) => decision.adr).length
console.log(`${withAdr} de ${decisions.length} decisiones tienen ADR.`)
