import assert from 'node:assert/strict'
import { cpSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'
import test from 'node:test'

const root = fileURLToPath(new URL('../../', import.meta.url))
const checker = join(root, 'scripts/check-docs.mjs')

function check(t, slices = {}) {
  const fixture = mkdtempSync(join(tmpdir(), 'del-campo-slices-'))
  t.after(() => rmSync(fixture, { recursive: true, force: true }))
  // Solo contexto versionable; no se copian datos, credenciales ni configuración local.
  for (const name of ['decisions.yaml', 'DECISIONS', 'TASKS', 'PROJECT.md',
    'DOMAIN.md', 'AGENTS.md', 'CLAUDE.md', 'ENGINEERING_RULES.md']) {
    cpSync(join(root, name), join(fixture, name), { recursive: true })
  }
  for (const [name, content] of Object.entries(slices)) {
    const path = resolve(fixture, 'SLICES', name)
    mkdirSync(dirname(path), { recursive: true })
    writeFileSync(path, content)
  }
  const result = spawnSync(process.execPath, [checker], { cwd: fixture, encoding: 'utf8' })
  assert.ifError(result.error)
  return { status: result.status, output: result.stdout + result.stderr }
}

test('el checker funciona cuando SLICES todavía no existe', (t) => {
  const result = check(t)
  assert.equal(result.status, 0, result.output)
})

test('admite referencias existentes en slices y subdirectorios', (t) => {
  const result = check(t, {
    'VS01.md': '# Contrato\nD-0019 y D-0040.\n',
    'history/VS00.md': '# Historia\nD-0009.\n',
  })
  assert.equal(result.status, 0, result.output)
})

test('rechaza una referencia inexistente con el path del slice', (t) => {
  const result = check(t, { 'VS01.md': '# Contrato\nD-9999.\n' })
  assert.equal(result.status, 1, result.output)
  assert.match(result.output, /SLICES\/VS01\.md: referencia a una decisión inexistente: D-9999/)
})

test('no omite referencias inexistentes dentro de subdirectorios', (t) => {
  const result = check(t, { 'history/VS00.md': '# Historia\nD-9999.\n' })
  assert.equal(result.status, 1, result.output)
  assert.match(result.output, /SLICES\/history\/VS00\.md: referencia a una decisión inexistente/)
})

test('un slice no puede copiar estados del índice de decisiones', (t) => {
  const result = check(t, { 'VS01.md': '# Contrato\nD-0019: ACCEPTED\n' })
  assert.equal(result.status, 1, result.output)
  assert.match(result.output, /SLICES\/VS01\.md:2: afirma el estado de una decisión/)
})
