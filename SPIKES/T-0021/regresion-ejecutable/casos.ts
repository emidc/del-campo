// Los 20 casos de propiedad como datos tipados. Cada caso separa cuatro cosas:
//
//   - `adjudicacion`: lo que Emiliano adjudicó y se puede juzgar con las fichas (orden,
//     empate, visibilidad, movimiento). Fuente: `v0/adjudicacion-casos.md` (2026-10-05), leído
//     con el resumen juzgable de `v0/dry-run/reporte-dry-run.md` §2.
//   - `aprobado`: el veredicto de la corrida F5-REG-01 con metodologia v0.2, aceptado por
//     Emiliano (`v0/fase-5/regresion/reporte-regresion.md` §2). Un FAIL aprobado se conserva
//     como FAIL: el test exige que el arnés lo siga viendo, no que desaparezca.
//   - `ordenRegistrado`: el orden que F5-REG-01 dice haber producido, por momento.
//   - `bandas` y `juicio`: lo que la adjudicación pide y no se automatiza (bandas hasta la
//     Fase 9; criterios que requieren juicio profesional o datos que las fichas no tienen).
//
// Los ids de ficha (`EV-…`) son los de `fichas-regresion.csv`.

import type { Categoria, Empate, Expectativa } from './verificacion.ts'

export type Banda = 'Baja' | 'Media' | 'Alta' | 'Crítica'

export interface BandaAdjudicada {
  /** Ficha a la que se refiere la banda, o `null` si la adjudicación no dice a cuál (no se usa). */
  readonly evaluacionId: string | null
  /** Bandas admitidas, o `null` si el texto está hedgeado ("posiblemente", "puede ser"). */
  readonly admitidas: readonly Banda[] | null
  readonly texto: string
}

export interface VeredictoAprobado {
  readonly categoria: Categoria
  readonly secundarias: readonly Categoria[]
}

export interface CasoAdjudicado {
  readonly id: string
  /** Conjuntos de fichas de una misma organización que forman un ranking principal. */
  readonly momentos: Readonly<Record<string, readonly string[]>>
  readonly adjudicacion: readonly Expectativa[]
  readonly aprobado: VeredictoAprobado
  /** CP-14: adjudicación revisada por Emiliano (protocolo v0.2 §13). Si está, `aprobado` es contra ella. */
  readonly revision?: { readonly adjudicacion: readonly Expectativa[]; readonly aprobadoOriginal: VeredictoAprobado; readonly fuente: string }
  /** Orden de F5-REG-01 por momento: posiciones, con los empatados juntos. */
  readonly ordenRegistrado: Readonly<Record<string, readonly (readonly string[])[]>>
  readonly bandas: readonly BandaAdjudicada[]
  /** Criterios adjudicados que no se automatizan, y por qué. */
  readonly juicio: readonly string[]
}

const orden = (momento: string, alto: string, bajo: string, empate: Empate): Expectativa => ({ tipo: 'orden', momento, alto, bajo, empate })
const U = 'unico'

/** Todas las parejas de una cadena estricta `a > b > c …` (CP-01). */
function cadena(momento: string, ids: readonly string[]): Expectativa[] {
  return ids.flatMap((alto, i) => ids.slice(i + 1).map((bajo) => orden(momento, alto, bajo, 'no_permitido')))
}

const PASS: VeredictoAprobado = { categoria: 'PASS', secundarias: [] }

