// El validador portado (T-0029) da lo mismo que el de la 15b sobre sus propios lotes: cada caso
// inválido produce exactamente su rechazo de `errores-esperados.csv` (regla, archivo, fila y
// mensaje) y ningún otro, el lote base y las sintéticas no tienen rechazos, y cada regla de aviso
// tiene un lote que la dispara sin rechazos (los mismos cambios que `invalidos.test.ts` de la 15b).
// Además, las reglas que resuelven referencias contra lo ya registrado (`existentes`).

import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { leerContrato } from '../application/importar.ts'
import {
  aLote, casoInvalido, erroresEsperados, FECHA_CORTE, filasBase, idNuevo, idsBase, leerCarpeta, SINTETICOS, INVALIDOS,
  type Filas,
} from '../testing/lotes.ts'
import { validarLote, type Existentes, type Hallazgo } from './validador.ts'

const contrato = leerContrato()
const validar = (l: ReturnType<typeof leerCarpeta>, existentes?: Existentes): Hallazgo[] =>
  validarLote(contrato, l, { fechaCorte: FECHA_CORTE, ...(existentes === undefined ? {} : { existentes }) })
const rechazos = (h: Hallazgo[]): Hallazgo[] => h.filter((x) => x.severidad === 'rechazo')

describe('validador: el contrato', () => {
  it('71 reglas: 55 de rechazo y 16 de aviso, leídas de contrato/', () => {
    const r = [...contrato.reglas.values()]
    assert.equal(r.length, 71)
    assert.equal(r.filter((x) => x.severidad === 'rechazo').length, 55)
    assert.equal(r.filter((x) => x.severidad === 'aviso').length, 16)
  })
})

describe('validador: lotes válidos de la 15b', () => {
  it('el lote base de los inválidos no tiene rechazos', () => {
    assert.deepEqual(rechazos(validar(leerCarpeta(new URL('base/', INVALIDOS)))), [])
  })

  it('las 8 sintéticas: 0 rechazos y 103 avisos, por regla como en verificacion-15b.md', () => {
    const h = validar(leerCarpeta(SINTETICOS))
    assert.deepEqual(rechazos(h), [])
    const porRegla = Object.fromEntries(['RV-ACC-11', 'RV-ECO-02', 'RV-EVA-08'].map((r) => [r, h.filter((x) => x.regla_id === r).length]))
    assert.deepEqual(porRegla, { 'RV-ACC-11': 20, 'RV-ECO-02': 26, 'RV-EVA-08': 57 })
    assert.equal(h.length, 103)
  })
})

describe('validador: los 55 casos inválidos de la 15b, cada uno con su error y ningún otro', () => {
  const esperados = erroresEsperados()
  it('un caso por regla de rechazo', () => {
    const deRechazo = [...contrato.reglas.values()].filter((r) => r.severidad === 'rechazo').map((r) => r.id).sort()
    assert.deepEqual(esperados.map((e) => e.caso).sort(), deRechazo)
  })
  for (const e of esperados) {
    it(e.caso, () => {
      const halladas = rechazos(validar(casoInvalido(e.caso))).map((h) => ({ regla_id: h.regla_id, archivo: h.archivo, fila: h.fila === null ? '' : String(h.fila), mensaje: h.mensaje }))
      assert.deepEqual(halladas, [{ regla_id: e.regla_id, archivo: e.archivo, fila: e.fila, mensaje: e.error_esperado }])
    })
  }
})

