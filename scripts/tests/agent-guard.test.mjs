// T-0039, GOV-04a: intentos controlados contra el hook de rutas protegidas de Codex y
// Gemini CLI. Las entradas siguen los esquemas documentados por cada proveedor; las
// corridas con los CLIs reales quedan en ops/evidence/T-0039.md.
import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'
import test from 'node:test'

const hook = fileURLToPath(new URL('../../.agents/hooks/protect-paths.mjs', import.meta.url))

function fixture(t) {
  const dir = mkdtempSync(join(tmpdir(), 'del-campo-t0039-'))
  t.after(() => rmSync(dir, { recursive: true, force: true }))
  for (const folder of ['.git', '.claude', '.codex', '.gemini', '.agents/hooks', '.github/workflows', 'TASKS', 'sub'])
    mkdirSync(join(dir, folder), { recursive: true })
  writeFileSync(join(dir, 'TASKS/x.md'), 'antes\n')
  mkdirSync(join(dir, 'scripts'))
  writeFileSync(join(dir, 'scripts/check-docs.mjs'), '// validador\n')
  symlinkSync(join(dir, '.claude'), join(dir, 'sub/atajo'))
  return dir
}

// Normaliza las dos salidas de rechazo: Codex (código 2) y Gemini (JSON deny).
function run(raw) {
  const result = spawnSync(process.execPath, [hook], { input: raw, encoding: 'utf8' })
  const out = result.stdout.trim() ? JSON.parse(result.stdout) : null
  if (out) assert.equal(result.status, 0, 'Gemini: el rechazo en JSON sale con código 0')
  return out?.decision === 'deny'
    ? { status: 2, stderr: out.reason }
    : { status: result.status, stderr: result.stderr }
}

const codex = (cwd, tool_name, tool_input) => JSON.stringify({
  session_id: 's', transcript_path: null, cwd, hook_event_name: 'PreToolUse', model: 'm',
  turn_id: 't', tool_name, tool_use_id: 'u', tool_input, permission_mode: 'default',
})
const gemini = (cwd, tool_name, tool_input) => JSON.stringify({
  session_id: 's', transcript_path: '/tmp/t', cwd, hook_event_name: 'BeforeTool',
  timestamp: '2026-11-08T00:00:00Z', tool_name, tool_input,
})
const patch = (path) => `*** Begin Patch\n*** Update File: ${path}\n@@\n-antes\n+después\n*** End Patch\n`

const cases = [
  // Codex
  ['codex', 'redirección a .codex', 'Bash', { command: 'echo {} > .codex/hooks.json' }, 2],
  ['codex', 'sed sobre el propio hook', 'Bash', { command: "sed -i 's/a/b/' .agents/hooks/protect-paths.mjs" }, 2],
  ['codex', 'borrar el ancestro de workflows', 'Bash', { command: 'rm -r .github' }, 2],
  ['codex', 'formatear todo el repo', 'Bash', { command: 'prettier --write .' }, 2],
  ['codex', 'bash -lc en forma de arreglo', 'Bash', { command: ['bash', '-lc', 'cp x .gemini/settings.json'] }, 2],
  ['codex', 'exec_command con cmd', 'exec_command', { cmd: 'mv x .claude/settings.json' }, 2],
  ['codex', 'apply_patch sobre .claude', 'apply_patch', { command: patch('.claude/settings.json') }, 2],
  ['codex', 'apply_patch que mueve a .codex', 'apply_patch', { command: `*** Begin Patch\n*** Update File: TASKS/x.md\n*** Move to: .codex/x.md\n*** End Patch\n` }, 2],
  ['codex', 'apply_patch sobre TASKS', 'apply_patch', { command: patch('TASKS/x.md') }, 0],
  ['codex', 'leer settings de Claude', 'Bash', { command: 'cat .claude/settings.json' }, 0],
  ['codex', 'git add .', 'Bash', { command: 'git add .' }, 0],
  ['codex', 'comando sin rutas protegidas', 'Bash', { command: 'pnpm check && git status' }, 0],
  ['codex', 'MCP que nombra .gemini', 'mcp__fs__write', { path: '.gemini/settings.json' }, 2],
  // T-0043: los validadores se ejecutan libremente; escribirlos se rechaza.
  ['codex', 'correr un validador', 'Bash', { command: 'node scripts/check-docs.mjs' }, 0],
  ['codex', 'sed sobre un validador', 'Bash', { command: "sed -i 's/a/b/' scripts/check-docs.mjs" }, 2],
  ['codex', 'apply_patch sobre un validador', 'apply_patch', { command: patch('scripts/check-docs.mjs') }, 2],
  // Gemini CLI
  ['gemini', 'write_file sobre un validador', 'write_file', { file_path: 'scripts/check-docs.mjs', content: '' }, 2],
  ['gemini', 'write_file en .gemini', 'write_file', { file_path: '.gemini/settings.json', content: '{}' }, 2],
  ['gemini', 'replace en .claude', 'replace', { file_path: '.claude/settings.json', old_string: 'a', new_string: 'b' }, 2],
  ['gemini', 'write_file a través de un symlink', 'write_file', { file_path: 'sub/atajo/x.json', content: '{}' }, 2],
  ['gemini', 'run_shell_command hacia .codex', 'run_shell_command', { command: 'mv x .codex/' }, 2],
  ['gemini', 'shell opaco que nombra workflows', 'run_shell_command', { command: 'cd .github/workflows && touch y' }, 2],
  ['gemini', 'write_file en TASKS', 'write_file', { file_path: 'TASKS/x.md', content: 'después\n' }, 0],
  ['gemini', 'read_file de .claude', 'read_file', { file_path: '.claude/settings.json' }, 0],
]

for (const [provider, name, tool, input, expected] of cases) {
  test(`${provider}: ${name} → ${expected === 2 ? 'rechazo' : 'pasa'}`, (t) => {
    const dir = fixture(t)
    const result = run((provider === 'codex' ? codex : gemini)(dir, tool, input))
    assert.equal(result.status, expected, result.stderr)
    if (expected === 2) assert.match(result.stderr, /T-0039/)
    else assert.equal(result.stderr, '')
  })
}

test('rutas absolutas y cwd en un subdirectorio', (t) => {
  const dir = fixture(t)
  assert.equal(run(gemini(join(dir, 'sub'), 'write_file', { file_path: join(dir, '.codex/hooks.json') })).status, 2)
  assert.equal(run(codex(join(dir, 'sub'), 'Bash', { command: 'touch ../.agents/hooks/x' })).status, 2)
  assert.equal(run(codex(join(dir, 'sub'), 'Bash', { command: 'touch ../TASKS/y.md' })).status, 0)
})

test('entrada inválida o de otro evento: rechazo, nunca paso silencioso', () => {
  assert.equal(run('{no-json').status, 2)
  assert.equal(run(JSON.stringify({ hook_event_name: 'SessionStart', cwd: '/', tool_name: 'Bash' })).status, 2)
  assert.equal(run(JSON.stringify({ hook_event_name: 'PreToolUse', cwd: 'relativo', tool_name: 'Bash' })).status, 2)
})
