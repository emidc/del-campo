// CSV de RFC 4180 para los tres archivos de importación (contrato, RV-ARCH-01 y RV-ARCH-02).
// A diferencia del lector del arnés, no aborta: devuelve el error de lectura con su línea, y
// cada registro con la línea física en la que empieza, para que el validador lo informe.

export interface Registro {
  /** Número de fila: el encabezado es la fila 1 y el primer registro de datos, la fila 2. */
  readonly fila: number
  readonly valores: string[]
}

export type Lectura =
  | { readonly ok: true; readonly encabezado: string[]; readonly registros: Registro[] }
  | { readonly ok: false; readonly linea: number; readonly motivo: string }

export function leerCsv(bytes: Uint8Array): Lectura {
  let texto: string
  try {
    texto = new TextDecoder('utf-8', { fatal: true }).decode(bytes)
  } catch {
    // La línea del primer byte inválido: se cuentan los saltos de línea anteriores.
    let linea = 1
    const decoder = new TextDecoder('utf-8', { fatal: true })
    for (let i = 0; i < bytes.length; i++) {
      try { decoder.decode(bytes.subarray(0, i + 1)) } catch { break }
      if (bytes[i] === 0x0a) linea++
    }
    return { ok: false, linea, motivo: 'no es UTF-8' }
  }
  if (texto.startsWith('﻿')) texto = texto.slice(1)
  const filas: string[][] = []
  let fila: string[] = []
  let campo = ''
  let entreComillas = false
  let comillaCerrada = false
  let linea = 1
  let lineaInicio = 1
  for (let i = 0; i < texto.length; i++) {
    const c = texto.charAt(i)
    if (entreComillas) {
      if (c === '"' && texto[i + 1] === '"') { campo += '"'; i++ }
      else if (c === '"') { entreComillas = false; comillaCerrada = true }
      else { if (c === '\n') linea++; campo += c }
      continue
    }
    if (c === '"') {
      if (campo !== '' || comillaCerrada) return { ok: false, linea, motivo: 'comilla dentro de un campo sin comillas' }
      entreComillas = true
    } else if (c === ',') { fila.push(campo); campo = ''; comillaCerrada = false }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && texto[i + 1] === '\n') i++
      fila.push(campo)
      filas.push(fila)
      fila = []; campo = ''; comillaCerrada = false
      linea++
      lineaInicio = linea
    } else {
      if (comillaCerrada) return { ok: false, linea, motivo: 'texto después de una comilla de cierre' }
      campo += c
    }
  }
  if (entreComillas) return { ok: false, linea: lineaInicio, motivo: 'comilla sin cerrar' }
  if (campo !== '' || fila.length > 0) { fila.push(campo); filas.push(fila) }
  const [encabezado, ...datos] = filas
  if (encabezado === undefined) return { ok: false, linea: 1, motivo: 'archivo vacío' }
  return { ok: true, encabezado, registros: datos.map((valores, n) => ({ fila: n + 2, valores })) }
}

/** Una celda con comillas sólo si hace falta (coma, comilla o salto de línea). */
function celda(v: string): string {
  return /[",\n\r]/.test(v) ? `"${v.replaceAll('"', '""')}"` : v
}

export function escribirCsv(columnas: readonly string[], filas: readonly Readonly<Record<string, string>>[]): string {
  const lineas = [columnas.map(celda).join(',')]
  for (const f of filas) lineas.push(columnas.map((c) => celda(f[c] ?? '')).join(','))
  return lineas.join('\n') + '\n'
}

/** Convierte una lectura correcta en filas con nombre (sólo para archivos ya validados en estructura). */
export function comoFilas(l: Lectura & { ok: true }): Record<string, string>[] {
  return l.registros.map((r) => Object.fromEntries(l.encabezado.map((c, j) => [c, r.valores[j] ?? ''])))
}
