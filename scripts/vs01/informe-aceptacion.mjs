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
const casos = join(root, 'data/vs01-acceptance/casos.csv')
const salida = join(root, 'ops/evidence/T-0018-aceptacion.md')

export const mediana = (xs) => {
  if (!xs.length) return null
  const o = [...xs].sort((a, b) => a - b), m = Math.floor(o.length / 2)
  return o.length % 2 ? o[m] : (o[m - 1] + o[m]) / 2
}

// §4.1 congela exactamente 20 casos y §4 exige «≥ 19 de 20». El denominador es la
// cantidad de casos congelados, no la cantidad de filas medidas: con `filas.length` una
// planilla de 19 filas imprimía «19 de 19 ✓», que es justamente lo que §4.5 y el
// `## Non-scope` prohíben. `main()` además aborta si los códigos medidos no son los
// congelados.
export const CASOS_ESPERADOS = 20
export const MINIMO_ENCONTRADAS = 19

export function calcular(filas, { excluir = new Set(), fallarPista = false, casos = CASOS_ESPERADOS } = {}) {
  const si = (v) => (v ?? '').trim().toUpperCase() === 'SI'
  const num = (v) => { const t = (v ?? '').trim(); return /^\d+(\.\d+)?$/.test(t) ? Number(t) : null }
  let encontradas = 0, falsas = 0, esperadas = 0, comprobadas = 0
  // El criterio documental de §4.5 es por caso, no por suma global: un caso sin
  // `aperturas_esperadas` no puede pasar por vacío, y un exceso en un caso no puede
  // compensar un faltante en otro.
  const documentalPorCaso = []
  const detalle = [], pares = []
  for (const f of filas) {
    const pista = si(f.pista_boton)
    const cuentaEncontrada = si(f.poliza_encontrada) && !(fallarPista && pista)
    if (cuentaEncontrada) encontradas++
    if (si(f.coincidencia_falsa_inequivoca)) falsas++
    const e = num(f.aperturas_esperadas), c = num(f.aperturas_comprobadas)
    esperadas += e ?? 0
    comprobadas += c ?? 0
    documentalPorCaso.push(e !== null && e > 0 && c === e)
    const b = num(f.base_segundos), v = num(f.vs01_segundos)
    const enPares = b !== null && v !== null && !excluir.has(f.case_code)
    if (enPares) pares.push({ b, v })
    detalle.push({ code: f.case_code, base: b, vs01: v, encontrada: cuentaEncontrada, pista, esperadas: e, comprobadas: c, enPares })
  }
  const mb = mediana(pares.map((p) => p.b)), mv = mediana(pares.map((p) => p.v))
  const tiempoValido = pares.length >= MINIMO_ENCONTRADAS && mb !== null && mb > 0
  return {
    casos, medidos: filas.length, encontradas, falsas, esperadas, comprobadas, detalle,
    pares: pares.length, medianaBase: mb, medianaVs01: mv,
    reduccion: tiempoValido ? 1 - mv / mb : null,
    criterios: {
      encontradas: encontradas >= MINIMO_ENCONTRADAS,
      sinFalsas: falsas === 0,
      vinculos: filas.length > 0 && documentalPorCaso.every(Boolean),
      tiempo: tiempoValido && mv <= 0.5 * mb,
      tiempoValido,
    },
  }
}

// Filas por caso, para que cualquiera pueda recalcular las medianas desde el informe
// versionado (§4.7). Sólo código de caso, segundos y conteos: nada de PII (R-19, §4.4).
const porCaso = (r) => [
  '### Filas por caso', '',
  '| Caso | Base (s) | VS01 (s) | En pares | Encontrada | Aperturas | Pista del botón |',
  '| --- | --- | --- | --- | --- | --- | --- |',
  ...r.detalle.map((d) => `| ${d.code} | ${d.base ?? '—'} | ${d.vs01 ?? '—'} | ${d.enPares ? 'sí' : 'no'} | ` +
    `${d.encontrada ? 'sí' : 'no'} | ${d.comprobadas ?? '—'} de ${d.esperadas ?? '—'} | ${d.pista ? 'sí' : 'no'} |`),
  '',
].join('\n')

const fila = (r, titulo) => {
  const c = r.criterios, ok = (b) => (b ? '✓' : '✗')
  return [
    `### ${titulo}`, '',
    '| Criterio (§4) | Umbral | Resultado | |', '| --- | --- | --- | --- |',
    `| Pólizas encontradas | ≥ ${MINIMO_ENCONTRADAS} de ${r.casos} | ${r.encontradas} de ${r.casos} | ${ok(c.encontradas)} |`,
    `| Coincidencias falsas inequívocas | 0 | ${r.falsas} | ${ok(c.sinFalsas)} |`,
    `| Vínculos que abren el destino correcto | todos, en todos los casos | ${r.comprobadas} de ${r.esperadas} | ${ok(c.vinculos)} |`,
    `| Mediana VS01 ≤ 50 % de la base | ≥ ${MINIMO_ENCONTRADAS} pares | base ${r.medianaBase ?? '—'} s · VS01 ${r.medianaVs01 ?? '—'} s · ${r.pares} pares` +
      `${r.reduccion === null ? ' · medición no válida' : ` · reducción ${(r.reduccion * 100).toFixed(1)} %`} | ${ok(c.tiempo)} |`,
    '',
    `**Resultado: ${Object.entries(c).filter(([k]) => k !== 'tiempoValido').every(([, v]) => v) ? 'cumple los cuatro criterios' : 'NO cumple todos los criterios'}.**`, '',
  ].join('\n')
}

