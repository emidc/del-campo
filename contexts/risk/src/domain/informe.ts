// El informe de una importación, en texto. Dos modos (T-0029, ## Outcome):
//   - con valores: cada hallazgo con `regla_id`, archivo, línea, id, origen y mensaje;
//   - sin valores, para los datos reales (R-19): conteos por archivo y por `regla_id`, y por
//     hallazgo sólo regla, archivo, línea e id. Sin mensajes ni celdas, porque varios textos de
//     error del contrato interpolan la celda (`«{valor}»`), y sin `id_origen` ni la carpeta, que
//     pueden nombrar a la empresa. Es el que el owner pega en la evidencia.
// Puro: recibe el resultado y devuelve líneas.

import { ARCHIVOS, type Archivo } from './contrato.ts'
import { TABLAS_IMPORTACION, type SinDestino, type TablaImportacion } from './importacion.ts'
import type { Hallazgo } from './validador.ts'

export interface ResumenLote {
  readonly huella: string
  readonly filas: Readonly<Record<Archivo, number>>
}

/** Un lote ya importado antes, como lo registró la base. */
export interface LoteRegistrado {
  readonly id: number
  readonly huella: string
  readonly origen: string
  readonly importadoPor: string
  readonly importadoEn: Date
  readonly fechaCorte: string
  readonly escritas: Readonly<Record<string, number>>
}

/** Una escritura que la base rechazó o que se cortó: el lote no dejó nada. */
export interface FallaEscritura {
  /** Tabla y restricción, si la base las informó. */
  readonly tabla: string | null
  readonly restriccion: string | null
  /** Código de Postgres o del driver. */
  readonly codigo: string | null
  /** El texto del error; puede traer valores, así que no sale en el modo sin valores. */
  readonly mensaje: string
}

export type Resultado =
  | { readonly estado: 'importado'; readonly lote: ResumenLote; readonly id: number; readonly hallazgos: readonly Hallazgo[]; readonly escritas: Readonly<Record<TablaImportacion, number>> }
  | { readonly estado: 'ya_importado'; readonly lote: ResumenLote; readonly registrado: LoteRegistrado }
  | { readonly estado: 'rechazado'; readonly lote: ResumenLote; readonly hallazgos: readonly Hallazgo[] }
  | { readonly estado: 'sin_destino'; readonly lote: ResumenLote; readonly hallazgos: readonly Hallazgo[]; readonly sinDestino: readonly SinDestino[] }
  | { readonly estado: 'falla_escritura'; readonly lote: ResumenLote; readonly hallazgos: readonly Hallazgo[]; readonly falla: FallaEscritura }

export type Modo = 'con_valores' | 'sin_valores'

const TITULO: Readonly<Record<Resultado['estado'], string>> = {
  importado: 'importado',
  ya_importado: 'ya importado: no se validó ni se escribió nada',
  rechazado: 'rechazado: no se escribió nada',
  sin_destino: 'no importado: hay celdas sin columna en el esquema; no se escribió nada',
  falla_escritura: 'no importado: la escritura falló y se revirtió; no se escribió nada',
}

function conteoPorRegla(hallazgos: readonly Hallazgo[]): string[] {
  const n = new Map<string, number>()
  for (const h of hallazgos) n.set(`${h.severidad} ${h.regla_id}`, (n.get(`${h.severidad} ${h.regla_id}`) ?? 0) + 1)
  return [...n].sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => `  ${k}: ${String(v)}`)
}

function conteoPorArchivo(hallazgos: readonly Hallazgo[], filas: Readonly<Record<Archivo, number>>): string[] {
  return ARCHIVOS.map((a) => {
    const deA = hallazgos.filter((h) => h.archivo === a)
    const r = deA.filter((h) => h.severidad === 'rechazo').length
    return `  ${a}: ${String(filas[a])} filas, ${String(r)} rechazos, ${String(deA.length - r)} avisos`
  })
}

function hallazgo(h: Hallazgo, modo: Modo): string {
  const linea = h.fila === null ? '' : String(h.fila)
  const base = `  ${h.severidad} ${h.regla_id} ${h.archivo}:${linea} ${h.id}`.trimEnd()
  if (modo === 'sin_valores') return base
  return `${base}${h.origen === '' ? '' : ` [${h.origen}]`} — ${h.mensaje}`
}

/** Las filas escritas por tabla, en el orden de escritura (el jsonb del registro no lo conserva). */
const enOrden = (escritas: Readonly<Record<string, number>>): string[] =>
  Object.entries(escritas)
    .sort(([a], [b]) => (TABLAS_IMPORTACION as readonly string[]).indexOf(a) - (TABLAS_IMPORTACION as readonly string[]).indexOf(b))
    .map(([t, n]) => `  ${t}: ${String(n)}`)

/** El informe, línea por línea. */
export function informe(r: Resultado, modo: Modo): string[] {
  const lineas = [TITULO[r.estado], `huella ${r.lote.huella}`]
  if (r.estado === 'ya_importado') {
    const g = r.registrado
    lineas.push(`lote ${String(g.id)}, importado el ${g.importadoEn.toISOString()} por ${modo === 'sin_valores' ? '(oculto)' : g.importadoPor}`)
    if (modo === 'con_valores') lineas.push(`origen ${g.origen}`)
    lineas.push('filas escritas entonces:', ...enOrden(g.escritas))
    return lineas
  }
  const hallazgos = r.hallazgos
  const rechazos = hallazgos.filter((h) => h.severidad === 'rechazo').length
  lineas.push(`${String(rechazos)} rechazos, ${String(hallazgos.length - rechazos)} avisos`)
  lineas.push('por archivo:', ...conteoPorArchivo(hallazgos, r.lote.filas))
  if (hallazgos.length > 0) lineas.push('por regla:', ...conteoPorRegla(hallazgos))
  if (r.estado === 'importado') {
    lineas.push(`lote ${String(r.id)}; filas escritas:`, ...enOrden(r.escritas))
  }
  if (r.estado === 'sin_destino') {
    lineas.push('celdas sin columna en el esquema:', ...r.sinDestino.map((s) => `  ${[`${s.archivo}:${String(s.fila)}`, s.id, s.columna].filter((x) => x !== '').join(' ')}`))
  }
  if (r.estado === 'falla_escritura') {
    const f = r.falla
    lineas.push(`falla: tabla ${f.tabla ?? '(sin tabla)'}, restricción ${f.restriccion ?? '(sin restricción)'}, código ${f.codigo ?? '(sin código)'}`)
    if (modo === 'con_valores') lineas.push(`  ${f.mensaje}`)
  }
  if (hallazgos.length > 0) lineas.push('hallazgos:', ...hallazgos.map((h) => hallazgo(h, modo)))
  return lineas
}
