// T-0035: la matriz de permisos consolidada no se desvía del código.
// `docs/migration/T-0035-matriz-de-permisos.md` declara qué acciones existen, qué rutas
// existen y cómo se corresponde cada caso de `permisos.js`. Una funcionalidad pendiente no
// puede volverse accesible sin pasar por ese documento.

import assert from 'node:assert/strict'
import { readdirSync, readFileSync } from 'node:fs'
import { join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import test from 'node:test'

const root = fileURLToPath(new URL('../../', import.meta.url))
const leer = (p) => readFileSync(join(root, p), 'utf8')
const doc = leer('docs/migration/T-0035-matriz-de-permisos.md')
const seccion = (titulo) => {
  const desde = doc.indexOf(`\n## ${titulo}`)
  assert.ok(desde >= 0, `falta la sección ${titulo}`)
  const hasta = doc.indexOf('\n## ', desde + 1)
  return doc.slice(desde, hasta === -1 ? undefined : hasta)
}
const filas = (texto) =>
  texto.split('\n').filter((l) => l.startsWith('| ') && !l.startsWith('| ---') && !/^\| (Contexto|Caso del prototipo) \|/.test(l))
    .map((l) => l.split('|').slice(1, -1).map((c) => c.trim()))

const CONTEXTOS = {
  'Broker OS': () => [...leer('packages/api/src/acceso/admin.ts').matchAll(/accion: '([a-z_.]+)'/g)].map((m) => m[1]),
  'Communication OS': () => {
    const m = leer('contexts/communication/src/domain/permisos.ts').match(/export type AccionCommunication =([^\n]+)/)
    return [...(m?.[1] ?? '').matchAll(/'([a-z_.]+)'/g)].map((x) => x[1])
  },
  'Risk OS': () => {
    const m = leer('contexts/risk/src/domain/permisos.ts').match(/export const ACCIONES[^=]*=\s*\[([^\]]+)\]/)
    return [...(m?.[1] ?? '').matchAll(/'([a-z_.]+)'/g)].map((x) => x[1])
  },
}

test('cada acción del código está en la matriz, y la matriz no nombra acciones que no existen', () => {
  const declaradas = filas(seccion('1. Acciones implementadas'))
  for (const [contexto, delCodigo] of Object.entries(CONTEXTOS)) {
    const enCodigo = [...new Set(delCodigo())].sort()
    assert.ok(enCodigo.length > 0, `no se encontraron acciones de ${contexto}`)
    const enDoc = declaradas.filter((f) => f[0] === contexto).map((f) => f[1].replaceAll('`', '')).sort()
    assert.deepEqual(enDoc, enCodigo, contexto)
  }
  for (const f of declaradas) {
    assert.ok(/^(Sí|No)/.test(f[2]) && /^(Sí|No)/.test(f[3]) && /^(Sí|No)/.test(f[4]), `roles sin decidir en ${f[1]}`)
  }
})

test('toda página y todo endpoint existente está en la lista de rutas de la matriz', () => {
  const walk = (dir) =>
    readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
      e.name === 'node_modules' ? [] : e.isDirectory() ? walk(join(dir, e.name)) : [join(dir, e.name)])
  const existentes = ['apps/communication', 'apps/risk', 'apps/web']
    .flatMap((a) => walk(join(root, a, 'src/app')))
    .map((f) => relative(root, f).split('\\').join('/'))
    .filter((f) => /(^|\/)(page\.tsx|route\.ts)$/.test(f))
    .sort()
  const bloque = seccion('3. Rutas que existen').match(/```text\n([\s\S]*?)```/)
  const declaradas = (bloque?.[1] ?? '').split('\n').filter(Boolean).sort()
  assert.deepEqual(declaradas, existentes)
})

test('cada caso de permisos.js tiene su fila, y lo pendiente no figura como acción en el código', () => {
  const prototipo = [...leer('docs/north-star/prototipo/pruebas/permisos.js').matchAll(/^ {2}\['[^']+', '(\w+)'/gm)].map((m) => m[1])
  assert.equal(prototipo.length, 22)
  const correspondencia = filas(seccion('2. Correspondencia con `permisos.js`'))
  const porAccion = new Map(correspondencia.map((f) => [f[1].replaceAll('`', ''), f]))
  assert.deepEqual([...porAccion.keys()].sort(), [...prototipo].sort())
  const implementadas = new Set(Object.values(CONTEXTOS).flatMap((f) => f()))
  for (const [accion, f] of porAccion) {
    assert.ok(['implementada', 'parcial', 'pendiente', 'pendiente en la UI'].includes(f[2]), `${accion}: estado ${f[2]}`)
    const nombradas = [...f[3].matchAll(/`([a-z_]+\.[a-z_.]+)`/g)].map((m) => m[1])
    if (f[2] === 'pendiente') assert.deepEqual(nombradas, [], `${accion} es pendiente pero nombra una acción`)
    else for (const n of nombradas) assert.ok(implementadas.has(n), `${accion} corresponde a ${n}, que no existe en el código`)
  }
})
