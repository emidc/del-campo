// Detalle de un riesgo: identidad, relaciones, la evaluación usada y el historial de evaluaciones,
// cada una con su criticidad y el movimiento por dimensión contra la anterior.
//
// Es la única vista con `C_raw` (H6), y siempre dentro de un bloque `data-fila="criticidad"` que
// tiene en la misma fila el vector completo y las dos banderas (regla 1). El movimiento muestra
// niveles antes y después, nunca una diferencia (regla 2). El techo plausible va en su propio
// bloque rotulado, fuera de la criticidad (regla 3).

import type { ReactElement } from 'react'

import type { CriticidadDetalle, EntradaHistorial, EvaluacionDetalle, FactorVista, Identidad, Movimiento, VistaDetalle } from '@del-campo/risk'

import {
  cabeceraBanderas, cabeceraVector, calculado, celdasBanderas, celdasVector, corto, DIMENSION, enlaceRiesgo, evaluacionUsada, h, marco,
  NOMBRE_FACTOR, procedencia, revisiones, seccion, tabla, textoFactor, th, vacio, type Aviso,
} from './comun.ts'
import { formAltaAccion, formAltaCobertura, formCerrar, formNovedad, formReevaluacion, formRevisar } from './formularios.ts'
import { bloqueAccion, bloqueCobertura } from './registros.ts'

const dimensiones = (ds: readonly string[]): string => (ds.length === 0 ? '—' : ds.map((d) => DIMENSION[d] ?? d).join(', '))

const vPorDimension = (v: Readonly<Record<string, number>> | null): string =>
  v === null ? 'no se calcula (contención o recuperación unknown)' : Object.entries(v).map(([d, n]) => `${DIMENSION[d] ?? d} ${String(n)}`).join(', ')

const criticidad = (c: CriticidadDetalle): ReactElement =>
  h('div', { className: 'criticidad' },
    calculado(c.version, 'Criticidad'),
    tabla([h('th', { scope: 'col' }, 'C_raw'), th('Banda'), th('I efectivo'), th('Determinante'), ...cabeceraVector(), ...cabeceraBanderas()], [
      h('tr', { 'data-fila': 'criticidad' },
        h('td', { 'data-c-raw': c.cRaw === null ? '' : String(c.cRaw) }, c.cRaw === null ? `no evaluable: ${c.motivoNoEvaluable ?? ''}` : String(c.cRaw)),
        h('td', { 'data-banda': c.banda ?? '' }, c.banda ?? 'sin banda'),
        h('td', null, c.iEfectivo),
        h('td', null, dimensiones(c.dimensionDeterminante)),
        ...celdasVector(c.vector),
        ...celdasBanderas(c.banderas)),
    ]),
    h('p', { className: 'muted small' }, `V por dimensión: ${vPorDimension(c.vPorDimension)}.`))

const nivel = (f: FactorVista): ReactElement => h('span', { className: `factor ${f.estado}` }, textoFactor(f))

const movimiento = (m: Movimiento): ReactElement =>
  h('details', { className: 'movimiento' },
    h('summary', null, `Movimiento contra ${corto(m.contraId)}${m.contraAceptada ? ' (la anterior aceptada)' : ' (la anterior de la cadena; no había una aceptada)'}`),
    h('p', { className: 'muted small' }, 'Niveles antes y después, sin restar.'),
    tabla([th('Factor'), th('Antes'), th('Después')], m.factores.map((x) =>
      h('tr', { 'data-movimiento': x.factor, className: textoFactor(x.antes) === textoFactor(x.despues) ? '' : 'cambio' },
        h('td', null, NOMBRE_FACTOR[x.factor]), h('td', null, nivel(x.antes)), h('td', null, nivel(x.despues))))),
    h('ul', null,
      h('li', null, `V por dimensión: antes ${vPorDimension(m.vPorDimension.antes)}; después ${vPorDimension(m.vPorDimension.despues)}.`),
      h('li', null, `Banda: antes ${m.banda.antes ?? 'sin banda'}; después ${m.banda.despues ?? 'sin banda'}.`),
      h('li', null, `Determinante: antes ${dimensiones(m.dimensionDeterminante.antes)}; después ${dimensiones(m.dimensionDeterminante.despues)}.`)))