export const CASOS: readonly CasoAdjudicado[] = [
  {
    id: 'CP-01',
    momentos: { [U]: ['EV-0052', 'EV-0053', 'EV-0054', 'EV-0055', 'EV-0056'] },
    adjudicacion: [
      // "R1 > R4 > R5 > R2 = R3", empate permitido sólo R2 = R3.
      ...cadena(U, ['CP-01-R1', 'CP-01-R4', 'CP-01-R5', 'CP-01-R2']),
      orden(U, 'CP-01-R1', 'CP-01-R3', 'no_permitido'),
      orden(U, 'CP-01-R4', 'CP-01-R3', 'no_permitido'),
      orden(U, 'CP-01-R5', 'CP-01-R3', 'no_permitido'),
      // "R2 = R3": la Fase 5 no lo juzgó como empate exigido (R2 20 > R3 15 no figura como falla).
      { tipo: 'sin_orden', momento: U, a: 'CP-01-R2', b: 'CP-01-R3' },
      // "Incorrecto: R1 en la mitad de abajo".
      { tipo: 'no_en_mitad_inferior', momento: U, riesgo: 'CP-01-R1' },
    ],
    aprobado: { categoria: 'FAIL — combinación', secundarias: ['FAIL — ranking'] },
    ordenRegistrado: { [U]: [['CP-01-R5'], ['CP-01-R1'], ['CP-01-R2'], ['CP-01-R4'], ['CP-01-R3']] },
    bandas: [{ evaluacionId: 'EV-0052', admitidas: ['Alta'], texto: 'R1 Alta' }],
    juicio: [
      'Que R3 no se trate "como si los cortes siguieran deteniendo la planta": es una lectura de la evidencia de los controles, no una regla.',
    ],
  },
  {
    id: 'CP-02',
    momentos: { [U]: ['EV-0057', 'EV-0058'] },
    adjudicacion: [
      orden(U, 'CP-02-R2', 'CP-02-R1', 'permitido'),
      { tipo: 'visible', momento: U, riesgo: 'CP-02-R2' },
      { tipo: 'safety_critical', momento: U, riesgo: 'CP-02-R2' },
    ],
    aprobado: PASS,
    ordenRegistrado: { [U]: [['CP-02-R2'], ['CP-02-R1']] },
    bandas: [{ evaluacionId: 'EV-0058', admitidas: ['Alta'], texto: 'R2 Alta; además safety-critical' }],
    juicio: ['"Puede alcanzar la banda más alta analíticamente": depende de los umbrales de la Fase 9.'],
  },
  {
    id: 'CP-03',
    momentos: { [U]: ['EV-0059', 'EV-0060'] },
    // Empate "No necesario": la columna no dice si un empate sería aceptable.
    adjudicacion: [orden(U, 'CP-03-R2', 'CP-03-R1', 'no_especificado')],
    aprobado: PASS,
    ordenRegistrado: { [U]: [['CP-03-R2'], ['CP-03-R1']] },
    bandas: [
      { evaluacionId: 'EV-0060', admitidas: ['Media'], texto: 'R2 Media' },
      { evaluacionId: 'EV-0059', admitidas: ['Baja', 'Media'], texto: 'R1 Baja/Media' },
    ],
    juicio: ['"La gravedad inherente de la fuga debe seguir visible": R1 queda con safety_critical y consecuencia_extrema; qué tan visible es una pantalla, no una regla.'],
  },
  {
    id: 'CP-04',
    momentos: { antes: ['EV-0061', 'EV-0063'], despues: ['EV-0062', 'EV-0063'] },
    adjudicacion: [
      orden('antes', 'CP-04-R1', 'CP-04-R2', 'no_especificado'),
      orden('despues', 'CP-04-R2', 'CP-04-R1', 'no_especificado'),
      // "Incorrecto: que R1 no muestre una mejora material".
      { tipo: 'movimiento', desde: 'EV-0061', hasta: 'EV-0062', medida: 'c_raw', sentido: 'baja' },
    ],
    aprobado: PASS,
    ordenRegistrado: { antes: [['CP-04-R1'], ['CP-04-R2']], despues: [['CP-04-R2'], ['CP-04-R1']] },
    bandas: [
      { evaluacionId: 'EV-0061', admitidas: ['Alta'], texto: 'R1 pasa de Alta…' },
      { evaluacionId: 'EV-0062', admitidas: ['Media', 'Baja'], texto: '…a Media/Baja' },
    ],
    juicio: [
      '"R1 debe bajar claramente": el arnés exige que baje (50 → 30); cuánto es "claramente" es juicio.',
      'Que el directorio vea antes/después, 3–4 meses → 6 horas, 2 horas de transacciones y la prueba externa: es contenido de una vista (§13), no un derivado de la ficha.',
    ],
  },
  {
    id: 'CP-05',
    momentos: { [U]: ['EV-0064', 'EV-0065'] },
    adjudicacion: [orden(U, 'CP-05-R2', 'CP-05-R1', 'no_permitido')],
    aprobado: PASS,
    ordenRegistrado: { [U]: [['CP-05-R2'], ['CP-05-R1']] },
    bandas: [
      { evaluacionId: 'EV-0065', admitidas: ['Alta'], texto: 'R2 Alta' },
      { evaluacionId: 'EV-0064', admitidas: ['Media'], texto: 'R1 Media' },
    ],
    juicio: [],
  },
  {
    id: 'CP-06',
    momentos: { [U]: ['EV-0066', 'EV-0067'] },
    adjudicacion: [orden(U, 'CP-06-R1', 'CP-06-R2', 'no_permitido')],
    aprobado: PASS,
    ordenRegistrado: { [U]: [['CP-06-R1'], ['CP-06-R2']] },
    bandas: [
      { evaluacionId: 'EV-0066', admitidas: ['Alta'], texto: 'R1 Alta' },
      { evaluacionId: 'EV-0067', admitidas: ['Baja', 'Media'], texto: 'R2 Baja/Media' },
    ],
    juicio: ['"Distinguir el evento iniciador de la progresión": es la regla de §2.1 al escribir la ficha; el arnés no lee la narrativa.'],
  },
  {
    id: 'CP-07',
    momentos: { [U]: ['EV-0068', 'EV-0069'] },
    adjudicacion: [orden(U, 'CP-07-R2', 'CP-07-R1', 'permitido')],
    // AN-0160: D10 rompe por I efectivo un empate adjudicado como permitido. Queda abierto (§15).
    aprobado: { categoria: 'FAIL — ranking', secundarias: [] },
    ordenRegistrado: { [U]: [['CP-07-R1'], ['CP-07-R2']] },
    bandas: [
      { evaluacionId: 'EV-0068', admitidas: ['Media'], texto: 'R1 Media' },
      { evaluacionId: 'EV-0069', admitidas: ['Media', 'Alta'], texto: 'R2 Media/Alta' },
    ],
    juicio: [],
  },
  {
    id: 'CP-08',
    momentos: { [U]: ['EV-0070', 'EV-0071', 'EV-0072'] },
    adjudicacion: [
      // Empate "Sí": la adjudicación no dice entre cuáles; se aplica al único par ordenado.
      orden(U, 'CP-08-R1', 'CP-08-R3', 'permitido'),
      { tipo: 'visible', momento: U, riesgo: 'CP-08-R2' },
    ],
    aprobado: PASS,
    ordenRegistrado: { [U]: [['CP-08-R1'], ['CP-08-R3']] },
    bandas: [],
    juicio: ['"R1 se ordena con la mejor estimación, no por el peor escenario": el test de CP-08 comprueba que el ranking usa `C_raw` y no el techo; elegir esa estimación es juicio.'],
  },
  {
    id: 'CP-09',
    momentos: { [U]: ['EV-0073'] },
    adjudicacion: [],
    aprobado: PASS,
    ordenRegistrado: { [U]: [['CP-09-R1']] },
    bandas: [{ evaluacionId: 'EV-0073', admitidas: null, texto: 'Global posiblemente Alta' }],
    juicio: [
      'Que la mejora financiera de la póliza quede visible: vive en el historial de risk-transfer (§11.3, §13), que no existe en las fichas (AN-0016). El arnés comprueba la otra mitad: que la póliza no genera ficha ni mueve factores.',
    ],
  },
  {
    id: 'CP-10',
    momentos: { antes: ['EV-0074'], despues: ['EV-0075'] },
    adjudicacion: [{ tipo: 'movimiento', desde: 'EV-0074', hasta: 'EV-0075', medida: 'c_raw', sentido: 'baja' }],
    aprobado: PASS,
    ordenRegistrado: { antes: [['CP-10-R1']], despues: [['CP-10-R1']] },
    bandas: [{ evaluacionId: null, admitidas: ['Media', 'Alta'], texto: 'Media/Alta (sin momento)' }],
    juicio: ['"Menos de lo esperado": el test de CP-10 lo comprueba contra el cambio esperado escrito en la acción (EV-0024); la magnitud aceptable de la brecha es juicio.'],
  },
  {
    id: 'CP-11',
    // Dos organizaciones: no hay ranking común (§7.1.4, CH-075).
    momentos: { A: ['EV-0076'], B: ['EV-0077'] },
    // "R2 > R1" no es juzgable como orden: comparar posiciones o `C_raw` entre empresas está
    // prohibido desde CH-075. F5-REG-01 lo juzgó por el nivel económico y la bandera.
    adjudicacion: [],
    aprobado: PASS,
    ordenRegistrado: { A: [['CP-11-A-R1']], B: [['CP-11-B-R2']] },
    bandas: [
      { evaluacionId: 'EV-0077', admitidas: ['Alta'], texto: 'R2 Alta' },
      { evaluacionId: 'EV-0076', admitidas: ['Baja', 'Media'], texto: 'R1 Baja/Media' },
    ],
    juicio: ['"No corresponde inferir quiebra": lectura de los datos; el nivel 5 económico no la afirma.'],
  },
  {
    id: 'CP-12',
    momentos: { formaA: ['EV-0078', 'EV-0083'], formaB: ['EV-0079', 'EV-0083'] },
    adjudicacion: [
      orden('formaA', 'CP-12-R1-A', 'CP-12-R2', 'no_especificado'),
      // "Para la priorización principal debe usarse el riesgo padre R1".
      orden('formaB', 'CP-12-R1-B', 'CP-12-R2', 'no_especificado'),
    ],
    aprobado: { categoria: 'FAIL — combinación', secundarias: [] },
    ordenRegistrado: { formaA: [['CP-12-R2'], ['CP-12-R1-A']], formaB: [['CP-12-R2'], ['CP-12-R1-B']] },
    bandas: [{ evaluacionId: 'EV-0079', admitidas: ['Alta'], texto: 'R1 Alta' }],
    juicio: [
      '"La prioridad no debe cambiar por descomponer R1": reemplazado por la decisión de la Fase 4 (§1.3.6, F5-3): no hay invariancia entre formas. No se afirma.',
    ],
  },
  {
    id: 'CP-13',
    momentos: { [U]: ['EV-0084', 'EV-0085'] },
    adjudicacion: [orden(U, 'CP-13-R1', 'CP-13-R2', 'permitido')],
    aprobado: PASS,
    ordenRegistrado: { [U]: [['CP-13-R1'], ['CP-13-R2']] },
    bandas: [{ evaluacionId: 'EV-0084', admitidas: ['Alta'], texto: 'R1 Alta' }],
    juicio: [
      '"R1 ligeramente arriba por su carácter multidimensional": D10 ya no desempata por amplitud (§7.2); R1 queda arriba por I-personas. El motivo adjudicado no se reproduce, el orden sí.',
      '"No sumar dos veces la misma pérdida": es la regla de §4.1.3 al llenar la ficha; no es un derivado.',
    ],
  },
  {
    id: 'CP-14',
    momentos: { [U]: ['EV-0086', 'EV-0087'] },
    // Adjudicación revisada (prevalece PV-1, 2026-10-06 11:08 UTC): ya no exige orden entre
    // R1 y R2; exige que contención y recuperación queden separadas y R1 visible.
    adjudicacion: [{ tipo: 'sin_orden', momento: U, a: 'CP-14-R1', b: 'CP-14-R2' }, { tipo: 'visible', momento: U, riesgo: 'CP-14-R1' }],
    aprobado: PASS,
    revision: {
      adjudicacion: [orden(U, 'CP-14-R1', 'CP-14-R2', 'permitido')],
      aprobadoOriginal: { categoria: 'FAIL — combinación', secundarias: [] },
      fuente: 'v0/fase-5/log-adjudicacion.md, grupo 2; AN-0162',
    },
    ordenRegistrado: { [U]: [['CP-14-R2'], ['CP-14-R1']] },
    bandas: [
      { evaluacionId: 'EV-0086', admitidas: ['Alta'], texto: 'R1 Alta (adjudicación original)' },
      { evaluacionId: 'EV-0087', admitidas: ['Media', 'Alta'], texto: 'R2 Media/Alta (adjudicación original)' },
    ],
    juicio: [],
  },
  {
    id: 'CP-15',
    momentos: { [U]: ['EV-0088', 'EV-0089'] },
    adjudicacion: [
      orden(U, 'CP-15-R2', 'CP-15-R1', 'permitido'),
      { tipo: 'safety_critical', momento: U, riesgo: 'CP-15-R1' },
      { tipo: 'visible', momento: U, riesgo: 'CP-15-R1' },
    ],
    aprobado: PASS,
    ordenRegistrado: { [U]: [['CP-15-R2'], ['CP-15-R1']] },
    bandas: [{ evaluacionId: 'EV-0088', admitidas: null, texto: 'R1 puede ser Alta; safety-critical obligatorio' }],
    juicio: ['"Tratamiento especial" de safety_critical (§8.2.2): exige una acción o decisión registrada, que no está en las fichas.'],
  },
  {
    id: 'CP-16',
    momentos: { [U]: ['EV-0090', 'EV-0091'] },
    adjudicacion: [orden(U, 'CP-16-R1', 'CP-16-R2', 'permitido')],
    // AN-0159: factores en el borde; dudoso hacia D14.
    aprobado: { categoria: 'FAIL — combinación', secundarias: [] },
    ordenRegistrado: { [U]: [['CP-16-R2'], ['CP-16-R1']] },
    bandas: [{ evaluacionId: null, admitidas: ['Alta', 'Media'], texto: 'Alta/Media (sin riesgo)' }],
    juicio: ['La descripción adjudicada del riesgo (5–10 días, manual parcial desde el segundo día) es redacción de la ficha.'],
  },
  {
    id: 'CP-17',
    momentos: { [U]: ['EV-0092'] },
    adjudicacion: [],
    aprobado: PASS,
    ordenRegistrado: { [U]: [['CP-17-R1']] },
    bandas: [{ evaluacionId: 'EV-0092', admitidas: ['Alta'], texto: 'Global Alta' }],
    juicio: ['Límite original, consumido, disponible y renovación visibles: historial de risk-transfer (§11.3), fuera de las fichas.'],
  },
  {
    id: 'CP-18',
    momentos: { antes: ['EV-0093'], despues: ['EV-0094'] },
    adjudicacion: [
      { tipo: 'movimiento', desde: 'EV-0093', hasta: 'EV-0094', medida: 'pers', sentido: 'baja' },
      // "La criticidad global puede permanecer Alta" / "incorrecto que baje todo el riesgo".
      { tipo: 'movimiento', desde: 'EV-0093', hasta: 'EV-0094', medida: 'econ', sentido: 'igual' },
      { tipo: 'movimiento', desde: 'EV-0093', hasta: 'EV-0094', medida: 'cont', sentido: 'igual' },
    ],
    aprobado: PASS,
    ordenRegistrado: { antes: [['CP-18-R1']], despues: [['CP-18-R1']] },
    bandas: [{ evaluacionId: 'EV-0094', admitidas: null, texto: 'Alta patrimonial/operativa (por dimensión, no global)' }],
    juicio: [],
  },
  {
    id: 'CP-19',
    momentos: { base: ['EV-0095'], marzo: ['EV-0096'], mayo: ['EV-0097'], julio: ['EV-0098'] },
    adjudicacion: [
      { tipo: 'movimiento', desde: 'EV-0095', hasta: 'EV-0096', medida: 'c_raw', sentido: 'sube' },
      { tipo: 'movimiento', desde: 'EV-0096', hasta: 'EV-0097', medida: 'c_raw', sentido: 'sube' },
      { tipo: 'movimiento', desde: 'EV-0097', hasta: 'EV-0098', medida: 'c_raw', sentido: 'baja' },
    ],
    aprobado: PASS,
    ordenRegistrado: { base: [['CP-19-R1']], marzo: [['CP-19-R1']], mayo: [['CP-19-R1']], julio: [['CP-19-R1']] },
    bandas: [],
    juicio: ['Septiembre: la escala nueva es hipotética y no se puede puntuar (reporte F4 §1); el arnés comprueba que no hay ficha inventada.'],
  },
  {
    id: 'CP-20',
    momentos: { [U]: ['EV-0099', 'EV-0100', 'EV-0101'] },
    adjudicacion: [
      orden(U, 'CP-20-R2', 'CP-20-R1', 'permitido'),
      orden(U, 'CP-20-R1', 'CP-20-R3', 'no_permitido'),
      orden(U, 'CP-20-R2', 'CP-20-R3', 'no_permitido'),
    ],
    aprobado: PASS,
    ordenRegistrado: { [U]: [['CP-20-R1', 'CP-20-R2'], ['CP-20-R3']] },
    bandas: [{ evaluacionId: 'EV-0102', admitidas: ['Alta'], texto: 'Escenario agregado Alto' }],
    juicio: ['Que la vista "desborde del río" exista y represente correlación: §10 y §13 definen los datos; la vista no existe.'],
  },
]

