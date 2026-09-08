#!/usr/bin/env node
// Registra eventos append-only de una sesión de Claude Code.
// SessionStart → RUN_STARTED; SessionEnd → RUN_ENDED.
// Los dos eventos comparten runId y se proyectan luego a un AgentRun normalizado.

import { appendFileSync, mkdirSync, readFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { createHash, randomUUID } from 'node:crypto'
import { join, resolve } from 'node:path'

const readStdin = () => {
  try {
    return JSON.parse(readFileSync(0, 'utf8') || '{}')
  } catch {
    return {}
  }
}

try {
  const hook = readStdin()
  const eventType = {
    SessionStart: 'RUN_STARTED',
    SessionEnd: 'RUN_ENDED',
  }[hook.hook_event_name]

  if (!eventType || !hook.session_id) process.exit(0)

  const root = resolve(process.env.CLAUDE_PROJECT_DIR || hook.cwd || process.cwd())
  const git = (...args) => {
    try {
      return execFileSync('git', args, { cwd: root, stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim()
    } catch {
      return undefined
    }
  }

  const now = new Date()
  const branch = git('rev-parse', '--abbrev-ref', 'HEAD')
  const repoSha = git('rev-parse', 'HEAD')
  const runKey = `claude-code:${hook.session_id}`
  const record = {
    eventId: `e_${now.toISOString().slice(0, 10).replaceAll('-', '')}_${randomUUID().slice(0, 8)}`,
    runId: `r_${createHash('sha256').update(runKey).digest('hex').slice(0, 20)}`,
    eventType,
    occurredAt: now.toISOString(),
    taskId: branch?.match(/\b(T-\d{4})\b/)?.[1],
    provider: 'claude-code',
    providerSessionId: hook.session_id,
    transcriptPath: hook.transcript_path,
    repoSha: repoSha ?? null,
    harnessSha: git('log', '-1', '--format=%H', '--', '.claude'),
    settingSources: process.env.CLAUDE_SETTING_SOURCES ?? 'default',
    branch,
    terminationReason: eventType === 'RUN_ENDED' ? hook.reason : undefined,
    providerRaw: hook,
  }

  const dir = resolve(process.env.AGENTRUN_DIR || join(root, 'ops', 'runs'))
  mkdirSync(dir, { recursive: true })
  appendFileSync(join(dir, `${now.toISOString().slice(0, 10)}.jsonl`), `${JSON.stringify(record)}\n`)
} catch (error) {
  console.error(`[record-agent-run] omitido: ${error.message}`)
}

process.exit(0)
