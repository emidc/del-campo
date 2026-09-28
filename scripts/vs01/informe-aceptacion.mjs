// Informe de aceptación de VS01 (SLICES/VS01.md §4) a partir de la planilla local
// data/vs01-acceptance/medicion.csv. Sólo produce números y códigos de caso: nunca
// copia `motivo_fallo`, `operador` ni ningún otro texto libre (R-19).
//
// Columna opcional `pista_boton` (SI/NO): el operador indica si eligió la póliza guiado
// por el botón "Abrir documento", que en la medición sólo estaba habilitado para las 20
// pólizas conciliadas. Con ella se calcula un análisis de sensibilidad.
//
// Uso: node scripts/vs01/informe-aceptacion.mjs            → muestra el informe
//      node scripts/vs01/informe-aceptacion.mjs --escribir → además lo versiona en ops/evidence
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseCsv } from './freeze-cases.mjs'

const root = fileURLToPath(new URL('../../', import.meta.url))
const archivo = join(root, 'data/vs01-acceptance/medicion.csv')
const salida = join(root, 'ops/evidence/T-0018-aceptacion.md')

export const mediana = (xs) => {
  if (!xs.length) return null
  const o = [...xs].sort((a, b) => a - b), m = Math.floor(o.length / 2)
  return o.length % 2 ? o[m] : (o[m - 1] + o[m]) / 2
}

export function calcular(filas, { excluir = new Set(), fallarPista = false } = {}) {
  const si = (v) => (v ?? '').trim().toUpperCase() === 'SI'
  const num = (v) => { const t = (v ?? '').trim(); return /^\d+(\.\d+)?$/.test(t) ? Number(t) : null }
  let encontradas = 0, falsas = 0, esperadas = 0, comprobadas = 0
  const pares = []
  for (const f of filas) {
    const pista = si(f.pista_boton)
    if (si(f.poliza_encontrada) && !(fallarPista && pista)) encontradas++
    if (si(f.coincidencia_falsa_inequivoca)) falsas++
    esperadas += num(f.aperturas_esperadas) ?? 0
    comprobadas += num(f.aperturas_comprobadas) ?? 0
    const b = num(f.base_segundos), v = num(f.vs01_segundos)
    if (b !== null && v !== null && !excluir.has(f.case_code)) pares.push({ b, v })
  }
  const mb = mediana(pares.map((p) => p.b)), mv = mediana(pares.map((p) => p.v))
  const tiempoValido = pares.length >= 19 && mb !== null && mb > 0
  return {
    casos: filas.length, encontradas, falsas, esperadas, comprobadas,
    pares: pares.length, medianaBase: mb, medianaVs01: mv,
    reduccion: tiempoValido ? 1 - mv / mb : null,
    criterios: {
      encontradas: encontradas >= 19,
      sinFalsas: falsas === 0,
      vinculos: esperadas > 0 && comprobadas === esperadas,
      tiempo: tiempoValido && mv <= 0.5 * mb,
      tiempoValido,
    },
  }
}

const fila = (r, titulo) => {
  const c = r.criterios, ok = (b) => (b ? '✓' : '✗')
  return [
    `### ${titulo}`, '',
    '| Criterio (§4) | Umbral | Resultado | |', '| --- | --- | --- | --- |',
    `| Pólizas encontradas | ≥ 19 de 20 | ${r.encontradas} de ${r.casos} | ${ok(c.encontradas)} |`,
    `| Coincidencias falsas inequívocas | 0 | ${r.falsas} | ${ok(c.sinFalsas)} |`,
    `| Vínculos que abren el destino correcto | todos | ${r.comprobadas} de ${r.esperadas} | ${ok(c.vinculos)} |`,
    `| Mediana VS01 ≤ 50 % de la base | ≥ 19 pares | base ${r.medianaBase ?? '—'} s · VS01 ${r.medianaVs01 ?? '—'} s · ${r.pares} pares` +
      `${r.reduccion === null ? ' · medición no válida' : ` · reducción ${(r.reduccion * 100).toFixed(1)} %`} | ${ok(c.tiempo)} |`,
    '',
    `**Resultado: ${Object.entries(c).filter(([k]) => k !== 'tiempoValido').every(([, v]) => v) ? 'cumple los cuatro criterios' : 'NO cumple todos los criterios'}.**`, '',
  ].join('\n')
}

function main() {
  const [cab, ...datos] = parseCsv(readFileSync(archivo, 'utf8').replace(/^﻿/, ''))
  const filas = datos.map((d) => Object.fromEntries(cab.map((h, i) => [h, d[i] ?? ''])))
  const tienePista = cab.includes('pista_boton')
  const conPista = filas.filter((f) => (f.pista_boton ?? '').trim().toUpperCase() === 'SI').map((f) => f.case_code)
  const partes = [
    '# T-0018 — Informe de aceptación de VS01', '',
    'Generado por `scripts/vs01/informe-aceptacion.mjs` desde la planilla local (ignorada por Git).',
    'Sólo números y códigos de caso (R-19). Los motivos de fallo quedan en la planilla local.', '',
    fila(calcular(filas), 'Resultado según el protocolo'),
  ]
  partes.push('## Amenaza a la validez declarada por el owner', '',
    'Durante la medición, el botón «Abrir documento» sólo estaba habilitado para las 20 pólizas',
    'conciliadas; el resto de las pólizas mostraba el documento pendiente. El botón funcionó como',
    'pista para elegir la póliza objetivo entre candidatos, y también acortó el recorrido.', '')
  if (tienePista) {
    partes.push(`Casos en que el operador declaró haber elegido guiado por el botón: ${conPista.length ? conPista.join(', ') : 'ninguno'}.`, '',
      fila(calcular(filas, { excluir: new Set(conPista), fallarPista: true }),
        'Sensibilidad: esos casos cuentan como no encontrados y salen de los pares de tiempo'))
  } else {
    partes.push('Sin la columna `pista_boton` no se puede estimar el efecto por caso.', '')
  }
  const texto = partes.join('\n') + '\n'
  process.stdout.write(texto)
  if (process.argv.includes('--escribir')) { writeFileSync(salida, texto); console.error(`✓ escrito ${salida}`) }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main()
