// La importación contra Postgres (T-0029; RO01 §6, A1 a A4). Cada caso corre dentro de una
// transacción que se revierte (el esquema es sólo de inserción) y la importación, dentro de
// ella, en un savepoint: una falla revierte el savepoint y el caso comprueba que no quedó
// ninguna fila en ninguna tabla del esquema. Lo que necesita transacciones de verdad
// (reimportar lo confirmado, cortar la conexión, la línea de comandos) está en
// `importar-confirmado.integration.test.ts`.

import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { after, before, describe, it } from 'node:test'

import { comoFilas, leerCsv } from '../domain/csv.ts'
import type { Resultado } from '../domain/informe.ts'
import type { Sql, TransactionSql } from '../persistence/database.ts'
import { contarFilas, leerParaCalculo } from '../persistence/importacion.ts'
import { enTransaccionRevertida, openTestDatabase } from '../persistence/testing.ts'
import { compararLote } from '../testing/regresion.ts'
import { leerArchivo, LOTE_EMI41, REGRESION_EMI41, type Lote as LoteCalculo } from '../testing/sinteticos.ts'
import {
  aLote, casoInvalido, erroresEsperados, FECHA_CORTE, filasBase, idNuevo, idsBase, leerCarpeta, SINTETICOS, INVALIDOS,
  type Filas, type Lote,
} from '../testing/lotes.ts'
import { importarLote, leerContrato } from './importar.ts'

const contrato = leerContrato()
let sql: Sql
before(async () => {
  sql = await openTestDatabase()
  // Los demás tests revierten todo; la base de la que parte cada caso está vacía.
  const conFilas = Object.entries(await contarFilas(sql)).filter(([, n]) => n > 0)
  assert.deepEqual(conFilas, [], 'delcampo_risk_test tiene filas de otra corrida: rehacerla con db:down y db:migrate')
})
after(async () => {
  await sql.end()
})

const importar = (tx: TransactionSql, lote: Lote, origen = 'test'): Promise<Resultado> =>
  importarLote(tx, contrato, lote, { origen, importadoPor: 'test T-0029', fechaCorte: FECHA_CORTE })

const enCero = async (tx: TransactionSql): Promise<void> => {
  const conFilas = Object.entries(await contarFilas(tx)).filter(([, n]) => n > 0)
  assert.deepEqual(conFilas, [], 'el esquema risk tiene que seguir vacío')
}

const base = (): Lote => leerCarpeta(new URL('base/', INVALIDOS))

