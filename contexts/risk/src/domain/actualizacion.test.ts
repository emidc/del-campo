// Reglas de la actualización (T-0031) sin base: qué abre una revisión pendiente, qué la cierra,
// qué estado sigue a cuál y cuál es la vigente después de cada revisión humana (decisión 8a).

import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  abreRevision, cambiosEvaluativos, evidenciaDeEjecucion, exigirCambioEvaluativo, exigirFundamento, exigirRevisor, fecha, porQueNoCambia, porQueNoCierra, RechazoActualizacion, referencias,
  type Cambio, type ContenidoEvaluativo, type RevisionAbierta,
} from './actualizacion.ts'
import { vigente } from './lectura.ts'
import type { Factores } from './metodologia.ts'
import type { Evaluacion, ReviewStatus } from './modelo.ts'

describe('qué abre una revisión pendiente (dossier 15a §5)', () => {
  const casos: [Cambio, string | null][] = [
    [{ tipo: 'estado_accion', estado: 'cumplida' }, 'accion_ejecutada'],
    [{ tipo: 'novedad', novedad: 'informacion_nueva' }, 'informacion_nueva'],
    [{ tipo: 'novedad', novedad: 'cambio_contexto' }, 'cambio_contexto'],
    [{ tipo: 'cambio_version', marcadoPorRegresion: true }, 'cambio_version_metodologia'],
    [{ tipo: 'cambio_version', marcadoPorRegresion: false }, null],
    [{ tipo: 'estado_accion', estado: 'planificada' }, null],
    [{ tipo: 'estado_accion', estado: 'en_curso' }, null],
    [{ tipo: 'estado_accion', estado: 'cancelada' }, null],
    [{ tipo: 'alta_accion' }, null],
    [{ tipo: 'eficacia' }, null],
    [{ tipo: 'novedad', novedad: 'comentario' }, null],
    [{ tipo: 'cobertura' }, null],
    [{ tipo: 'evento_poliza' }, null],
    [{ tipo: 'revision_humana' }, null],
    [{ tipo: 'reevaluacion' }, null],
    [{ tipo: 'reordenamiento' }, null],
    [{ tipo: 'propuesta_ia' }, null],
  ]
  for (const [c, esperado] of casos) {
    it(`${JSON.stringify(c)} → ${String(esperado)}`, () => { assert.equal(abreRevision(c), esperado) })
  }
})

describe('qué cierra una revisión', () => {
  const r: RevisionAbierta = { disparador: 'accion_ejecutada', accionId: 'ACC-1', abiertaEn: '2026-10-10T00:00:00Z' }
  const e = { tipo: 'reevaluacion' as const, motivo: 'accion_ejecutada', accionId: 'ACC-1', registradaEn: '2026-10-11T00:00:00Z', reviewStatus: 'pending' as ReviewStatus }

  it('una reevaluación del motivo, de la misma acción y posterior a la apertura, pendiente o aceptada', () => {
    assert.equal(porQueNoCierra(r, e), null)
    assert.equal(porQueNoCierra(r, { ...e, reviewStatus: 'accepted' }), null)
  })
  it('rechazada o needs_revision la deja abierta', () => {
    assert.match(porQueNoCierra(r, { ...e, reviewStatus: 'rejected' }) ?? '', /sigue abierta/)
    assert.match(porQueNoCierra(r, { ...e, reviewStatus: 'needs_revision' }) ?? '', /sigue abierta/)
  })
  it('no cierran: una inicial, otro motivo, otra acción, una anterior a la apertura', () => {
    assert.ok(porQueNoCierra(r, { ...e, tipo: 'inicial' }) !== null)
    assert.ok(porQueNoCierra(r, { ...e, motivo: 'informacion_nueva' }) !== null)
    assert.ok(porQueNoCierra(r, { ...e, accionId: 'ACC-2' }) !== null)
    assert.ok(porQueNoCierra(r, { ...e, registradaEn: '2026-10-09T00:00:00Z' }) !== null)
  })
  it('información nueva se responde también con una corrección de la evaluación', () => {
    const info: RevisionAbierta = { disparador: 'informacion_nueva', accionId: null, abiertaEn: r.abiertaEn }
    assert.equal(porQueNoCierra(info, { ...e, motivo: 'correccion_evaluacion', accionId: null }), null)
    assert.ok(porQueNoCierra(info, { ...e, motivo: 'cambio_contexto', accionId: null }) !== null)
  })
  it('un «sin cambio» necesita fundamento', () => {
    assert.throws(() => exigirFundamento('  '), RechazoActualizacion)
    assert.equal(exigirFundamento(' nada cambió '), 'nada cambió')
  })
})

