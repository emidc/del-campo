#!/usr/bin/env node
// Valida el esquema del ledger histórico de AgentRun en ops/runs/ (ops/AGENTRUN.md).
//
// Desde T-0043 la captura ya no es obligatoria y el capturador se retiró: este control
// sólo protege que el histórico siga legible y sin datos que no debía guardar. Un
// experimento deliberado puede agregar eventos con el mismo esquema.

import { readFileSync, readdirSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const dir = join(root, 'ops', 'runs')
const errors = []
const check = (condition, message) => {
  if (!condition) errors.push(message)
}

let files = []
try {
  files = readdirSync(dir).filter((file) => file.endsWith('.jsonl')).sort()
} catch {
  files = []
}

const RAW_ALLOWED = new Set(['session_id', 'hook_event_name', 'source', 'reason', 'model', 'permission_mode'])
const byProvider = {}
let count = 0
for (const file of files) {
  const lines = readFileSync(join(dir, file), 'utf8').split('\n').filter(Boolean)
  for (const [index, line] of lines.entries()) {
    let event
    try {
      event = JSON.parse(line)
    } catch {
      errors.push(`ops/runs/${file}:${index + 1}: JSON inválido`)
      continue
    }
    count += 1
    const where = `ops/runs/${file}: ${event.eventId ?? 'evento sin eventId'}`
    check(/^e_\d{8}_[0-9a-f]+$/.test(event.eventId ?? ''), `${where}: eventId inválido`)
    check(/^r_[0-9a-f]+$/.test(event.runId ?? ''), `${where}: runId inválido`)
    check(['RUN_STARTED', 'RUN_ENDED'].includes(event.eventType), `${where}: eventType inválido`)
    check(!Number.isNaN(Date.parse(event.occurredAt)), `${where}: occurredAt inválido`)
    check(typeof event.providerSessionId === 'string' && event.providerSessionId, `${where}: falta providerSessionId`)
    check(['claude-code', 'codex', 'gemini-cli'].includes(event.provider), `${where}: provider inválido`)
    check(event.repoSha === null || /^[0-9a-f]{40}$/.test(event.repoSha), `${where}: repoSha inválido`)
    check(typeof event.settingSources === 'string', `${where}: falta settingSources`)
    check(event.providerRaw && typeof event.providerRaw === 'object', `${where}: falta providerRaw`)
    const extra = Object.keys(event.providerRaw ?? {}).filter((key) => !RAW_ALLOWED.has(key))
    check(!extra.length, `${where}: providerRaw con campos no permitidos: ${extra.join(', ')}`)
    byProvider[event.provider] = (byProvider[event.provider] ?? 0) + 1
  }
}

for (const error of errors) console.error(`error  ${error}`)
const summary = Object.entries(byProvider).map(([provider, n]) => `${provider} ${n}`).join(', ')
console.log(errors.length
  ? `\n✗ ${errors.length} error(es) en ops/runs`
  : `✓ ops/runs: ${count} eventos históricos con el esquema vigente (${summary || 'ninguno'})`)
process.exit(errors.length ? 1 : 0)
