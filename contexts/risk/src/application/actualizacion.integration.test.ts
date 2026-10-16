// La actualización de T-0031 contra `delcampo_risk_test`, con las sintéticas de la 15b importadas
// dentro de una transacción que se revierte (`src/testing/actualizacion.ts`). Lo que se prueba es
// lo que hacen los casos de uso que llama la app:
//
//   - el ciclo de S07-R06 (15B-A01 y 15B-R01) recorrido desde la app da lo mismo que los CSV y la
//     regresión: la acción cumplida abre la revisión, la reevaluación `pending` no cambia la
//     vigente, al aceptarla P queda en 3 (no en el 2 del cambio esperado) y la revisión se cierra;
//   - qué no abre nada: 15B-A05 planificada, 15B-A10 cancelada, un comentario, un evento de póliza;
//   - qué no cierra: una reevaluación rechazada o `needs_revision`, un motivo que no responde, un
//     «sin cambio» sin fundamento;
//   - una falla inyectada en cada operación deja la base como estaba (RO01 A5);
//   - el orden previo del revisor, el reordenamiento y el cambio de versión.

import assert from 'node:assert/strict'
import { after, before, describe, it } from 'node:test'

import { exigirRevisor, RechazoActualizacion } from '../domain/actualizacion.ts'
import { rankingOrganizacion } from '../domain/lectura.ts'
import { VERSION_METODOLOGIA } from '../domain/modelo.ts'
import { aEvaluacion, aRiesgo } from '../domain/organizacion.ts'
import type { Sql, TransactionSql } from '../persistence/database.ts'
import { openTestDatabase } from '../persistence/testing.ts'
import { leerOrganizacion } from '../persistence/vistas.ts'
import { conEscenario, conteos, filaR01, filasSinteticas, id, reevaluacionDeFila, ultimaFila } from '../testing/actualizacion.ts'
import { resultado } from '../testing/regresion.ts'
import { leerArchivo, REGRESION_EMI41 } from '../testing/sinteticos.ts'
import type { Sesion } from './acceso.ts'
import {
  abrirRevisionesPorCambioDeVersion, altaAccion, altaCobertura, cambiarEstadoAccion, cargarReevaluacion, cerrarConReevaluacion,
  cerrarSinCambio, pantallaOrdenPrevio, registrarEficacia, registrarEventoPoliza, registrarNovedad, registrarOrdenPrevio, reordenar,
  revisar, type Opciones,
} from './actualizacion.ts'
import { vistaDetalle, vistaLista, vistaTransferencia } from './vistas.ts'

const V = VERSION_METODOLOGIA
const F = filasSinteticas()
const S07R06 = id('S07-R06')
const ORG_S07 = 'ORG-01M3QSRT00VT0W3XH3JG6NDTEX'

let sql: Sql
before(async () => {
  sql = await openTestDatabase()
})
after(async () => {
  await sql.end()
})

const rechaza = async (p: Promise<unknown>, patron: RegExp): Promise<void> => {
  await assert.rejects(p, (e: unknown) => e instanceof RechazoActualizacion && patron.test(e.message))
}

const revisionesDe = async (tx: TransactionSql, riskId: string): Promise<{ id: string; disparador: string; cerrada: boolean }[]> =>
  tx<{ id: string; disparador: string; cerrada: boolean }[]>`
    select r.id, r.disparador, exists (select 1 from risk.cierre_revision c where c.revision_id = r.id) as cerrada
    from risk.revision_pendiente r where r.risk_id = ${riskId} order by r.abierta_en, r.id`

/** La inicial de S07-R06 en las sintéticas: la evaluación de EMI-41 que 15B-R01 reevalúa. */
const inicialS07 = (): string => {
  const f = F['risks.csv'].find((r) => r.risk_id === S07R06 && r.tipo_evaluacion === 'inicial')
  assert.ok(f?.evaluacion_id !== undefined)
  return f.evaluacion_id
}

