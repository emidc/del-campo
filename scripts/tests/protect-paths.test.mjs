import assert from 'node:assert/strict'
import { existsSync, readFileSync, writeFileSync, mkdirSync, mkdtempSync, rmSync, symlinkSync, linkSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'
import test from 'node:test'

const root = fileURLToPath(new URL('../../', import.meta.url))
const patch = join(root, 'REVIEWS/T-0008/protected-paths.patch')
const proposal = join(root, 'REVIEWS/T-0008/protect-paths.proposed.mjs')
const originalSettings = readFileSync(join(root, '.claude/settings.json'), 'utf8')

function fixture(t) {
  const dir = mkdtempSync(join(tmpdir(), 'del-campo-t0008-'))
  t.after(() => rmSync(dir, { recursive: true, force: true }))
  for (const folder of ['.claude', '.github/workflows', 'TASKS', 'sub']) mkdirSync(join(dir, folder), { recursive: true })
  writeFileSync(join(dir, '.claude/settings.json'), originalSettings)
  if (JSON.parse(originalSettings).hooks.PreToolUse?.some((entry) =>
    entry.hooks?.some((hook) => hook.args?.includes('${CLAUDE_PROJECT_DIR}/.claude/hooks/protect-paths.mjs')))) {
    const reversed = spawnSync('git', ['apply', '-R', '--include=.claude/settings.json', patch], { cwd: dir, encoding: 'utf8' })
    assert.equal(reversed.status, 0, reversed.stderr)
  }
  writeFileSync(join(dir, '.github/workflows/check.yml'), 'name: before\n')
  writeFileSync(join(dir, 'TASKS/example.md'), 'before\n')
  const applied = spawnSync('git', ['apply', '--check', patch], { cwd: dir, encoding: 'utf8' })
  assert.equal(applied.status, 0, applied.stderr)
  const apply = spawnSync('git', ['apply', patch], { cwd: dir, encoding: 'utf8' })
  assert.equal(apply.status, 0, apply.stderr)
  assert.equal(readFileSync(join(dir, '.claude/hooks/protect-paths.mjs'), 'utf8'), readFileSync(proposal, 'utf8'))
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

test('patch conserva deny rules y captura AgentRun; agrega solo PreToolUse', (t) => {
  const dir = fixture(t)
  const before = JSON.parse(originalSettings)
  const after = JSON.parse(readFileSync(join(dir, '.claude/settings.json'), 'utf8'))
  assert.deepEqual(after.permissions, before.permissions)
  assert.deepEqual(after.hooks.SessionStart, before.hooks.SessionStart)
  assert.deepEqual(after.hooks.SessionEnd, before.hooks.SessionEnd)
  assert.equal(after.hooks.PreToolUse[0].matcher, 'Bash')
  assert.equal(after.hooks.PreToolUse[0].hooks[0].args[0], '${CLAUDE_PROJECT_DIR}/.claude/hooks/protect-paths.mjs')
  assert.equal(readFileSync(join(root, '.claude/settings.json'), 'utf8'), originalSettings)
})

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
  test(`pide revisión humana: ${command}`, (t) => {
    const dir = fixture(t)
    assert.equal(invoke(dir, command), 'ask')
  })
}

test('hardlinks y cwd externo no reciben pase automático', (t) => {
  const dir = fixture(t)
  linkSync(join(dir, '.claude/settings.json'), join(dir, 'TASKS/hardlink'))
  assert.equal(invoke(dir, "sed -i '' 's/before/after/' TASKS/hardlink"), 'ask')
  assert.equal(invoke(dir, "sed -i '' 's/before/after/' file", tmpdir()), 'ask')
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


test('si el hook está instalado, coincide con la propuesta probada y está conectado', () => {
  const installed = join(root, '.claude/hooks/protect-paths.mjs')
  const configured = JSON.parse(originalSettings).hooks.PreToolUse?.filter((entry) =>
    entry.hooks?.some((hook) => hook.args?.includes('${CLAUDE_PROJECT_DIR}/.claude/hooks/protect-paths.mjs'))) ?? []
  if (!existsSync(installed) && configured.length === 0) return
  assert.equal(existsSync(installed), true, 'Configuración sin archivo instalado')
  assert.equal(configured.length, 1, 'Hook instalado sin configuración única')
  assert.deepEqual(configured[0], {
    matcher: 'Bash',
    hooks: [{ type: 'command', command: 'node', args: ['${CLAUDE_PROJECT_DIR}/.claude/hooks/protect-paths.mjs'], timeout: 5 }],
  })
  assert.equal(readFileSync(installed, 'utf8'), readFileSync(proposal, 'utf8'), 'El hook instalado diverge de la propuesta probada')
})
