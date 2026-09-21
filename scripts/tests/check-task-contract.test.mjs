import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'

import {
  checkBranchName,
  getSection,
  run,
  splitSections,
} from '../check-task-contract.mjs'

const TASK = (verification = 'pnpm check') => `---
id: T-0001
title: Tarea sintética
kind: CHORE
status: READY
workstream: POS
riskClass: LOW
contextRefs: []
---

## Why

Existe solo para esta prueba.

## Outcome

El control ve una tarea más.

## Non-scope

- No representa trabajo real.

## Verification

\`\`\`bash
${verification}
\`\`\`

## Notes

Sección libre: puede cambiar sin romper nada.
`

function git(cwd, args) {
  return execFileSync('git', args, { cwd, encoding: 'utf8' })
}

// Repo con main en HEAD^ y una rama task/T-0001-... con un commit encima, para poder
// ejercitar merge-base de verdad en vez de simularlo.
function repoWithBranch(t, { branchName = 'task/T-0001-prueba', mutate = (dir) => {} } = {}) {
  const dir = mkdtempSync(join(tmpdir(), 'del-campo-contract-'))
  t.after(() => rmSync(dir, { recursive: true, force: true }))

  git(dir, ['init', '-q', '-b', 'main'])
  git(dir, ['config', 'user.email', 'test@example.com'])
  git(dir, ['config', 'user.name', 'Test'])

  mkdirSync(join(dir, 'TASKS'))
  writeFileSync(join(dir, 'TASKS/T-0001-prueba.md'), TASK())
  git(dir, ['add', '.'])
  git(dir, ['commit', '-q', '-m', 'main: agrega T-0001'])

  git(dir, ['checkout', '-q', '-b', branchName])
  mutate(dir)
  git(dir, ['add', '-A'])
  git(dir, ['commit', '-q', '--allow-empty', '-m', 'rama: cambios'])

  return dir
}

function runIn(dir, options) {
  const cwd = process.cwd()
  process.chdir(dir)
  try {
    return run({ baseRef: 'main', ...options })
  } finally {
    process.chdir(cwd)
  }
}

// --- Regla (a): nombre de rama -------------------------------------------------

test('una rama task/T-xxxx-... es válida y expone el task id', () => {
  const result = checkBranchName('task/T-0042-descripcion-corta')
  assert.deepEqual(result, { ok: true, taskId: 'T-0042' })
})

test('un prefijo exento (docs/) no requiere task id', () => {
  assert.deepEqual(checkBranchName('docs/typo'), { ok: true, taskId: null })
})

test('un prefijo exento (chore/) no requiere task id', () => {
  assert.deepEqual(checkBranchName('chore/algo'), { ok: true, taskId: null })
})

// Non-scope explícito: "No se agregan prefijos exentos más allá de los dos que el
// workflow declara." Un tercer prefijo cómodo (test/, fix/, wip/...) tiene que seguir
// cayendo en la regla (a), no colarse como si fuera exento.
test('una rama con un prefijo no declarado (test/) falla la regla (a), no se cuela como exenta', () => {
  const result = checkBranchName('test/mi-prueba')
  assert.equal(result.ok, false)
  assert.match(result.error, /R-29/)
})

test('una rama sin task id y sin prefijo exento falla nombrando R-29', () => {
  const result = checkBranchName('feature/algo')
  assert.equal(result.ok, false)
  assert.match(result.error, /R-29/)
})

// --- Falla conocida 1: GITHUB_REF_NAME no es el nombre de rama en pull_request -------

test('run() nunca deriva el nombre de rama de GITHUB_REF_NAME', (t) => {
  const dir = repoWithBranch(t)
  const previous = process.env.GITHUB_REF_NAME
  process.env.GITHUB_REF_NAME = 'refs/pull/42/merge'
  t.after(() => {
    if (previous === undefined) delete process.env.GITHUB_REF_NAME
    else process.env.GITHUB_REF_NAME = previous
  })

  // Sin CHECK_BRANCH_NAME explícito, cae a `git rev-parse --abbrev-ref HEAD`, que en
  // este repo de prueba es la rama real. Si el script leyera GITHUB_REF_NAME en su
  // lugar, intentaría matchear "refs/pull/42/merge" contra R-29 y fallaría la regla
  // (a) en un caso que debería pasar.
  const result = runIn(dir)
  assert.equal(result.ok, true, result.errors.join('\n'))
})

test('CHECK_BRANCH_NAME explícito tiene prioridad y es lo que el workflow debe cablear a github.head_ref', (t) => {
  const dir = repoWithBranch(t)
  const result = runIn(dir, { branchName: 'feature/rama-real-distinta' })
  assert.equal(result.ok, false)
  assert.match(result.errors[0], /R-29/)
})

