// Cada caso inválido produce exactamente su rechazo (regla, archivo, fila y mensaje) y ningún otro;
// el lote base y los CSV sintéticos no producen ningún rechazo; cada regla de rechazo del
// contrato tiene su caso.

import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { describe, it } from 'node:test'

import { porArchivo, reglas, type Archivo } from '../validador/contrato.ts'
import { comoFilas, leerCsv } from '../validador/csv.ts'
import { validarLote } from '../validador/validador.ts'
import { archivosDe, aTexto, base, CASOS, FECHA_CORTE, ID, type Lote } from './casos.ts'
import { archivos } from './generar.ts'

const AQUI = new URL('./', import.meta.url)
const enc = (t: string): Uint8Array => new TextEncoder().encode(t)
const rechazos = (c: Record<Archivo, Uint8Array>) => validarLote(c, { fechaCorte: FECHA_CORTE }).filter((h) => h.severidad === 'rechazo')

describe('Fase 15b: casos inválidos', () => {
  it('una regla de rechazo, un caso: los 55 del contrato', () => {
    const deRechazo = [...reglas().values()].filter((r) => r.severidad === 'rechazo').map((r) => r.id).sort()
    assert.equal(deRechazo.length, 55)
    assert.deepEqual(CASOS.map((c) => c.regla).sort(), deRechazo)
  })

  it('el lote base no tiene rechazos', () => {
    const b = base()
    assert.deepEqual(rechazos(porArchivo((a) => enc(aTexto(b, a)))), [])
  })

  it('unidad_id: opcional y libre entre riesgos, igual en todas las filas de un riesgo', () => {
    const b = base()
    const rids = [...new Set(b.risks.map((f) => f.risk_id ?? ''))]
    const conUnidad = { ...b, risks: b.risks.map((f) => ({ ...f, unidad_id: `UNI-${rids.indexOf(f.risk_id ?? '') % 2}` })) }
    assert.deepEqual(rechazos(porArchivo((a) => enc(aTexto(conUnidad, a)))), [])
    const repetido = rids.find((r) => b.risks.filter((f) => f.risk_id === r).length > 1)
    assert.ok(repetido !== undefined)
    let visto = false
    const distinta = { ...b, risks: b.risks.map((f) => (f.risk_id === repetido ? { ...f, unidad_id: visto ? 'UNI-B' : ((visto = true), 'UNI-A') } : f)) }
    assert.deepEqual(rechazos(porArchivo((a) => enc(aTexto(distinta, a)))).map((h) => [h.regla_id, h.mensaje.endsWith('(unidad_id)')]), [['RV-RSK-01', true]])
  })

  it('los archivos en disco son los que genera el script', () => {
    for (const [ruta, texto] of Object.entries(archivos())) assert.equal(readFileSync(new URL(ruta, AQUI), 'utf8'), texto, ruta)
  })

  const esperados = (() => {
    const l = leerCsv(readFileSync(new URL('errores-esperados.csv', AQUI)))
    if (!l.ok) throw new Error(l.motivo)
    return comoFilas(l)
  })()

  for (const c of CASOS) {
    it(`${c.regla}: ${c.que}`, () => {
      // Desde disco: base/ más lo que la carpeta del caso reemplaza.
      const contenidos = porArchivo((a) => {
        const propio = new URL(`${c.regla}/${a}`, AQUI)
        return readFileSync(existsSync(propio) ? propio : new URL(`base/${a}`, AQUI))
      })
      const e = esperados.find((x) => x.caso === c.regla)
      assert.ok(e, 'falta en errores-esperados.csv')
      const halladas = rechazos(contenidos).map((h) => ({ regla_id: h.regla_id, archivo: h.archivo, fila: h.fila === null ? '' : String(h.fila), mensaje: h.mensaje }))
      assert.deepEqual(halladas, [{ regla_id: e.regla_id, archivo: e.archivo, fila: e.fila, mensaje: e.error_esperado }])
      // Y en memoria, sin pasar por disco.
      const textos = archivosDe(c)
      const memoria = porArchivo((a) => enc(textos[a]))
      assert.equal(rechazos(memoria).length, 1)
    })
  }
})

