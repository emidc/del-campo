// Piezas comunes de las vistas, escritas con `createElement` y no con JSX para que los tests de
// presentación las rendericen con el runner de Node (que no transforma JSX) sobre los mismos
// datos que ve la persona. Las páginas de `src/app` sólo cargan la sesión y los datos y llaman
// a estas funciones.
//
// Marcas que leen los tests (RO01 §3, regla 1): cada fila que muestra factores es un elemento
// con `data-fila`; dentro, cada factor es un `data-factor` con su `data-estado`, y cada bandera
// un `data-bandera`. `C_raw` sólo aparece en el detalle, como `data-c-raw`, dentro de una fila
// con el vector completo y las dos banderas.

import { createElement, type ReactElement, type ReactNode } from 'react'

import type { Banderas, EvaluacionUsada, FactorVista, NombreFactor, Procedencia, RevisionRegistrada } from '@del-campo/risk'

type Props = Record<string, string | number | boolean | undefined | null>

export const h = (tag: string, props: Props | null, ...children: ReactNode[]): ReactElement => createElement(tag, props, ...children)

export const NOMBRE_FACTOR: Readonly<Record<NombreFactor, string>> = {
  p: 'P',
  i_econ: 'I econ.',
  i_pers: 'I pers.',
  i_cont: 'I cont.',
  i_legal: 'I legal',
  v_cont: 'V cont.',
  v_rec: 'V rec.',
}

export const DIMENSION: Readonly<Record<string, string>> = { econ: 'económica', pers: 'personas', cont: 'continuidad', legal: 'legal' }

const rango = (f: FactorVista): string =>
  f.min === null && f.max === null ? '' : ` [${f.min === null ? '·' : String(f.min)}–${f.max === null ? '·' : String(f.max)}]`

/** Un factor: el valor, `unknown` (nunca completado con un valor, §9) o `no aplica`, y su rango si lo tiene. */
export const textoFactor = (f: FactorVista): string =>
  f.estado === 'known' ? `${String(f.valor)}${rango(f)}` : f.estado === 'unknown' ? `unknown${rango(f)}` : 'no aplica'

export const celdasVector = (vector: readonly FactorVista[]): ReactElement[] =>
  vector.map((f) => h('td', { 'data-factor': f.factor, 'data-estado': f.estado, className: `factor ${f.estado}` }, textoFactor(f)))

export const cabeceraVector = (): ReactElement[] => Object.values(NOMBRE_FACTOR).map((n) => h('th', { scope: 'col' }, n))

export const celdasBanderas = (b: Banderas): ReactElement[] => [
  h('td', { 'data-bandera': 'consecuencia_extrema', className: b.consecuenciaExtrema ? 'bandera on' : 'bandera' },
    b.consecuenciaExtrema ? `sí (${b.dimensionesExtremas.map((d) => DIMENSION[d] ?? d).join(', ')})` : 'no'),
  h('td', { 'data-bandera': 'safety_critical', className: b.safetyCritical ? 'bandera on' : 'bandera' }, b.safetyCritical ? 'sí' : 'no'),
]

export const cabeceraBanderas = (): ReactElement[] => [
  h('th', { scope: 'col', title: 'consecuencia_extrema' }, 'Cons. extrema'),
  h('th', { scope: 'col', title: 'safety_critical' }, 'Safety'),
]

/** Qué evaluación usa la fila (RO01 §3, regla 6). */
export const evaluacionUsada = (e: EvaluacionUsada | null): ReactElement => {
  if (e === null) return h('span', { className: 'muted' }, 'sin evaluación vigente')
  const posteriores = e.posteriores.length === 0 ? null : h('div', { className: 'muted small' },
    `después: ${e.posteriores.map((p) => `${corto(p.id)} (${p.reviewStatus})`).join(', ')}; no la reemplazan`)
  return h('span', { 'data-evaluacion': e.id },
    h('code', { title: e.id }, corto(e.id)), ` · ${e.fecha} · `,
    e.rotulo === 'aceptada' ? h('span', { className: 'ok' }, 'aceptada') : h('span', { className: 'aviso' }, 'pendiente de revisión'),
    posteriores)
}