// Los mismos cambios que `AVISOS` en `invalidos/invalidos.test.ts` de la 15b, sobre el lote base leído de disco.
const AVISOS: [string, (l: Filas, id: Map<string, string>) => void][] = [
  ['RV-RSK-08', (l) => { l['risks.csv'].push({ ...(l['risks.csv'][0] ?? {}), risk_id: idNuevo('RSK'), id_origen: 'P2' }) }],
  ['RV-EVA-06', (l) => { Object.assign(l['risks.csv'][4] ?? {}, { fecha: '2026-09-01' }) }],
  ['RV-EVA-08', (l) => { Object.assign(l['risks.csv'][5] ?? {}, { version_metodologia: 'metodologia v0.2' }) }],
  ['RV-EVA-10', (l) => { Object.assign(l['risks.csv'][5] ?? {}, { riesgo_causa: '' }) }],
  ['RV-EVA-11', (l) => { Object.assign(l['risks.csv'][5] ?? {}, { justificacion: '' }) }],
  ['RV-PRO-06', (l) => { Object.assign(l['risks.csv'][5] ?? {}, { p_base: 'assumed' }) }],
  ['RV-FAC-07', (l) => { Object.assign(l['risks.csv'][5] ?? {}, { p_observacion: '' }) }],
  ['RV-FAC-08', (l) => { Object.assign(l['risks.csv'][5] ?? {}, { p_estado: 'unknown', p_valor: '', necesidad_validacion: 'Pedir el registro de cortes.' }) }],
  ['RV-UNC-03', (l) => { Object.assign(l['risks.csv'][5] ?? {}, { uncertainty_nota: 'Confianza del 80% en el valor de P' }) }],
  ['RV-ECO-02', (l) => { for (const f of l['risks.csv'].slice(3, 5)) Object.assign(f, { i_econ_monto_bruto: '', moneda: '' }) }],
  ['RV-ACC-02', (l, id) => { Object.assign(l['action-plan.csv'][2] ?? {}, { risk_id: id.get('ESC') }) }],
  ['RV-ACC-05', (l) => { Object.assign(l['action-plan.csv'][2] ?? {}, { factor_objetivo: 'p;v_cont' }) }],
  ['RV-ACC-11', (l) => { Object.assign(l['risks.csv'][5] ?? {}, { i_pers_valor: '4' }); Object.assign(l['action-plan.csv'][1] ?? {}, { fecha_proxima_revision: '2026-01-01' }) }],
  ['RV-TRF-07', (l, id) => { l['risk-transfer.csv'].push({ ...(l['risk-transfer.csv'][0] ?? {}), transferencia_id: idNuevo('TRF'), risk_id: id.get('R2') ?? '', id_origen: 'T2', limite_monto: '200000' }) }],
  ['RV-TRF-08', (l) => { Object.assign(l['risk-transfer.csv'][0] ?? {}, { suficiencia: 'parcial' }) }],
  ['RV-TRF-09', (l) => { Object.assign(l['risk-transfer.csv'][0] ?? {}, { vigencia_hasta: '2026-09-30' }) }],
]

describe('validador: cada regla de aviso aparece sin rechazos', () => {
  it('una regla de aviso, un lote: las 16 del contrato', () => {
    const deAviso = [...contrato.reglas.values()].filter((r) => r.severidad === 'aviso').map((r) => r.id).sort()
    assert.deepEqual(AVISOS.map(([r]) => r).sort(), deAviso)
  })
  const delBase = validar(aLote(contrato, filasBase())).map((h) => h.regla_id)
  for (const [regla, cambio] of AVISOS) {
    it(regla, () => {
      assert.ok(!delBase.includes(regla), 'el lote base ya lo dispara')
      const f = filasBase()
      cambio(f, idsBase(f))
      const h = validar(aLote(contrato, f))
      assert.deepEqual(rechazos(h), [])
      assert.ok(h.some((x) => x.regla_id === regla), JSON.stringify(h.map((x) => x.regla_id)))
    })
  }
})

// ── Lotes posteriores (`existentes`) ─────────────────────────────────────────
// Lo ya registrado se describe a mano, como lo devolvería la base después de importar el lote
// base; los tests de integración lo leen de la base de verdad (`importar.integration.test.ts`).

const id = idsBase()
const de = (k: string): string => id.get(k) ?? ''
const base = filasBase()
const registrado: Existentes = {
  ids: new Set(['E-S1', 'E-S2', 'E-R1', 'E-R1b', 'E-R2', 'E-ESC', 'A1', 'A2', 'A3', 'T1', 'EV1'].map(de)),
  riesgos: new Map(base['risks.csv'].map((f) => [f.risk_id ?? '', {
    tipo_objeto: f.tipo_objeto ?? '', organizacion_id: f.organizacion_id ?? '',
    identidad: {
      organizacion_id: f.organizacion_id ?? '', unidad_id: f.unidad_id ?? '', tipo_objeto: f.tipo_objeto ?? '',
      riesgo_padre_id: f.riesgo_padre_id ?? '', miembros: (f.miembros ?? '').split(';').filter((x) => x !== '').sort().join(';'), titulo: f.titulo ?? '',
    },
  }])),
  evaluaciones: new Map(base['risks.csv'].filter((f) => (f.evaluacion_id ?? '') !== '').map((f) => [f.evaluacion_id ?? '', {
    risk_id: f.risk_id ?? '', tipo_evaluacion: f.tipo_evaluacion ?? '', fecha: f.fecha ?? '', motivo: f.motivo ?? '', accion_id: f.accion_id ?? '',
    sucesora: f.evaluacion_id === de('E-R1') ? de('E-R1b') : '',
  }])),
  acciones: new Map([[de('A1'), { risk_id: de('R1'), tipo_registro: 'accion', estado: 'cumplida' }], [de('A3'), { risk_id: de('S1'), tipo_registro: 'accion', estado: 'planificada' }]]),
  coberturas: new Map([[de('T1'), { risk_id: de('R1') }]]),
}