/** Lo que el validador de la 15b informa sobre las sintéticas, desde su propia línea de comandos. */
function hallazgosDelSpike(): Record<string, string>[] {
  const dir = mkdtempSync(join(tmpdir(), 'risk-t0029-'))
  try {
    const salida = join(dir, 'hallazgos.csv')
    const validar = fileURLToPath(new URL('../../../../SPIKES/T-0021/v0/fase-15/validador/validar.ts', import.meta.url))
    execFileSync(process.execPath, [validar, fileURLToPath(SINTETICOS), '--corte', FECHA_CORTE, '--salida', salida], { stdio: 'pipe' })
    const l = leerCsv(readFileSync(salida))
    if (!l.ok) throw new Error(l.motivo)
    return comoFilas(l)
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
}

describe('A1: las 8 sintéticas', () => {
  it('entran con 0 rechazos, 84, 10 y 33 filas, y los mismos 103 avisos que el validador de la 15b', async () => {
    const delSpike = hallazgosDelSpike()
    await enTransaccionRevertida(sql, async (tx) => {
      const r = await importar(tx, leerCarpeta(SINTETICOS))
      assert.equal(r.estado, 'importado', JSON.stringify(r).slice(0, 2000))
      assert.deepEqual(r.lote.filas, { 'risks.csv': 84, 'action-plan.csv': 10, 'risk-transfer.csv': 33 })
      assert.equal(r.hallazgos.length, 103)
      assert.ok(r.hallazgos.every((h) => h.severidad === 'aviso'))
      assert.deepEqual(
        r.hallazgos.map((h) => ({ ...h, fila: h.fila === null ? '' : String(h.fila) })),
        delSpike.map((h) => ({ regla_id: h.regla_id, severidad: h.severidad, archivo: h.archivo, fila: h.fila, id: h.id, origen: h.origen, mensaje: h.mensaje })),
      )
      // Lo que dice que escribió es lo que hay, más el registro del lote.
      const conteos = await contarFilas(tx)
      for (const [t, n] of Object.entries(r.escritas)) assert.equal(conteos[t], n, t)
      assert.equal(conteos.lote_importacion, 1)
    })
  })

  it('los derivados calculados desde la base coinciden con regresion-emi41.csv en los 59 objetos', async () => {
    await enTransaccionRevertida(sql, async (tx) => {
      assert.equal((await importar(tx, leerCarpeta(SINTETICOS))).estado, 'importado')
      const p = await leerParaCalculo(tx)
      // Los miembros de los escenarios vuelven como lista (el dominio de la columna no lo hace solo).
      const escenarios = p.riesgos.filter((r) => r.tipoObjeto === 'escenario')
      assert.equal(escenarios.length, 1)
      for (const e of escenarios) assert.ok(Array.isArray(e.miembros) && e.miembros.length >= 2 && e.miembros.every((m: unknown) => typeof m === 'string' && m.startsWith('RSK-')))
      // Como el oráculo de T-0028: sin las filas de la 15b, que son posteriores a la regresión.
      const deEmi41 = (id: string): boolean => p.origen.get(id)?.loteOrigen === LOTE_EMI41
      const riesgos = p.riesgos.filter((r) => deEmi41(r.id))
      const lote: LoteCalculo = {
        riesgos,
        evaluaciones: p.evaluaciones.filter((e) => deEmi41(e.id)),
        origenDeRiesgo: new Map(riesgos.map((r) => [r.id, p.origen.get(r.id)?.idOrigen ?? ''])),
        origenDeEvaluacion: new Map(p.evaluaciones.map((e) => [e.id, p.origen.get(e.id)?.idOrigen ?? ''])),
      }
      const c = compararLote(lote, leerArchivo(REGRESION_EMI41))
      assert.deepEqual(c.diferencias, [])
      assert.equal(c.objetos, 59)
      assert.deepEqual(c.empresas, ['S05', 'S06', 'S07', 'S15', 'S28', 'S29', 'S32', 'S36'])
      assert.deepEqual(c.sinPosicion, ['S15'])
    })
  })

  it('la revisión accepted importada vuelve como reviewStatus y la evaluación es la vigente (decisión 8a)', async () => {
    await enTransaccionRevertida(sql, async (tx) => {
      assert.equal((await importar(tx, leerCarpeta(SINTETICOS))).estado, 'importado')
      // La única revisión de las sintéticas: una evaluación accepted por una persona.
      const [rev] = await tx<{ evaluacion_id: string; risk_id: string }[]>`
        select h.evaluacion_id, e.risk_id from risk.revision_humana h join risk.evaluacion e on e.id = h.evaluacion_id where h.estado = 'accepted'`
      assert.ok(rev !== undefined)
      const { vigente, historia } = await import('../domain/lectura.ts')
      const p = await leerParaCalculo(tx)
      const h = historia(p.evaluaciones, rev.risk_id)
      assert.equal(vigente(h)?.id, rev.evaluacion_id)
      assert.equal(h.find((e) => e.id === rev.evaluacion_id)?.reviewStatus, 'accepted')
    })
  })
})

describe('A2: cada caso inválido da exactamente su error y no escribe nada', () => {
  it('el lote base entra (punto de partida de los casos)', async () => {
    await enTransaccionRevertida(sql, async (tx) => {
      assert.equal((await importar(tx, base())).estado, 'importado')
    })
  })
  for (const e of erroresEsperados()) {
    it(e.caso, async () => {
      await enTransaccionRevertida(sql, async (tx) => {
        const r = await importar(tx, casoInvalido(e.caso))
        assert.equal(r.estado, 'rechazado')
        const rechazos = r.hallazgos.filter((h) => h.severidad === 'rechazo')
          .map((h) => ({ regla_id: h.regla_id, archivo: h.archivo, fila: h.fila === null ? '' : String(h.fila), mensaje: h.mensaje }))
        assert.deepEqual(rechazos, [{ regla_id: e.regla_id, archivo: e.archivo, fila: e.fila, mensaje: e.error_esperado }])
        await enCero(tx)
      })
    })
  }
})

describe('A3: reimportación', () => {
  it('el mismo lote otra vez responde ya_importado y deja los mismos conteos', async () => {
    await enTransaccionRevertida(sql, async (tx) => {
      const primera = await importar(tx, base())
      assert.equal(primera.estado, 'importado')
      const antes = await contarFilas(tx)
      const segunda = await importar(tx, base(), 'otra carpeta')
      assert.equal(segunda.estado, 'ya_importado')
      assert.equal(segunda.registrado.id, primera.id)
      assert.equal(segunda.registrado.origen, 'test')
      assert.deepEqual(await contarFilas(tx), antes)
    })
  })

  it('un lote distinto que reutiliza ids se rechaza por RV-ID-02 y no escribe nada', async () => {
    await enTransaccionRevertida(sql, async (tx) => {
      assert.equal((await importar(tx, base())).estado, 'importado')
      const antes = await contarFilas(tx)
      const f = filasBase()
      // Mismo contenido salvo una descripción: otra huella, los mismos ids.
      Object.assign(f['action-plan.csv'][0] ?? {}, { descripcion: 'Análisis de aceite quincenal' })
      const r = await importar(tx, aLote(contrato, f))
      assert.equal(r.estado, 'rechazado')
      const reglas = new Set(r.hallazgos.filter((h) => h.severidad === 'rechazo').map((h) => h.regla_id))
      assert.ok(reglas.has('RV-ID-02'), [...reglas].join(','))
      assert.ok(r.hallazgos.some((h) => h.regla_id === 'RV-ID-02' && h.mensaje.includes('líneas Risk OS y')))
      assert.deepEqual(await contarFilas(tx), antes)
    })
  })
})

describe('lotes posteriores contra lo ya importado', () => {
  const id = idsBase()
  const de = (k: string): string => id.get(k) ?? ''
  const r2 = (): Record<string, string> => ({ ...(filasBase()['risks.csv'].find((f) => f.id_origen === 'R2') ?? {}) })
  const reevaluacionDeR2 = (cambios: Record<string, string> = {}): Filas => ({
    'risks.csv': [{ ...r2(), evaluacion_id: idNuevo('EVA'), evaluacion_id_origen: 'E-R2b', tipo_evaluacion: 'reevaluacion', evaluacion_anterior_id: de('E-R2'), motivo: 'informacion_nueva', fecha: '2026-10-12', lote_origen: 'T-0029/posterior', p_valor: '2', ...cambios }],
    'action-plan.csv': [],
    'risk-transfer.csv': [],
  })

  it('una reevaluación de un riesgo ya importado entra, encadenada a la anterior', async () => {
    await enTransaccionRevertida(sql, async (tx) => {
      assert.equal((await importar(tx, base())).estado, 'importado')
      const f = reevaluacionDeR2()
      const r = await importar(tx, aLote(contrato, f))
      assert.equal(r.estado, 'importado', JSON.stringify(r).slice(0, 1500))
      assert.deepEqual(r.escritas, { riesgo: 0, miembro_escenario: 0, accion: 0, evaluacion: 1, accion_estado: 0, transferencia: 0, evento_poliza: 0, revision_humana: 0 })
      const [e] = await tx<{ evaluacion_anterior_id: string }[]>`select evaluacion_anterior_id from risk.evaluacion where id = ${f['risks.csv'][0]?.evaluacion_id ?? ''}`
      assert.equal(e?.evaluacion_anterior_id, de('E-R2'))
      const conteos = await contarFilas(tx)
      assert.equal(conteos.lote_importacion, 2)
      assert.equal(conteos.riesgo, 6)
    })
  })

  it('una acción cumplida nueva, su reevaluación y un evento de una cobertura ya importada', async () => {
    await enTransaccionRevertida(sql, async (tx) => {
      assert.equal((await importar(tx, base())).estado, 'importado')
      const acc = idNuevo('ACC')
      const eva = idNuevo('EVA')
      const b = filasBase()
      const f: Filas = {
        'risks.csv': [{ ...r2(), evaluacion_id: eva, evaluacion_id_origen: 'E-R2c', tipo_evaluacion: 'reevaluacion', evaluacion_anterior_id: de('E-R2'), motivo: 'accion_ejecutada', accion_id: acc, fecha: '2026-10-12', lote_origen: 'T-0029/posterior' }],
        'action-plan.csv': [{ ...(b['action-plan.csv'][0] ?? {}), accion_id: acc, risk_id: de('R2'), id_origen: 'A4', lote_origen: 'T-0029/posterior', evaluacion_efecto_id: eva, efecto: 'sin_efecto_medible', efecto_nota: 'Sin cambio en P.' }],
        'risk-transfer.csv': [{ ...(b['risk-transfer.csv'][1] ?? {}), evento_id: idNuevo('EVT'), id_origen: 'EV2', lote_origen: 'T-0029/posterior', tipo_evento: 'renovacion', monto_evento: '', moneda: '' }],
      }
      const r = await importar(tx, aLote(contrato, f))
      assert.equal(r.estado, 'importado', JSON.stringify(r).slice(0, 1500))
    })
  })

  it('un id ya importado es RV-ID-02 y el lote no escribe nada', async () => {
    await enTransaccionRevertida(sql, async (tx) => {
      assert.equal((await importar(tx, base())).estado, 'importado')
      const antes = await contarFilas(tx)
      const r = await importar(tx, aLote(contrato, reevaluacionDeR2({ evaluacion_id: de('E-ESC') })))
      assert.equal(r.estado, 'rechazado')
      assert.deepEqual(r.hallazgos.filter((h) => h.severidad === 'rechazo').map((h) => h.regla_id), ['RV-ID-02'])
      assert.deepEqual(await contarFilas(tx), antes)
    })
  })

  it('una relación rota contra lo importado (otra inicial, una rama, otra identidad) se rechaza', async () => {
    await enTransaccionRevertida(sql, async (tx) => {
      assert.equal((await importar(tx, base())).estado, 'importado')
      const antes = await contarFilas(tx)
      const r1 = filasBase()['risks.csv'].find((f) => f.evaluacion_id_origen === 'E-R1') ?? {}
      const casos: [string, Filas][] = [
        ['RV-EVA-03', reevaluacionDeR2({ tipo_evaluacion: 'inicial', evaluacion_anterior_id: '', motivo: '' })],
        ['RV-EVA-07', { 'risks.csv': [{ ...r1, evaluacion_id: idNuevo('EVA'), evaluacion_id_origen: 'E-R1x', tipo_evaluacion: 'reevaluacion', evaluacion_anterior_id: de('E-R1'), motivo: 'informacion_nueva', fecha: '2026-10-12', lote_origen: 'T-0029/posterior' }], 'action-plan.csv': [], 'risk-transfer.csv': [] }],
        ['RV-RSK-01', reevaluacionDeR2({ titulo: 'Corte de energía prolongado' })],
        ['RV-EVA-02', reevaluacionDeR2({ evaluacion_anterior_id: idNuevo('EVA') })],
      ]
      for (const [regla, f] of casos) {
        const r = await importar(tx, aLote(contrato, f))
        assert.equal(r.estado, 'rechazado', regla)
        assert.deepEqual(r.hallazgos.filter((h) => h.severidad === 'rechazo').map((h) => h.regla_id), [regla])
        assert.deepEqual(await contarFilas(tx), antes, regla)
      }
    })
  })
})

describe('A4 y lo que el validador no rechaza: ninguna escritura incompleta', () => {
  it('una restricción de la base violada en una de las últimas tablas revierte todo el lote', async () => {
    // El contrato no prohíbe monto en un evento de firma (RV-TRF-05 sólo lo exige en consumo_limite);
    // el esquema sí (evento_poliza_monto). Se escriben riesgos, acciones, evaluaciones y coberturas
    // antes de llegar al evento, y nada queda.
    await enTransaccionRevertida(sql, async (tx) => {
      const f = filasBase()
      Object.assign(f['risk-transfer.csv'][1] ?? {}, { tipo_evento: 'firma' })
      const r = await importar(tx, aLote(contrato, f))
      assert.equal(r.estado, 'falla_escritura', JSON.stringify(r).slice(0, 1500))
      assert.deepEqual([r.falla.tabla, r.falla.restriccion, r.falla.codigo], ['evento_poliza', 'evento_poliza_monto', '23514'])
      assert.deepEqual(r.hallazgos.filter((h) => h.severidad === 'rechazo'), [])
      await enCero(tx)
    })
  })

  it('una celda sin columna en el esquema no se pierde en silencio: el lote no se escribe', async () => {
    await enTransaccionRevertida(sql, async (tx) => {
      const f = filasBase()
      Object.assign(f['risk-transfer.csv'][1] ?? {}, { uncertainty: 'medium', uncertainty_nota: 'Falta el acta del siniestro' })
      const r = await importar(tx, aLote(contrato, f))
      assert.equal(r.estado, 'sin_destino')
      assert.deepEqual(r.sinDestino.map((s) => s.columna), ['uncertainty', 'uncertainty_nota'])
      await enCero(tx)
    })
  })
})
