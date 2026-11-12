import assert from 'node:assert/strict'
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'
import test from 'node:test'

// D-0080: máximo cinco tareas ACTIVE; una espera pasiva declara `waiting` y no cuenta.
const root = fileURLToPath(new URL('../../', import.meta.url))
const checker = join(root, 'scripts/check-docs.mjs')
const CONTEXT = ['decisions.yaml', 'DECISIONS', 'TASKS', 'SLICES', 'PROJECT.md',
  'DOMAIN.md', 'AGENTS.md', 'CLAUDE.md', 'ENGINEERING_RULES.md']

function fixture(t) {
  const dir = mkdtempSync(join(tmpdir(), 'del-campo-wip-'))
  t.after(() => rmSync(dir, { recursive: true, force: true }))
  for (const name of CONTEXT) cpSync(join(root, name), join(dir, name), { recursive: true })
  cpSync(join(root, 'ops/evidence'), join(dir, 'ops/evidence'), { recursive: true })
  return dir
}

function check(dir) {
  const result = spawnSync(process.execPath, [checker], { cwd: dir, encoding: 'utf8' })
  assert.ifError(result.error)
  return { status: result.status, output: result.stdout + result.stderr }
}

const task = (id, status, extra = '') => `---
id: ${id}
title: Tarea sintética de prueba
kind: CHORE
status: ${status}
workstream: POS
riskClass: LOW
contextRefs: []
${extra}---

## Why

Existe solo dentro de esta prueba.

## Outcome

El checker la ve como una tarea más.

## Non-scope

- No representa trabajo real del programa.

## Verification

\`\`\`bash
pnpm check
\`\`\`
`

// Completa hasta `n` tareas ACTIVE sintéticas por encima de las que ya tiene el repo.
function addActive(dir, ids, extra = '') {
  for (const id of ids) writeFileSync(join(dir, 'TASKS', `${id}-sintetica.md`), task(id, 'ACTIVE', extra))
}

// Las ACTIVE en espera pasiva (`waiting:`) no cuentan para el límite (D-0080).
const existingActive = () => {
  const r = spawnSync('grep', ['-l', '^status: ACTIVE', '-r', join(root, 'TASKS')], { encoding: 'utf8' })
  return r.stdout.split('\n').filter(Boolean).filter((f) => !/^waiting:/m.test(readFileSync(f, 'utf8'))).length
}

test('cinco tareas ACTIVE sin espera pasan', (t) => {
  const dir = fixture(t)
  const free = 5 - existingActive()
  addActive(dir, ['T-9901', 'T-9902', 'T-9903', 'T-9904', 'T-9905'].slice(0, free))
  const r = check(dir)
  assert.equal(r.status, 0, r.output)
})

test('seis tareas ACTIVE sin espera fallan nombrando D-0080', (t) => {
  const dir = fixture(t)
  const free = 6 - existingActive()
  addActive(dir, ['T-9901', 'T-9902', 'T-9903', 'T-9904', 'T-9905', 'T-9906'].slice(0, free))
  const r = check(dir)
  assert.notEqual(r.status, 0)
  assert.match(r.output, /máximo 5, D-0080/)
})

test('una tarea ACTIVE con waiting no cuenta', (t) => {
  const dir = fixture(t)
  const free = 5 - existingActive()
  addActive(dir, ['T-9901', 'T-9902', 'T-9903', 'T-9904', 'T-9905'].slice(0, free))
  addActive(dir, ['T-9906'], 'waiting: "factura del primer mes · próxima comprobación 2026-12-10"\n')
  const r = check(dir)
  assert.equal(r.status, 0, r.output)
})

test('waiting vacío o fuera de ACTIVE falla', (t) => {
  const dir = fixture(t)
  writeFileSync(join(dir, 'TASKS', 'T-9907-sintetica.md'), task('T-9907', 'ACTIVE', 'waiting: ""\n'))
  writeFileSync(join(dir, 'TASKS', 'T-9908-sintetica.md'), task('T-9908', 'READY', 'waiting: "algo"\n'))
  const r = check(dir)
  assert.notEqual(r.status, 0)
  assert.match(r.output, /T-9907.*waiting/)
  assert.match(r.output, /T-9908.*sólo vale en una tarea ACTIVE/)
})

test('una espera que vuelve a exigir trabajo cuenta otra vez', (t) => {
  const dir = fixture(t)
  const free = 5 - existingActive()
  addActive(dir, ['T-9901', 'T-9902', 'T-9903', 'T-9904', 'T-9905'].slice(0, free))
  const waiting = 'waiting: "observación de 14 días · próxima comprobación 2026-12-18"\n'
  addActive(dir, ['T-9906'], waiting)
  assert.equal(check(dir).status, 0)
  // Al retomar trabajo se quita `waiting`: la misma tarea pasa a ser el sexto frente.
  addActive(dir, ['T-9906'])
  const r = check(dir)
  assert.notEqual(r.status, 0)
  assert.match(r.output, /T-9906/)
})
