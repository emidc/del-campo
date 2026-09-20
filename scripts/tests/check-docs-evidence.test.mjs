import assert from 'node:assert/strict'
import { cpSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'
import test from 'node:test'

const root = fileURLToPath(new URL('../../', import.meta.url))
const checker = join(root, 'scripts/check-docs.mjs')

// Contexto versionable únicamente: ni datos, ni credenciales, ni configuración local.
const CONTEXT = ['decisions.yaml', 'DECISIONS', 'TASKS', 'SLICES', 'PROJECT.md',
  'DOMAIN.md', 'AGENTS.md', 'CLAUDE.md', 'ENGINEERING_RULES.md']

function fixture(t) {
  const dir = mkdtempSync(join(tmpdir(), 'del-campo-evidence-'))
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

const task = (id, status) => `---
id: ${id}
title: Tarea sintética de prueba
kind: CHORE
status: ${status}
workstream: POS
riskClass: LOW
contextRefs: []
---

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

const evidence = (omit = null) => ['## Comandos y salida literal', '## Observación externa',
  '## Qué NO se verificó']
  .filter((section) => section !== omit)
  .map((section) => `${section}\n\nContenido sintético.\n`)
  .join('\n')

test('el repositorio versionado satisface R-09b tal como está', (t) => {
  const result = check(fixture(t))
  assert.equal(result.status, 0, result.output)
})

test('una tarea DONE sin archivo de evidencia falla nombrando el archivo que falta', (t) => {
  const dir = fixture(t)
  rmSync(join(dir, 'ops/evidence/T-0001.md'))
  const result = check(dir)
  assert.equal(result.status, 1, result.output)
  assert.match(result.output, /T-0001-captura-de-agentrun\.md: status DONE exige el archivo de evidencia ops\/evidence\/T-0001\.md \(R-09b\)/)
})

test('una tarea DONE nueva pasa en cuanto su evidencia existe con las tres secciones', (t) => {
  const dir = fixture(t)
  writeFileSync(join(dir, 'TASKS/T-9998-sintetica.md'), task('T-9998', 'DONE'))
  mkdirSync(resolve(dir, 'ops/evidence'), { recursive: true })
  writeFileSync(join(dir, 'ops/evidence/T-9998.md'), `# Evidencia\n\n${evidence()}`)
  const result = check(dir)
  assert.equal(result.status, 0, result.output)
})

test('un archivo de evidencia incompleto falla nombrando la sección ausente', (t) => {
  const dir = fixture(t)
  writeFileSync(join(dir, 'TASKS/T-9998-sintetica.md'), task('T-9998', 'DONE'))
  writeFileSync(join(dir, 'ops/evidence/T-9998.md'),
    `# Evidencia\n\n${evidence('## Qué NO se verificó')}`)
  const result = check(dir)
  assert.equal(result.status, 1, result.output)
  assert.match(result.output, /ops\/evidence\/T-9998\.md: falta la sección obligatoria "## Qué NO se verificó" \(R-09b\)/)
})

test('la regla no alcanza a una tarea DROPPED', (t) => {
  const dir = fixture(t)
  writeFileSync(join(dir, 'TASKS/T-9997-sintetica.md'), task('T-9997', 'DROPPED'))
  const result = check(dir)
  assert.equal(result.status, 0, result.output)
})
