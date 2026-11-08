#!/usr/bin/env node

import { mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const hookScript = join(root, 'scripts', 'record-agent-run.mjs')
const auditDir = mkdtempSync(join(tmpdir(), 'del-campo-agentrun-check-'))

const fail = (message) => {
  throw new Error(message)
}
const check = (condition, message) => {
  if (!condition) fail(message)
}
const paths = (name) => ({
  AGENTRUN_DIR: join(auditDir, name, 'runs'),
  AGENTRUN_STATE_DIR: join(auditDir, name, 'state'),
})
const invoke = (input, env, expectedStatus = 0, args = []) => {
  const result = spawnSync(process.execPath, [hookScript, ...args], {
    cwd: root,
    env: { ...process.env, ...env },
    input: typeof input === 'string' ? input : JSON.stringify(input),
    encoding: 'utf8',
  })
  check(
    result.status === expectedStatus,
    `exit ${result.status}, esperaba ${expectedStatus}: ${result.stderr.trim()}`,
  )
  return result
}
const eventsFrom = (dir) => {
  try {
    return readdirSync(dir)
      .sort()
      .flatMap((file) =>
        readFileSync(join(dir, file), 'utf8')
          .trim()
          .split('\n')
          .filter(Boolean)
          .map(JSON.parse),
      )
  } catch {
    return []
  }
}
const fileCount = (dir) => {
  try {
    return readdirSync(dir).length
  } catch {
    return 0
  }
}

try {
  const lifecycle = paths('lifecycle')
  const base = { cwd: root, transcript_path: '/Users/nadie/transcript.jsonl' }

  invoke(
    { ...base, session_id: 'shared', hook_event_name: 'SessionStart', source: 'startup' },
    { ...lifecycle, AGENTRUN_EXECUTION_KEY: 'process-a' },
  )
  invoke(
    { ...base, session_id: 'shared', hook_event_name: 'SessionEnd', reason: 'other' },
    { ...lifecycle, AGENTRUN_EXECUTION_KEY: 'process-a' },
  )
  invoke(
    { ...base, session_id: 'shared', hook_event_name: 'SessionStart', source: 'resume' },
    { ...lifecycle, AGENTRUN_EXECUTION_KEY: 'process-b' },
  )
  invoke(
    { ...base, session_id: 'shared', hook_event_name: 'SessionEnd', reason: 'other' },
    { ...lifecycle, AGENTRUN_EXECUTION_KEY: 'process-b' },
  )

  const beforeCompact = eventsFrom(lifecycle.AGENTRUN_DIR).length
  invoke(
    { ...base, session_id: 'shared', hook_event_name: 'SessionStart', source: 'compact' },
    { ...lifecycle, AGENTRUN_EXECUTION_KEY: 'process-b' },
  )
  check(eventsFrom(lifecycle.AGENTRUN_DIR).length === beforeCompact, 'compact agregó un evento')

  invoke('{not-json', lifecycle, 1)
  invoke(
    { ...base, session_id: 'invalid-source', hook_event_name: 'SessionStart', source: 'fork' },
    { ...lifecycle, AGENTRUN_EXECUTION_KEY: 'invalid-source' },
    1,
  )
  invoke(
    { session_id: 'ghost', hook_event_name: 'SessionEnd', reason: 'other', cwd: root },
    { ...lifecycle, AGENTRUN_EXECUTION_KEY: 'ghost-process' },
    1,
  )

  const concurrent = paths('concurrent')
  for (const execution of ['terminal-a', 'terminal-b']) {
    invoke(
      { ...base, session_id: 'concurrent-session', hook_event_name: 'SessionStart', source: 'resume' },
      { ...concurrent, AGENTRUN_EXECUTION_KEY: execution },
    )
  }
  for (const execution of ['terminal-a', 'terminal-b']) {
    invoke(
      { ...base, session_id: 'concurrent-session', hook_event_name: 'SessionEnd', reason: 'other' },
      { ...concurrent, AGENTRUN_EXECUTION_KEY: execution },
    )
  }

  const failure = paths('failed-start')
  invoke(
    { ...base, session_id: 'failed-start', hook_event_name: 'SessionStart', source: 'startup' },
    {
      ...failure,
      AGENTRUN_DIR: '/dev/null/impossible',
      AGENTRUN_EXECUTION_KEY: 'failed-process',
    },
    1,
  )
  invoke(
    { ...base, session_id: 'failed-start', hook_event_name: 'SessionEnd', reason: 'other' },
    { ...failure, AGENTRUN_EXECUTION_KEY: 'failed-process' },
    1,
  )
  check(eventsFrom(failure.AGENTRUN_DIR).length === 0, 'un inicio fallido produjo RUN_ENDED')
  check(fileCount(failure.AGENTRUN_STATE_DIR) === 0, 'un inicio fallido dejó estado consumible')

  const sources = paths('sources')
  invoke(
    { ...base, session_id: 'source-project', hook_event_name: 'SessionStart', source: 'startup' },
    { ...sources, AGENTRUN_EXECUTION_KEY: 'source-project', AGENTRUN_SETTING_SOURCES: 'project' },
  )
  invoke(
    { ...base, session_id: 'source-invalid', hook_event_name: 'SessionStart', source: 'startup' },
    { ...sources, AGENTRUN_EXECUTION_KEY: 'source-invalid', AGENTRUN_SETTING_SOURCES: 'bare' },
  )

  // Codex y Gemini CLI (T-0039): mismo contrato, otro `provider`. Sin clave de proceso:
  // los dos lanzan el hook a través de un shell y el padre no es estable.
  const providers = paths('providers')
  const noKey = { ...providers, AGENTRUN_EXECUTION_KEY: '' }
  for (const [provider, sessionId] of [['codex', 'codex-session'], ['gemini-cli', 'gemini-session']]) {
    const args = ['--provider', provider]
    invoke({ ...base, session_id: sessionId, hook_event_name: 'SessionStart', source: 'startup' }, noKey, 0, args)
    invoke({ ...base, session_id: sessionId, hook_event_name: 'SessionEnd', reason: 'other' }, noKey, 0, args)
  }
  invoke({ ...base, session_id: 'codex-fork', hook_event_name: 'SessionStart', source: 'fork' }, noKey, 0, ['--provider', 'codex'])
  invoke({ ...base, session_id: 'gemini-fork', hook_event_name: 'SessionStart', source: 'fork' }, noKey, 1, ['--provider', 'gemini-cli'])
  invoke({ ...base, session_id: 'nobody', hook_event_name: 'SessionStart', source: 'startup' }, noKey, 1, ['--provider', 'otro'])
  const providerEvents = eventsFrom(providers.AGENTRUN_DIR)
  check(providerEvents.length === 5, `proveedores: esperaba 5 eventos, hay ${providerEvents.length}`)
  for (const provider of ['codex', 'gemini-cli']) {
    const own = providerEvents.filter((event) => event.provider === provider && event.providerSessionId !== 'codex-fork')
    check(own.length === 2 && own[0].runId === own[1].runId, `${provider}: start y end no correlacionan`)
  }

  const lifecycleEvents = eventsFrom(lifecycle.AGENTRUN_DIR)
  check(lifecycleEvents.length === 4, `lifecycle: esperaba 4 eventos, hay ${lifecycleEvents.length}`)
  const [start, end, resumed, resumedEnd] = lifecycleEvents
  check(start.runId === end.runId, 'startup y end no correlacionan')
  check(resumed.runId === resumedEnd.runId, 'resume y end no correlacionan')
  check(start.runId !== resumed.runId, 'resume reutilizó runId')
  check(start.providerSessionId === resumed.providerSessionId, 'resume cambió providerSessionId')
  check(fileCount(lifecycle.AGENTRUN_STATE_DIR) === 0, 'lifecycle dejó estado huérfano')

  const concurrentEvents = eventsFrom(concurrent.AGENTRUN_DIR)
  const concurrentRuns = Map.groupBy(concurrentEvents, (event) => event.runId)
  check(concurrentEvents.length === 4 && concurrentRuns.size === 2, 'concurrencia perdió eventos')
  for (const events of concurrentRuns.values()) {
    check(events.length === 2, 'run concurrente incompleto')
    check(events[0].eventType === 'RUN_STARTED' && events[1].eventType === 'RUN_ENDED', 'orden inválido')
  }
  check(fileCount(concurrent.AGENTRUN_STATE_DIR) === 0, 'concurrencia dejó estado huérfano')

  const sourceEvents = eventsFrom(sources.AGENTRUN_DIR)
  check(sourceEvents[0].settingSources === 'project', 'settingSources válido ignorado')
  check(sourceEvents[1].settingSources === 'unknown', 'settingSources inválido aceptado')

  check(lifecycleEvents.every((event) => event.provider === 'claude-code'), 'sin --provider no es claude-code')
  const allEvents = [...lifecycleEvents, ...concurrentEvents, ...sourceEvents, ...providerEvents]
  check(new Set(allEvents.map((event) => event.eventId)).size === allEvents.length, 'eventId duplicado')
  for (const event of allEvents) {
    check(event.eventId.length === 43, `eventId sin UUID completo: ${event.eventId}`)
    check(!('cwd' in event.providerRaw), 'providerRaw expone cwd')
    check(!('transcript_path' in event.providerRaw), 'providerRaw expone transcript_path')
  }

  console.log(`✓ AgentRun: ${allEvents.length} eventos; lifecycle, concurrencia, proveedores y fallos verificados`)

  // El ledger versionado en ops/runs/ cumple el esquema de ops/AGENTRUN.md.
  const ledger = eventsFrom(join(root, 'ops', 'runs'))
  const RAW_ALLOWED = new Set(['session_id', 'hook_event_name', 'source', 'reason', 'model', 'permission_mode'])
  const byProvider = {}
  for (const event of ledger) {
    const where = `ops/runs: ${event.eventId ?? 'evento sin eventId'}`
    check(/^e_\d{8}_[0-9a-f]+$/.test(event.eventId ?? ''), `${where}: eventId inválido`)
    check(/^r_[0-9a-f]+$/.test(event.runId ?? ''), `${where}: runId inválido`)
    check(['RUN_STARTED', 'RUN_ENDED'].includes(event.eventType), `${where}: eventType inválido`)
    check(!Number.isNaN(Date.parse(event.occurredAt)), `${where}: occurredAt inválido`)
    check(typeof event.providerSessionId === 'string' && event.providerSessionId, `${where}: falta providerSessionId`)
    check(['claude-code', 'codex', 'gemini-cli'].includes(event.provider), `${where}: provider inválido`)
    check(event.repoSha === null || /^[0-9a-f]{40}$/.test(event.repoSha), `${where}: repoSha inválido`)
    check(typeof event.settingSources === 'string', `${where}: falta settingSources`)
    check(event.providerRaw && typeof event.providerRaw === 'object', `${where}: falta providerRaw`)
    const extra = Object.keys(event.providerRaw).filter((key) => !RAW_ALLOWED.has(key))
    check(!extra.length, `${where}: providerRaw con campos no permitidos: ${extra.join(', ')}`)
    byProvider[event.provider] = (byProvider[event.provider] ?? 0) + 1
  }
  const summary = Object.entries(byProvider).map(([provider, count]) => `${provider} ${count}`).join(', ')
  console.log(`✓ ops/runs: ${ledger.length} eventos con el esquema vigente (${summary})`)
} finally {
  rmSync(auditDir, { recursive: true, force: true })
}
