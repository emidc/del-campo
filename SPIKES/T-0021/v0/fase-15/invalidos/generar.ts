// Escribe los casos inválidos: `base/` con el lote válido, una carpeta por regla de rechazo con
// sólo el archivo que cambia, y `errores-esperados.csv`. `--check` compara sin escribir.

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'

import { escribirCsv } from '../validador/csv.ts'
import { archivosDe, aTexto, base, CASOS, errorEsperado } from './casos.ts'

const AQUI = new URL('./', import.meta.url)

export function archivos(): Record<string, string> {
  const out: Record<string, string> = {}
  const b = base()
  for (const a of ['risks.csv', 'action-plan.csv', 'risk-transfer.csv'] as const) out[`base/${a}`] = aTexto(b, a)
  for (const c of CASOS) {
    const todos = archivosDe(c)
    for (const [a, texto] of Object.entries(todos)) if (texto !== out[`base/${a}`]) out[`${c.regla}/${a}`] = texto
  }
  out['errores-esperados.csv'] = escribirCsv(['caso', 'regla_id', 'archivo', 'fila', 'error_esperado'], CASOS.map((c) => ({
    caso: c.regla, regla_id: c.regla, archivo: c.archivo, fila: c.fila === null ? '' : String(c.fila), error_esperado: errorEsperado(c),
  })))
  out['casos.csv'] = escribirCsv(['caso', 'que_cambia'], CASOS.map((c) => ({ caso: c.regla, que_cambia: c.que })))
  return out
}

if (import.meta.url === `file://${process.argv[1] ?? ''}`) {
  const check = process.argv.includes('--check')
  let distintos = 0
  for (const [ruta, texto] of Object.entries(archivos())) {
    const url = new URL(ruta, AQUI)
    if (check) {
      let actual = ''
      try { actual = readFileSync(url, 'utf8') } catch { /* no existe */ }
      if (actual !== texto) { distintos++; console.error(`${ruta}: difiere`) }
    } else {
      mkdirSync(new URL('./', url), { recursive: true })
      writeFileSync(url, texto)
    }
  }
  console.log(`${String(CASOS.length)} casos`)
  if (distintos > 0) process.exit(1)
}