/** Un lote posterior: una reevaluación de R2 que apunta a su inicial ya registrada. */
function posterior(cambios: Record<string, string> = {}): Filas {
  const r2 = base['risks.csv'].find((f) => f.id_origen === 'R2') ?? {}
  return {
    'risks.csv': [{ ...r2, evaluacion_id: idNuevo('EVA'), evaluacion_id_origen: 'E-R2b', tipo_evaluacion: 'reevaluacion', evaluacion_anterior_id: de('E-R2'), motivo: 'informacion_nueva', fecha: '2026-10-12', lote_origen: 'T-0029/posterior', ...cambios }],
    'action-plan.csv': [],
    'risk-transfer.csv': [],
  }
}
const reglasDe = (f: Filas): string[] => rechazos(validar(aLote(contrato, f), registrado)).map((h) => h.regla_id)

describe('validador: lote posterior contra lo ya registrado', () => {
  it('sin existentes, la misma reevaluación es RV-EVA-02 (su anterior no está en el lote)', () => {
    assert.deepEqual(rechazos(validar(aLote(contrato, posterior()))).map((h) => h.regla_id), ['RV-EVA-02'])
  })

  it('una reevaluación de un riesgo ya registrado entra', () => {
    assert.deepEqual(reglasDe(posterior()), [])
  })

  it('RV-ID-02: un id ya registrado, con «Risk OS» como primera línea', () => {
    const h = rechazos(validar(aLote(contrato, posterior({ evaluacion_id: de('E-ESC') })), registrado))
    assert.deepEqual(h.map((x) => [x.regla_id, x.mensaje]), [['RV-ID-02', `risks.csv: id repetido ${de('E-ESC')} (líneas Risk OS y 2)`]])
  })

  it('RV-RSK-01: la identidad no coincide con la registrada', () => {
    assert.deepEqual(reglasDe(posterior({ titulo: 'Otro título' })), ['RV-RSK-01'])
  })

  it('RV-EVA-03: otra inicial para un riesgo que ya tiene una', () => {
    assert.deepEqual(reglasDe(posterior({ tipo_evaluacion: 'inicial', evaluacion_anterior_id: '', motivo: '' })), ['RV-EVA-03'])
  })

  it('RV-EVA-07: reevaluar una evaluación que ya tiene sucesora registrada', () => {
    const r1 = base['risks.csv'].find((f) => f.evaluacion_id_origen === 'E-R1') ?? {}
    const f: Filas = { 'risks.csv': [{ ...r1, evaluacion_id: idNuevo('EVA'), evaluacion_id_origen: 'E-R1x', tipo_evaluacion: 'reevaluacion', evaluacion_anterior_id: de('E-R1'), motivo: 'informacion_nueva', fecha: '2026-10-12', lote_origen: 'T-0029/posterior' }], 'action-plan.csv': [], 'risk-transfer.csv': [] }
    assert.deepEqual(reglasDe(f), ['RV-EVA-07'])
  })

  it('RV-EVA-05: una reevaluación por una acción registrada que no está cumplida', () => {
    const s1 = base['risks.csv'].find((f) => f.id_origen === 'S1') ?? {}
    const f: Filas = { 'risks.csv': [{ ...s1, evaluacion_id: idNuevo('EVA'), evaluacion_id_origen: 'E-S1b', tipo_evaluacion: 'reevaluacion', evaluacion_anterior_id: de('E-S1'), motivo: 'accion_ejecutada', accion_id: de('A3'), fecha: '2026-10-12', lote_origen: 'T-0029/posterior' }], 'action-plan.csv': [], 'risk-transfer.csv': [] }
    assert.deepEqual(reglasDe(f), ['RV-EVA-05'])
  })

  it('RV-RSK-07: otra fila de un padre ya registrado', () => {
    const p = base['risks.csv'].find((f) => f.id_origen === 'P') ?? {}
    assert.deepEqual(reglasDe({ 'risks.csv': [{ ...p }], 'action-plan.csv': [], 'risk-transfer.csv': [] }), ['RV-RSK-07'])
  })

  it('RV-TRF-04: un evento de una cobertura registrada entra; de una inexistente, no', () => {
    const ev = base['risk-transfer.csv'].find((f) => f.tipo_registro === 'evento') ?? {}
    const nuevo = { ...ev, evento_id: idNuevo('EVT'), id_origen: 'EV2', lote_origen: 'T-0029/posterior', tipo_evento: 'renovacion', monto_evento: '', moneda: '' }
    assert.deepEqual(reglasDe({ 'risks.csv': [], 'action-plan.csv': [], 'risk-transfer.csv': [nuevo] }), [])
    assert.deepEqual(reglasDe({ 'risks.csv': [], 'action-plan.csv': [], 'risk-transfer.csv': [{ ...nuevo, transferencia_ref: idNuevo('TRF') }] }), ['RV-TRF-04'])
  })

  it('RV-ID-03: un origen ya registrado para otra entidad', () => {
    const conOrigen: Existentes = { ...registrado, origenes: new Map([[`evaluacion\u0000T-0029/posterior\u0000E-R2b`, `evaluación ${idNuevo('EVA')}`]]) }
    const h = rechazos(validar(aLote(contrato, posterior()), conOrigen))
    assert.deepEqual(h.map((x) => x.regla_id), ['RV-ID-03'])
  })
})