// Los códigos medidos tienen que ser exactamente los congelados en §4.1. Sin esta
// comparación el informe no distingue «20 de 20» de «19 de 19», ni detecta que se midió
// un caso que no estaba congelado (§4.5, `## Non-scope`).
export function cotejarConCongelados(medidos, congelados) {
  const m = new Set(medidos), c = new Set(congelados)
  const faltan = [...c].filter((x) => !m.has(x)).sort()
  const sobran = [...m].filter((x) => !c.has(x)).sort()
  const repetidos = medidos.length !== m.size
  const cantidad = congelados.length !== CASOS_ESPERADOS
  if (!faltan.length && !sobran.length && !repetidos && !cantidad) return null
  return [
    cantidad ? `hay ${congelados.length} casos congelados y §4.1 exige ${CASOS_ESPERADOS}` : null,
    repetidos ? 'la medición tiene case_code repetidos' : null,
    faltan.length ? `casos congelados sin medir: ${faltan.join(', ')}` : null,
    sobran.length ? `casos medidos que no están congelados: ${sobran.join(', ')}` : null,
  ].filter(Boolean).join('; ')
}

function main() {
  const [cab, ...datos] = parseCsv(readFileSync(archivo, 'utf8').replace(/^﻿/, ''))
  const filas = datos.map((d) => Object.fromEntries(cab.map((h, i) => [h, d[i] ?? ''])))
  const [cabCasos, ...datosCasos] = parseCsv(readFileSync(casos, 'utf8').replace(/^﻿/, ''))
  const iCodigo = cabCasos.indexOf('case_code')
  const congelados = datosCasos.map((d) => (d[iCodigo] ?? '').trim())
  const desajuste = cotejarConCongelados(filas.map((f) => (f.case_code ?? '').trim()), congelados)
  if (desajuste) {
    console.error(`✗ La medición no corresponde a los casos congelados: ${desajuste}.\n` +
      'El informe no se genera: no habría con qué comparar los umbrales de §4.')
    process.exitCode = 1
    return
  }
  const tienePista = cab.includes('pista_boton')
  const conPista = filas.filter((f) => (f.pista_boton ?? '').trim().toUpperCase() === 'SI').map((f) => f.case_code)
  const partes = [
    '# T-0018 — Informe de aceptación de VS01', '',
    'Generado por `scripts/vs01/informe-aceptacion.mjs` desde la planilla local (ignorada por Git).',
    'Sólo números y códigos de caso (R-19). Los motivos de fallo quedan en la planilla local.', '',
    `Casos congelados (§4.1): ${congelados.length}. Casos medidos: ${filas.length}. Los códigos coinciden uno a uno.`, '',
    fila(calcular(filas, { casos: congelados.length }), 'Resultado según el protocolo'),
    porCaso(calcular(filas, { casos: congelados.length })),
  ]
  partes.push('## Amenaza a la validez declarada por el owner', '',
    'Durante la medición, el botón «Abrir documento» sólo estaba habilitado para las 20 pólizas',
    'conciliadas; el resto de las pólizas mostraba el documento pendiente. El botón funcionó como',
    'pista para elegir la póliza objetivo entre candidatos, y también acortó el recorrido.', '')
  if (tienePista) {
    partes.push(`Casos en que el operador declaró haber elegido guiado por el botón: ${conPista.length ? conPista.join(', ') : 'ninguno'}.`, '',
      fila(calcular(filas, { excluir: new Set(conPista), fallarPista: true, casos: congelados.length }),
        'Sensibilidad: esos casos cuentan como no encontrados y salen de los pares de tiempo'),
      '**Límite de este análisis.** Sólo corrige los casos que el operador declaró haber elegido',
      'guiado por el botón. El botón estuvo visible en los 20 casos conciliados, así que la',
      'reducción que queda es una **cota superior** del efecto de VS01: el resto del atajo no se',
      `puede separar de la medición con estos datos. Además, excluir más de ${CASOS_ESPERADOS - MINIMO_ENCONTRADAS} caso dejaría`,
      `menos de ${MINIMO_ENCONTRADAS} pares y la medición de tiempo pasaría a no ser válida por §4 — el análisis no`,
      'tiene margen para una sensibilidad más agresiva.', '')
  } else {
    partes.push('Sin la columna `pista_boton` no se puede estimar el efecto por caso.', '')
  }
  const texto = partes.join('\n') + '\n'
  process.stdout.write(texto)
  if (process.argv.includes('--escribir')) { writeFileSync(salida, texto); console.error(`✓ escrito ${salida}`) }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main()
