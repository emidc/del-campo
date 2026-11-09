import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import test from 'node:test'

import { run, sensitiveArea } from '../check-review-required.mjs'

const TASK = (kind) => `---\nid: T-9001\nkind: ${kind}\n---\n`

function repo(t, { branch, kind = 'CHORE', files = {} }) {
  const dir = mkdtempSync(join(tmpdir(), 'del-campo-review-'))
  t.after(() => rmSync(dir, { recursive: true, force: true }))
  const git = (...args) => execFileSync('git', args, { cwd: dir, encoding: 'utf8',
    env: { ...process.env, GIT_CONFIG_NOSYSTEM: '1', GIT_CONFIG_GLOBAL: '/dev/null' } })
  const write = (path, text) => {
    mkdirSync(join(dir, dirname(path)), { recursive: true })
    writeFileSync(join(dir, path), text)
  }
  git('init', '-q', '-b', 'main')
  write('TASKS/T-9001-prueba.md', TASK(kind))
  write('README.md', 'x\n')
  git('add', '-A')
  git('-c', 'user.name=t', '-c', 'user.email=t@example.invalid', 'commit', '-qm', 'base')
  git('checkout', '-qb', branch)
  for (const [path, text] of Object.entries(files)) write(path, text)
  git('add', '-A')
  git('-c', 'user.name=t', '-c', 'user.email=t@example.invalid', 'commit', '-qm', 'rama', '--allow-empty')
  const previous = process.cwd()
  process.chdir(dir)
  try { return run({ branchName: branch, baseRef: 'main' }) } finally { process.chdir(previous) }
}

test('un cambio de documentación no exige revisión', (t) => {
  assert.equal(repo(t, { branch: 'docs/typo', files: { 'README.md': 'y\n' } }).ok, true)
})

test('una migración en una tarea CHORE/LOW exige revisión aunque la etiqueta no lo pida', (t) => {
  const result = repo(t, { branch: 'task/T-9001-x', files: { 'packages/db/migrations/0099.sql': 'select 1;\n' } })
  assert.equal(result.ok, false)
  assert.match(result.errors[0], /REVIEWS\//)
})

test('con un reporte en REVIEWS/ que nombra la tarea, pasa', (t) => {
  const result = repo(t, { branch: 'task/T-9001-x', files: {
    'packages/db/migrations/0099.sql': 'select 1;\n',
    'REVIEWS/T-9001-blind-review.md': 'reporte\n',
  } })
  assert.equal(result.ok, true, result.errors.join('\n'))
})

test('un reporte de otra tarea no cuenta', (t) => {
  const result = repo(t, { branch: 'task/T-9001-x', files: {
    '.claude/settings.json': '{}\n',
    'REVIEWS/T-9002-blind-review.md': 'reporte\n',
  } })
  assert.equal(result.ok, false)
})

test('una FEATURE exige revisión aunque no toque rutas sensibles (D-0052)', (t) => {
  const result = repo(t, { branch: 'task/T-9001-x', kind: 'FEATURE', files: { 'README.md': 'y\n' } })
  assert.equal(result.ok, false)
  assert.match(result.errors[0], /FEATURE/)
})

test('un cambio sensible desde una rama sin tarea falla', (t) => {
  const result = repo(t, { branch: 'chore/limpieza', files: { 'scripts/check-docs.mjs': '\n' } })
  assert.equal(result.ok, false)
  assert.match(result.errors[0], /no nombra una tarea/)
})

test('un archivo nuevo en apps/*/src/lib cuenta como control de acceso; uno modificado sin nombre listado no', () => {
  assert.equal(sensitiveArea('apps/risk/src/lib/nuevo-control.ts', 'A'), 'controles de acceso de las apps')
  assert.equal(sensitiveArea('apps/risk/src/lib/pagina.ts', 'M'), null)
  assert.equal(sensitiveArea('apps/risk/src/lib/guard.ts', 'M'), 'controles de acceso de las apps')
  assert.equal(sensitiveArea('apps/web/src/app/api/vs01/route.ts', 'M'), 'endpoints y webhook')
  assert.equal(sensitiveArea('.agents/hooks/protect-paths.mjs', 'M'), 'guardrails')
})
