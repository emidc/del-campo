// Escenarios, plan de acción, y transferencia con el feed de actividad: las vistas de una
// organización que no son la lista.

import type { ReactElement } from 'react'

import type { FilaEscenario, Identidad, Lectura, RiesgoEnPlan, VistaActividad, VistaEscenarios, VistaPlan, VistaTransferencia } from '@del-campo/risk'

import {
  cabeceraBanderas, cabeceraVector, calculado, celdasBanderas, celdasVector, corto, enlaceRiesgo, evaluacionUsada, h, marco, seccion, tabla,
  th, vacio,
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

const riesgoEnPlan = (r: RiesgoEnPlan): ReactElement =>
  h('section', { className: 'riesgo', 'data-risk-id': r.riskId },
    h('h3', null, enlaceRiesgo(r.riskId, r.titulo, r.idOrigen)),
    ...r.acciones.map(bloqueAccion))

export const PaginaPlan = (v: VistaPlan, persona: string): ReactElement => {
  const conAcciones = v.riesgos.filter((r) => r.acciones.length > 0)
  return marco('Plan de acción', { organizacionId: v.organizacionId, activa: 'plan', persona },
    h('p', { className: 'muted' }, 'Muestra las acciones y decisiones de tratamiento registradas. No usa ninguna evaluación ni calcula nada: el cambio esperado es una hipótesis y la eficacia es la que observó una reevaluación.'),
    conAcciones.length === 0 ? vacio('No hay acciones ni decisiones registradas.') : h('div', null, ...conAcciones.map(riesgoEnPlan)))
}

// ── Transferencia y actividad (§12, §13) ─────────────────────────────────────

const ACTIVIDAD: Readonly<Record<string, string>> = {
  evaluacion: 'Evaluación', revision_humana: 'Revisión humana', estado_accion: 'Acción', evento_poliza: 'Evento de póliza',
  revision_pendiente: 'Revisión pendiente', cierre_revision: 'Cierre de revisión', novedad: 'Novedad',
}

export const PaginaTransferencia = (t: VistaTransferencia, a: VistaActividad, persona: string): ReactElement =>
  marco('Transferencia y actividad', { organizacionId: t.organizacionId, activa: 'transferencia', persona },
    seccion('Transferencia',
      calculado(t.version, 'Límite disponible'),
      h('p', { className: 'muted' }, 'Lo registrado de cada póliza, por riesgo. No usa evaluaciones ni descuenta la cobertura del riesgo: la suficiencia es la que se registró.'),
      t.riesgos.length === 0 ? vacio('No hay coberturas registradas.') : h('div', null, ...t.riesgos.map((r) =>
        h('section', { className: 'riesgo', 'data-risk-id': r.riskId },
          h('h3', null, enlaceRiesgo(r.riskId, r.titulo, r.idOrigen)), ...r.coberturas.map(bloqueCobertura))))),
    seccion('Actividad',
      h('p', { className: 'muted' }, 'Lo registrado en la organización, de lo más nuevo a lo más viejo. No calcula nada.'),
      a.items.length === 0 ? vacio('Sin actividad registrada.') :
        tabla([th('Fecha'), th('Tipo'), th('Riesgo'), th('Qué'), th('Registro')], a.items.map((i) =>
          h('tr', { 'data-actividad': i.tipo },
            h('td', null, i.fecha), h('td', null, ACTIVIDAD[i.tipo] ?? i.tipo), h('td', null, enlaceRiesgo(i.riskId, i.titulo, i.idOrigen)),
            h('td', null, i.detalle), h('td', null, h('code', { title: i.refId }, corto(i.refId))))))))
