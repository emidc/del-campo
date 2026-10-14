// Línea de comandos del validador: `node validar.ts <carpeta> [--corte AAAA-MM-DD] [--salida hallazgos.csv]`.
// Lee risks.csv, action-plan.csv y risk-transfer.csv de la carpeta, imprime un resumen por regla y,
// con --salida, escribe cada hallazgo en un CSV. Sale con 1 si hay algún rechazo.

import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

import { porArchivo } from './contrato.ts'
import { escribirCsv } from './csv.ts'
import { validarLote } from './validador.ts'

const args = process.argv.slice(2)
const opcion = (n: string): string | undefined => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : undefined }
const carpeta = args[0]
if (carpeta === undefined || carpeta.startsWith('--')) {
  console.error('uso: node validar.ts <carpeta> [--corte AAAA-MM-DD] [--salida hallazgos.csv]')
  process.exit(2)
}
const fechaCorte = opcion('--corte') ?? new Date().toISOString().slice(0, 10)
const contenidos = porArchivo((a) => readFileSync(join(carpeta, a)))
const hallazgos = validarLote(contenidos, { fechaCorte })

const porRegla = new Map<string, number>()
for (const h of hallazgos) porRegla.set(`${h.severidad} ${h.regla_id}`, (porRegla.get(`${h.severidad} ${h.regla_id}`) ?? 0) + 1)
const rechazos = hallazgos.filter((h) => h.severidad === 'rechazo').length
console.log(`fecha de corte ${fechaCorte}: ${rechazos} rechazos, ${hallazgos.length - rechazos} avisos`)
for (const [k, v] of [...porRegla].sort()) console.log(`  ${k}: ${v}`)
const salida = opcion('--salida')
if (salida !== undefined) {
  writeFileSync(salida, escribirCsv(['regla_id', 'severidad', 'archivo', 'fila', 'id', 'origen', 'mensaje'],
    hallazgos.map((h) => ({ ...h, fila: h.fila === null ? '' : String(h.fila) }))))
}
process.exit(rechazos > 0 ? 1 : 0)
