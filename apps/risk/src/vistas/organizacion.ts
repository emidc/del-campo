// Escenarios, plan de acción, y transferencia con el feed de actividad: las vistas de una
// organización que no son la lista.

import type { ReactElement } from 'react'

import type {
  FilaEscenario, Identidad, Lectura, ObjetoCiego, PantallaOrdenPrevio, RiesgoEnPlan, VistaActividad, VistaEscenarios, VistaPlan, VistaTransferencia,
} from '@del-campo/risk'

import {
  cabeceraBanderas, cabeceraVector, calculado, celdasBanderas, celdasVector, corto, enlaceRiesgo, evaluacionUsada, h, marco, seccion, tabla,
  th, vacio, type Aviso,
} from './comun.ts'
import { bloqueAccion, bloqueCobertura } from './registros.ts'

// ── Escenarios (§10.4) ───────────────────────────────────────────────────────

const celdasLectura = (l: Lectura | null): ReactElement[] =>
  l === null
    ? [h('td', { colSpan: 11 }, 'sin evaluación vigente')]
    : [h('td', { 'data-banda': l.banda ?? '' }, l.banda ?? (l.evaluable ? 'sin banda' : `no evaluable: ${l.motivoNoEvaluable ?? ''}`)),
      ...celdasVector(l.vector), ...celdasBanderas(l.banderas), h('td', null, evaluacionUsada(l.evaluacion))]

const filasEscenario = (e: FilaEscenario): ReactElement[] => [
  h('tr', { 'data-fila': 'escenario', 'data-risk-id': e.riskId, className: 'escenario' },
    h('td', null, enlaceRiesgo(e.riskId, e.titulo, e.idOrigen)), ...celdasLectura(e.lectura)),
  ...e.miembros.map((m: Identidad & { readonly lectura: Lectura | null }) =>
    h('tr', { 'data-fila': 'miembro', 'data-risk-id': m.riskId, className: 'hijo' },
      h('td', null, '↳ ', enlaceRiesgo(m.riskId, m.titulo, m.idOrigen)), ...celdasLectura(m.lectura))),
]

export const PaginaEscenarios = (v: VistaEscenarios, persona: string): ReactElement =>
  marco('Escenarios', { organizacionId: v.organizacionId, activa: 'escenarios', persona },
    calculado(v.version, 'Bandas y banderas'),
    h('p', { className: 'muted' }, 'Un escenario se evalúa aparte y no entra al ranking principal (§10.4). Debajo de cada uno, sus miembros con su propia evaluación vigente.'),
    v.escenarios.length === 0 ? vacio('La organización no tiene escenarios.') :
      tabla([th('Escenario / miembro'), th('Banda'), ...cabeceraVector(), ...cabeceraBanderas(), th('Evaluación usada')], v.escenarios.flatMap(filasEscenario)))

// ── Plan de acción (§11) ─────────────────────────────────────────────────────

const conAviso = (a: Aviso | undefined): { aviso?: Aviso } => (a === undefined ? {} : { aviso: a })

const riesgoEnPlan = (volver: string) => (r: RiesgoEnPlan): ReactElement =>
  h('section', { className: 'riesgo', 'data-risk-id': r.riskId },
    h('h3', null, enlaceRiesgo(r.riskId, r.titulo, r.idOrigen)),
    ...r.acciones.map((a) => bloqueAccion(a, { volver })))

export const PaginaPlan = (v: VistaPlan, persona: string, avisoDePagina?: Aviso): ReactElement => {
  const conAcciones = v.riesgos.filter((r) => r.acciones.length > 0)
  const volver = `/o/${encodeURIComponent(v.organizacionId)}/plan`
  return marco('Plan de acción', { organizacionId: v.organizacionId, activa: 'plan', persona, ...conAviso(avisoDePagina) },
    h('p', { className: 'muted' }, 'Muestra las acciones y decisiones de tratamiento registradas. No usa ninguna evaluación ni calcula nada: el cambio esperado es una hipótesis y la eficacia es la que observó una reevaluación.'),
    h('p', { className: 'muted' }, 'Una acción nueva y la eficacia de una cumplida se registran desde el detalle del riesgo, junto a sus reevaluaciones.'),
    conAcciones.length === 0 ? vacio('No hay acciones ni decisiones registradas.') : h('div', null, ...conAcciones.map(riesgoEnPlan(volver))))
}

// ── Transferencia y actividad (§12, §13) ─────────────────────────────────────

const ACTIVIDAD: Readonly<Record<string, string>> = {
  evaluacion: 'Evaluación', revision_humana: 'Revisión humana', estado_accion: 'Acción', evento_poliza: 'Evento de póliza',
  revision_pendiente: 'Revisión pendiente', cierre_revision: 'Cierre de revisión', novedad: 'Novedad',
}