// Los avisos no tienen casos en disco (la 15b pide uno por rechazo); se prueban acá, en memoria,
// para que cada regla de aviso del contrato tenga al menos un lote que la dispara sin rechazos.
type Cambio = (l: Lote) => void
const R2 = (l: Lote): Record<string, string> => l.risks[5] ?? {}
const AVISOS: [string, Cambio][] = [
  ['RV-RSK-08', (l) => { l.risks.push({ ...(l.risks[0] ?? {}), risk_id: ID.T2.replace('TRF', 'RSK'), id_origen: 'P2' }) }],
  ['RV-EVA-06', (l) => { Object.assign(l.risks[4] ?? {}, { fecha: '2026-09-01' }) }],
  ['RV-EVA-08', (l) => { R2(l).version_metodologia = 'metodologia v0.2' }],
  ['RV-EVA-10', (l) => { R2(l).riesgo_causa = '' }],
  ['RV-EVA-11', (l) => { R2(l).justificacion = '' }],
  ['RV-PRO-06', (l) => { R2(l).p_base = 'assumed' }],
  ['RV-FAC-07', (l) => { R2(l).p_observacion = '' }],
  ['RV-FAC-08', (l) => { Object.assign(R2(l), { p_estado: 'unknown', p_valor: '', necesidad_validacion: 'Pedir el registro de cortes.' }) }],
  ['RV-UNC-03', (l) => { R2(l).uncertainty_nota = 'Confianza del 80% en el valor de P' }],
  ['RV-ECO-02', (l) => { for (const f of l.risks.slice(3, 5)) Object.assign(f, { i_econ_monto_bruto: '', moneda: '' }) }],
  ['RV-ACC-02', (l) => { Object.assign(l.acciones[2] ?? {}, { risk_id: ID.ESC }) }],
  ['RV-ACC-05', (l) => { Object.assign(l.acciones[2] ?? {}, { factor_objetivo: 'p;v_cont' }) }],
  ['RV-ACC-11', (l) => { R2(l).i_pers_valor = '4'; Object.assign(l.acciones[1] ?? {}, { fecha_proxima_revision: '2026-01-01' }) }],
  ['RV-TRF-07', (l) => { l.transferencias.push({ ...(l.transferencias[0] ?? {}), transferencia_id: ID.T2, risk_id: ID.R2, id_origen: 'T2', limite_monto: '200000' }) }],
  ['RV-TRF-08', (l) => { Object.assign(l.transferencias[0] ?? {}, { suficiencia: 'parcial' }) }],
  ['RV-TRF-09', (l) => { Object.assign(l.transferencias[0] ?? {}, { vigencia_hasta: '2026-09-30' }) }],
]

describe('Fase 15b: avisos', () => {
  it('una regla de aviso, un lote: los 16 del contrato', () => {
    const deAviso = [...reglas().values()].filter((r) => r.severidad === 'aviso').map((r) => r.id).sort()
    assert.deepEqual(AVISOS.map(([r]) => r).sort(), deAviso)
  })
  const delBase = (() => { const b = base(); return validarLote(porArchivo((a) => enc(aTexto(b, a))), { fechaCorte: FECHA_CORTE }).map((h) => h.regla_id) })()
  for (const [regla, cambio] of AVISOS) {
    it(`${regla}: aparece y no hay rechazos`, () => {
      assert.ok(!delBase.includes(regla), 'el lote base ya lo dispara')
      const l = base()
      cambio(l)
      const h = validarLote(porArchivo((a) => enc(aTexto(l, a))), { fechaCorte: FECHA_CORTE })
      assert.deepEqual(h.filter((x) => x.severidad === 'rechazo'), [])
      assert.ok(h.some((x) => x.regla_id === regla), JSON.stringify(h.map((x) => x.regla_id)))
    })
  }
})
