#!/usr/bin/env node
// Protección local de rutas para Codex y Gemini CLI (T-0039, GOV-04a).
//
// Lo invocan `.codex/hooks.json` (PreToolUse) y `.gemini/settings.json` (BeforeTool).
// Para bloquear, Codex recibe código 2 con la razón en stderr y Gemini una decisión
// `deny` en JSON; los dos formatos están documentados. Código 0 sin salida deja la
// llamada al flujo normal de aprobación del proveedor: este hook no aprueba nada.
//
// Es un guardrail, no un límite de seguridad completo (la documentación de Codex lo
// dice de sus propios hooks). Un comando opaco que no nombra una ruta protegida pasa.
// La barrera que no se puede omitir sigue siendo CI y la revisión del PR por el owner.
//
// Fuentes, consultadas el 2026-11-08:
//   https://learn.chatgpt.com/docs/hooks.md (Codex hooks)
//   https://geminicli.com/docs/hooks/reference/ (Gemini CLI hooks)

import { readdirSync, readFileSync, realpathSync } from 'node:fs'
import { dirname, isAbsolute, relative, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

// Rutas que ningún agente modifica desde la máquina local: los guardrails de los tres
// proveedores, este hook, los workflows de CI y los validadores (R-15, T-0043).
export const PROTECTED = ['.claude', '.github/workflows', '.codex', '.gemini', '.agents']
export const VALIDATOR = /^(check-[\w-]+|guard-db-tests)\.mjs$/
const MENTION = /\.claude(?![\w-])|\.github[\\/]+workflows|\.codex(?![\w-])|\.gemini(?![\w-])|\.agents(?![\w-])/i

export function validators(root) {
  try {
    return readdirSync(resolve(root, 'scripts')).filter((name) => VALIDATOR.test(name))
      .map((name) => `scripts/${name}`)
  } catch {
    return []
  }
}

const SHELL_TOOLS = new Set(['Bash', 'shell', 'local_shell', 'exec_command', 'unified_exec', 'run_shell_command'])
const PATCH_TOOLS = new Set(['apply_patch'])
const FILE_TOOLS = new Set(['write_file', 'replace', 'Edit', 'Write'])
// Herramientas de sólo lectura o sin acceso al filesystem. Pasan sin revisar.
const READ_TOOLS = new Set([
  'read_file', 'read_many_files', 'list_directory', 'glob', 'grep_search', 'google_web_search',
  'web_fetch', 'ask_user', 'write_todos', 'update_plan', 'view_image', 'Read', 'Grep', 'Glob',
  'LS', 'WebSearch', 'WebFetch',
])
const READERS = new Set(['cat', 'head', 'tail', 'wc', 'ls', 'pwd', 'grep', 'rg', 'stat', 'file', 'diff'])
// git add y commit no cambian archivos del árbol; `git add .` no debe bloquearse.
const GIT_SAFE = new Set(['status', 'diff', 'log', 'show', 'ls-files', 'rev-parse', 'blame', 'grep', 'add', 'commit'])
const FIND_WRITES = /^-(delete|exec|execdir|ok|okdir|fprint|fprint0|fprintf|fls)$/

// Subconjunto literal de shell, no un parser. null = comando opaco o compuesto.
export function words(command) {
  const out = []
  let word = '', quote = '', started = false
  for (const char of command) {
    if (quote) {
      if (char === quote) { quote = ''; continue }
      if (quote === '"' && /[$`\\]/.test(char)) return null
      word += char
    } else if (char === "'" || char === '"') {
      quote = char
      started = true
    } else if (char === ' ' || char === '\t') {
      if (started) { out.push(word); word = ''; started = false }
    } else if (/[\n\r\\$`;|&<>(){}*?[\]~]/.test(char)) {
      return null
    } else {
      word += char
      started = true
    }
  }
  if (quote) return null
  if (started) out.push(word)
  return out
}

function canonical(path) {
  try { return realpathSync(path) } catch (error) {
    if (!['ENOENT', 'ENOTDIR'].includes(error.code)) throw error
    const parent = dirname(path)
    if (parent === path) throw error
    return resolve(canonical(parent), relative(parent, path))
  }
}

function contains(parent, child) {
  const rel = relative(parent.toLowerCase(), child.toLowerCase())
  return rel === '' || (rel !== '..' && !rel.startsWith(`..${sep}`) && !isAbsolute(rel))
}

function repoRoot(cwd) {
  let dir = cwd
  for (;;) {
    try { realpathSync(resolve(dir, '.git')); return dir } catch { /* sigue subiendo */ }
    const parent = dirname(dir)
    if (parent === dir) return cwd
    dir = parent
  }
}

// Un destino es protegido si está dentro de una ruta protegida o si la contiene
// (borrar `.github` borra los workflows).
function touchesProtected(root, cwd, target, { ancestors = true } = {}) {
  const path = resolve(cwd, target)
  const actual = canonical(path)
  return PROTECTED.map((p) => resolve(root, p)).flatMap((p) => [p, canonical(p)]).some((p) =>
    contains(p, path) || contains(p, actual) ||
    (ancestors && (contains(path, p) || contains(actual, p))))
}

// Un validador se ejecuta todo el tiempo; sólo cuenta escribirlo, moverlo o borrarlo.
const WRITERS = new Set(['sed', 'mv', 'cp', 'rm', 'tee', 'truncate', 'ln', 'chmod', 'perl', 'awk', 'install', 'rsync'])
// El destino puede ser el validador o, para un programa que escribe, el directorio que lo
// contiene (`cp x scripts/`, `rm -r scripts`).
function touchesValidator(root, cwd, target, { ancestors = false } = {}) {
  const path = resolve(cwd, target)
  const actual = canonical(path)
  return validators(root).map((p) => resolve(root, p)).flatMap((p) => [p, canonical(p)])
    .some((p) => p === path || p === actual || (ancestors && (contains(path, p) || contains(actual, p))))
}

function shellCommand(input) {
  const value = input?.command ?? input?.cmd
  if (typeof value === 'string') return { text: value, tokens: words(value) }
  if (Array.isArray(value) && value.every((part) => typeof part === 'string')) {
    // ["bash", "-lc", "<script>"]: lo que corre es el script.
    if (value.length === 3 && /(^|\/)(ba|z|da)?sh$/.test(value[0]) && /^-l?c$/.test(value[1]))
      return { text: value[2], tokens: words(value[2]) }
    return { text: value.join(' '), tokens: value }
  }
  return null
}

function evaluateShell(root, cwd, command) {
  if (!command) return 'entrada de shell sin comando reconocible.'
  const { text, tokens } = command
  if (!tokens?.length)
    return MENTION.test(text) ? 'comando compuesto u opaco que nombra una ruta protegida.' : null
  const [program, ...args] = tokens
  const name = program.split('/').pop()
  if (READERS.has(name)) return null
  if (name === 'git' && GIT_SAFE.has(args[0])) return null
  if (name === 'find' && !args.some((arg) => FIND_WRITES.test(arg))) return null
  for (const arg of args) {
    if (!arg || arg.startsWith('-')) continue
    if (touchesProtected(root, cwd, arg)) return `el comando alcanza una ruta protegida (${arg}).`
    if (WRITERS.has(name) && touchesValidator(root, cwd, arg, { ancestors: true })) return `el comando modifica un validador (${arg}).`
  }
  return null
}

function patchTargets(toolInput) {
  const text = Object.values(toolInput ?? {}).filter((v) => typeof v === 'string').join('\n')
  const targets = []
  for (const match of text.matchAll(/^\*\*\* (?:Add|Update|Delete) File: (.+)$|^\*\*\* Move to: (.+)$/gm))
    targets.push((match[1] ?? match[2]).trim())
  return targets
}

export function evaluate(input) {
  if (!['PreToolUse', 'BeforeTool'].includes(input?.hook_event_name)) return 'evento inesperado.'
  if (typeof input?.cwd !== 'string' || !isAbsolute(input.cwd) || typeof input?.tool_name !== 'string')
    return 'entrada incompleta.'
  const cwd = realpathSync(input.cwd)
  const root = repoRoot(cwd)
  const tool = input.tool_name
  const toolInput = input.tool_input ?? {}

  if (SHELL_TOOLS.has(tool)) return evaluateShell(root, cwd, shellCommand(toolInput))
  if (PATCH_TOOLS.has(tool) || (FILE_TOOLS.has(tool) && typeof toolInput.file_path !== 'string')) {
    const targets = patchTargets(toolInput)
    if (!targets.length) return MENTION.test(JSON.stringify(toolInput)) ? 'parche opaco que nombra una ruta protegida.' : null
    const hit = targets.find((target) => touchesProtected(root, cwd, target, { ancestors: false }) ||
      touchesValidator(root, cwd, target))
    return hit ? `el parche escribe una ruta protegida (${hit}).` : null
  }
  if (FILE_TOOLS.has(tool))
    return touchesProtected(root, cwd, toolInput.file_path, { ancestors: false }) ||
      touchesValidator(root, cwd, toolInput.file_path)
      ? `escritura en una ruta protegida (${toolInput.file_path}).` : null
  if (READ_TOOLS.has(tool)) return null
  // Herramienta desconocida (MCP, extensiones): se bloquea sólo si nombra una ruta protegida.
  return MENTION.test(JSON.stringify(toolInput)) ? `${tool} nombra una ruta protegida.` : null
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  let input, reason
  try {
    input = JSON.parse(readFileSync(0, 'utf8'))
    reason = evaluate(input)
  } catch {
    reason = 'falló la validación de la entrada o del filesystem.'
  }
  if (reason) {
    const message = `T-0039 / R-15: ${reason} Las rutas protegidas las cambia el owner por PR.`
    // Gemini CLI recomienda la decisión en JSON: el código 2 también bloquea, pero lo
    // informa como hook fallido. Codex, y cualquier entrada ilegible, usan código 2.
    if (input?.hook_event_name === 'BeforeTool') {
      process.stdout.write(`${JSON.stringify({ decision: 'deny', reason: message })}\n`)
    } else {
      process.stderr.write(`${message}\n`)
      process.exit(2)
    }
  }
}