const evaluacion = (riskId: string) => (e: EvaluacionDetalle): ReactElement =>
  h('article', { className: e.vigente ? 'registro vigente' : 'registro', 'data-evaluacion-detalle': e.id },
    h('h4', null, `${e.tipo === 'inicial' ? 'Evaluación inicial' : `Reevaluación por ${e.motivo ?? 'motivo sin registrar'}`} · ${e.fecha}`,
      e.vigente ? h('span', { className: 'ok' }, ' · la usada') : null),
    h('p', { className: 'muted small' },
      h('code', { title: e.id }, corto(e.id)), ` · ${e.versionMetodologia} · evaluó ${e.evaluador} · ${procedencia(e.procedencia)} · review status ${e.reviewStatus}; `,
      revisiones(e.revisiones)),
    h('p', null, [e.riesgoCausa, e.riesgoEvento, e.riesgoConsecuencia].filter((x) => x !== null).join(' → ')),
    criticidad(e.criticidad),
    h('p', { className: 'techo', 'data-techo': String(e.techoPlausible.valor) },
      `${e.techoPlausible.rotulo}: ${String(e.techoPlausible.valor)} (calculado con las funciones de ${e.techoPlausible.version}).`),
    h('details', null, h('summary', null, 'Factores, con su base y evidencia'),
      tabla([th('Factor'), th('Valor'), th('Observación'), th('Base'), th('Evidencia')], e.factores.map((f) =>
        h('tr', null, h('td', null, NOMBRE_FACTOR[f.factor]), h('td', null, nivel(f)), h('td', null, f.observacion ?? '—'),
          h('td', null, f.base ?? '—'), h('td', null, f.evidencia === null ? '—' : f.evidencia.join(', ')))))),
    h('ul', { className: 'muted small' },
      h('li', null, `Monto bruto: ${e.montoBruto === null ? 'sin registrar' : `${e.montoBruto} ${e.moneda ?? ''}`}`),
      h('li', null, `Uncertainty: ${e.uncertainty}${e.uncertaintyNota === null ? '' : ` (${e.uncertaintyNota})`}`),
      e.necesidadValidacion === null ? null : h('li', null, `Necesidad de validación: ${e.necesidadValidacion}`),
      e.justificacion === null ? null : h('li', null, `Justificación: ${e.justificacion}`),
      e.reglasAplicadas === null ? null : h('li', null, `Reglas aplicadas: ${e.reglasAplicadas.join(', ')}`)),
    e.movimiento === null ? null : movimiento(e.movimiento),
    formRevisar(riskId, 'evaluacion', e.id, `/r/${riskId}`))

const TABLA: Readonly<Record<string, string>> = {
  riesgo: 'Riesgo', evaluacion: 'Evaluación', revision_humana: 'Revisión humana', accion: 'Acción', accion_estado: 'Estado de acción',
  transferencia: 'Cobertura', evento_poliza: 'Evento de póliza', novedad: 'Novedad', revision_pendiente: 'Revisión pendiente',
  cierre_revision: 'Cierre de revisión', reordenamiento: 'Reordenamiento', orden_previo_item: 'Orden previo',
}

/** Todo lo que cambió del riesgo, del más reciente al más antiguo: quién, cuándo, qué había antes y qué quedó (A12). */
const historialDeCambios = (cambios: readonly EntradaHistorial[]): ReactElement =>
  cambios.length === 0 ? vacio('Sin cambios registrados.') :
    tabla([th('Cuándo'), th('Quién'), th('Qué'), th('Antes'), th('Después')], [...cambios].reverse().map((c) =>
      h('tr', { 'data-cambio': c.tabla, 'data-objeto': c.objetoId },
        h('td', null, c.cuando), h('td', null, `${c.quien}${c.origen === 'importacion' ? ' (importación)' : ''}`),
        h('td', null, h('strong', null, TABLA[c.tabla] ?? c.tabla), ' · ', c.que, ' ', h('code', { title: c.objetoId }, corto(c.objetoId))),
        h('td', null, c.antes ?? '—'), h('td', null, c.despues))))

const relacion = (titulo: string, xs: readonly Identidad[]): ReactElement | null =>
  xs.length === 0 ? null : h('p', null, `${titulo}: `, ...xs.flatMap((x, i) => [i === 0 ? '' : ', ', enlaceRiesgo(x.riskId, x.titulo, x.idOrigen)]))

