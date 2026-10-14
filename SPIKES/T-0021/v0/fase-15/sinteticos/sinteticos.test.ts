// Tests de los CSV sintéticos de la Fase 15b: que se regeneran igual, que el validador no los
// rechaza, que los derivados que Risk OS calcularía coinciden con la regresión de EMI-41, y que las
// filas nuevas muestran lo que el prompt pide (caso consistente, ciclo de actualización, evento de
// póliza sin reevaluación, reevaluaciones nuevas pending, padre provisional, hijos empatados).

import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { describe, it } from 'node:test'

import { porArchivo } from '../validador/contrato.ts'
import { comoFilas, leerCsv } from '../validador/csv.ts'
import { validarLote } from '../validador/validador.ts'
import { derivados, historia, posicion, ranking, resultado, revisiones, vigente, type Fila } from './ciclo.ts'
import { generar, HISTORIA_DE_EMILIANO, LOTE_15B, LOTE_EMI41 } from './generar.ts'

const AQUI = new URL('./', import.meta.url)
const CORTE = '2026-10-14'
const bytes = (a: string): Buffer => readFileSync(new URL(a, AQUI))
function filas(a: string): Fila[] {
  const l = leerCsv(bytes(a))
  if (!l.ok) throw new Error(`${a}: ${l.motivo}`)
  return comoFilas(l)
}
const risks = filas('risks.csv')
const acciones = filas('action-plan.csv')
const transferencias = filas('risk-transfer.csv')
const regresion = filas('../../fase-11/regresion-emi41.csv')

const origenDe = (rid: string): string => risks.find((f) => f.risk_id === rid && f.lote_origen === LOTE_EMI41)?.id_origen ?? risks.find((f) => f.risk_id === rid)?.id_origen ?? ''
const rskDe = (origen: string): string => {
  const f = risks.find((x) => x.id_origen === origen)
  if (f === undefined) throw new Error(`${origen} no está en risks.csv`)
  return f.risk_id ?? ''
}
const evaDe = (origen: string): Fila => {
  const f = risks.find((x) => x.evaluacion_id_origen === origen)
  if (f === undefined) throw new Error(`${origen} no está en risks.csv`)
  return f
}
const accionDe = (origen: string): Fila => {
  const f = acciones.find((x) => x.id_origen === origen)
  if (f === undefined) throw new Error(`${origen} no está en action-plan.csv`)
  return f
}

describe('Fase 15b: CSV sintéticos', () => {
  it('el script los regenera byte por byte', () => {
    const { archivos } = generar()
    for (const [nombre, contenido] of Object.entries(archivos)) assert.equal(bytes(nombre).toString('utf8'), contenido, nombre)
  })

  it('el validador no rechaza ninguna fila', () => {
    const contenidos = porArchivo(bytes)
    const rechazos = validarLote(contenidos, { fechaCorte: CORTE }).filter((h) => h.severidad === 'rechazo')
    assert.deepEqual(rechazos, [])
  })

  it('los derivados del dataset convertido coinciden con resultado_nuevo de regresion-emi41.csv', () => {
    // Sin las filas de la 15b: la regresión de EMI-41 es la foto anterior a ellas.
    const emi41 = risks.filter((f) => f.lote_origen === LOTE_EMI41)
    const ids = [...new Set(emi41.map((f) => f.risk_id ?? ''))]
    const empresas = new Set(ids.map((id) => origenDe(id).slice(0, 3)))
    const distintas: string[] = []
    for (const id of ids) {
      const origen = origenDe(id)
      const evaluador = HISTORIA_DE_EMILIANO.has(origen) ? 'emiliano' : 'agente'
      const reg = regresion.find((r) => r.risk_id === origen && r.evaluador === evaluador)
      if (reg === undefined) { distintas.push(`${origen}: sin fila de regresión`); continue }
      const tipo = emi41.find((f) => f.risk_id === id)?.tipo_objeto
      if (tipo !== 'padre') {
        const esperada = reg.evaluacion_nueva !== '' ? reg.evaluacion_nueva : reg.evaluacion_anterior
        const ultima = historia(emi41, id).at(-1)?.evaluacion_id_origen
        if (ultima !== esperada) distintas.push(`${origen}: la cadena termina en ${String(ultima)}, la regresión usó ${String(esperada)}`)
      }
      // La posición se compara donde la organización tiene una sola historia (la del agente);
      // en S15 la historia de S15-R04 es la de Emiliano y la regresión ordena a cada evaluador por separado.
      const sinPos = (s: string): string => s.replace(/ · pos [^·]+/, '')
      const conPos = !origen.startsWith('S15')
      const ts = resultado(emi41, id)
      const py = reg.resultado_nuevo ?? ''
      const igual = tipo === 'padre' ? (conPos ? py.startsWith(ts) : sinPos(py).startsWith(sinPos(ts))) : conPos ? ts === py : sinPos(ts) === sinPos(py)
      if (!igual) distintas.push(`${origen}: ${ts} ≠ ${py}`)
    }
    assert.equal(empresas.size, 8)
    assert.equal(ids.length, 59)
    assert.deepEqual(distintas, [])
  })

  it('invariantes de la 15a (§3.5): el padre no tiene evaluación propia y el escenario no cambia a sus miembros', () => {
    const padres = risks.filter((f) => f.tipo_objeto === 'padre')
    assert.equal(padres.length, 2)
    for (const p of padres) {
      assert.equal(p.evaluacion_id, '')
      for (const x of ['p', 'i_econ', 'i_pers', 'i_cont', 'i_legal', 'v_cont', 'v_rec']) assert.equal(p[`${x}_estado`], '', x)
      // Su lugar en el ranking es el de su hijo prioritario, no un score propio.
      const r = ranking(risks, p.organizacion_id ?? '')
      const pos = r.padres.get(p.risk_id ?? '')
      const hijo = pos?.conPosicion === true ? pos.hijosPrioritarios[0] : undefined
      const vh = hijo === undefined ? undefined : vigente(risks, hijo)
      assert.ok(vh)
      assert.equal(r.items.get(p.risk_id ?? '')?.cRaw, derivados(vh).cRaw)
    }
    const esc = risks.find((f) => f.tipo_objeto === 'escenario')
    assert.ok(esc)
    const miembros = (esc.miembros ?? '').split(';')
    assert.ok(miembros.length >= 2)
    const sinEscenario = risks.filter((f) => f.risk_id !== esc.risk_id)
    for (const m of miembros) assert.equal(resultado(risks, m), resultado(sinEscenario, m), origenDe(m))
  })

  it('ningún derivado viaja en los archivos (decisión 6a)', () => {
    for (const c of ['c_raw', 'banda', 'evaluable', 'i_efectivo', 'safety_critical', 'consecuencia_extrema', 'techo_plausible']) {
      assert.ok(!(c in (risks[0] ?? {})), c)
    }
  })
})

