// El manifiesto de la aceptación (T-0032): lo que acepta, lo que rechaza y que el error nunca
// repite el contenido del archivo, que es privado. Y la línea de comandos, que falla por el
// manifiesto antes de conectarse a ninguna base.

import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

import { ERROR_MANIFIESTO, leerManifiesto, ManifiestoInvalido } from './manifiesto.ts'

const org = (n: number): string => `ORG-${'0'.repeat(25)}${String(n)}`
const H = 'b'.repeat(64)

const valido = () => ({
  empresas: Object.fromEntries(['H1', 'H2', 'H3', 'H4', 'H5'].map((c, i) => [c, {
    organizacionId: org(i + 1),
    intentos: [
      { fecha: '2026-10-20', estado: 'rechazado', huella: 'a'.repeat(64), rechazos: { 'RV-RSK-01': 2 }, avisos: {} },
      { fecha: '2026-10-21', estado: 'importado', huella: H, rechazos: {}, avisos: { 'RV-EVA-08': 3 } },
    ],
  }])),
  personas: { R1: 'PER-01M50T00000000000000000002', O1: 'PER-01M50T00000000000000000001' },
})

type M = ReturnType<typeof valido>
const con = (cambio: (m: M) => void): M => {
  const m = valido()
  cambio(m)
  return m
}

/** El manifiesto falla en `campo`, y el mensaje no tiene `secreto`. */
function falla(m: unknown, campo: string, secreto?: string): void {
  assert.throws(() => leerManifiesto(m), (e: unknown) => {
    assert.ok(e instanceof ManifiestoInvalido)
    assert.equal(e.campo, campo)
    assert.equal(e.message, `${ERROR_MANIFIESTO}: ${campo}`)
    if (secreto !== undefined) assert.ok(!e.message.includes(secreto))
    return true
  })
}

describe('manifiesto de la aceptación', () => {
  it('acepta las cinco empresas, sus intentos y el revisor', () => {
    const m = leerManifiesto(valido())
    assert.equal(m.empresas.H3.organizacionId, org(3))
    assert.equal(m.empresas.H1.intentos.length, 2)
    assert.equal(m.personas.R1, 'PER-01M50T00000000000000000002')
  })

  it('rechaza lo que no es un manifiesto, nombrando sólo el campo', () => {
    falla(null, 'raíz')
    falla([], 'raíz')
    falla({ ...valido(), extra: 'Empresa Real S.A.' }, 'raíz', 'Empresa Real')
    falla(con((m) => { delete (m.empresas as Record<string, unknown>).H5 }), 'empresas')
    falla(con((m) => { (m.empresas as Record<string, unknown>).H6 = m.empresas.H1 }), 'empresas')
    falla(con((m) => { (m.empresas.H2 as { organizacionId: string }).organizacionId = 'Empresa Real S.A.' }), 'empresas.H2.organizacionId', 'Empresa Real')
    falla(con((m) => { (m.empresas.H2 as { organizacionId: string }).organizacionId = org(1) }), 'empresas.H2.organizacionId')
    falla(con((m) => { (m.empresas.H1 as { nombre?: string }).nombre = 'Empresa Real' }), 'empresas.H1', 'Empresa Real')
    falla(con((m) => { (m.empresas.H1 as { intentos: unknown[] }).intentos = [] }), 'empresas.H1.intentos')
  })

  it('rechaza intentos con valores, reglas inventadas o un estado que no cuadra con sus rechazos', () => {
    const intento = (m: M, i: number): Record<string, unknown> => {
      const x = (m.empresas.H1 as { intentos: Record<string, unknown>[] }).intentos[i]
      assert.ok(x !== undefined)
      return x
    }
    falla(con((m) => { intento(m, 0).estado = 'cargado' }), 'empresas.H1.intentos[0].estado')
    falla(con((m) => { intento(m, 0).huella = 'lote-de-la-empresa-real' }), 'empresas.H1.intentos[0].huella', 'empresa-real')
    falla(con((m) => { intento(m, 0).rechazos = { 'RV-RSK-01': 'monto 1.250.000' } }), 'empresas.H1.intentos[0].rechazos', '1.250.000')
    falla(con((m) => { intento(m, 0).rechazos = { 'el título del riesgo': 1 } }), 'empresas.H1.intentos[0].rechazos', 'título')
    falla(con((m) => { intento(m, 0).rechazos = {} }), 'empresas.H1.intentos[0].rechazos')
    falla(con((m) => { intento(m, 1).rechazos = { 'RV-RSK-01': 1 } }), 'empresas.H1.intentos[1].rechazos')
    falla(con((m) => { intento(m, 1).avisos = { 'RV-EVA-08': 0 } }), 'empresas.H1.intentos[1].avisos')
    falla(con((m) => { intento(m, 0).fecha = '2026-02-30' }), 'empresas.H1.intentos[0].fecha')
    falla(con((m) => { intento(m, 0).fecha = '2026-10-22' }), 'empresas.H1.intentos (en orden de fecha)')
    falla(con((m) => { intento(m, 0).fila = 'Juan Pérez' }), 'empresas.H1.intentos[0]', 'Juan')
  })

  it('pide el revisor R1 y sólo acepta códigos de persona con su id', () => {
    falla(con((m) => { delete (m.personas as Record<string, string>).R1 }), 'personas.R1')
    falla(con((m) => { (m.personas as Record<string, string>)['Juan Pérez'] = 'PER-01M50T00000000000000000003' }), 'personas (un código que no es R1, O1, …)', 'Juan')
    falla(con((m) => { (m.personas as Record<string, string>).O2 = 'Juan Pérez' }), 'personas.O2', 'Juan')
    falla(con((m) => { (m.personas as Record<string, string>).O1 = m.personas.R1 }), 'personas.O1')
  })
})