export const PaginaTransferencia = (t: VistaTransferencia, a: VistaActividad, persona: string, avisoDePagina?: Aviso): ReactElement =>
  marco('Transferencia y actividad', { organizacionId: t.organizacionId, activa: 'transferencia', persona, ...conAviso(avisoDePagina) },
    seccion('Transferencia',
      calculado(t.version, 'Límite disponible'),
      h('p', { className: 'muted' }, 'Lo registrado de cada póliza, por riesgo. No usa evaluaciones ni descuenta la cobertura del riesgo: la suficiencia es la que se registró.'),
      t.riesgos.length === 0 ? vacio('No hay coberturas registradas.') : h('div', null, ...t.riesgos.map((r) =>
        h('section', { className: 'riesgo', 'data-risk-id': r.riskId },
          h('h3', null, enlaceRiesgo(r.riskId, r.titulo, r.idOrigen)),
          ...r.coberturas.map((c) => bloqueCobertura(c, { volver: `/o/${encodeURIComponent(t.organizacionId)}/transferencia` })))))),
    seccion('Actividad',
      h('p', { className: 'muted' }, 'Lo registrado en la organización, de lo más nuevo a lo más viejo. No calcula nada.'),
      a.items.length === 0 ? vacio('Sin actividad registrada.') :
        tabla([th('Fecha'), th('Tipo'), th('Riesgo'), th('Qué'), th('Registro')], a.items.map((i) =>
          h('tr', { 'data-actividad': i.tipo },
            h('td', null, i.fecha), h('td', null, ACTIVIDAD[i.tipo] ?? i.tipo), h('td', null, enlaceRiesgo(i.riskId, i.titulo, i.idOrigen)),
            h('td', null, i.detalle), h('td', null, h('code', { title: i.refId }, corto(i.refId))))))))

// ── Orden previo del revisor (decisión 6; A8a) ───────────────────────────────

const BANDAS_PREVIO = ['Baja', 'Media', 'Alta', 'Crítica']

/**
 * El material ciego: los riesgos y padres de la empresa con su identidad, en orden de origen, sin
 * ranking, bandas, `C_raw` ni factores. La persona escribe su posición y, si quiere, su banda.
 */
export const PaginaOrdenPrevio = (p: PantallaOrdenPrevio, persona: string, avisoDePagina?: Aviso): ReactElement =>
  marco('Orden previo del revisor', { organizacionId: p.organizacionId, activa: 'orden-previo', persona, ...conAviso(avisoDePagina) },
    h('p', { className: 'muted' }, 'Tu orden profesional de esta empresa, escrito antes de ver resultados. Esta pantalla no muestra ranking, bandas ni criticidad, y no cuenta como acceso a resultados.'),
    p.registrado !== null
      ? seccion('Ya registrado',
        h('p', null, `Registraste tu orden previo el ${p.registrado.registradoEn}.`),
        tabla([th('Posición'), th('Riesgo'), th('Banda')], [...p.registrado.items].sort((a, b) => a.posicion - b.posicion).map((i) => {
          const o = p.objetos.find((x) => x.riskId === i.riskId)
          return h('tr', { 'data-orden-previo': i.riskId }, h('td', null, String(i.posicion)), h('td', null, o === undefined ? i.riskId : `${o.idOrigen ?? ''} ${o.titulo}`.trim()), h('td', null, i.banda ?? '—'))
        })))
      : p.vioResultados
        ? h('p', { className: 'aviso', 'data-orden-previo-cerrado': '' }, 'Ya accediste a resultados de esta empresa: un orden registrado ahora no sería previo (A8a).')
        : h('form', { method: 'post', action: `/api/o/${encodeURIComponent(p.organizacionId)}/orden-previo`, 'data-formulario': 'orden-previo' },
          h('label', null, h('span', null, 'Material ciego (referencia)'), h('input', { name: 'material', required: true, placeholder: 'qué ficha o material usaste' })),
          tabla([th('Riesgo'), th('Tipo'), th('Unidad'), th('Tu posición'), th('Tu banda')], p.objetos.map((o: ObjetoCiego) =>
            h('tr', { 'data-objeto-ciego': o.riskId },
              h('td', null, o.idOrigen === null ? o.titulo : `${o.idOrigen} · ${o.titulo}`,
                o.hijos.length === 0 ? null : h('div', { className: 'muted small' }, `hijos: ${o.hijos.map((x) => x.idOrigen ?? x.titulo).join(', ')}`)),
              h('td', null, o.tipoObjeto), h('td', null, o.unidadId ?? '—'),
              h('td', null, h('input', { name: `pos_${o.riskId}`, type: 'number', min: 1, max: p.objetos.length, required: true, 'aria-label': `posición de ${o.titulo}` })),
              h('td', null, h('select', { name: `banda_${o.riskId}`, defaultValue: '', 'aria-label': `banda de ${o.titulo}` },
                h('option', { value: '' }, '—'), ...BANDAS_PREVIO.map((b) => h('option', { value: b }, b))))))),
          h('button', { type: 'submit' }, 'Registrar mi orden previo')))