/** Acepta la inicial y cumple 15B-A01: la revisión de S07-R06 queda abierta. */
async function cumplirA01(tx: TransactionSql, sesion: Sesion): Promise<string> {
  await revisar(tx, sesion, { evaluacionId: inicialS07() }, 'accepted')
  const a = F['action-plan.csv'].find((x) => x.id_origen === '15B-A01')
  assert.ok(a !== undefined)
  const r = await cambiarEstadoAccion(tx, sesion, {
    accionId: id('15B-A01'), estado: 'cumplida', fechaCumplida: a.fecha_cumplida ?? '', evidencia: a.evidencia_ejecucion ?? '',
    comentario: 'Ultrasonido y torque registrados: la acción está cumplida.',
  })
  assert.ok(r.revisionId !== null)
  return r.revisionId
}

describe('el ciclo de S07-R06 desde la app (15B-A01 y 15B-R01)', () => {
  it('cumplida abre la revisión; la reevaluación pending no cambia la vigente; aceptada, P queda en 3 y la revisión se cierra', () =>
    conEscenario(sql, async ({ tx, sesion }) => {
      const antes = await vistaDetalle(tx, sesion, V, S07R06)
      assert.ok(antes !== null)
      assert.equal(antes.revisionesPendientes.length, 0)
      assert.equal(antes.acciones.find((a) => a.id === id('15B-A01'))?.estado, 'en_curso')

      const revisionId = await cumplirA01(tx, sesion)
      const abierta = await vistaDetalle(tx, sesion, V, S07R06)
      assert.deepEqual(abierta?.revisionesPendientes.map((r) => [r.id, r.disparador, r.referencia, r.estado]), [
        [revisionId, 'accion_ejecutada', id('15B-A01'), 'abierta'],
      ])
      assert.equal(abierta.evaluacionUsada?.id, inicialS07())
      assert.equal(abierta.evaluacionUsada.rotulo, 'aceptada')

      const { evaluacionId } = await cargarReevaluacion(tx, sesion, reevaluacionDeFila(filaR01(F)))
      const pendiente = await vistaDetalle(tx, sesion, V, S07R06)
      assert.equal(pendiente?.evaluacionUsada?.id, inicialS07(), 'una reevaluación pending no reemplaza a la vigente aceptada (8a)')
      assert.deepEqual(pendiente.evaluacionUsada.posteriores, [{ id: evaluacionId, reviewStatus: 'pending' }])
      assert.equal(pendiente.revisionesPendientes[0]?.estado, 'abierta', 'cargar la reevaluación no cierra la revisión')

      assert.deepEqual(await cerrarConReevaluacion(tx, sesion, { revisionId, evaluacionId }), { aceptada: true })
      await registrarEficacia(tx, sesion, {
        accionId: id('15B-A01'), efecto: 'efecto_parcial', evaluacionId,
        nota: 'Esperado: p 3→2. Obtenido: p sigue en 3 y su máximo baja de 4 a 3.',
      })

      const d = await vistaDetalle(tx, sesion, V, S07R06)
      assert.ok(d !== null)
      assert.equal(d.evaluacionUsada?.id, evaluacionId)
      assert.equal(d.evaluacionUsada.rotulo, 'aceptada')
      const ultima = d.historial.at(-1)
      assert.equal(ultima?.anteriorId, inicialS07())
      assert.equal(ultima.motivo, 'accion_ejecutada')
      assert.equal(ultima.accionId, id('15B-A01'))
      // El factor toma el valor reevaluado (3), no el esperado (2): el cambio esperado es una hipótesis (D16).
      const p = ultima.factores.find((f) => f.factor === 'p')
      assert.deepEqual([p?.valor, p?.min, p?.max], [3, 2, 3])
      const a01 = d.acciones.find((a) => a.id === id('15B-A01'))
      assert.equal(a01?.cambioEsperado?.texto, 'p 3→2')
      assert.equal(a01.eficacia?.efecto, 'efecto_parcial')
      assert.equal(a01.eficacia.evaluacionEfecto?.id, evaluacionId)
      assert.deepEqual(d.revisionesPendientes.map((r) => [r.estado, r.cierre?.resultado, r.cierre?.evaluacionId]), [
        ['cerrada', 'reevaluacion_aceptada', evaluacionId],
      ])

      // Lo mismo que calcula la regresión independiente de EMI-41 para S07-R06 (agente): la
      // reevaluación no cambia ningún nivel, así que C, posición, banda y banderas no se mueven.
      const datos = await leerOrganizacion(tx, ORG_S07)
      assert.ok(datos !== null)
      const ranking = rankingOrganizacion(V, datos.riesgos.map(aRiesgo), datos.evaluaciones.map(aEvaluacion))
      const riesgo = datos.riesgos.find((r) => r.id === S07R06)
      assert.ok(riesgo !== undefined)
      const esperado = leerArchivo(REGRESION_EMI41).find((r) => r.risk_id === 'S07-R06' && r.evaluador === 'agente')?.resultado_nuevo
      assert.equal(resultado(ranking, aRiesgo(riesgo)), esperado)
      assert.equal(esperado, 'C 60 · pos 2 · Alta · ext=true · sc=false · I 5')
    }))

  it('no abren nada: 15B-A05 planificada que pasa a en curso, 15B-A10 cancelada, un comentario, un evento de póliza (D17)', () =>
    conEscenario(sql, async ({ tx, sesion }) => {
      const antes = await conteos(tx)
      const r1 = await cambiarEstadoAccion(tx, sesion, {
        accionId: id('15B-A05'), estado: 'en_curso', evidencia: 'sin_evidencia', comentario: 'Empezó la obra.',
      })
      assert.equal(r1.revisionId, null)
      await rechaza(cambiarEstadoAccion(tx, sesion, {
        accionId: id('15B-A10'), estado: 'en_curso', evidencia: 'sin_evidencia', comentario: 'Se retoma.',
      }), /cancelada; ese estado es final/)
      const r2 = await registrarNovedad(tx, sesion, { riskId: S07R06, tipo: 'comentario', texto: 'Visita de rutina.', evidencia: 'sin_evidencia' })
      assert.equal(r2.revisionId, null)
      const { accionId } = await altaAccion(tx, sesion, {
        riskId: S07R06, tipoRegistro: 'accion', descripcion: 'Inspección adicional', factorObjetivo: ['p'], mecanismoCausal: 'p: detección temprana',
        cambioEsperado: 'p 3→2', fechaAlta: '2026-10-15', base: 'assumed', evidencia: 'sin_evidencia', estado: 'planificada',
      })
      await cambiarEstadoAccion(tx, sesion, { accionId, estado: 'cancelada', evidencia: 'sin_evidencia', comentario: 'No hace falta.' })

      const evento = F['risk-transfer.csv'].find((t) => t.id_origen === '15B-E01')
      assert.ok(evento !== undefined)
      const rid = evento.risk_id ?? ''
      const trf = evento.transferencia_ref ?? ''
      const org = F['risks.csv'].find((r) => r.risk_id === rid)?.organizacion_id ?? ''
      const detalle = await vistaDetalle(tx, sesion, V, rid)
      const limite = (await vistaTransferencia(tx, sesion, V, org))?.riesgos
        .flatMap((r) => r.coberturas).find((c) => c.id === trf)?.limiteDisponible.valor
      await registrarEventoPoliza(tx, sesion, {
        transferenciaId: trf, tipo: 'consumo_limite', fecha: '2026-10-15', monto: '500', moneda: 'USD', base: 'reported', evidencia: 'DOC-SINTETICO-EVT',
      })
      const despues = await conteos(tx)
      assert.equal(despues.revision_pendiente, antes.revision_pendiente, 'nada abrió una revisión')
      assert.equal(despues.evaluacion, antes.evaluacion, 'nada creó una evaluación')
      assert.equal(despues.evento_poliza, (antes.evento_poliza ?? 0) + 1)
      const detalleDespues = await vistaDetalle(tx, sesion, V, rid)
      assert.deepEqual(detalleDespues?.historial.map((e) => e.criticidad), detalle?.historial.map((e) => e.criticidad), 'el evento no cambia la criticidad')
      assert.deepEqual(detalleDespues?.posicion, detalle?.posicion)
      const limiteDespues = (await vistaTransferencia(tx, sesion, V, org))?.riesgos
        .flatMap((r) => r.coberturas).find((c) => c.id === trf)?.limiteDisponible.valor
      assert.ok(limite !== null && limite !== undefined)
      assert.equal(Number(limiteDespues), Number(limite) - 500, 'el límite disponible sí cambia: es un cálculo de la transferencia, no del riesgo')
    }))
})