describe('línea de comandos de la aceptación', () => {
  const CLI = fileURLToPath(new URL('cli.ts', import.meta.url))
  const correr = (args: string[], env: Record<string, string> = {}) => {
    const { PATH, HOME } = process.env
    return spawnSync(process.execPath, [CLI, ...args], { encoding: 'utf8', env: { PATH, HOME, ...env } })
  }
  const archivo = (contenido: string): string => {
    const f = join(mkdtempSync(join(tmpdir(), 'aceptacion-')), 'manifiesto.json')
    writeFileSync(f, contenido)
    return f
  }

  it('sin manifiesto, muestra el uso', () => {
    const r = correr([])
    assert.equal(r.status, 2)
    assert.match(r.stderr, /uso: pnpm --filter @del-campo\/risk run aceptacion <manifiesto.json>/)
  })

  it('un manifiesto inválido sale con 2, nombra el campo y no repite el contenido', () => {
    const r = correr([archivo(JSON.stringify({ ...valido(), personas: { R1: 'Juan Pérez' } }))])
    assert.equal(r.status, 2)
    assert.equal(r.stderr, `✗ ${ERROR_MANIFIESTO}: personas.R1\n`)
    assert.equal(r.stdout, '')
  })

  it('un archivo que no es JSON no se repite', () => {
    const r = correr([archivo('Empresa Real S.A.; ORG-…')])
    assert.equal(r.status, 2)
    assert.match(r.stderr, /RO01_MANIFIESTO_ILEGIBLE/)
    assert.doesNotMatch(r.stderr, /Empresa Real/)
  })

  it('con --hosteada pide su variable y no usa RISK_DATABASE_URL', () => {
    const r = correr([archivo(JSON.stringify(valido())), '--hosteada'], { RISK_DATABASE_URL: 'postgres://localhost:5432/delcampo_risk_dev' })
    assert.equal(r.status, 2)
    assert.match(r.stderr, /RISK_HOSTED_DATABASE_URL/)
  })
})