// --- Falla conocida 2: checkout shallow sin fetch-depth: 0 --------------------------

test('un baseRef que no se pudo resolver localmente falla explícito, no pasa en silencio', (t) => {
  const dir = repoWithBranch(t)
  // Simula un checkout shallow: "origin/main" no existe porque nunca se hizo fetch.
  const result = runIn(dir, { baseRef: 'origin/main' })
  assert.equal(result.ok, false, 'un merge-base irresoluble no puede leerse como "todo bien"')
  assert.match(result.errors[0], /merge-base/)
  assert.match(result.errors[0], /shallow/)
})

// --- Reglas (b) y (c): tarea en el merge-base y contrato congelado ------------------

test('rama con task id cuya tarea no existe en el merge-base falla la regla (b)', (t) => {
  const dir = mkdtempSync(join(tmpdir(), 'del-campo-contract-'))
  t.after(() => rmSync(dir, { recursive: true, force: true }))
  git(dir, ['init', '-q', '-b', 'main'])
  git(dir, ['config', 'user.email', 'test@example.com'])
  git(dir, ['config', 'user.name', 'Test'])
  writeFileSync(join(dir, 'README.md'), 'x')
  git(dir, ['add', '.'])
  git(dir, ['commit', '-q', '-m', 'main sin TASKS/'])

  git(dir, ['checkout', '-q', '-b', 'task/T-9999-inexistente'])
  mkdirSync(join(dir, 'TASKS'))
  writeFileSync(join(dir, 'TASKS/T-9999-inexistente.md'), TASK())
  git(dir, ['add', '.'])
  git(dir, ['commit', '-q', '-m', 'crea la tarea en la propia rama'])

  const result = runIn(dir)
  assert.equal(result.ok, false)
  assert.match(result.errors[0], /no existe en el merge-base/)
})

test('modificar ## Verification en la rama rompe la regla (c)', (t) => {
  const dir = repoWithBranch(t, {
    mutate: (d) => writeFileSync(join(d, 'TASKS/T-0001-prueba.md'), TASK('pnpm check && pnpm lint')),
  })
  const result = runIn(dir)
  assert.equal(result.ok, false)
  assert.match(result.errors[0], /## Verification/)
})

test('modificar solo ## Notes pasa en verde: esa sección queda libre', (t) => {
  const dir = repoWithBranch(t, {
    mutate: (d) => {
      const original = TASK()
      writeFileSync(join(d, 'TASKS/T-0001-prueba.md'),
        original.replace('Sección libre: puede cambiar sin romper nada.', 'Nota nueva del implementador.'))
    },
  })
  const result = runIn(dir)
  assert.equal(result.ok, true, result.errors.join('\n'))
})

test('una rama docs/ sin tarea asociada pasa en verde', (t) => {
  const dir = repoWithBranch(t, { branchName: 'docs/typo' })
  const result = runIn(dir)
  assert.equal(result.ok, true, result.errors.join('\n'))
})

// --- Falla conocida 3: el extractor de secciones tiene que ser determinista ---------

test('un "## Verification" citado dentro de un bloque de código no parte la sección', () => {
  const text = `## Why\n\ncontenido\n\n## Outcome\n\n\`\`\`text\nejemplo con ## Verification adentro\nque no es un header real\n\`\`\`\n\nresto de Outcome\n\n## Non-scope\n\n- x\n`
  const outcome = getSection(text, '## Outcome')
  assert.match(outcome, /ejemplo con ## Verification adentro/)
  assert.match(outcome, /resto de Outcome/)
  assert.equal(getSection(text, '## Verification'), null)
})

test('CRLF no rompe la extracción ni produce un falso verde o falso rojo', () => {
  const lf = '## Why\r\n\r\ncontenido\r\n\r\n## Outcome\r\n\r\nx\r\n'
  const outcome = getSection(lf, '## Outcome')
  assert.equal(outcome, '\r\nx\r\n')
  const why = getSection(lf, '## Why')
  assert.equal(why, '\r\ncontenido\r\n\r\n')
})

test('una sección vacía se distingue de una sección ausente', () => {
  const text = '## Why\n\n## Outcome\n\ncontenido\n'
  assert.equal(getSection(text, '## Why'), '\n')
  assert.equal(getSection(text, '## Non-scope'), null)
})

test('splitSections no confunde un header real que sigue a un bloque de código', () => {
  const text = '## Verification\n\n```bash\npnpm check\n```\n\n## Notes\n\nlibre\n'
  const sections = splitSections(text)
  assert.deepEqual(sections.map((s) => s.name), ['## Verification', '## Notes'])
})