describe('qué cierra una revisión y qué no', () => {
  const abrirInformacionNueva = async (tx: TransactionSql, sesion: Sesion, riskId: string): Promise<string> => {
    const r = await registrarNovedad(tx, sesion, { riskId, tipo: 'informacion_nueva', texto: 'Llegó el informe del perito.', evidencia: 'DOC-SINTETICO-2' })
    assert.ok(r.revisionId !== null)
    return r.revisionId
  }

  it('una reevaluación rechazada o needs_revision deja la revisión abierta; aceptada la cierra', () =>
    conEscenario(sql, async ({ tx, sesion }) => {
      const rid = id('S36-R01')
      const revisionId = await abrirInformacionNueva(tx, sesion, rid)
      for (const estado of ['rejected', 'needs_revision'] as const) {
        const { evaluacionId } = await cargarReevaluacion(tx, sesion, reevaluacionDeFila(ultimaFila(F, rid), { motivo: 'informacion_nueva', accionId: null, fecha: '2026-10-15' }))
        await revisar(tx, sesion, { evaluacionId }, estado)
        await rechaza(cerrarConReevaluacion(tx, sesion, { revisionId, evaluacionId }), new RegExp(`está ${estado}: la revisión sigue abierta`))
        assert.deepEqual((await revisionesDe(tx, rid)).map((r) => r.cerrada), [false])
      }
      const { evaluacionId } = await cargarReevaluacion(tx, sesion, reevaluacionDeFila(ultimaFila(F, rid), { motivo: 'correccion_evaluacion', accionId: null, fecha: '2026-10-15' }))
      await cerrarConReevaluacion(tx, sesion, { revisionId, evaluacionId })
      assert.deepEqual((await revisionesDe(tx, rid)).map((r) => r.cerrada), [true])
      // La cadena siguió lineal: tres reevaluaciones, cada una sobre la anterior.
      const d = await vistaDetalle(tx, sesion, V, rid)
      const h = d?.historial ?? []
      for (let i = 1; i < h.length; i++) assert.equal(h[i]?.anteriorId, h[i - 1]?.id)
      assert.equal(d?.evaluacionUsada?.id, evaluacionId)
      // Lo que cerró la revisión no se desdice después: ni rejected ni needs_revision.
      for (const estado of ['rejected', 'needs_revision']) {
        await rechaza(revisar(tx, sesion, { evaluacionId }, estado), /cerró una revisión: para corregirla, cargá otra reevaluación/)
      }
      assert.equal((await vistaDetalle(tx, sesion, V, rid))?.evaluacionUsada?.id, evaluacionId)
    }))

  it('un motivo que no responde al disparador no cierra; un «sin cambio» sin fundamento se rechaza y con fundamento cierra', () =>
    conEscenario(sql, async ({ tx, sesion }) => {
      const rid = id('S36-R01')
      const revisionId = await abrirInformacionNueva(tx, sesion, rid)
      const { evaluacionId } = await cargarReevaluacion(tx, sesion, reevaluacionDeFila(ultimaFila(F, rid), { motivo: 'cambio_contexto', accionId: null, fecha: '2026-10-15' }))
      await rechaza(cerrarConReevaluacion(tx, sesion, { revisionId, evaluacionId }), /no responde a una revisión abierta por informacion_nueva/)
      await rechaza(cerrarSinCambio(tx, sesion, { revisionId, fundamento: '   ' }), /necesita su fundamento/)
      assert.deepEqual((await revisionesDe(tx, rid)).map((r) => r.cerrada), [false])
      await cerrarSinCambio(tx, sesion, { revisionId, fundamento: 'El informe confirma lo que ya estaba evaluado.' })
      assert.deepEqual((await revisionesDe(tx, rid)).map((r) => r.cerrada), [true])
      await rechaza(cerrarSinCambio(tx, sesion, { revisionId, fundamento: 'otra vez' }), /ya está cerrada/)
    }))

  it('sólo una persona deja algo en accepted: la regla y la base lo rechazan para una IA', () =>
    conEscenario(sql, async ({ tx }) => {
      assert.throws(() => { exigirRevisor('ai', 'accepted') }, RechazoActualizacion)
      exigirRevisor('ai', 'needs_revision')
      await assert.rejects(
        tx.savepoint((s) => s`
          insert into risk.revision_humana (evaluacion_id, estado, revisado_por_actor, revisado_por_origen, fecha_revision, origen)
          values (${inicialS07()}, 'accepted', 'ai', 'agente', '2026-10-15', 'importacion')`),
        (e: unknown) => (e as { constraint_name?: string }).constraint_name === 'revision_humana_accepted_solo_humano',
      )
    }))

  it('una novedad que abriría revisión sobre un padre se rechaza; un comentario sobre el padre no', () =>
    conEscenario(sql, async ({ tx, sesion }) => {
      const padre = id('S05-P01')
      await rechaza(registrarNovedad(tx, sesion, { riskId: padre, tipo: 'cambio_contexto', texto: 'Cambió la planta.', evidencia: 'DOC-X' }), /un padre no tiene evaluación propia/)
      assert.equal((await registrarNovedad(tx, sesion, { riskId: padre, tipo: 'comentario', texto: 'Nota.', evidencia: 'sin_evidencia' })).revisionId, null)
    }))
})

