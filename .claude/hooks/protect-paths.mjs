// Propuesta: se instala por revisión humana en .claude/hooks/protect-paths.mjs.
// No ejecutar el comando recibido. No usar allow para saltar otros permisos.
// D-0056 (Session Trust Mode): el hook solo deniega destinos protegidos reconocibles
// y pide revisión ante hardlinks. Lo indeterminado vuelve al flujo normal de permisos
// (sin salida), para que el modo de la sesión decida: Manual pregunta y ofrece
// "don't ask again"; auto usa el clasificador; bypassPermissions ejecuta.
import { readdirSync, readFileSync, realpathSync, statSync } from 'node:fs'
import { dirname, isAbsolute, relative, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

const result = (permissionDecision, permissionDecisionReason) => ({
  hookSpecificOutput: { hookEventName: 'PreToolUse', permissionDecision, permissionDecisionReason },
})
const deny = (reason) => result('deny', `T-0008 / R-15: ${reason}`)
const ask = () => result('ask', 'T-0008 / D-0056: el comando escribe un archivo con hardlinks; podría alcanzar una ruta protegida. Confirmar el destino real.')
// Sin decisión: el flujo normal de permisos y el modo de la sesión deciden (D-0056).
const defer = () => null

// Subconjunto literal de shell, no un parser Bash. Lo demás va a revisión.
function words(command) {
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
    } else if (/[\n\r\\$`;|&<>(){}*?\[\]~]/.test(char)) {
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

export const PROTECTED_DIRS = ['.claude', '.github/workflows', '.codex', '.gemini', '.agents']
export const VALIDATOR = /^(check-[\w-]+|guard-db-tests)\.mjs$/
const MENTION = /\.claude(?![\w-])|\.github[\\/]+workflows|\.codex(?![\w-])|\.gemini(?![\w-])|\.agents(?![\w-])/i
// Los validadores se ejecutan todo el tiempo (`node scripts/check-docs.mjs`), así que sólo
// se deniega cuando un programa que escribe o mueve archivos los nombra. Un comando opaco
// que los modifica no se detecta acá: lo frenan permissions.deny, la revisión exigida por
// CI y la del owner.
const WRITERS = new Set(['sed', '/usr/bin/sed', 'mv', '/bin/mv', 'cp', '/bin/cp', 'rm', '/bin/rm',
  'tee', '/usr/bin/tee', 'truncate', 'ln', '/bin/ln', 'chmod', '/bin/chmod', 'perl', 'awk'])

export function validators(root) {
  try {
    return readdirSync(resolve(root, 'scripts')).filter((name) => VALIDATOR.test(name))
      .map((name) => `scripts/${name}`)
  } catch {
    return []
  }
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

function evaluate(input, projectRoot) {
  if (input?.hook_event_name !== 'PreToolUse' || input?.tool_name !== 'Bash')
    return deny('entrada inesperada; comprobar la configuración del hook.')
  if (typeof input?.cwd !== 'string' || !isAbsolute(input.cwd) ||
      typeof input?.tool_input?.command !== 'string') return deny('entrada incompleta.')
  const command = input.tool_input.command
  if (!command.trim() || command.length > 65536) return deny('comando vacío o demasiado largo.')
  const root = realpathSync(projectRoot)
  const cwd = realpathSync(input.cwd)
  if (!contains(root, cwd)) return defer()
  // R-15 (T-0043): los guardrails de los tres proveedores, los workflows de CI y los
  // validadores. Las mismas rutas que .agents/hooks/protect-paths.mjs.
  const protectedPaths = PROTECTED_DIRS.map((p) => resolve(root, p))
    .flatMap((p) => [p, canonical(p)])
  const validatorPaths = validators(root).map((p) => resolve(root, p))
    .flatMap((p) => [p, canonical(p)])
  const tokens = words(command)
  if (!tokens?.length) {
    if (MENTION.test(command))
      return deny('comando compuesto u opaco menciona una ruta protegida; ejecutar la modificación desde revisión humana.')
    return defer()
  }
  const [program, ...args] = tokens
  // Lecturas simples: no hay operadores, expansiones ni ejecución de código.
  const readers = new Set(['cat', '/bin/cat', 'head', '/usr/bin/head',
    'tail', '/usr/bin/tail', 'wc', '/usr/bin/wc', 'ls', '/bin/ls', 'pwd', '/bin/pwd'])
  if (readers.has(program)) return null

  // No clasificamos un ../ indirecto como seguro mediante normalización textual.
  for (const token of args) {
    if (!token || token.startsWith('-')) continue
    const path = resolve(cwd, token)
    const actual = canonical(path)
    if (protectedPaths.some((p) => contains(p, path) || contains(p, actual) ||
        contains(path, p) || contains(actual, p)))
      return deny('destino protegido o directorio que lo contiene. El humano aplica el cambio.')
    if (WRITERS.has(program) && validatorPaths.some((p) => p === path || p === actual))
      return deny('el comando modifica un validador. El humano aplica el cambio.')
    try {
      if (statSync(actual).isFile() && statSync(actual).nlink > 1) return ask()
    } catch (error) {
      if (!['ENOENT', 'ENOTDIR'].includes(error.code)) throw error
    }
  }
  if (program !== 'sed' && program !== '/usr/bin/sed') return defer()

  // Única escritura autónoma reconocida: sustitución simple sed -i sobre archivos
  // locales regulares. No se interpretan sed e/w/r, scripts -f ni backups con rutas.
  let i = 1
  if (tokens[i] === '-i') {
    i++
    if (tokens[i] === '' || /^\.[\w-]+$/.test(tokens[i] ?? '')) i++
  } else if (/^-i\.[\w-]+$/.test(tokens[i] ?? '')) i++
  else return defer()
  if (tokens[i] === '-e') i++
  const script = tokens[i++]
  if (!/^s([/#|])([A-Za-z0-9 _.-]+)\1([A-Za-z0-9 _.-]*)\1g?$/.test(script ?? '')) return defer()
  const files = tokens.slice(i)
  if (!files.length) return defer()
  for (const file of files) {
    if (!file || file.startsWith('-')) return defer()
    const path = canonical(resolve(cwd, file))
    if (!contains(root, path)) return defer()
    const info = statSync(path)
    if (!info.isFile()) return defer()
    if (info.nlink !== 1) return ask()
  }
  return null
}

{
  let output
  try {
    // En la instalación, el hook vive exactamente en .claude/hooks/.
    const root = fileURLToPath(new URL('../../', import.meta.url))
    output = evaluate(JSON.parse(readFileSync(0, 'utf8')), root)
  } catch {
    output = deny('falló la validación de entrada o filesystem; no continuar automáticamente.')
  }
  if (output) process.stdout.write(`${JSON.stringify(output)}\n`)
}
