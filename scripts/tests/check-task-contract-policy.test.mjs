// Casos de aceptación de la política de congelamiento de T-0043. Los preparó una revisión
// independiente con Codex el 09/11/2026; contra el checker anterior fallaban diez.
// Son fixtures locales, sin producción ni red.
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import { run } from '../check-task-contract.mjs'

const task = (id = 'T-9901', risk = 'HIGH') => `---
id: ${id}
title: Prueba sintética del contrato
kind: FEATURE
status: ACTIVE
workstream: POS
riskClass: ${risk}
contextRefs: [ENGINEERING_RULES.md, DOMAIN.md]
---

## Why

Comprobar el control con datos sintéticos.

## Outcome

La consulta rechaza usuarios sin permiso.

## Non-scope

- No toca producción ni envía comunicaciones.

## Verification

\`\`\`bash
pnpm check
\`\`\`

- [ ] La comprobación humana prevista se realizó.

## Data effects

No escribe datos ni modifica permisos.

## Notes

Nota libre.
`

function fixture(t, { branch = 'task/T-9901-prueba', mutate = s => s, risk = 'HIGH',
  second = false, otherFile = false, baseMutate = s => s } = {}) {
  const dir = mkdtempSync(join(tmpdir(), 'del-campo-contract-policy-'))
  t.after(() => rmSync(dir, { recursive: true, force: true }))
  const git = (...args) => execFileSync('git', args, {
    cwd: dir, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, GIT_CONFIG_NOSYSTEM: '1', GIT_CONFIG_GLOBAL: '/dev/null' }
  })
  const commit = message => {
    git('add', '-A')
    git('-c', 'user.name=Prueba sintética', '-c', 'user.email=test@example.invalid',
      '-c', 'commit.gpgsign=false', 'commit', '-qm', message, '--allow-empty')
  }
  git('init', '-q', '-b', 'main')
  mkdirSync(join(dir, 'TASKS'))
  writeFileSync(join(dir, 'TASKS/T-9901-prueba.md'), baseMutate(task('T-9901', risk)))
  writeFileSync(join(dir, 'TASKS/T-9902-prueba.md'), baseMutate(task('T-9902', risk)))
  commit('Base sintética')
  git('checkout', '-qb', branch)
  writeFileSync(join(dir, `TASKS/${second ? 'T-9902' : 'T-9901'}-prueba.md`),
    mutate(baseMutate(task(second ? 'T-9902' : 'T-9901', risk))))
  if (otherFile) writeFileSync(join(dir, 'README.md'), 'Documentación de prueba.\n')
  commit('Cambio sintético')
  const previous = process.cwd()
  process.chdir(dir)
  try { return run({ branchName: branch, baseRef: 'main' }) }
  finally { process.chdir(previous) }
}
const expectResult = (result, expected) =>
  assert.equal(result.ok, expected, JSON.stringify(result))

test('contrato intacto: permitido', t =>
  expectResult(fixture(t), true))
test('FEATURE a CHORE: bloqueado sin enmienda', t =>
  expectResult(fixture(t, { mutate: s => s.replace('kind: FEATURE', 'kind: CHORE') }), false))
test('HIGH a LOW: bloqueado sin enmienda', t =>
  expectResult(fixture(t, { mutate: s => s.replace('riskClass: HIGH', 'riskClass: LOW') }), false))
test('LOW a HIGH: permitido; activa los controles del nivel mayor', t =>
  expectResult(fixture(t, { risk: 'LOW', mutate: s => s.replace('riskClass: LOW', 'riskClass: HIGH') }), true))
test('eliminar contextRefs: bloqueado', t =>
  expectResult(fixture(t, { mutate: s => s.replace('[ENGINEERING_RULES.md, DOMAIN.md]', '[]') }), false))
test('sustituir una referencia de contexto: bloqueado', t =>
  expectResult(fixture(t, { mutate: s => s.replace('DOMAIN.md]', 'PROJECT.md]') }), false))
test('agregar referencia sin quitar las existentes: permitido', t =>
  expectResult(fixture(t, { mutate: s => s.replace('DOMAIN.md]', 'DOMAIN.md, PROJECT.md]') }), true))
test('eliminar Data effects: bloqueado', t =>
  expectResult(fixture(t, { mutate: s => s.replace(/## Data effects\n[\s\S]*?(?=## Notes)/, '') }), false))
test('cambiar efectos declarados: bloqueado', t =>
  expectResult(fixture(t, { mutate: s => s.replace('No escribe datos ni modifica permisos.', 'Escribe datos y modifica permisos.') }), false))
test('cambiar Outcome: bloqueado', t =>
  expectResult(fixture(t, { mutate: s => s.replace('rechaza usuarios sin permiso', 'acepta todos los usuarios') }), false))
for (const branch of ['docs/cierre', 'chore/cierre'])
  test(`${branch}: cambiar Outcome sigue bloqueado`, t =>
    expectResult(fixture(t, { branch, mutate: s => s.replace('rechaza usuarios sin permiso', 'acepta todos los usuarios') }), false))
test('cambiar contrato de otra tarea en la rama: bloqueado', t =>
  expectResult(fixture(t, { second: true, mutate: s => s.replace('rechaza usuarios sin permiso', 'acepta todos los usuarios') }), false))
test('marcar casilla sin cambiar texto: permitido', t =>
  expectResult(fixture(t, { mutate: s => s.replace('- [ ] La comprobación', '- [x] La comprobación') }), true))
test('marcar casilla y debilitar su texto: bloqueado', t =>
  expectResult(fixture(t, { mutate: s => s.replace('- [ ] La comprobación humana prevista se realizó.', '- [x] No hace falta comprobación humana.') }), false))
test('una casilla literal dentro del comando no se normaliza: bloqueado', t =>
  expectResult(fixture(t, {
    baseMutate: s => s.replace('pnpm check', 'printf "%s" "- [ ] literal"'),
    mutate: s => s.replace('"- [ ] literal"', '"- [x] literal"')
  }), false))
test('ACTIVE a DONE sin cambiar contrato: permitido por este control; otros checks validan evidencia', t =>
  expectResult(fixture(t, { mutate: s => s.replace('status: ACTIVE', 'status: DONE') }), true))
test('Notes sigue libre', t =>
  expectResult(fixture(t, { mutate: s => s.replace('Nota libre.', 'Otra nota libre.') }), true))
test('docs cambia sólo README: permitido', t =>
  expectResult(fixture(t, { branch: 'docs/typo', otherFile: true }), true))

