import assert from 'node:assert/strict'
import { existsSync, readFileSync, writeFileSync, mkdirSync, mkdtempSync, rmSync, symlinkSync, linkSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'
import test from 'node:test'

const root = fileURLToPath(new URL('../../', import.meta.url))
const installed = join(root, '.claude/hooks/protect-paths.mjs')
const originalSettings = readFileSync(join(root, '.claude/settings.json'), 'utf8')

// T-0043: se prueba el hook instalado. El circuito de propuesta y parche de T-0008
// (REVIEWS/T-0008/*.proposed.*) queda como historia.
function fixture(t) {
  const dir = mkdtempSync(join(tmpdir(), 'del-campo-t0008-'))
  t.after(() => rmSync(dir, { recursive: true, force: true }))
  for (const folder of ['.claude/hooks', '.github/workflows', '.codex', 'TASKS', 'sub', 'scripts'])
    mkdirSync(join(dir, folder), { recursive: true })
  writeFileSync(join(dir, '.claude/settings.json'), originalSettings)
  writeFileSync(join(dir, '.claude/hooks/protect-paths.mjs'), readFileSync(installed, 'utf8'))
  writeFileSync(join(dir, '.github/workflows/check.yml'), 'name: before\n')
  writeFileSync(join(dir, 'TASKS/example.md'), 'before\n')
  writeFileSync(join(dir, 'scripts/check-docs.mjs'), '// validador\n')
  return dir
}

function invoke(dir, command, cwd = dir, raw) {
  const input = { hook_event_name: 'PreToolUse', tool_name: 'Bash', cwd, tool_input: { command } }
  const result = spawnSync(process.execPath, [join(dir, '.claude/hooks/protect-paths.mjs')], {
    cwd: dir, encoding: 'utf8', input: raw ?? JSON.stringify(input),
  })
  assert.equal(result.status, 0, result.stderr)
  return result.stdout.trim() ? JSON.parse(result.stdout).hookSpecificOutput.permissionDecision : 'continue'
}

for (const [name, command] of [
  ['sed settings', "sed -i '' 's/before/after/' .claude/settings.json"],
  ['sed workflow', "sed -i '' 's/before/after/' .github/workflows/check.yml"],
  ['GNU sed', "sed -i 's/before/after/' .claude/settings.json"],
  ['backup sed', "sed -i.bak 's/before/after/' .github/workflows/check.yml"],
  ['borrar ancestro', 'rm -r .github'],
  ['mover control', 'mv .claude elsewhere'],
  ['redirección', "printf bad > .claude/settings.json"],
  ['comando compuesto', "cd .claude && sed -i '' 's/before/after/' settings.json"],
  ['traversal explícito', "sed -i '' 's/before/after/' TASKS/../.claude/settings.json"],
  ['escritura en .codex', 'cp TASKS/example.md .codex/hooks.json'],
  ['sed sobre un validador', "sed -i '' 's/before/after/' scripts/check-docs.mjs"],
  ['borrar un validador', 'rm scripts/check-docs.mjs'],
  ['copiar hacia el directorio de un validador', 'cp TASKS/example.md scripts/'],
  ['borrar con ruta absoluta del programa', '/usr/bin/rm -r scripts'],
]) {
  test(`deniega ${name} sin ejecutar ni cambiar la entrada`, (t) => {
    const dir = fixture(t)
    const before = readFileSync(join(dir, '.claude/settings.json'), 'utf8')
    assert.equal(invoke(dir, command), 'deny')
    assert.equal(readFileSync(join(dir, '.claude/settings.json'), 'utf8'), before)
    assert.equal(readFileSync(join(dir, '.github/workflows/check.yml'), 'utf8'), 'name: before\n')
  })
}

test('deniega alias por symlink y ruta absoluta protegida', (t) => {
  const dir = fixture(t)
  symlinkSync(join(dir, '.claude'), join(dir, 'alias'))
  assert.equal(invoke(dir, "sed -i '' 's/before/after/' alias/settings.json"), 'deny')
  assert.equal(invoke(dir, `sed -i '' 's/before/after/' '${join(dir, '.claude/settings.json')}'`), 'deny')
  assert.equal(invoke(dir, "sed -i '' 's/before/after/' settings.json", join(dir, '.claude')), 'deny')
})

for (const command of [
  'python3 script.py', 'node scripts/check-docs.mjs', 'pnpm check',
  'git checkout other', 'git apply input.patch', 'bash script.sh',
  "p=target; sed -i '' 's/before/after/' \"$p\"",
  "sed -i '' 's/before/after/' TASKS/*.md",
  "sed -i '' 's/before/after/e' TASKS/example.md",
  "sed -i '' 's/before/after/;w output' TASKS/example.md",
  "sed -i '' -f program.sed TASKS/example.md",
  "sed -i '' 's/before/after/' $(printf target)",
  "cat TASKS/example.md && node another.mjs",
]) {
  test(`sin decisión del hook, decide el modo de la sesión (D-0056): ${command}`, (t) => {
    const dir = fixture(t)
    assert.equal(invoke(dir, command), 'continue')
  })
}

test('hardlinks piden revisión incluso en auto o bypass; cwd externo vuelve al flujo normal', (t) => {
  const dir = fixture(t)
  linkSync(join(dir, '.claude/settings.json'), join(dir, 'TASKS/hardlink'))
  assert.equal(invoke(dir, "sed -i '' 's/before/after/' TASKS/hardlink"), 'ask')
  assert.equal(invoke(dir, "sed -i '' 's/before/after/' file", tmpdir()), 'continue')
})

test('lectura simple de configuración continúa por permisos normales', (t) => {
  const dir = fixture(t)
  assert.equal(invoke(dir, 'cat .claude/settings.json'), 'continue')
})

test('sed permitido sobre TASKS se ejecuta realmente solo en la copia temporal', (t) => {
  const dir = fixture(t)
  const args = process.platform === 'darwin'
    ? ['-i', '', 's/before/after/', 'TASKS/example.md']
    : ['-i', 's/before/after/', 'TASKS/example.md']
  const command = 'sed ' + args.map((arg) => `'${arg}'`).join(' ')
  assert.equal(invoke(dir, command), 'continue')
  const ran = spawnSync('/usr/bin/sed', args, { cwd: dir, encoding: 'utf8' })
  assert.equal(ran.status, 0, ran.stderr)
  assert.equal(readFileSync(join(dir, 'TASKS/example.md'), 'utf8'), 'after\n')
  assert.equal(readFileSync(join(dir, '.github/workflows/check.yml'), 'utf8'), 'name: before\n')
})

test('JSON inválido, herramienta equivocada y path ilegible se deniegan', (t) => {
  const dir = fixture(t)
  assert.equal(invoke(dir, '', dir, '{broken'), 'deny')
  assert.equal(invoke(dir, '', dir, '{}'), 'deny')
  assert.equal(invoke(dir, 'cat test', resolve(dir, 'nonexistent')), 'deny')
  assert.equal(invoke(dir, '', dir, JSON.stringify({ tool_name: 'Edit', cwd: dir })), 'deny')
})


test('el hook instalado está conectado una sola vez sobre Bash', () => {
  const configured = JSON.parse(originalSettings).hooks.PreToolUse?.filter((entry) =>
    entry.hooks?.some((hook) => hook.args?.includes('${CLAUDE_PROJECT_DIR}/.claude/hooks/protect-paths.mjs'))) ?? []
  assert.equal(existsSync(installed), true)
  assert.deepEqual(configured, [{
    matcher: 'Bash',
    hooks: [{ type: 'command', command: 'node', args: ['${CLAUDE_PROJECT_DIR}/.claude/hooks/protect-paths.mjs'], timeout: 5 }],
  }])
})

test('permissions.deny cubre las cinco rutas protegidas y los validadores (R-15)', () => {
  const deny = JSON.parse(originalSettings).permissions.deny
  for (const tool of ['Edit', 'Write'])
    for (const path of ['.claude/**', '.github/workflows/**', '.codex/**', '.gemini/**', '.agents/**',
      'scripts/check-*.mjs', 'scripts/guard-db-tests.mjs'])
      assert.ok(deny.includes(`${tool}(./${path})`), `falta ${tool}(./${path})`)
})
