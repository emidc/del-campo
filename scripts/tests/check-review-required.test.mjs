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
  assert.match(result.errors[0], /nombran una tarea/)
})

test('un archivo nuevo en apps/*/src/lib cuenta como control de acceso; uno modificado sin nombre listado no', () => {
  assert.equal(sensitiveArea('apps/risk/src/lib/nuevo-control.ts', 'A'), 'controles de acceso de las apps')
  assert.equal(sensitiveArea('apps/risk/src/lib/pagina.ts', 'M'), null)
  assert.equal(sensitiveArea('apps/risk/src/lib/guard.ts', 'M'), 'controles de acceso de las apps')
  assert.equal(sensitiveArea('apps/web/src/app/api/vs01/route.ts', 'M'), 'endpoints y webhook')
  assert.equal(sensitiveArea('.agents/hooks/protect-paths.mjs', 'M'), 'guardrails')
})

test('una FEATURE implementada desde una rama sin id igual exige revisión (por la tarea que toca)', (t) => {
  const result = repo(t, { branch: 'chore/impl', kind: 'FEATURE', files: {
    'TASKS/T-9001-prueba.md': TASK('FEATURE') + '\nnota\n',
  } })
  assert.equal(result.ok, false)
  assert.match(result.errors[0], /T-9001 es FEATURE/)
})

test('rutas con acentos no se cuelan: un endpoint con ñ cuenta como sensible', (t) => {
  const result = repo(t, { branch: 'task/T-9001-x', files: { 'apps/web/src/app/api/niño/route.ts': 'export {}\n' } })
  assert.equal(result.ok, false)
  assert.match(result.errors[0], /niño/)
})

test('la lógica de los endpoints y los tests de denegación cuentan como sensibles', () => {
  assert.equal(sensitiveArea('apps/risk/src/lib/handlers.ts'), 'controles de acceso de las apps')
  assert.equal(sensitiveArea('packages/api/src/http.ts'), 'endpoints y webhook')
  assert.equal(sensitiveArea('apps/communication/src/lib/deny.test.ts'), 'controles de acceso de las apps')
})

test('un kind entre comillas es el mismo kind: "FEATURE" exige revisión', (t) => {
  for (const kind of ['"FEATURE"', "'MIGRATION'", 'FEATURE   # comentario']) {
    const result = repo(t, { branch: 'task/T-9001-x', kind, files: { 'README.md': 'y\n' } })
    assert.equal(result.ok, false, kind)
    assert.match(result.errors[0], /T-9001 es (FEATURE|MIGRATION)/)
  }
})

test('una tarea cuyo kind no se puede leer falla en vez de pasar', (t) => {
  const result = repo(t, { branch: 'task/T-9001-x', kind: '[sin, cerrar', files: { 'README.md': 'y\n' } })
  assert.equal(result.ok, false)
  assert.match(result.errors[0], /no se pudo leer su kind/)
})

test('un PR que sólo planifica una FEATURE nueva no exige revisión', (t) => {
  const result = repo(t, { branch: 'docs/plan', files: {
    'TASKS/T-9002-nueva.md': '---\nid: T-9002\nkind: FEATURE\nstatus: READY\n---\n',
    'docs/plan.md': 'plan\n',
  } })
  assert.equal(result.ok, true, result.errors.join('\n'))
  assert.match(result.reasons[0], /sólo la planifica/)
})

test('agregar la FEATURE junto con código sí exige revisión', (t) => {
  const result = repo(t, { branch: 'task/T-9002-nueva', files: {
    'TASKS/T-9002-nueva.md': '---\nid: T-9002\nkind: FEATURE\nstatus: ACTIVE\n---\n',
    'apps/web/src/components/boton.tsx': 'export {}\n',
  } })
  assert.equal(result.ok, false)
  assert.match(result.errors[0], /T-9002 es FEATURE/)
})

test('una vez planificada, implementarla exige revisión aunque el diff sea sólo documentación', (t) => {
  const result = repo(t, { branch: 'task/T-9001-x', kind: 'FEATURE', files: { 'docs/nota.md': 'x\n' } })
  assert.equal(result.ok, false)
  assert.match(result.errors[0], /T-9001 es FEATURE/)
})

test('un alta de planificación que toca código del prototipo en docs/ exige revisión', (t) => {
  const result = repo(t, { branch: 'docs/plan', files: {
    'TASKS/T-9002-nueva.md': '---\nid: T-9002\nkind: FEATURE\nstatus: READY\n---\n',
    'docs/north-star/prototipo/pruebas/permisos.js': 'export {}\n',
  } })
  assert.equal(result.ok, false)
  assert.match(result.errors[0], /T-9002 es FEATURE/)
  const html = repo(t, { branch: 'docs/plan', files: {
    'TASKS/T-9002-nueva.md': '---\nid: T-9002\nkind: FEATURE\nstatus: READY\n---\n',
    'docs/pagina.html': '<p>x</p>\n',
  } })
  assert.equal(html.ok, false)
})

test('renombrar una FEATURE de la base no la vuelve un alta de planificación', (t) => {
  const result = repo(t, { branch: 'amend/T-9001-x', kind: 'FEATURE', rename: ['TASKS/T-9001-prueba.md', 'TASKS/T-9001-otra.md'] })
  assert.equal(result.ok, false)
  assert.match(result.errors[0], /T-9001 es FEATURE/)
})

test('un archivo que no es .md con el prefijo de la tarea no decide el kind', (t) => {
  const result = repo(t, { branch: 'task/T-9001-x', kind: 'FEATURE', files: {
    'TASKS/T-9001-0.txt': '---\nid: T-9001\nkind: CHORE\n---\n',
    'apps/web/src/components/boton.tsx': 'export {}\n',
  } })
  assert.equal(result.ok, false)
  assert.match(result.errors[0], /T-9001 es FEATURE/)
})

test('una tarea cuyo único archivo no es .md no queda invisible', (t) => {
  for (const name of ['TASKS/T-9003-x.MD', 'TASKS/T-9003-x.txt']) {
    const result = repo(t, { branch: 'task/T-9003-impl', files: {
      [name]: '---\nid: T-9003\nkind: FEATURE\n---\n',
      'apps/web/src/components/boton.tsx': 'export {}\n',
    } })
    assert.equal(result.ok, false, name)
    assert.match(result.errors[0], /no se pudo leer su kind/)
  }
})
