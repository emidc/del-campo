import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import test from 'node:test'

import { run, sensitiveArea } from '../check-review-required.mjs'

const TASK = (kind) => `---\nid: T-9001\nkind: ${kind}\n---\n`

function repo(t, { branch, kind = 'CHORE', files = {}, rename = null }) {
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
  if (rename) git('mv', ...rename)
  git('add', '-A')
  git('-c', 'user.name=t', '-c', 'user.email=t@example.invalid', 'commit', '-qm', 'rama', '--allow-empty')
  const previous = process.cwd()
  process.chdir(dir)
  try { return run({ branchName: branch, baseRef: 'main' }) } finally { process.chdir(previous) }
}

test('un cambio de documentación no exige revisión', (t) => {
  assert.equal(repo(t, { branch: 'docs/typo', files: { 'README.md': 'y\n' } }).ok, true)
})

test('una FEATURE con migración y endpoints no exige revisión (D-0089)', (t) => {
  const result = repo(t, { branch: 'task/T-9001-x', kind: 'FEATURE', files: {
    'packages/db/migrations/0099.sql': 'select 1;\n',
    'apps/web/src/app/api/vs01/route.ts': 'export {}\n',
    'apps/web/src/components/boton.tsx': 'export {}\n',
  } })
  assert.equal(result.ok, true, result.errors.join('\n'))
})

test('un cambio de permisos exige un reporte en REVIEWS/ que nombre la tarea', (t) => {
  const result = repo(t, { branch: 'task/T-9001-x', files: { 'packages/api/src/acceso/rol.ts': 'export {}\n' } })
  assert.equal(result.ok, false)
  assert.match(result.errors[0], /REVIEWS\//)
})

test('con un reporte en REVIEWS/ que nombra la tarea, pasa', (t) => {
  const result = repo(t, { branch: 'task/T-9001-x', files: {
    'packages/identidad/src/x.ts': 'export {}\n',
    'REVIEWS/T-9001-revision.md': 'reporte\n',
  } })
  assert.equal(result.ok, true, result.errors.join('\n'))
})

test('un reporte de otra tarea no cuenta', (t) => {
  const result = repo(t, { branch: 'task/T-9001-x', files: {
    '.claude/settings.json': '{}\n',
    'REVIEWS/T-9002-revision.md': 'reporte\n',
  } })
  assert.equal(result.ok, false)
})

test('un cambio sensible desde una rama sin tarea falla', (t) => {
  const result = repo(t, { branch: 'chore/limpieza', files: { 'scripts/check-docs.mjs': '\n' } })
  assert.equal(result.ok, false)
  assert.match(result.errors[0], /nombran una tarea/)
})

test('la tarea que entra en el mismo diff alcanza para nombrar el reporte', (t) => {
  const result = repo(t, { branch: 'chore/x', files: {
    'TASKS/T-9002-nueva.md': '---\nid: T-9002\nkind: CHORE\n---\n',
    '.github/workflows/ci.yml': 'x\n',
    'REVIEWS/T-9002-revision.md': 'reporte\n',
  } })
  assert.equal(result.ok, true, result.errors.join('\n'))
})

test('qué rutas son de permisos o seguridad', () => {
  assert.equal(sensitiveArea('apps/risk/src/lib/nuevo-control.ts', 'A'), 'controles de acceso de las apps')
  assert.equal(sensitiveArea('apps/risk/src/lib/pagina.ts', 'M'), null)
  assert.equal(sensitiveArea('apps/risk/src/lib/guard.ts', 'M'), 'controles de acceso de las apps')
  assert.equal(sensitiveArea('apps/communication/src/lib/deny.test.ts'), 'controles de acceso de las apps')
  assert.equal(sensitiveArea('.agents/hooks/protect-paths.mjs', 'M'), 'guardrails')
  assert.equal(sensitiveArea('scripts/tests/x.test.mjs'), 'validadores')
  assert.equal(sensitiveArea('packages/db/migrations/0014_x.sql'), null)
  assert.equal(sensitiveArea('apps/web/src/app/api/vs01/route.ts'), null)
  assert.equal(sensitiveArea('contexts/risk/src/persistence/x.ts'), null)
})

test('rutas con acentos no se cuelan', (t) => {
  const result = repo(t, { branch: 'task/T-9001-x', files: { 'packages/identidad/src/niño.ts': 'export {}\n' } })
  assert.equal(result.ok, false)
  assert.match(result.errors[0], /niño/)
})
