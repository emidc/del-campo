// Bloques de acciones y coberturas: los usan el plan de acción, la transferencia y el detalle.
//
// El cambio esperado de una acción se muestra como hipótesis, con su rótulo, y nunca como el valor
// de un factor (D16). La transferencia no muestra ningún "riesgo neto" (regla del prompt de Fase 3):
// muestra lo registrado de cada cobertura, la suficiencia como se registró (`no evaluada` si lo
// está) y el límite disponible calculado con su regla y su versión.

import type { ReactElement } from 'react'

import type { AccionVista, CoberturaVista, EventoVista } from '@del-campo/risk'

import { corto, h, procedencia, revisiones, tabla, th } from './comun.ts'
import { formEficacia, formEstadoAccion, formEvento, formRevisar } from './formularios.ts'

/**
 * Con esto, un bloque lleva sus formularios de actualización (T-0031): a qué página vuelve y, para
 * la eficacia de una acción, las reevaluaciones de su riesgo (sin ellas, la eficacia se registra
 * desde el detalle).
 */
export interface ConFormularios {
  readonly volver: string
  readonly reevaluaciones?: readonly { readonly id: string; readonly fecha: string; readonly accionId: string | null; readonly motivo: string | null }[]
}

const dato = (etiqueta: string, valor: string | null | ReactElement): ReactElement =>
  h('div', { className: 'dato' }, h('dt', null, etiqueta), h('dd', null, valor ?? '—'))

const datos = (...xs: ReactElement[]): ReactElement => h('dl', { className: 'datos' }, ...xs)

const ESTADO: Readonly<Record<string, string>> = { planificada: 'planificada', en_curso: 'en curso', cumplida: 'cumplida', cancelada: 'cancelada' }

export const bloqueAccion = (a: AccionVista, f?: ConFormularios): ReactElement =>
  h('article', { className: 'registro', 'data-accion': a.id },
    h('h4', null, a.tipoRegistro === 'accion' ? 'Acción' : 'Decisión de tratamiento', ': ', a.descripcion),
    datos(
      dato('Estado', a.estado === null ? (a.tipoRegistro === 'accion' ? 'sin estado' : 'no aplica') : (ESTADO[a.estado] ?? a.estado)),
      ...(a.tipoRegistro === 'accion' ? [
        dato('Factor objetivo', a.factorObjetivo === null ? null : a.factorObjetivo.join(', ')),
        dato('Mecanismo causal', a.mecanismoCausal),
        dato('Cambio esperado', a.cambioEsperado === null ? null : h('span', { 'data-cambio-esperado': '', className: 'hipotesis' },
          h('span', { className: 'rotulo' }, a.cambioEsperado.rotulo), ': ', a.cambioEsperado.texto)),
        dato('Eficacia observada', a.eficacia === null ? 'sin observar' :
          `${a.eficacia.efecto}${a.eficacia.nota === null ? '' : ` (${a.eficacia.nota})`}${a.eficacia.evaluacionEfecto === null ? '' :
            `; observada en la reevaluación ${corto(a.eficacia.evaluacionEfecto.id)} del ${a.eficacia.evaluacionEfecto.fecha}`}`),
      ] : [
        dato('Decisión', a.decision),
        dato('Fundamento', a.fundamento),
        dato('Próxima revisión', a.fechaProximaRevision),
      ]),
      dato('Alta', a.fechaAlta),
      dato('Procedencia', procedencia(a.procedencia)),
      dato('Review status', a.reviewStatus),
      dato('Revisiones', h('span', null, revisiones(a.revisiones)))),
    a.estados.length === 0 ? null : h('details', null, h('summary', null, `Historial de estados (${String(a.estados.length)})`),
      h('ol', null, ...a.estados.map((s) => h('li', null,
        `${ESTADO[s.estado] ?? s.estado}${s.fechaCumplida === null ? '' : ` el ${s.fechaCumplida}`}`,
        s.efecto === null ? '' : `, efecto ${s.efecto}${s.efectoNota === null ? '' : ` (${s.efectoNota})`}`,
        s.evidenciaEjecucion === null ? '' : `; evidencia: ${s.evidenciaEjecucion.join(', ')}`,
        h('span', { className: 'muted' }, ` · ${s.origen}${s.autor === null ? '' : `, ${s.autor}`}, registrado ${s.registradoEn}`))))),
    f === undefined ? null : h('div', { className: 'formularios' },
      formEstadoAccion(a, f.volver),
      f.reevaluaciones === undefined ? null : formEficacia(a, f.reevaluaciones, f.volver),
      formRevisar(a.riskId, 'accion', a.id, f.volver)))

const monto = (m: string | null, moneda: string | null): string | null => (m === null ? null : `${m}${moneda === null ? '' : ` ${moneda}`}`)

const filaEvento = (e: EventoVista): ReactElement =>
  h('tr', { 'data-evento': e.id },
    h('td', null, e.fecha), h('td', null, e.tipo), h('td', null, monto(e.monto, e.moneda) ?? '—'), h('td', null, e.nota ?? '—'),
    h('td', null, procedencia(e.procedencia)))

export const bloqueCobertura = (c: CoberturaVista, f?: ConFormularios): ReactElement =>
  h('article', { className: 'registro', 'data-cobertura': c.id },
    h('h4', null, `${c.polizaRef} · ${c.cobertura}`),
    datos(
      dato('Vigencia', `${c.vigenciaDesde} a ${c.vigenciaHasta}`),
      dato('Límite', monto(c.limite, c.moneda)),
      dato('Sublímite', monto(c.sublimite, c.moneda) ?? c.sublimitesTexto),
      dato('Deducible', monto(c.deducible, c.moneda) ?? c.deducibleTexto),
      dato('Exclusiones', c.exclusiones),
      dato('Suficiencia', `${c.suficiencia}${c.suficienciaNota === null ? '' : ` (${c.suficienciaNota})`}`),
      dato('Exposición retenida', c.exposicionRetenida === null ? 'sin estimar' :
        `${c.exposicionRetenida}${c.exposicionRetenidaNota === null ? '' : ` (${c.exposicionRetenidaNota})`}`),
      dato('Uncertainty', `${c.uncertainty}${c.uncertaintyNota === null ? '' : ` (${c.uncertaintyNota})`}`),
      dato('Procedencia', procedencia(c.procedencia)),
      dato('Review status', c.reviewStatus),
      dato('Límite disponible (calculado)', h('span', { 'data-limite-disponible': c.limiteDisponible.valor ?? '' },
        c.limiteDisponible.valor === null ? `no se calcula: ${c.limiteDisponible.motivo ?? ''}` : monto(c.limiteDisponible.valor, c.limiteDisponible.moneda),
        h('div', { className: 'muted small' }, `${c.limiteDisponible.regla}; calculado con las funciones de ${c.limiteDisponible.version}.`)))),
    c.eventos.length === 0 ? h('p', { className: 'muted' }, 'Sin eventos de póliza registrados.') : h('div', null,
      h('p', { className: 'muted small', 'data-rotulo-evento': '' }, `Eventos de póliza: ${c.eventos[0]?.rotulo ?? ''}.`),
      tabla([th('Fecha'), th('Tipo'), th('Monto'), th('Nota'), th('Procedencia')], c.eventos.map(filaEvento))),
    f === undefined ? null : h('div', { className: 'formularios' }, formEvento(c, f.volver), formRevisar(c.riskId, 'transferencia', c.id, f.volver)))