export const PaginaDetalle = (v: VistaDetalle, persona: string, avisoDePagina?: Aviso): ReactElement => {
  const r = v.riesgo
  const volver = `/r/${r.riskId}`
  const padre = r.tipoObjeto === 'padre'
  const reevaluaciones = v.historial.map((e) => ({ id: e.id, fecha: e.fecha, accionId: e.accionId, motivo: e.motivo }))
  const base = v.historial.find((e) => e.vigente) ?? v.historial.at(-1)
  const destinos = [
    ...v.acciones.map((a): readonly [string, string] => [a.id, `acción: ${a.descripcion}`]),
    ...v.coberturas.map((c): readonly [string, string] => [c.id, `cobertura: ${c.polizaRef}`]),
  ]
  return marco(`${r.idOrigen === null ? '' : `${r.idOrigen} · `}${r.titulo}`, { organizacionId: v.organizacionId, persona, ...(avisoDePagina === undefined ? {} : { aviso: avisoDePagina }) },
    h('p', { className: 'muted' }, h('code', null, r.riskId), ` · ${r.tipoObjeto}${r.unidadId === null ? '' : ` · unidad ${r.unidadId}`}${r.loteOrigen === null ? '' : ` · lote ${r.loteOrigen}`}`),
    h('p', { 'data-posicion-detalle': v.posicion === null ? '' : String(v.posicion.posicion) },
      v.posicion === null ? 'No compite en el ranking principal de su organización.' :
        `Posición ${String(v.posicion.posicion)} en el ranking de su organización${v.posicion.empate ? ' (empate)' : ''}${v.posicion.provisional ? ' (provisional)' : ''}.`),
    v.posicion === null ? null : calculado(v.version, 'Posición'),
    v.leePor === null
      ? h('p', null, 'Evaluación usada: ', evaluacionUsada(v.evaluacionUsada))
      : h('p', { 'data-lee-por': v.leePor.riskId },
        'Un padre no tiene evaluación propia: se lee por su hijo prioritario ', enlaceRiesgo(v.leePor.riskId, v.leePor.titulo, v.leePor.idOrigen),
        v.leePor.prioridadProvisional ? ' (prioridad provisional por un unknown)' : '', '. Evaluación usada: ', evaluacionUsada(v.leePor.evaluacion)),
    relacion('Padre', r.padre === null ? [] : [r.padre]),
    relacion('Hijos', r.hijos),
    relacion('Miembros', r.miembros),
    relacion('En los escenarios', r.escenarios),
    r.consecuenciaComun === null ? null : h('p', null, `Consecuencia común: ${r.consecuenciaComun}`),
    seccion('Revisiones pendientes', v.revisionesPendientes.length === 0 ? vacio('Ninguna.') : h('ul', null, ...v.revisionesPendientes.map((p) =>
      h('li', { 'data-revision': p.id, 'data-estado': p.estado }, `${p.abiertaEn} · ${p.disparador}${p.referencia === null ? '' : ` (${p.referencia})`} · ${p.estado}`,
        p.cierre === null ? '' : `: ${p.cierre.resultado === 'sin_cambio' ? `sin cambio (${p.cierre.fundamento ?? ''})` : `reevaluación aceptada ${corto(p.cierre.evaluacionId ?? '')}`} por ${p.cierre.cerradaPor} el ${p.cierre.cerradaEn}`,
        p.estado === 'abierta' ? h('div', { className: 'formularios' }, ...formCerrar(r.riskId, p, v.historial, volver)) : null)))),
    seccion('Historial de evaluaciones',
      v.historial.length === 0 ? vacio(padre ? 'Un padre no tiene evaluación propia: se lee por sus hijos.' : 'Sin evaluaciones.') :
        h('div', null, ...[...v.historial].reverse().map(evaluacion(r.riskId))),
      padre || base === undefined ? null : formReevaluacion(r.riskId, base, v.acciones, volver)),
    seccion('Acciones y decisiones', v.acciones.length === 0 ? vacio('Sin acciones registradas.') : h('div', null, ...v.acciones.map((a) => bloqueAccion(a, { volver, reevaluaciones }))),
      padre ? null : formAltaAccion(r.riskId, volver)),
    seccion('Coberturas', v.coberturas.length === 0 ? vacio('Sin coberturas registradas.') : h('div', null, ...v.coberturas.map((c) => bloqueCobertura(c, { volver }))),
      padre ? null : formAltaCobertura(r.riskId, volver)),
    seccion('Novedades', v.novedades.length === 0 ? vacio('Sin novedades.') : h('ul', null, ...v.novedades.map((n) =>
      h('li', null, `${n.registradaEn} · ${n.tipo} · ${n.autor}: ${n.texto}${n.evidencia.length === 0 ? '' : ` (evidencia: ${n.evidencia.join(', ')})`}`))),
      formNovedad(r.riskId, destinos, volver)),
    seccion('Historial de cambios', h('p', { className: 'muted' }, 'Cada cambio es un registro nuevo: nada se sobrescribe ni se borra.'), historialDeCambios(v.cambios)))
}