describe('una falla a mitad de cada operación deja la base como estaba (RO01 A5)', () => {
  /** Corre `op` haciendo fallar la escritura número `n`; comprueba que no quedó nada y que hubo al menos `n` escrituras. */
  const fallaEn = async (tx: TransactionSql, n: number, op: (o: Opciones) => Promise<unknown>): Promise<void> => {
    const antes = await conteos(tx)
    let escritas = 0
    const falla = new Error(`falla inyectada en la escritura ${String(n)}`)
    await assert.rejects(op({ trasEscribir: () => { if (++escritas === n) throw falla } }), (e) => e === falla)
    assert.deepEqual(await conteos(tx), antes, `escritura ${String(n)}: no queda ninguna fila`)
  }

  /** Cuántas escrituras hace `op`, corriéndola de verdad dentro de un savepoint que se revierte. */
  const escrituras = async (tx: TransactionSql, op: (o: Opciones) => Promise<unknown>): Promise<number> => {
    let n = 0
    const fin = new Error('fin')
    await assert.rejects(tx.savepoint(async () => {
      await op({ trasEscribir: () => { n++ } })
      throw fin
    }), (e) => e === fin)
    return n
  }

  it('cada operación, en cada una de sus escrituras', () =>
    conEscenario(sql, async ({ tx, sesion, revisor }) => {
      const revisionId = await cumplirA01(tx, sesion)
      const { evaluacionId } = await cargarReevaluacion(tx, sesion, reevaluacionDeFila(filaR01(F)))
      const rid = id('S36-R01')
      const operaciones: Record<string, (o: Opciones) => Promise<unknown>> = {
        'novedad que abre revisión': (o) => registrarNovedad(tx, sesion, { riskId: rid, tipo: 'informacion_nueva', texto: 'x', evidencia: 'DOC-1' }, o),
        'acción que pasa a cumplida': (o) => cambiarEstadoAccion(tx, sesion, {
          accionId: id('15B-A04'), estado: 'cumplida', fechaCumplida: '2026-10-15', evidencia: 'DOC-EJEC-1', comentario: 'Hecho.',
        }, o),
        'alta de una acción con su estado': (o) => altaAccion(tx, sesion, {
          riskId: rid, tipoRegistro: 'accion', descripcion: 'x', factorObjetivo: ['p'], mecanismoCausal: 'p: x', fechaAlta: '2026-10-15',
          base: 'assumed', evidencia: 'sin_evidencia', estado: 'en_curso',
        }, o),
        'cierre que acepta la reevaluación': (o) => cerrarConReevaluacion(tx, sesion, { revisionId, evaluacionId }, o),
        'cierre sin cambio': (o) => cerrarSinCambio(tx, sesion, { revisionId, fundamento: 'nada cambió' }, o),
        'reevaluación': (o) => cargarReevaluacion(tx, sesion, reevaluacionDeFila(ultimaFila(F, rid), { motivo: 'informacion_nueva', accionId: null, fecha: '2026-10-15' }), o),
        'revisión humana': (o) => revisar(tx, sesion, { evaluacionId }, 'accepted', o),
        'cobertura': (o) => altaCobertura(tx, sesion, {
          riskId: rid, polizaRef: 'POL-SINT-9', cobertura: 'Daños', vigenciaDesde: '2026-01-01', vigenciaHasta: '2026-12-31', suficiencia: 'no_evaluada',
          base: 'reported', evidencia: 'DOC-POL-9', uncertainty: 'low',
        }, o),
        'evento de póliza': (o) => registrarEventoPoliza(tx, sesion, {
          transferenciaId: id('POL-S07-1/S07-R01'), tipo: 'vencimiento', fecha: '2026-12-31', base: 'reported', evidencia: 'DOC-1',
        }, o),
        'reordenamiento con su foto': (o) => reordenar(tx, sesion, V, ORG_S07, {
          tipo: 'banda', riskId: S07R06, banda: 'Crítica', causa: 'desacuerdo_de_criterio_profesional', fundamento: 'x', patron: 'otro',
        }, o),
        'orden previo con sus posiciones': async (o) => {
          const p = await pantallaOrdenPrevio(tx, revisor, ORG_S07)
          return registrarOrdenPrevio(tx, revisor, ORG_S07, { materialRef: 'MAT-1', items: (p?.objetos ?? []).map((x, i) => ({ riskId: x.riskId, posicion: i + 1 })) }, o)
        },
        'cambio de versión en dos riesgos': (o) => abrirRevisionesPorCambioDeVersion(tx, sesion, ORG_S07, {
          version: 'metodologia v2', regresion: [{ riskId: id('S07-R01'), podriaCambiar: true }, { riskId: id('S07-R02'), podriaCambiar: true }],
        }, o),
      }
      const multiples: string[] = []
      for (const [nombre, op] of Object.entries(operaciones)) {
        const n = await escrituras(tx, op)
        assert.ok(n >= 1, nombre)
        if (n > 1) multiples.push(nombre)
        // Con muchas escrituras (la foto del reordenamiento), alcanza con la primera, la segunda y la última.
        for (const k of new Set([1, 2, n].filter((x) => x <= n))) await fallaEn(tx, k, op)
      }
      assert.deepEqual(multiples.sort(), [
        'acción que pasa a cumplida', 'alta de una acción con su estado', 'cambio de versión en dos riesgos', 'cierre que acepta la reevaluación',
        'novedad que abre revisión', 'orden previo con sus posiciones', 'reordenamiento con su foto',
      ])
      // La revisión del cierre que falló sigue abierta, sin evaluación aceptada.
      assert.deepEqual((await revisionesDe(tx, S07R06)).map((r) => r.cerrada), [false])
      const d = await vistaDetalle(tx, sesion, V, S07R06)
      assert.equal(d?.historial.find((e) => e.id === evaluacionId)?.reviewStatus, 'pending')
    }))
})