// ── Perfiles de V de la Fase 5 (casos de origen de §5.5) ─────────────────────
// `v0/fase-5/log-adjudicacion.md`, grupo 2: P 3, I 4 en las cuatro dimensiones.

export type Respuesta = 'casi protegida' | 'a mitad' | 'casi igual de expuesta'

export interface PerfilV {
  readonly id: string
  readonly contencion: 1 | 3 | 5
  readonly recuperacion: 1 | 3 | 5
  /** Respuestas de Emiliano por dimensión (2026-10-06 11:04 UTC). */
  readonly respuestas: Readonly<Record<'pers' | 'econ' | 'cont' | 'legal', Respuesta>>
  /** `V_d` y `C_raw` de la tabla "Contra los perfiles" del log y del ejemplo de §5.5. */
  readonly v: Readonly<Record<'pers' | 'econ' | 'cont' | 'legal', number>>
  readonly cRaw: number
}

const todas = (r: Respuesta) => ({ pers: r, econ: r, cont: r, legal: r })

export const PERFILES_V: readonly PerfilV[] = [
  { id: 'PV-1', contencion: 1, recuperacion: 5, respuestas: todas('casi protegida'), v: { pers: 1, econ: 1, cont: 1, legal: 1 }, cRaw: 12 },
  {
    id: 'PV-2', contencion: 5, recuperacion: 1,
    respuestas: { pers: 'casi igual de expuesta', econ: 'a mitad', cont: 'casi protegida', legal: 'casi igual de expuesta' },
    v: { pers: 5, econ: 3, cont: 1, legal: 5 }, cRaw: 60,
  },
  { id: 'PV-3', contencion: 3, recuperacion: 3, respuestas: todas('a mitad'), v: { pers: 3, econ: 3, cont: 3, legal: 3 }, cRaw: 36 },
  { id: 'PV-4', contencion: 1, recuperacion: 1, respuestas: todas('casi protegida'), v: { pers: 1, econ: 1, cont: 1, legal: 1 }, cRaw: 12 },
  { id: 'PV-5', contencion: 5, recuperacion: 5, respuestas: todas('casi igual de expuesta'), v: { pers: 5, econ: 5, cont: 5, legal: 5 }, cRaw: 60 },
]

/** Orden aprobado de §5.5 tras quitar el desempate de preparación (2026-10-07 01:54 UTC). */
export const ORDEN_PERFILES_V: readonly (readonly string[])[] = [['PV-5', 'PV-2'], ['PV-3'], ['PV-1', 'PV-4']]

/**
 * Lo que Emiliano esperaba y la metodología decidió no ordenar: "PV-5 > PV-2 y PV-1 > PV-4;
 * esas dos diferencias quedan visibles por dimensión y en los campos de V, pero no ordenan".
 */
export const PREFERENCIAS_NO_ORDENADAS: readonly [string, string][] = [['PV-5', 'PV-2'], ['PV-1', 'PV-4']]
