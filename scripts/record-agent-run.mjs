#!/usr/bin/env node
// Registra eventos append-only del lifecycle de una sesión de Claude Code.
//
//   SessionStart(startup|resume|clear)      → RUN_STARTED con runId nuevo
//   SessionStart(compact)                   → no-op: el run en curso continúa
//   SessionEnd                              → RUN_ENDED con el runId correlacionado
//
// El runId lo genera RUN_STARTED al azar y lo guarda en estado local NO versionado
// bajo la ruta de Git (`git rev-parse --git-path agentrun-state`). SessionEnd lo lee
// de ahí. La clave combina session_id con el proceso anfitrión del hook para separar
// dos resumes concurrentes de la misma sesión.
//
// Los errores de entrada, de correlación o de escritura terminan con código 1
// (SessionStart y SessionEnd no son eventos bloqueables; el fallo queda visible).

import { appendFileSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { createHash, randomBytes, randomUUID } from 'node:crypto'
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
const SESSION_START_SOURCES = new Set(['startup', 'resume', 'clear', 'compact'])

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
if (eventType === 'RUN_STARTED' && !SESSION_START_SOURCES.has(hook.source))
  die('entrada', `source de SessionStart inválido: ${hook.source ?? 'ausente'}`)

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
// Cada invocación del hook es hija del proceso de Claude Code que aloja la sesión.
// El override existe sólo para reproducir procesos independientes en tests.
const executionKey = process.env.AGENTRUN_EXECUTION_KEY || String(process.ppid)
const stateKey = createHash('sha256')
  .update(`${hook.session_id}\0${executionKey}`)
  .digest('hex')
const stateFile = join(stateDir, `${stateKey}.json`)

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
      `${JSON.stringify({
        runId,
        providerSessionId: hook.session_id,
        startedAt: iso,
        source: hook.source ?? null,
        persisted: false,
      })}\n`,
      { flag: 'wx' },
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
  if (startedState.providerSessionId !== hook.session_id)
    die('correlación', `estado de correlación pertenece a otra sesión`)
  if (startedState.persisted !== true)
    die('correlación', `RUN_STARTED no confirmado en el ledger para ${hook.session_id}`)
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
  eventId: `e_${day.replaceAll('-', '')}_${randomUUID().replaceAll('-', '')}`,
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
  // Una reserva pendiente nunca debe habilitar un RUN_ENDED sin RUN_STARTED.
  if (eventType === 'RUN_STARTED') {
    try {
      rmSync(stateFile, { force: true })
    } catch {
      /* persisted:false también impide consumirla si el rollback falla */
    }
  }
  die('escritura', `no se pudo escribir el ledger: ${error.message}`)
}

if (eventType === 'RUN_STARTED') {
  try {
    writeFileSync(
      stateFile,
      `${JSON.stringify({ ...JSON.parse(readFileSync(stateFile, 'utf8')), persisted: true })}\n`,
    )
  } catch (error) {
    // RUN_STARTED ya es evidencia durable. Sin estado confirmado quedará RUNNING,
    // pero nunca podrá producirse un RUN_ENDED huérfano.
    die('escritura', `RUN_STARTED escrito pero no se pudo confirmar su estado: ${error.message}`)
  }
} else {
  // RUN_ENDED consume el estado de correlación sólo después del append exitoso.
  try {
    rmSync(stateFile, { force: true })
  } catch {
    /* el evento ya quedó escrito; un estado huérfano no justifica fallar */
  }
}

process.exit(0)