describe('revisión humana y estados', () => {
  it('sólo una persona acepta (EMI-17)', () => {
    assert.throws(() => { exigirRevisor('ai', 'accepted') }, RechazoActualizacion)
    exigirRevisor('ai', 'rejected')
    exigirRevisor('human', 'accepted')
  })
  it('cancelada es final; de cumplida sólo se suma la eficacia; no se repite el estado', () => {
    assert.equal(porQueNoCambia(null, 'cumplida'), null)
    assert.equal(porQueNoCambia('planificada', 'en_curso'), null)
    assert.equal(porQueNoCambia('en_curso', 'cancelada'), null)
    assert.match(porQueNoCambia('cancelada', 'en_curso') ?? '', /final/)
    assert.match(porQueNoCambia('cumplida', 'en_curso') ?? '', /eficacia/)
    assert.match(porQueNoCambia('en_curso', 'en_curso') ?? '', /ya está en curso/)
  })
  it('evidencia: sin_evidencia va sola, y una acción cumplida necesita evidencia real (D25)', () => {
    assert.deepEqual(referencias('DOC-1; DOC-2\nDOC-3'), ['DOC-1', 'DOC-2', 'DOC-3'])
    assert.deepEqual(referencias('sin_evidencia'), ['sin_evidencia'])
    assert.throws(() => referencias('DOC-1;sin_evidencia'), RechazoActualizacion)
    assert.throws(() => referencias(' '), RechazoActualizacion)
    assert.throws(() => evidenciaDeEjecucion('sin_evidencia'), RechazoActualizacion)
  })
  it('fechas AAAA-MM-DD que existen', () => {
    assert.equal(fecha('2026-10-09', 'f'), '2026-10-09')
    assert.throws(() => fecha('2026-02-30', 'f'), RechazoActualizacion)
    assert.throws(() => fecha('9/10/2026', 'f'), RechazoActualizacion)
  })
})

describe('la vigente después de cada revisión (decisión 8a)', () => {
  const f = {} as Factores
  const ev = (id: string, reviewStatus: ReviewStatus): Evaluacion => ({ id, riskId: 'R', tipo: id === 'E0' ? 'inicial' : 'reevaluacion', anteriorId: null, factores: f, uncertainty: 'low', reviewStatus })
  const cadena = (s0: ReviewStatus, s1: ReviewStatus): string | undefined => vigente([ev('E0', s0), ev('E1', s1)])?.id

  it('una reevaluación pending no reemplaza a la inicial aceptada; aceptada, sí', () => {
    assert.equal(cadena('accepted', 'pending'), 'E0')
    assert.equal(cadena('accepted', 'accepted'), 'E1')
  })
  it('rechazada o needs_revision tampoco la reemplazan si hay una aceptada', () => {
    assert.equal(cadena('accepted', 'rejected'), 'E0')
    assert.equal(cadena('accepted', 'needs_revision'), 'E0')
  })
  it('sin ninguna aceptada, la última no rechazada', () => {
    assert.equal(cadena('pending', 'pending'), 'E1')
    assert.equal(cadena('pending', 'rejected'), 'E0')
  })
})

describe('reevaluación materialmente idéntica (decisión del owner, 2026-10-17)', () => {
  const factor = { estado: 'known', valor: 3, min: null, max: null, observacion: 'Sin cambios.' }
  const vigente: ContenidoEvaluativo = {
    factores: { p: factor, i_econ: { ...factor, valor: 4 } }, base: 'reported', evidencia: ['DOC-1', 'DOC-2'], riesgoCausa: 'Causa.',
    riesgoEvento: 'Evento.', riesgoConsecuencia: null, montoBruto: '1000', moneda: 'USD', uncertainty: 'medium', uncertaintyNota: 'Plazo.',
    necesidadValidacion: null,
  }
  it('igual en todo lo evaluativo: se rechaza, aunque cambien espacios, el orden de la evidencia o la forma del monto', () => {
    const igual = { ...vigente, evidencia: ['DOC-2', ' DOC-1'], montoBruto: '1000.00', moneda: 'usd', riesgoCausa: ' Causa. ' }
    assert.deepEqual(cambiosEvaluativos(vigente, igual), [])
    assert.throws(() => { exigirCambioEvaluativo(vigente, igual) }, /«sin cambio»/)
  })
  it('un cambio en un factor, su rango o su observación, la evidencia, la incertidumbre o el texto del riesgo es material', () => {
    const casos: [Partial<ContenidoEvaluativo>, string][] = [
      [{ factores: { ...vigente.factores, p: { ...factor, max: 4 } } }, 'p'],
      [{ factores: { ...vigente.factores, p: { ...factor, observacion: 'Supuesto nuevo.' } } }, 'p'],
      [{ evidencia: ['DOC-1', 'DOC-2', 'DOC-3'] }, 'evidencia'],
      [{ uncertainty: 'high' }, 'uncertainty'],
      [{ uncertaintyNota: 'Otro supuesto.' }, 'nota de uncertainty'],
      [{ riesgoEvento: 'Otro evento.' }, 'evento'],
      [{ montoBruto: '2000' }, 'monto bruto'],
      [{ base: 'observed' }, 'base'],
    ]
    for (const [cambio, campo] of casos) {
      assert.deepEqual(cambiosEvaluativos(vigente, { ...vigente, ...cambio }), [campo], campo)
      exigirCambioEvaluativo(vigente, { ...vigente, ...cambio })
    }
  })
})