describe('Fase 15b: filas nuevas', () => {
  it('todas salen del lote 15b, escritas por un agente y pending', () => {
    const nuevas = [...risks, ...acciones, ...transferencias].filter((f) => f.lote_origen === LOTE_15B)
    assert.equal(nuevas.filter((f) => 'accion_id' in f && !('evaluacion_id' in f)).length, 10)
    for (const f of nuevas) {
      assert.equal(f.actor, 'ai', f.id_origen)
      if ('review_status' in f && (f.tipo_registro !== 'evento')) assert.equal(f.review_status, 'pending', f.id_origen)
      assert.equal(f.revisado_por ?? '', '', f.id_origen)
    }
    for (const f of risks.filter((x) => x.lote_origen === LOTE_15B)) {
      assert.equal(f.version_metodologia, 'metodologia v1', f.evaluacion_id_origen)
      assert.ok(!risks.some((o) => o !== f && o.evaluacion_id === f.evaluacion_id), `${String(f.evaluacion_id_origen)} pisa un id`)
    }
  })

  it('caso consistente EMI-16 (S07-R06): el mismo riesgo en los tres archivos', () => {
    const rid = rskDe('S07-R06')
    const a = accionDe('15B-A01')
    const r = evaDe('15B-R01')
    assert.equal(a.risk_id, rid)
    assert.equal(r.risk_id, rid)
    assert.ok(transferencias.some((t) => t.risk_id === rid && t.tipo_registro === 'cobertura' && t.poliza_ref === 'POL-S07-1'))
    assert.equal(r.accion_id, a.accion_id)
    assert.equal(a.evaluacion_efecto_id, r.evaluacion_id)
  })

  it('ciclo de actualización: cumplida → revisión → reevaluación accion_ejecutada → eficacia aparte → el factor toma el valor reevaluado', () => {
    const rid = rskDe('S07-R06')
    const a = accionDe('15B-A01')
    const r = evaDe('15B-R01')
    assert.equal(a.estado, 'cumplida')
    assert.equal(a.cambio_esperado, 'p 3→2')
    // Sin la reevaluación, la acción cumplida deja una revisión abierta (decisión 9a).
    const sinR01 = risks.filter((f) => f !== r)
    assert.deepEqual(revisiones(sinR01, acciones).find((x) => x.accion_id === a.accion_id)?.abierta, true)
    const rev = revisiones(risks, acciones).find((x) => x.accion_id === a.accion_id)
    assert.deepEqual(rev, { accion_id: a.accion_id, risk_id: rid, abierta: false, evaluacion_id: r.evaluacion_id })
    // La reevaluación apunta a la anterior, que no se toca.
    const h = historia(risks, rid)
    assert.equal(h.at(-1), r)
    assert.equal(r.evaluacion_anterior_id, h.at(-2)?.evaluacion_id)
    assert.equal(r.motivo, 'accion_ejecutada')
    // La eficacia va en la acción, no en la evaluación.
    assert.equal(a.efecto, 'efecto_parcial')
    assert.ok((a.efecto_nota ?? '') !== '')
    // El factor toma el valor reevaluado (3), no el esperado (2).
    assert.equal(vigente(risks, rid), r)
    assert.equal(r.p_valor, '3')
    assert.equal(h.at(-2)?.p_valor, '3')
    // Las tres acciones cumplidas tienen su revisión cerrada.
    assert.deepEqual(revisiones(risks, acciones).map((x) => x.abierta), [false, false, false])
  })

  it('la vigente sigue la decisión 8a: aceptar o rechazar la reevaluación cambia cuál se lee (simulado en memoria)', () => {
    const rid = rskDe('S07-R06')
    const r = evaDe('15B-R01')
    const anterior = historia(risks, rid).at(-2)
    const con = (status: string): Fila[] => risks.map((f) => (f === r ? { ...f, review_status: status, revisado_por: 'revisor', revisado_por_actor: 'human', fecha_revision: CORTE } : f))
    assert.equal(vigente(con('accepted'), rid)?.evaluacion_id, r.evaluacion_id)
    assert.equal(vigente(con('rejected'), rid)?.evaluacion_id, anterior?.evaluacion_id)
  })

  it('eficacias: total con p 4→3 (S36-R06) y sin efecto medible sin cambio de factores (S28-R05)', () => {
    const r2 = evaDe('15B-R02')
    assert.equal(accionDe('15B-A02').efecto, 'efecto_total')
    assert.equal(r2.p_valor, '3')
    assert.equal(historia(risks, r2.risk_id ?? '').at(-2)?.p_valor, '4')
    const r3 = evaDe('15B-R03')
    assert.equal(accionDe('15B-A03').efecto, 'sin_efecto_medible')
    const ant = historia(risks, r3.risk_id ?? '').at(-2) ?? {}
    for (const c of Object.keys(r3).filter((k) => /_(estado|valor|min|max)$/.test(k))) assert.equal(r3[c], ant[c], c)
  })

  it('evento de póliza: no crea reevaluación ni cambia la criticidad (D17)', () => {
    const ev = transferencias.find((t) => t.tipo_registro === 'evento')
    assert.ok(ev)
    assert.equal(ev.tipo_evento, 'consumo_limite')
    const rid = ev.risk_id ?? ''
    // Ninguna evaluación nueva sobre el riesgo del evento: su historia es la que trajo EMI-41.
    assert.ok(!risks.some((f) => f.risk_id === rid && f.lote_origen === LOTE_15B))
    assert.deepEqual(historia(risks, rid), historia(risks.filter((f) => f.lote_origen === LOTE_EMI41), rid))
    // La criticidad se calcula sólo desde risks.csv (ciclo.ts no recibe transferencias): es la de la regresión.
    const reg = regresion.find((r) => r.risk_id === origenDe(rid) && r.evaluador === 'agente')
    assert.equal(resultado(risks, rid), reg?.resultado_nuevo)
  })

  it('padre con un hijo no evaluable: prioridad provisional (S29-P01, 15B-R04)', () => {
    const r4 = evaDe('15B-R04')
    assert.equal(r4.motivo, 'informacion_nueva')
    assert.equal(derivados(r4).evaluable, false)
    const padre = rskDe('S29-P01')
    const r = ranking(risks, r4.organizacion_id ?? '')
    const p = r.padres.get(padre)
    assert.ok(p?.prioridadProvisional === true)
    const antes = ranking(risks.filter((f) => f !== r4), r4.organizacion_id ?? '').padres.get(padre)
    assert.ok(antes?.prioridadProvisional === false)
  })

  it('hijos empatados (S05-P01, 15B-R05): el padre se muestra con los dos', () => {
    const r5 = evaDe('15B-R05')
    assert.equal(r5.motivo, 'cambio_contexto')
    const padre = rskDe('S05-P01')
    const p = ranking(risks, r5.organizacion_id ?? '').padres.get(padre)
    assert.ok(p?.conPosicion === true)
    assert.equal(p.hijosPrioritarios.length, 2)
    assert.ok(p.hijosPrioritarios.includes(r5.risk_id ?? ''))
    assert.ok(p.hijosPrioritarios.includes(rskDe('S05-P01-S03')))
  })

  it('riesgo identificado sin evaluar (15B-S28-N01): no evaluable, todo unknown, fuera del ranking', () => {
    const rid = rskDe('15B-S28-N01')
    const h = historia(risks, rid)
    assert.equal(h.length, 1)
    const f = h[0] ?? {}
    for (const x of ['p', 'i_econ', 'i_pers', 'i_cont', 'i_legal', 'v_cont', 'v_rec']) assert.equal(f[`${x}_estado`], 'unknown', x)
    assert.equal(f.base, 'assumed')
    assert.equal(posicion(ranking(risks, f.organizacion_id ?? ''), rid), null)
  })
})
