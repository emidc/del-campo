// Congela los 20 casos de aceptación de VS01 (SLICES/VS01.md §4.1, T-0018).
// Valida la planilla local, calcula huellas y escribe evidencia SIN PII.
// Nunca imprime contenido de celdas: solo códigos de caso y nombres de columna (R-19).
//
// Uso: node scripts/vs01/freeze-cases.mjs            → valida y muestra el resultado
//      node scripts/vs01/freeze-cases.mjs --freeze   → además congela (una sola vez)
//      node scripts/vs01/freeze-cases.mjs --verify   → comprueba que nada cambió
import { createHash } from 'node:crypto'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('../../', import.meta.url))
const dir = join(root, 'data/vs01-acceptance')
const casesPath = join(dir, 'casos.csv')
const selectionPath = join(dir, 'seleccion.md')
const lockPath = join(dir, 'congelado.json')
const evidencePath = join(root, 'ops/evidence/T-0018-casos-congelados.md')
const REQUIRED = ['case_code', 'consulta_inicial', 'policy_source_id', 'documento_objetivo_url',
  'documento_objetivo_descripcion', 'vinculos_a_comprobar', 'motivo_de_seleccion',
  'seleccionado_por', 'seleccionado_en']

export function parseCsv(text) {
  const rows = []
  let row = [], field = '', quoted = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++ }
      else if (c === '"') quoted = false
      else field += c
    } else if (c === '"' && field === '') quoted = true
    else if (c === ',') { row.push(field); field = '' }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++
      row.push(field); field = ''
      if (row.some((x) => x !== '')) rows.push(row)
      row = []
    } else field += c
  }
  if (quoted) throw new Error('CSV con comillas sin cerrar')
  row.push(field)
  if (row.some((x) => x !== '')) rows.push(row)
  return rows
}

export function validate(csvText, selectionText) {
  const errors = []
  const rows = parseCsv(csvText.replace(/^﻿/, ''))
  const [header, ...data] = rows
  const missingCols = REQUIRED.filter((c) => !header?.includes(c))
  if (missingCols.length) return [`faltan columnas: ${missingCols.join(', ')}`]
  const idx = Object.fromEntries(header.map((h, i) => [h, i]))
  if (data.length !== 20) errors.push(`se esperan exactamente 20 casos y hay ${data.length}`)
  const codes = new Set()
  data.forEach((r, n) => {
    const code = r[idx.case_code]?.trim() || `fila ${n + 2}`
    if (!/^C(0[1-9]|1[0-9]|20)$/.test(code)) errors.push(`${code}: case_code debe ser C01–C20`)
    if (codes.has(code)) errors.push(`${code}: case_code repetido`)
    codes.add(code)
    if (r.length !== header.length) errors.push(`${code}: cantidad de columnas distinta del encabezado`)
    const empty = REQUIRED.filter((c) => !(r[idx[c]] ?? '').trim())
    if (empty.length) errors.push(`${code}: vacío en ${empty.join(', ')}`)
    const url = (r[idx.documento_objetivo_url] ?? '').trim()
    if (url && !/^https:\/\/(drive|docs)\.google\.com\//.test(url))
      errors.push(`${code}: documento_objetivo_url no es un enlace de Google Drive/Docs`)
    if (url && /\/drive\/(u\/\d+\/)?folders\//.test(url))
      errors.push(`${code}: documento_objetivo_url apunta a una carpeta; el objetivo debe ser el documento`)
    const at = (r[idx.seleccionado_en] ?? '').trim()
    if (at && Number.isNaN(Date.parse(at))) errors.push(`${code}: seleccionado_en no es una fecha válida (usar AAAA-MM-DD)`)
  })
  const blanks = selectionText.split('\n').filter((l) => /^- [^:]+:\s*$/.test(l)).length
  if (blanks) errors.push(`seleccion.md tiene ${blanks} campo(s) sin completar`)
  return errors
}

const sha = (text) => createHash('sha256').update(text).digest('hex')

function main(mode) {
  if (!existsSync(casesPath) || !existsSync(selectionPath)) {
    console.error('No se encuentran data/vs01-acceptance/casos.csv y seleccion.md'); return 1
  }
  const csvText = readFileSync(casesPath, 'utf8')
  const selectionText = readFileSync(selectionPath, 'utf8')
  const hashes = { casos: sha(csvText), seleccion: sha(selectionText) }
  if (mode === '--verify') {
    if (!existsSync(lockPath)) { console.error('Todavía no hay congelamiento.'); return 1 }
    const lock = JSON.parse(readFileSync(lockPath, 'utf8'))
    const ok = lock.hashes.casos === hashes.casos && lock.hashes.seleccion === hashes.seleccion
    console.log(ok ? `✓ Sin cambios desde el congelamiento del ${lock.frozenAt}` : '✗ Los casos o la selección cambiaron después del congelamiento')
    return ok ? 0 : 1
  }
  const errors = validate(csvText, selectionText)
  if (errors.length) { console.error(`✗ ${errors.length} problema(s):\n- ${errors.join('\n- ')}`); return 1 }
  console.log('✓ 20 casos válidos')
  if (mode !== '--freeze') { console.log('Para congelar: node scripts/vs01/freeze-cases.mjs --freeze'); return 0 }
  if (existsSync(lockPath)) { console.error('Ya existe un congelamiento. No se reemplazan casos (SLICES/VS01.md §3).'); return 1 }
  const frozenAt = new Date().toISOString()
  writeFileSync(lockPath, JSON.stringify({ frozenAt, hashes }, null, 2) + '\n')
  writeFileSync(evidencePath, `# T-0018 — Casos de aceptación de VS01 congelados

Evidencia agregada y sin PII (R-19). Los casos viven en \`data/vs01-acceptance/\`, ignorado por Git.

- Congelado: ${frozenAt}
- Casos: 20 (C01–C20), con consulta inicial, Policy objetivo, documento objetivo y vínculos a comprobar
- Registro de selección: \`seleccion.md\` completo
- SHA-256 \`casos.csv\`: \`${hashes.casos}\`
- SHA-256 \`seleccion.md\`: \`${hashes.seleccion}\`

Comprobación: \`node scripts/vs01/freeze-cases.mjs --verify\`. Si las huellas no coinciden,
los casos cambiaron después del congelamiento y la medición no es válida para aceptación.
`)
  console.log(`✓ Congelado ${frozenAt}\n  Evidencia: ops/evidence/T-0018-casos-congelados.md`)
  return 0
}

if (process.argv[1] === fileURLToPath(import.meta.url)) process.exitCode = main(process.argv[2])