describe('orden previo del revisor (decisión 6; A8a)', () => {
  it('la pantalla no trae ranking, bandas ni C_raw y no registra acceso; quien ya vio resultados no registra', () =>
    conEscenario(sql, async ({ tx, sesion, revisor }) => {
      const antes = await conteos(tx)
      const p = await pantallaOrdenPrevio(tx, revisor, ORG_S07)
      assert.ok(p !== null)
      assert.equal((await conteos(tx)).registro_acceso, antes.registro_acceso, 'la pantalla ciega no es una vista con resultados')
      assert.doesNotMatch(JSON.stringify(p), /cRaw|banda|posicion|ranking|factores|"p"/i)
      assert.equal(p.vioResultados, false)
      assert.ok(p.objetos.length > 0)

      const items = p.objetos.map((o, i) => ({ riskId: o.riskId, posicion: p.objetos.length - i, banda: i === 0 ? 'Alta' : null }))
      await rechaza(registrarOrdenPrevio(tx, revisor, ORG_S07, { materialRef: 'MAT-S07', items: items.slice(1) }), /cubre todos los de la empresa/)
      await rechaza(registrarOrdenPrevio(tx, revisor, ORG_S07, { materialRef: 'MAT-S07', items: items.map((i) => ({ ...i, posicion: 1 })) }), /la posición 1 está dos veces/)
      await registrarOrdenPrevio(tx, revisor, ORG_S07, { materialRef: 'MAT-S07', items })
      await rechaza(registrarOrdenPrevio(tx, revisor, ORG_S07, { materialRef: 'MAT-S07', items }), /ya registraste/)

      // La otra persona mira la lista de la empresa: ya no puede registrar un orden previo de ella.
      await vistaLista(tx, sesion, V, ORG_S07)
      const visto = await pantallaOrdenPrevio(tx, sesion, ORG_S07)
      assert.equal(visto?.vioResultados, true)
      await rechaza(registrarOrdenPrevio(tx, sesion, ORG_S07, { materialRef: 'MAT-S07', items }), /no sería previo/)
    }))
})

