import assert from 'node:assert/strict'
import test from 'node:test'
import { parseCsv, validate } from '../vs01/freeze-cases.mjs'

const header = 'case_code,consulta_inicial,policy_source_id,documento_objetivo_url,documento_objetivo_descripcion,vinculos_a_comprobar,motivo_de_seleccion,seleccionado_por,seleccionado_en'
const row = (n, url = 'https://drive.google.com/file/d/SYNTH/view') =>
  `C${String(n).padStart(2, '0')},"consulta, sintética",SYN-${n},${url},póliza sintética,1,habitual,owner,2026-09-23`
const csv = (rows) => [header, ...rows].join('\n') + '\n'
const selection = '- Seleccionado por: owner\n- Fecha: 2026-09-23\n'

test('parseCsv respeta comillas y comas embebidas', () => {
  assert.deepEqual(parseCsv('a,b\n"x, y","z ""q"""\n'), [['a', 'b'], ['x, y', 'z "q"']])
})

test('20 casos completos son válidos', () => {
  assert.deepEqual(validate(csv(Array.from({ length: 20 }, (_, i) => row(i + 1))), selection), [])
})

test('rechaza cantidad incorrecta, carpeta como objetivo y selección incompleta', () => {
  const rows = Array.from({ length: 19 }, (_, i) => row(i + 1))
  rows[0] = row(1, 'https://drive.google.com/drive/folders/SYNTH')
  const errors = validate(csv(rows), '- Fecha:\n')
  assert.ok(errors.some((e) => e.includes('exactamente 20')))
  assert.ok(errors.some((e) => e.includes('carpeta')))
  assert.ok(errors.some((e) => e.includes('seleccion.md')))
})

test('los errores no exponen contenido de celdas', () => {
  const rows = Array.from({ length: 20 }, (_, i) => row(i + 1))
  rows[3] = 'C04,Cliente Real SA,,,,,,,'
  const errors = validate(csv(rows), selection).join('\n')
  assert.ok(!errors.includes('Cliente Real'))
})
