#!/usr/bin/env node
// Registra eventos append-only del lifecycle de una sesión de Claude Code.
//
//   SessionStart(startup|resume|clear|fork) → RUN_STARTED con runId nuevo
//   SessionStart(compact)                   → no-op: el run en curso continúa
//   SessionEnd                              → RUN_ENDED con el runId correlacionado
//
// El runId lo genera RUN_STARTED al azar y lo guarda en estado local NO versionado
// bajo la ruta de Git (`git rev-parse --git-path agentrun-state`). SessionEnd lo lee
// de ahí. No se deriva del session_id porque resume/clear/fork reusan el session_id
// para runs distintos.
//
// Los errores de entrada, de correlación o de escritura terminan con código 1
// (no-bloqueante: la sesión sigue, pero el fallo queda visible). Nunca se usa el
// código 2, que bloquearía el arranque o el cierre de la sesión.

import { appendFileSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { randomBytes, randomUUID } from 'node:crypto'
import { join, resolve } from 'node:path'

// providerRaw preserva solo estos campos: descriptivos, de baja cardinalidad y sin
// rutas personales. Quedan fuera cwd y transcript_path.
const RAW_ALLOWED = new Set([
  'session_id',
  'hook_event_name',
  'source',
  'reason',
  'model',
  'permission_mode',
])

// settingSources solo acepta declaración explícita con estos tokens. Sin declaración
// es "unknown". "bare" no es capturable: sin settings cargados este hook no corre.
const SETTING_SOURCE_TOKENS = new Set(['default', 'project', 'user', 'local'])

const die = (kind, message) => {
  console.error(`[record-agent-run] error de ${kind}: ${message}`)
  process.exit(1)
}

// --- entrada ---------------------------------------------------------------
let raw
try {
  raw = readFileSync(0, 'utf8')
} catch (error) {
  die('entrada', `no se pudo leer stdin: ${error.message}`)
}
let hook
try {
  hook = JSON.parse(raw)
} catch {
  die('entrada', 'stdin no es JSON válido')
}
if (!hook || typeof hook !== 'object') die('entrada', 'el payload del hook no es un objeto')
if (!hook.hook_event_name) die('entrada', 'falta hook_event_name')

const eventType = { SessionStart: 'RUN_STARTED', SessionEnd: 'RUN_ENDED' }[hook.hook_event_name]
if (!eventType) process.exit(0) // un evento que este hook no proyecta

if (typeof hook.session_id !== 'string' || !hook.session_id) die('entrada', 'falta session_id')

// compact no abre un run: la sesión continúa con el runId ya asignado.
if (eventType === 'RUN_STARTED' && hook.source === 'compact') process.exit(0)

// --- contexto de repo ----------------------------------------------------
const root = resolve(process.env.CLAUDE_PROJECT_DIR || hook.cwd || process.cwd())
const git = (...args) => {
  try {
    return (
      execFileSync('git', args, { cwd: root, stdio: ['ignore', 'pipe', 'ignore'] })
        .toString()
        .trim() || undefined
    )
  } catch {
    return undefined
  }
}

const stateDir = process.env.AGENTRUN_STATE_DIR
  ? resolve(process.env.AGENTRUN_STATE_DIR)
  : resolve(root, git('rev-parse', '--git-path', 'agentrun-state') || join('.git', 'agentrun-state'))
const stateFile = join(stateDir, `${hook.session_id.replace(/[^A-Za-z0-9_-]/g, '_')}.json`)

const now = new Date()
const iso = now.toISOString()
const day = iso.slice(0, 10)

// --- runId: nuevo en RUN_STARTED, correlacionado en RUN_ENDED -------------
let runId
let startedState
if (eventType === 'RUN_STARTED') {
  runId = `r_${randomBytes(10).toString('hex')}`
  try {
    mkdirSync(stateDir, { recursive: true })
    writeFileSync(
      stateFile,
      `${JSON.stringify({ runId, startedAt: iso, source: hook.source ?? null })}\n`,
    )
  } catch (error) {
    die('escritura', `no se pudo guardar el estado de correlación: ${error.message}`)
  }
} else {
  try {
    startedState = JSON.parse(readFileSync(stateFile, 'utf8'))
  } catch {
    die('correlación', `SessionEnd sin RUN_STARTED previo para la sesión ${hook.session_id}`)
  }
  if (typeof startedState?.runId !== 'string')
    die('correlación', `estado de correlación corrupto para ${hook.session_id}`)
  runId = startedState.runId
}

// --- settingSources: unknown salvo declaración explícita -----------------
const declared = (process.env.AGENTRUN_SETTING_SOURCES ?? '')
  .split(',')
  .map((token) => token.trim())
  .filter(Boolean)
const settingSources =
  declared.length && declared.every((token) => SETTING_SOURCE_TOKENS.has(token))
    ? declared.join(',')
    : 'unknown'

const branch = git('rev-parse', '--abbrev-ref', 'HEAD')

const record = {
  eventId: `e_${day.replaceAll('-', '')}_${randomUUID().slice(0, 8)}`,
  runId,
  eventType,
  occurredAt: iso,
  taskId: branch?.match(/\b(T-\d{4})\b/)?.[1],
  provider: 'claude-code',
  providerSessionId: hook.session_id,
  transcriptPath: hook.transcript_path,
  repoSha: git('rev-parse', 'HEAD') ?? null,
  harnessSha: git('log', '-1', '--format=%H', '--', '.claude', 'scripts/record-agent-run.mjs'),
  settingSources,
  branch,
  terminationReason: eventType === 'RUN_ENDED' ? hook.reason : undefined,
  providerRaw: Object.fromEntries(
    Object.entries(hook).filter(([key]) => RAW_ALLOWED.has(key)),
  ),
}

// --- escritura append-only ---------------------------------------------
const dir = resolve(process.env.AGENTRUN_DIR || join(root, 'ops', 'runs'))
try {
  mkdirSync(dir, { recursive: true })
  appendFileSync(join(dir, `${day}.jsonl`), `${JSON.stringify(record)}\n`)
} catch (error) {
  die('escritura', `no se pudo escribir el ledger: ${error.message}`)
}

// RUN_ENDED consume el estado de correlación.
if (eventType === 'RUN_ENDED') {
  try {
    rmSync(stateFile, { force: true })
  } catch {
    /* el evento ya quedó escrito; un estado huérfano no justifica fallar */
  }
}

process.exit(0)