describe('reordenamiento profesional (decisión 5)', () => {
  it('conserva la foto y las vigentes, muestra el orden profesional al lado del calculado y no cambia nada calculado', () =>
    conEscenario(sql, async ({ tx, sesion, revisor }) => {
      const p = await pantallaOrdenPrevio(tx, sesion, ORG_S07)
      await registrarOrdenPrevio(tx, sesion, ORG_S07, { materialRef: 'MAT-S07', items: (p?.objetos ?? []).map((o, i) => ({ riskId: o.riskId, posicion: i + 1 })) })
      const antes = await vistaLista(tx, sesion, V, ORG_S07)
      assert.ok(antes !== null)
      const [primero, segundo] = antes.ranking
      assert.ok(primero !== undefined && segundo !== undefined)
      assert.ok(antes.ranking.every((f) => f.profesional?.posicion === antes.ranking.indexOf(f) + 1 && f.profesional.por.length === 0))
      await rechaza(reordenar(tx, sesion, V, ORG_S07, {
        tipo: 'par', riskIdSube: segundo.riskId, riskIdBaja: primero.riskId, causa: 'regla_ambigua', fundamento: ' ', patron: 'otro',
      }), /necesita su fundamento/)
      const { reordenamientoId } = await reordenar(tx, sesion, V, ORG_S07, {
        tipo: 'par', riskIdSube: segundo.riskId, riskIdBaja: primero.riskId, causa: 'desacuerdo_de_criterio_profesional',
        fundamento: 'La consecuencia del segundo es más grave de lo que el vector deja ver.', patron: 'otro',
      })
      const despues = await vistaLista(tx, sesion, V, ORG_S07)
      assert.ok(despues !== null)
      const sinProfesional = (l: typeof antes): unknown => l.ranking.map(({ profesional: _p, ...resto }) => resto)
      assert.deepEqual(sinProfesional(despues), sinProfesional(antes), 'las posiciones, bandas y lecturas calculadas no cambian')
      assert.deepEqual(despues.ranking.slice(0, 2).map((f) => [f.riskId, f.posicion, f.profesional?.posicion]), [
        [primero.riskId, primero.posicion, 2], [segundo.riskId, segundo.posicion, 1],
      ])
      assert.deepEqual(despues.reordenamientos.map((r) => [r.id, r.enPie, r.conOrdenPrevio, r.autor]), [[reordenamientoId, true, true, 'Operadora de prueba']])

      const [foto] = await tx<{ orden_calculado: { version: string; filas: { riskId: string; posicion: number }[] }; vigentes: number }[]>`
        select orden_calculado, (select count(*)::int from risk.reordenamiento_vigente v where v.reordenamiento_id = r.id) as vigentes
        from risk.reordenamiento r where r.id = ${reordenamientoId}`
      assert.equal(foto?.orden_calculado.version, V)
      assert.deepEqual(foto.orden_calculado.filas.map((f) => [f.riskId, f.posicion]), antes.ranking.map((f) => [f.riskId, f.posicion]))
      assert.ok(foto.vigentes >= antes.ranking.length)
      assert.equal((await revisionesDe(tx, segundo.riskId)).length, 0, 'un reordenamiento no abre revisión')

      // Si cambia la vigente de uno de los dos, el reordenamiento queda en el historial y deja de aplicarse.
      const rid = segundo.tipoObjeto === 'padre' ? undefined : segundo.riskId
      assert.ok(rid !== undefined)
      const { evaluacionId } = await cargarReevaluacion(tx, revisor, reevaluacionDeFila(ultimaFila(F, rid), { motivo: 'informacion_nueva', accionId: null, fecha: '2026-10-15' }))
      await revisar(tx, revisor, { evaluacionId }, 'accepted')
      const caduco = await vistaLista(tx, sesion, V, ORG_S07)
      assert.deepEqual(caduco?.reordenamientos.map((r) => r.enPie), [false])
      assert.equal(caduco.ranking.find((f) => f.riskId === segundo.riskId)?.profesional?.posicion, 2)
    }))
})

describe('cambio de versión de la metodología (sin UI en v1)', () => {
  it('abre revisión sólo donde la regresión marca que el resultado podría cambiar, una vez por versión', () =>
    conEscenario(sql, async ({ tx, sesion }) => {
      const regresion = [{ riskId: id('S07-R01'), podriaCambiar: true }, { riskId: id('S07-R02'), podriaCambiar: false }]
      const r = await abrirRevisionesPorCambioDeVersion(tx, sesion, ORG_S07, { version: 'metodologia v2', regresion })
      assert.equal(r.revisiones.length, 1)
      assert.deepEqual((await revisionesDe(tx, id('S07-R01'))).map((x) => x.disparador), ['cambio_version_metodologia'])
      assert.equal((await revisionesDe(tx, id('S07-R02'))).length, 0)
      assert.deepEqual((await abrirRevisionesPorCambioDeVersion(tx, sesion, ORG_S07, { version: 'metodologia v2', regresion })).revisiones, [])
    }))
})

