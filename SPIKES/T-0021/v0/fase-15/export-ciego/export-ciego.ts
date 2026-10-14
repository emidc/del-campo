// Export ciego (decisión 11a de la 15a; especificación en `../dossier-fase-15a.md` §8). Copia a una
// carpeta FUERA del repositorio lo que un evaluador necesita para evaluar empresas sin ver ninguna
// evaluación anterior: la información de cada empresa, la lista de sus riesgos, la metodología y
// el protocolo de la versión que se prueba y la plantilla vacía. Escribe un MANIFIESTO.txt con la
// huella y el origen de cada archivo y falla si alguna de las cuatro comprobaciones no pasa.
//
// La 15a lo especificó como `export_ciego.py`; se escribió en TypeScript para que su test corra
// en `pnpm check` con el resto de la 15b. La especificación no cambia.
//
// Uso:
//   node export-ciego.ts --empresas S29[,S05…] --version v1 --salida <carpeta fuera del repo>
//        [--aceptar "<token>=<motivo>"]…
// `--aceptar` registra en el manifiesto una contaminación aceptada para este export: un risk_id de
// una empresa exportada que la metodología o el protocolo citan (comprobación 4), o un id de
// evaluación que aparece en la metodología o el protocolo (comprobación 2). Un id de evaluación en
// cualquier otro archivo no se puede aceptar.

