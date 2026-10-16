// Lista por organización (RO01 §2): ranking D10 con posiciones, banda, vector completo y banderas;
// y, como secciones de la misma página, seguridad, no evaluables y la cola de validación.
//
// Ninguna fila muestra `C_raw` (H6: sólo en el detalle). El filtro por unidad conserva el número
// de posición de la organización (regla 4): una unidad muestra huecos, no un ranking propio. El
// techo plausible sólo aparece en la cola, en su columna rotulada (regla 3).

import type { ReactElement } from 'react'

import type { FilaCola, FilaNoEvaluable, FilaRanking, FilaSeguridad, HijoEnLista, Lectura, VistaLista } from '@del-campo/risk'

import {
  cabeceraBanderas, cabeceraVector, calculado, celdasBanderas, celdasVector, DIMENSION, enlaceRiesgo, evaluacionUsada, h, marco,
  seccion, tabla, th, vacio,
} from './comun.ts'

const banda = (l: Lectura): ReactElement =>
  h('td', { 'data-banda': l.banda ?? '', className: `banda ${l.banda ?? 'ninguna'}` }, l.banda ?? 'sin banda')

const determinante = (l: Lectura): string => (l.dimensionDeterminante.length === 0 ? '—' : l.dimensionDeterminante.map((d) => DIMENSION[d] ?? d).join(', '))

/** Las columnas de lectura: banda, I efectivo, determinante, el vector, las banderas y la evaluación usada. */
const celdasLectura = (l: Lectura): ReactElement[] => [
  banda(l),
  h('td', null, l.iEfectivo),
  h('td', null, determinante(l)),
  ...celdasVector(l.vector),
  ...celdasBanderas(l.banderas),
  h('td', null, evaluacionUsada(l.evaluacion)),
]

const cabeceraLectura = (): ReactElement[] => [th('Banda'), th('I efectivo'), th('Determinante'), ...cabeceraVector(), ...cabeceraBanderas(), th('Evaluación usada')]

const posicion = (f: FilaRanking): string => `${String(f.posicion)}${f.empate ? ' (empate)' : ''}${f.provisional ? ' (provisional)' : ''}`

const filaHijo = (x: HijoEnLista): ReactElement =>
  x.lectura === null
    ? h('tr', { 'data-fila': 'hijo', 'data-risk-id': x.riskId, className: 'hijo' },
      h('td', null, '↳'), h('td', null, enlaceRiesgo(x.riskId, x.titulo, x.idOrigen)), h('td', { colSpan: 13 }, 'sin evaluación vigente'))
    : h('tr', { 'data-fila': 'hijo', 'data-risk-id': x.riskId, className: 'hijo' },
      h('td', null, x.prioritario ? '↳ prioritario' : '↳'), h('td', null, enlaceRiesgo(x.riskId, x.titulo, x.idOrigen)), ...celdasLectura(x.lectura))

const filasRanking = (f: FilaRanking): ReactElement[] => [
  h('tr', { 'data-fila': 'ranking', 'data-risk-id': f.riskId, 'data-posicion': f.posicion },
    h('td', { className: 'posicion' }, posicion(f)),
    h('td', null, enlaceRiesgo(f.riskId, f.titulo, f.idOrigen),
      f.padre === null ? null : h('div', { className: 'muted small' },
        `padre: se lee por su hijo prioritario${f.padre.prioridadProvisional ? ' (prioridad provisional por un unknown)' : ''}`)),
    ...celdasLectura(f.lectura)),
  ...(f.padre === null ? [] : f.padre.hijos.map(filaHijo)),
]

const tratamiento = (f: FilaSeguridad): ReactElement => {
  const t = f.tratamiento
  return h('td', null,
    t.accionesEnCurso.length === 0 ? null : h('div', null, `En curso: ${t.accionesEnCurso.map((a) => a.descripcion).join('; ')}`),
    t.decision === null ? null : h('div', null,
      `Decisión: ${t.decision.decision}${t.decision.fechaProximaRevision === null ? '' : `, próxima revisión ${t.decision.fechaProximaRevision}`}`),
    f.alerta ? h('strong', { className: 'aviso', 'data-alerta': 'sin-tratamiento' }, 'Sin acción en curso ni decisión registrada') : null)
}

