// Conteo de ciclos para A7 de RO01 (decisión 7 del owner): revisiones pendientes cerradas en
// Risk OS después de la importación. Cuentan las que abrió y cerró una persona desde una
// sesión; las abiertas y los ciclos que vienen en los CSV (origen `importacion`) no cuentan.
//
// A7 se cumple con al menos 10, al menos una en cada empresa histórica y al menos tres tipos de
// disparador entre `accion_ejecutada`, `informacion_nueva` y `cambio_contexto`. La salida tiene
// sólo códigos de empresa, conteos y fechas: ni títulos, ni textos, ni nombres (R-19).

export const MINIMO_CICLOS = 10
export const DISPARADORES_A7 = ['accion_ejecutada', 'informacion_nueva', 'cambio_contexto'] as const
export const MINIMO_TIPOS = 3
/** Las empresas históricas de A7: un conteo con menos no puede dar A7 por cumplido. */
export const EMPRESAS_HISTORICAS = 5

/** Una revisión pendiente, como la lee el script: sin textos. */
export interface RevisionParaContar {
  readonly id: string
  readonly organizacionId: string
  readonly disparador: string
  /** La acción, la novedad o la versión que la abrió. */
  readonly referencia: string | null
  readonly origen: 'importacion' | 'sesion'
  readonly abiertaEn: string
  readonly cierre: {
    readonly resultado: 'reevaluacion_aceptada' | 'sin_cambio'
    readonly evaluacionId: string | null
    readonly cerradaPor: string
    readonly cerradaEn: string
  } | null
}

export interface ConteoEmpresa {
  readonly organizacionId: string
  readonly ciclos: number
  readonly porDisparador: Readonly<Record<string, number>>
  /** AAAA-MM-DD del primer y del último cierre. */
  readonly primerCierre: string | null
  readonly ultimoCierre: string | null
}

export interface ConteoCiclos {
  readonly ciclos: number
  readonly porDisparador: Readonly<Record<string, number>>
  /** Cuántos se cerraron con una reevaluación aceptada y cuántos sin cambio. */
  readonly porResultado: Readonly<Record<string, number>>
  readonly porEmpresa: readonly ConteoEmpresa[]
  /** Lo que no cuenta, por qué. */
  readonly noCuentan: { readonly abiertas: number; readonly deLosCsv: number }
  /** Empresas históricas sin ningún ciclo. */
  readonly empresasSinCiclo: readonly string[]
  readonly tiposA7: readonly string[]
  readonly cumpleA7: boolean
  /** Por qué no se cumple, si no se cumple. */
  readonly faltas: readonly string[]
}

/** Cuenta los ciclos de A7. `empresasHistoricas` son los códigos de las cinco empresas. */
export function contarCiclos(revisiones: readonly RevisionParaContar[], empresasHistoricas: readonly string[]): ConteoCiclos {
  const cuentan = revisiones.filter((r) => r.origen === 'sesion' && r.cierre !== null)
  const sumar = (rs: readonly RevisionParaContar[]): Record<string, number> => {
    const n: Record<string, number> = {}
    for (const r of rs) n[r.disparador] = (n[r.disparador] ?? 0) + 1
    return n
  }
  const empresas = [...new Set([...empresasHistoricas, ...cuentan.map((r) => r.organizacionId)])].sort()
  const porEmpresa = empresas.map((organizacionId): ConteoEmpresa => {
    const de = cuentan.filter((r) => r.organizacionId === organizacionId)
    const cierres = de.map((r) => (r.cierre?.cerradaEn ?? '').slice(0, 10)).sort()
    return { organizacionId, ciclos: de.length, porDisparador: sumar(de), primerCierre: cierres[0] ?? null, ultimoCierre: cierres.at(-1) ?? null }
  })
  const porDisparador = sumar(cuentan)
  const tiposA7 = DISPARADORES_A7.filter((d) => (porDisparador[d] ?? 0) > 0)
  const empresasSinCiclo = empresasHistoricas.filter((e) => !cuentan.some((r) => r.organizacionId === e))
  const faltas: string[] = []
  if (cuentan.length < MINIMO_CICLOS) faltas.push(`${String(cuentan.length)} ciclos cerrados; A7 pide al menos ${String(MINIMO_CICLOS)}`)
  const indicadas = new Set(empresasHistoricas).size
  if (indicadas < EMPRESAS_HISTORICAS) faltas.push(`A7 pide las ${String(EMPRESAS_HISTORICAS)} empresas históricas; se indicaron ${String(indicadas)}`)
  for (const e of empresasSinCiclo) faltas.push(`${e} no tiene ningún ciclo cerrado`)
  if (tiposA7.length < MINIMO_TIPOS) {
    faltas.push(`${String(tiposA7.length)} tipos de disparador (${tiposA7.join(', ') || 'ninguno'}); A7 pide ${String(MINIMO_TIPOS)} entre ${DISPARADORES_A7.join(', ')}`)
  }
  return {
    ciclos: cuentan.length,
    porDisparador,
    porResultado: Object.fromEntries(['reevaluacion_aceptada', 'sin_cambio'].map((x) => [x, cuentan.filter((r) => r.cierre?.resultado === x).length])),
    porEmpresa,
    noCuentan: {
      abiertas: revisiones.filter((r) => r.cierre === null).length,
      deLosCsv: revisiones.filter((r) => r.origen === 'importacion' && r.cierre !== null).length,
    },
    empresasSinCiclo,
    tiposA7,
    cumpleA7: faltas.length === 0,
    faltas,
  }
}

/** El informe del script: códigos de empresa, conteos y fechas, nada más. */
export function informeCiclos(c: ConteoCiclos): string[] {
  const tipos = (n: Readonly<Record<string, number>>): string =>
    Object.keys(n).sort().map((d) => `${d} ${String(n[d])}`).join(', ') || '—'
  return [
    `ciclos cerrados después de la importación: ${String(c.ciclos)} (${tipos(c.porDisparador)})`,
    `cerrados con reevaluación aceptada: ${String(c.porResultado.reevaluacion_aceptada ?? 0)}; sin cambio: ${String(c.porResultado.sin_cambio ?? 0)}`,
    `no cuentan: ${String(c.noCuentan.abiertas)} abiertas, ${String(c.noCuentan.deLosCsv)} de los CSV`,
    ...c.porEmpresa.map((e) =>
      `  ${e.organizacionId}: ${String(e.ciclos)} (${tipos(e.porDisparador)})${e.primerCierre === null ? '' : `, cierres del ${e.primerCierre} al ${e.ultimoCierre ?? ''}`}`),
    c.cumpleA7 ? 'A7: cumplido' : 'A7: no cumplido',
    ...c.faltas.map((f) => `  - ${f}`),
  ]
}