import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readdirSync, readFileSync, realpathSync, writeFileSync } from 'node:fs'
import { dirname, join, relative, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

import { comoFilas, escribirCsv, leerCsv } from '../validador/csv.ts'

/** Raíz de T-0021: las rutas de origen son relativas a ella, como en los manifiestos de las fases anteriores. */
export const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')

const VERSIONES: Record<string, { metodologia: string; protocolo: string; plantilla: string }> = {
  'v1': { metodologia: 'v1/metodologia-v1.md', protocolo: 'v0/protocolo.md', plantilla: 'v0/plantillas/ficha-evaluacion.csv' },
  'v1 candidate': { metodologia: 'v1/metodologia-v1-candidate.md', protocolo: 'v0/protocolo.md', plantilla: 'v0/plantillas/ficha-evaluacion.csv' },
}
const COLUMNAS_LISTA = ['risk_id', 'empresa', 'tipo_objeto', 'riesgo_padre_id', 'miembros', 'titulo']

/** Los siete patrones de id de evaluación del inventario (`../inventario-campos.md` §5). `EV-S01-010` no coincide. */
export const ID_EVALUACION = /\bEV-(?:\d{4}|8-[a-z]+(?:-[a-z]+)*-\d{4}|11-\d{4}|12-PILOTO-[A-Z0-9-]+)\b/g
/** Columnas de resultado o de fases posteriores (comprobación 3). */
export const COLUMNAS_PROHIBIDAS = ['c_raw', 'banda', 'techo_plausible', 'evaluable', 'safety_critical', 'consecuencia_extrema', 'review_status', 'contrastes_intencion']
const esColumnaProhibida = (c: string): boolean => COLUMNAS_PROHIBIDAS.includes(c) || c.startsWith('v1_')
/**
 * La plantilla vacía está en la lista blanca y trae en su encabezado columnas de resultado (es la
 * plantilla de la ficha que el evaluador llena). No tiene ninguna fila: no lleva resultados. La
 * comprobación 3 no se le aplica, y el manifiesto lo dice.
 */
const EXENTOS_COMPROBACION_3 = new Set(['v0/plantillas/ficha-evaluacion.csv'])
/** Lo que nunca puede ser origen de un archivo exportado, aunque alguien lo agregue a la lista blanca. */
const ORIGENES_PROHIBIDOS = [/(^|\/)cerrado\//, /^v0\/fase-(8|9|1[0-5])\//, /regresion-[^/]*\.csv$/, /^v0\/fase-14\//, /cobertura-empresas\.md$/, /matriz-cobertura\.csv$/]

export interface Entrada {
  /** Ruta relativa a la raíz de T-0021 (o, para la lista derivada, las listas de las que sale). */
  readonly origen: string
  readonly destino: string
  /** `copia` sin cambios; `derivado` = la lista de riesgos con sólo las columnas permitidas. */
  readonly modo: 'copia' | 'derivado'
  readonly contenido: Buffer
}

export interface Plan {
  readonly empresas: string[]
  readonly version: string
  readonly entradas: Entrada[]
}

const sha = (b: Uint8Array): string => createHash('sha256').update(b).digest('hex')
const leerRaiz = (r: string): Buffer => readFileSync(join(RAIZ, r))

function listaDeRiesgos(empresas: readonly string[]): { origen: string; contenido: Buffer } {
  const archivos = readdirSync(join(RAIZ, 'v0/emi41')).filter((f) => /^lista-riesgos-.*\.csv$/.test(f)).sort()
  const filas: Record<string, string>[] = []
  const usados: string[] = []
  for (const a of archivos) {
    const l = leerCsv(leerRaiz(`v0/emi41/${a}`))
    if (!l.ok) throw new Error(`${a}: ${l.motivo}`)
    const deEstas = comoFilas(l).filter((f) => empresas.includes(f.empresa ?? ''))
    if (deEstas.length > 0) usados.push(`v0/emi41/${a}`)
    filas.push(...deEstas)
  }
  return { origen: usados.join(';'), contenido: Buffer.from(escribirCsv(COLUMNAS_LISTA, filas)) }
}

/** La lista blanca (modo 1 del manifiesto), resuelta para estas empresas y esta versión. */
export function planificar(empresas: readonly string[], version: string): Plan {
  const v = VERSIONES[version]
  if (v === undefined) throw new Error(`versión desconocida: ${version} (hay ${Object.keys(VERSIONES).join(', ')})`)
  if (empresas.length === 0) throw new Error('sin empresas')
  const entradas: Entrada[] = []
  const copia = (origen: string, destino: string): void => { entradas.push({ origen, destino, modo: 'copia', contenido: leerRaiz(origen) }) }
  for (const s of empresas) {
    if (!/^S\d{2}$/.test(s) || !existsSync(join(RAIZ, `v0/emi41/fichas/${s}`))) throw new Error(`empresa desconocida: ${s}`)
    for (const f of readdirSync(join(RAIZ, `v0/emi41/fichas/${s}`)).filter((x) => x.endsWith('.md')).sort()) copia(`v0/emi41/fichas/${s}/${f}`, `empresas/${s}/${f}`)
  }
  const lista = listaDeRiesgos(empresas)
  entradas.push({ origen: lista.origen, destino: 'lista-riesgos.csv', modo: 'derivado', contenido: lista.contenido })
  copia(v.metodologia, `metodologia/${v.metodologia.split('/').at(-1) ?? ''}`)
  copia(v.protocolo, `metodologia/${v.protocolo.split('/').at(-1) ?? ''}`)
  copia(v.plantilla, `plantilla/${v.plantilla.split('/').at(-1) ?? ''}`)
  return { empresas: [...empresas], version, entradas }
}

export interface Hallazgo { readonly comprobacion: 1 | 2 | 3 | 4; readonly archivo: string; readonly detalle: string; readonly token: string; readonly aceptable: boolean }

/** Las cuatro comprobaciones de §8 sobre un plan (antes de escribir) o sobre lo escrito (`leidos`). */
export function comprobar(plan: Plan, leidos?: ReadonlyMap<string, Buffer>): Hallazgo[] {
  const h: Hallazgo[] = []
  const blanca = new Set(planificar(plan.empresas, plan.version).entradas.map((e) => `${e.origen} → ${e.destino}`))
  const metodologicos = new Set(plan.entradas.filter((e) => e.destino.startsWith('metodologia/')).map((e) => e.destino))
  for (const e of plan.entradas) {
    const contenido = leidos?.get(e.destino) ?? e.contenido
    // 1. Origen en la lista blanca, nunca en un origen prohibido, y la misma huella que el origen.
    if (!blanca.has(`${e.origen} → ${e.destino}`) || e.origen.split(';').some((o) => ORIGENES_PROHIBIDOS.some((p) => p.test(o)))) {
      h.push({ comprobacion: 1, archivo: e.destino, detalle: `origen fuera de la lista blanca: ${e.origen}`, token: e.origen, aceptable: false })
    }
    const esperado = e.modo === 'copia' ? leerRaiz(e.origen) : listaDeRiesgos(plan.empresas).contenido
    if (sha(contenido) !== sha(esperado)) h.push({ comprobacion: 1, archivo: e.destino, detalle: `huella distinta de la de su origen ${e.origen}`, token: e.destino, aceptable: false })
    const texto = contenido.toString('utf8')
    // 2. Ningún id de evaluación. En la metodología o el protocolo, una cita se puede aceptar explícitamente.
    for (const m of new Set(texto.match(ID_EVALUACION) ?? [])) {
      h.push({ comprobacion: 2, archivo: e.destino, detalle: `id de evaluación ${m}`, token: m, aceptable: metodologicos.has(e.destino) })
    }
    // 3. Ningún CSV con una columna de resultado (salvo la plantilla vacía).
    if (e.destino.endsWith('.csv')) {
      const l = leerCsv(contenido)
      if (!l.ok) h.push({ comprobacion: 3, archivo: e.destino, detalle: `no se puede leer: ${l.motivo}`, token: e.destino, aceptable: false })
      else {
        const exento = EXENTOS_COMPROBACION_3.has(e.origen) && l.registros.length === 0
        for (const c of l.encabezado.filter(esColumnaProhibida)) if (!exento) h.push({ comprobacion: 3, archivo: e.destino, detalle: `columna de resultado ${c}`, token: c, aceptable: false })
        if (EXENTOS_COMPROBACION_3.has(e.origen) && l.registros.length > 0) h.push({ comprobacion: 3, archivo: e.destino, detalle: 'la plantilla trae filas', token: e.destino, aceptable: false })
      }
    }
    // 4. Contaminación por la metodología: risk_id de las empresas exportadas citados en la metodología o el protocolo.
    if (metodologicos.has(e.destino)) {
      const patron = new RegExp(`\\b(?:${plan.empresas.join('|')})-[REP]\\d{2}(?:-S\\d{2})?\\b`, 'g')
      for (const m of new Set(texto.match(patron) ?? [])) h.push({ comprobacion: 4, archivo: e.destino, detalle: `cita ${m}`, token: m, aceptable: true })
    }
  }
  return h
}

/** La raíz del checkout que contiene `ruta`, si hay una (busca `.git` hacia arriba). */
function checkoutDe(ruta: string): string | null {
  for (let d = ruta; ; d = dirname(d)) {
    if (existsSync(join(d, '.git'))) return d
    if (dirname(d) === d) return null
  }
}

export function dentroDelRepositorio(salida: string): boolean {
  const repo = checkoutDe(realpathSync(RAIZ))
  if (repo === null) return false
  // La carpeta puede no existir todavía: se resuelve el ancestro existente más cercano.
  let d = resolve(salida)
  while (!existsSync(d)) d = dirname(d)
  const real = join(realpathSync(d), relative(d, resolve(salida)))
  return real === repo || real.startsWith(repo + sep) || checkoutDe(realpathSync(d)) !== null
}

export interface Aceptacion { readonly token: string; readonly motivo: string }

export function exportar(empresas: readonly string[], version: string, salida: string, aceptaciones: readonly Aceptacion[] = []): { manifiesto: string } {
  if (dentroDelRepositorio(salida)) throw new Error(`${salida}: está dentro de un repositorio; el export ciego se escribe fuera`)
  if (existsSync(salida) && readdirSync(salida).length > 0) throw new Error(`${salida}: la carpeta no está vacía`)
  const plan = planificar(empresas, version)
  const aceptados = new Map(aceptaciones.map((a) => [a.token, a.motivo]))
  const fallas = (hs: Hallazgo[]): Hallazgo[] => hs.filter((x) => !(x.aceptable && aceptados.has(x.token)))
  const previas = comprobar(plan)
  if (fallas(previas).length > 0) throw new Error(`el export no está limpio:\n${fallas(previas).map(texto).join('\n')}`)
  const sobrantes = [...aceptados.keys()].filter((t) => !previas.some((x) => x.token === t))
  if (sobrantes.length > 0) throw new Error(`aceptación de algo que no aparece: ${sobrantes.join(', ')}`)

  for (const e of plan.entradas) {
    mkdirSync(dirname(join(salida, e.destino)), { recursive: true })
    writeFileSync(join(salida, e.destino), e.contenido)
  }
  // Se vuelve a comprobar sobre lo escrito.
  const leidos = new Map(plan.entradas.map((e) => [e.destino, readFileSync(join(salida, e.destino))]))
  const despues = fallas(comprobar(plan, leidos))
  if (despues.length > 0) throw new Error(`lo escrito no pasa las comprobaciones:\n${despues.map(texto).join('\n')}`)

  const manifiesto = [
    '# MANIFIESTO del export ciego (T-0021, Fase 15b)',
    '',
    `empresas: ${plan.empresas.join(', ')}`,
    `version: ${plan.version}`,
    `script: v0/fase-15/export-ciego/export-ciego.ts sha256 ${sha(readFileSync(fileURLToPath(import.meta.url)))}`,
    'modo: 1 (lista blanca)',
    '',
    '## Archivos (sha256  destino  ←  origen, relativo a SPIKES/T-0021)',
    ...plan.entradas.map((e) => `${sha(e.contenido)}  ${e.destino}  ←  ${e.origen}${e.modo === 'derivado' ? ` (sólo ${COLUMNAS_LISTA.join(', ')})` : ''}`),
    '',
    '## Comprobaciones',
    '1. Origen en la lista blanca y misma huella que el origen: pasa.',
    '2. Ningún id de evaluación de los siete patrones: pasa' + (aceptaciones.some((a) => previas.some((x) => x.comprobacion === 2 && x.token === a.token)) ? ', con las aceptaciones de abajo.' : '.'),
    `3. Ningún CSV con columnas de resultado: pasa. Exenta: la plantilla vacía (${[...EXENTOS_COMPROBACION_3].join(', ')}, 0 filas).`,
    '4. Contaminación por la metodología o el protocolo: ' + (previas.some((x) => x.comprobacion === 4) ? 'pasa con las aceptaciones de abajo.' : 'pasa, ninguna cita.'),
    '',
    '## Contaminación aceptada',
    ...(aceptaciones.length === 0 ? ['ninguna'] : aceptaciones.map((a) => {
      const donde = previas.filter((x) => x.token === a.token).map((x) => `comprobación ${String(x.comprobacion)} en ${x.archivo}`).join('; ')
      return `- ${a.token} (${donde}): ${a.motivo}`
    })),
    '',
  ].join('\n')
  writeFileSync(join(salida, 'MANIFIESTO.txt'), manifiesto)
  return { manifiesto }
}

const texto = (x: Hallazgo): string => `  comprobación ${String(x.comprobacion)}: ${x.archivo}: ${x.detalle}${x.aceptable ? ' (aceptable con --aceptar)' : ''}`

if (import.meta.url === `file://${process.argv[1] ?? ''}`) {
  const args = process.argv.slice(2)
  const valor = (n: string): string | undefined => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : undefined }
  const empresas = (valor('--empresas') ?? '').split(',').filter((x) => x !== '')
  const salida = valor('--salida')
  if (empresas.length === 0 || salida === undefined) {
    console.error('uso: node export-ciego.ts --empresas S29[,S05…] --version v1 --salida <carpeta fuera del repo> [--aceptar "<token>=<motivo>"]…')
    process.exit(2)
  }
  const aceptaciones = args.flatMap((a, i) => (a === '--aceptar' ? [args[i + 1] ?? ''] : [])).map((x) => {
    const [token = '', ...motivo] = x.split('=')
    if (token === '' || motivo.join('=').trim() === '') { console.error(`--aceptar "${x}": falta el token o el motivo`); process.exit(2) }
    return { token, motivo: motivo.join('=').trim() }
  })
  try {
    const { manifiesto } = exportar(empresas, valor('--version') ?? 'v1', salida, aceptaciones)
    console.log(manifiesto)
  } catch (e) {
    console.error((e as Error).message)
    process.exit(1)
  }
}