const filaSeguridad = (f: FilaSeguridad): ReactElement =>
  h('tr', { 'data-fila': 'seguridad', 'data-risk-id': f.riskId },
    h('td', null, enlaceRiesgo(f.riskId, f.titulo, f.idOrigen)), ...celdasLectura(f.lectura), tratamiento(f))

const filaNoEvaluable = (f: FilaNoEvaluable): ReactElement =>
  h('tr', { 'data-fila': 'no-evaluable', 'data-risk-id': f.riskId },
    h('td', null, enlaceRiesgo(f.riskId, f.titulo, f.idOrigen)),
    h('td', null, f.motivo),
    h('td', null, f.necesidadValidacion ?? '—'),
    ...(f.lectura === null
      ? [h('td', { colSpan: 13 }, f.tipoObjeto === 'padre' ? 'padre: no tiene evaluación propia' : 'sin evaluación vigente')]
      : celdasLectura(f.lectura)))

const filaCola = (f: FilaCola): ReactElement =>
  h('tr', { 'data-fila': 'cola', 'data-risk-id': f.riskId },
    h('td', null, String(f.orden)),
    h('td', null, enlaceRiesgo(f.riskId, f.titulo, f.idOrigen)),
    h('td', null, f.entra.join(', ')),
    h('td', null, f.uncertainty),
    h('td', null, f.necesidadValidacion ?? '—'),
    ...celdasLectura(f.lectura),
    h('td', { 'data-techo': String(f.techoPlausible.valor), className: 'techo', title: f.techoPlausible.rotulo }, String(f.techoPlausible.valor)))

const filtroUnidad = (v: VistaLista): ReactElement | null =>
  v.unidades.length === 0 ? null : h('form', { method: 'get', className: 'filtro' },
    h('label', null, 'Unidad ',
      h('select', { name: 'unidad', defaultValue: v.unidad ?? '' },
        h('option', { value: '' }, 'toda la organización'),
        ...v.unidades.map((u) => h('option', { value: u }, u)))),
    h('button', { type: 'submit' }, 'Filtrar'),
    v.unidad === null ? null : h('p', { className: 'muted' },
      `Filtrado por la unidad ${v.unidad}. Las posiciones son las de la organización: el filtro oculta filas y no reordena.`))

export const PaginaLista = (v: VistaLista, persona: string): ReactElement =>
  marco('Lista de riesgos', { organizacionId: v.organizacionId, activa: 'lista', persona },
    calculado(v.version, 'Posiciones, bandas, banderas, cola y techo plausible'),
    h('p', { className: 'muted' }, 'Cada fila usa la evaluación vigente de su riesgo: la última aceptada o, si no hay, la última no rechazada, rotulada pendiente de revisión.'),
    filtroUnidad(v),
    seccion('Ranking (D10)',
      v.ranking.length === 0 ? vacio('Ningún riesgo evaluable compite en esta selección.') :
        tabla([th('Pos.'), th('Riesgo'), ...cabeceraLectura()], v.ranking.flatMap(filasRanking))),
    seccion('Seguridad (safety_critical)',
      h('p', { className: 'muted' }, 'Riesgos con la bandera safety_critical, con su tratamiento. La alerta marca los que no tienen acción en curso ni decisión registrada.'),
      v.seguridad.length === 0 ? vacio('Ningún riesgo tiene la bandera safety_critical.') :
        tabla([th('Riesgo'), ...cabeceraLectura(), th('Tratamiento')], v.seguridad.map(filaSeguridad))),
    seccion('No evaluables',
      v.noEvaluables.length === 0 ? vacio('No hay objetos no evaluables.') :
        tabla([th('Riesgo'), th('Motivo'), th('Necesidad de validación'), ...cabeceraLectura()], v.noEvaluables.map(filaNoEvaluable))),
    seccion('Cola de validación',
      h('p', { className: 'muted' }, 'El orden es el de la cola, no una posición del ranking. El techo plausible va aparte y nunca entra al ranking.'),
      v.cola.length === 0 ? vacio('La cola está vacía.') :
        tabla([th('Orden'), th('Riesgo'), th('Entra por'), th('Uncertainty'), th('Necesidad de validación'), ...cabeceraLectura(),
          h('th', { scope: 'col', className: 'techo' }, 'Techo plausible (no entra al ranking)')], v.cola.map(filaCola))))