/** Los últimos 6 caracteres de un id: para leer, no para identificar (el id completo va en `title`). */
export const corto = (id: string): string => `…${id.slice(-6)}`

export const enlaceRiesgo = (riskId: string, titulo: string, idOrigen: string | null): ReactElement =>
  h('a', { href: `/r/${riskId}`, title: riskId }, idOrigen === null ? titulo : `${idOrigen} · ${titulo}`)

export const procedencia = (p: Procedencia): string => `${p.actor}, ${p.base}; evidencia: ${p.evidencia.join(', ')}`

export const revisiones = (rs: readonly RevisionRegistrada[]): ReactNode =>
  rs.length === 0 ? 'sin revisión humana (pending)' : rs.map((r) => `${r.estado} por ${r.revisor} (${r.actor}) el ${r.fecha}`).join('; ')

/** Rótulo de lo calculado (RO01 §3, regla 7). */
export const calculado = (version: string, que: string): ReactElement =>
  h('p', { className: 'calculado' }, `${que}: calculado con las funciones de ${version}.`)

export const vacio = (texto: string): ReactElement => h('p', { className: 'muted' }, texto)

export const seccion = (titulo: string, ...children: ReactNode[]): ReactElement => h('section', null, h('h2', null, titulo), ...children)

export const tabla = (cabecera: ReactElement[], filas: ReactElement[]): ReactElement =>
  h('div', { className: 'tabla' }, h('table', null, h('thead', null, h('tr', null, ...cabecera)), h('tbody', null, ...filas)))

export const th = (texto: string): ReactElement => h('th', { scope: 'col' }, texto)

/** Lo que trae a la página el resultado de un formulario: `?ok=` o `?error=` (T-0031). */
export interface Aviso {
  readonly ok?: string | undefined
  readonly error?: string | undefined
}

export const aviso = (a: Aviso | undefined): ReactElement | null =>
  a?.error !== undefined ? h('p', { className: 'aviso-error', role: 'alert', 'data-aviso': 'error' }, `No se guardó nada: ${a.error}`)
    : a?.ok !== undefined ? h('p', { className: 'aviso-ok', role: 'status', 'data-aviso': 'ok' }, a.ok) : null

/** El aviso de los parámetros de una página. */
export const avisoDe = (q: { ok?: string | string[] | undefined; error?: string | string[] | undefined }): Aviso => ({
  ok: typeof q.ok === 'string' ? q.ok.slice(0, 300) : undefined,
  error: typeof q.error === 'string' ? q.error.slice(0, 300) : undefined,
})

export interface Navegacion {
  readonly organizacionId?: string
  readonly activa?: 'organizaciones' | 'lista' | 'escenarios' | 'plan' | 'transferencia' | 'orden-previo'
  readonly persona: string
  readonly aviso?: Aviso
}

/** El marco de toda página: navegación de la organización y quién está en la sesión. */
export const marco = (titulo: string, nav: Navegacion, ...children: ReactNode[]): ReactElement => {
  const org = nav.organizacionId
  const link = (clave: NonNullable<Navegacion['activa']>, href: string, texto: string): ReactElement =>
    h('a', { href, className: nav.activa === clave ? 'activa' : undefined }, texto)
  const base = org === undefined ? null : `/o/${encodeURIComponent(org)}`
  return h('main', null,
    h('header', { className: 'barra' },
      h('nav', null,
        link('organizaciones', '/', 'Organizaciones'),
        ...(base === null ? [] : [
          link('lista', base, 'Lista'),
          link('escenarios', `${base}/escenarios`, 'Escenarios'),
          link('plan', `${base}/plan`, 'Plan de acción'),
          link('transferencia', `${base}/transferencia`, 'Transferencia y actividad'),
          link('orden-previo', `${base}/orden-previo`, 'Orden previo'),
        ])),
      h('form', { method: 'post', action: '/api/logout', className: 'salir' },
        h('span', { className: 'muted' }, nav.persona), h('button', { type: 'submit' }, 'Salir'))),
    h('h1', null, titulo),
    org === undefined ? null : h('p', { className: 'muted' }, 'Organización ', h('code', null, org)),
    aviso(nav.aviso),
    ...children)
}
