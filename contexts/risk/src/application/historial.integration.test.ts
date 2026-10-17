// El historial de T-0031 (RO01 §2, «Historial»; A12) contra `delcampo_risk_test`: después de un
// recorrido completo sobre S07-R06 desde los casos de uso, el historial del detalle tiene una
// entrada por cada fila que la base tiene de ese riesgo, con quién, cuándo y el estado anterior.
// Ninguna tabla del esquema queda fuera sin una razón escrita, y ningún archivo del contexto ni
// de la app tiene un UPDATE o un DELETE sobre `risk` (R-22, R-23).

import assert from 'node:assert/strict'
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { after, before, describe, it } from 'node:test'

import { TABLAS_DEL_HISTORIAL, vectorEnTexto, type TablaHistorial } from '../domain/historial.ts'
import { VERSION_METODOLOGIA } from '../domain/modelo.ts'
import type { Sql, TransactionSql } from '../persistence/database.ts'
import { openTestDatabase } from '../persistence/testing.ts'
import { leerOrganizacion } from '../persistence/vistas.ts'
import { conEscenario, filaR01, filasSinteticas, id } from '../testing/actualizacion.ts'
import {
  altaAccion, altaCobertura, cambiarEstadoAccion, cargarReevaluacion, cerrarConReevaluacion, cerrarSinCambio, pantallaOrdenPrevio,
  registrarEficacia, registrarEventoPoliza, registrarNovedad, registrarOrdenPrevio, reordenar, revisar,
} from './actualizacion.ts'
import { reevaluacionDeFila } from '../testing/actualizacion.ts'
import { vistaDetalle } from './vistas.ts'

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

/** Cuántas filas tiene la base de un riesgo, por tabla del historial. */
async function filasDelRiesgo(tx: TransactionSql, rid: string): Promise<Record<TablaHistorial, number>> {
  const [f] = await tx<Record<TablaHistorial, number>[]>`
    select
      (select count(*)::int from risk.riesgo where id = ${rid}) as riesgo,
      (select count(*)::int from risk.evaluacion where risk_id = ${rid}) as evaluacion,
      (select count(*)::int from risk.revision_humana h
         left join risk.evaluacion e on e.id = h.evaluacion_id left join risk.accion a on a.id = h.accion_id
         left join risk.transferencia t on t.id = h.transferencia_id
       where coalesce(e.risk_id, a.risk_id, t.risk_id) = ${rid}) as revision_humana,
      (select count(*)::int from risk.accion where risk_id = ${rid}) as accion,
      (select count(*)::int from risk.accion_estado s join risk.accion a on a.id = s.accion_id where a.risk_id = ${rid}) as accion_estado,
      (select count(*)::int from risk.transferencia where risk_id = ${rid}) as transferencia,
      (select count(*)::int from risk.evento_poliza where risk_id = ${rid}) as evento_poliza,
      (select count(*)::int from risk.novedad where risk_id = ${rid}) as novedad,
      (select count(*)::int from risk.revision_pendiente where risk_id = ${rid}) as revision_pendiente,
      (select count(*)::int from risk.cierre_revision where risk_id = ${rid}) as cierre_revision,
      (select count(*)::int from risk.reordenamiento where ${rid} in (risk_id, risk_id_sube, risk_id_baja)) as reordenamiento,
      (select count(*)::int from risk.orden_previo_item where risk_id = ${rid}) as orden_previo_item`
  assert.ok(f !== undefined)
  return f
}

describe('historial de un riesgo (A12)', () => {
  it('cada cambio de un recorrido completo está en el historial, con quién, cuándo y qué había antes', () =>
    conEscenario(sql, async ({ tx, sesion, revisor }) => {
      // Orden previo del revisor, antes de ver nada.
      const p = await pantallaOrdenPrevio(tx, revisor, ORG_S07)
      await registrarOrdenPrevio(tx, revisor, ORG_S07, { materialRef: 'MAT-S07', items: (p?.objetos ?? []).map((o, i) => ({ riskId: o.riskId, posicion: i + 1, banda: 'Alta' })) })
      // El ciclo de 15B-A01.
      const inicial = F['risks.csv'].find((r) => r.risk_id === S07R06 && r.tipo_evaluacion === 'inicial')?.evaluacion_id ?? ''
      await revisar(tx, sesion, { evaluacionId: inicial }, 'accepted')
      const a = F['action-plan.csv'].find((x) => x.id_origen === '15B-A01')
      const { revisionId } = await cambiarEstadoAccion(tx, sesion, {
        accionId: id('15B-A01'), estado: 'cumplida', fechaCumplida: a?.fecha_cumplida ?? '', evidencia: a?.evidencia_ejecucion ?? '', comentario: 'Cumplida.',
      })
      assert.ok(revisionId !== null)
      const { evaluacionId } = await cargarReevaluacion(tx, sesion, reevaluacionDeFila(filaR01(F)))
      await cerrarConReevaluacion(tx, sesion, { revisionId, evaluacionId })
      await registrarEficacia(tx, sesion, { accionId: id('15B-A01'), efecto: 'efecto_parcial', nota: 'Parcial.', evaluacionId })
      // Una información nueva cerrada sin cambio.
      const n = await registrarNovedad(tx, sesion, { riskId: S07R06, tipo: 'informacion_nueva', texto: 'Informe del fabricante.', evidencia: 'DOC-FAB-1' })
      assert.ok(n.revisionId !== null)
      await cerrarSinCambio(tx, sesion, { revisionId: n.revisionId, fundamento: 'Confirma la evaluación vigente.' })
      // Una acción y una cobertura nuevas, revisadas, y un evento.
      const { accionId } = await altaAccion(tx, sesion, {
        riskId: S07R06, tipoRegistro: 'accion', descripcion: 'Repuesto en planta', factorObjetivo: ['v_rec'], mecanismoCausal: 'v_rec: menos días parado',
        fechaAlta: '2026-10-15', base: 'assumed', evidencia: 'sin_evidencia', estado: 'planificada',
      })
      await revisar(tx, sesion, { accionId }, 'needs_revision')
      await cambiarEstadoAccion(tx, sesion, { accionId, estado: 'en_curso', evidencia: 'sin_evidencia', comentario: 'Pedido el repuesto.' })
      const { transferenciaId } = await altaCobertura(tx, sesion, {
        riskId: S07R06, polizaRef: 'POL-SINT-7', cobertura: 'Rotura de maquinaria', vigenciaDesde: '2026-01-01', vigenciaHasta: '2026-12-31',
        limite: '1000000', moneda: 'USD', suficiencia: 'parcial', base: 'reported', evidencia: 'DOC-POL-7', uncertainty: 'medium', uncertaintyNota: 'sin la póliza firmada',
      })
      await revisar(tx, sesion, { transferenciaId }, 'accepted')
      await registrarEventoPoliza(tx, sesion, { transferenciaId, tipo: 'consumo_limite', fecha: '2026-10-15', monto: '1000', moneda: 'USD', base: 'reported', evidencia: 'DOC-PAGO-1' })
      // Un reordenamiento.
      await reordenar(tx, sesion, V, ORG_S07, { tipo: 'banda', riskId: S07R06, banda: 'Crítica', causa: 'regla_ambigua', fundamento: 'Lectura propia.', patron: 'otro' })

      const d = await vistaDetalle(tx, sesion, V, S07R06)
      assert.ok(d !== null)
      const h = d.cambios
      // Una entrada por fila de la base (las importadas y las de la sesión).
      const porTabla = (t: TablaHistorial): number => h.filter((e) => e.tabla === t).length
      const filas = await filasDelRiesgo(tx, S07R06)
      for (const [t, n] of Object.entries(filas)) assert.equal(porTabla(t as TablaHistorial), n, t)
      assert.ok(Object.values(filas).every((x) => x > 0), JSON.stringify(filas))

      // En orden, cada una con quién y cuándo.
      for (let i = 1; i < h.length; i++) assert.ok((h[i - 1]?.cuando ?? '') <= (h[i]?.cuando ?? ''), `${String(i)}: fuera de orden`)
      for (const e of h) {
        assert.ok(e.quien.trim() !== '' && e.cuando !== '', JSON.stringify(e))
        if (e.origen === 'sesion' && e.tabla !== 'orden_previo_item') assert.equal(e.quien, 'Operadora de prueba', JSON.stringify(e))
      }
      assert.equal(h.find((e) => e.tabla === 'orden_previo_item')?.quien, 'Revisor de prueba')

      // El estado anterior de cada cambio.
      const datos = await leerOrganizacion(tx, ORG_S07)
      const factoresInicial = datos?.evaluaciones.find((e) => e.id === inicial)?.factores
      assert.ok(factoresInicial !== undefined)
      const de = (t: TablaHistorial, objeto: string): { antes: string | null; despues: string }[] =>
        h.filter((e) => e.tabla === t && e.objetoId === objeto).map((e) => ({ antes: e.antes, despues: e.despues }))
      assert.deepEqual(de('accion_estado', id('15B-A01')).map((e) => e.antes), [null, 'en_curso', 'cumplida'])
      assert.match(de('accion_estado', id('15B-A01')).at(-1)?.despues ?? '', /efecto_parcial/)
      assert.deepEqual(de('evaluacion', evaluacionId), [{ antes: vectorEnTexto(factoresInicial), despues: vectorEnTexto(datos?.evaluaciones.find((e) => e.id === evaluacionId)?.factores ?? factoresInicial) }])
      assert.deepEqual(de('revision_humana', inicial), [{ antes: 'pending', despues: 'accepted' }])
      assert.deepEqual(de('revision_humana', evaluacionId), [{ antes: 'pending', despues: 'accepted' }])
      assert.deepEqual(de('cierre_revision', revisionId), [{ antes: 'abierta', despues: `reevaluación aceptada ${evaluacionId}` }])
      assert.deepEqual(de('cierre_revision', n.revisionId), [{ antes: 'abierta', despues: 'sin cambio: Confirma la evaluación vigente.' }])
      assert.equal(h.find((e) => e.tabla === 'reordenamiento')?.antes?.startsWith('posición calculada 2'), true)
    }))

  it('cada tabla del esquema entra al historial o dice por qué no', async () => {
    const tablas = await sql<{ t: string }[]>`
      select c.relname as t from pg_class c join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'risk' and c.relkind = 'r' order by 1`
    assert.deepEqual(tablas.map((x) => x.t), Object.keys(TABLAS_DEL_HISTORIAL).sort())
  })

  it('ningún archivo del contexto ni de la app escribe un UPDATE, un DELETE o un TRUNCATE sobre risk (R-22, R-23)', () => {
    const raiz = fileURLToPath(new URL('../../../../', import.meta.url))
    const archivos = (dir: string): string[] => readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
      e.isDirectory() ? (e.name === 'node_modules' || e.name === '.next' ? [] : archivos(join(dir, e.name)))
        : /\.(ts|tsx|mjs)$/.test(e.name) && !e.name.endsWith('.test.ts') ? [join(dir, e.name)] : [])
    // El runner de migraciones borra su propia fila del ledger al revertir una migración
    // (`db:down`, sólo local): `risk.schema_migrations` no es un dato de Risk OS ni tiene historial.
    const runner = join(raiz, 'contexts/risk/src/persistence/migrations.ts')
    const fuentes = [...archivos(join(raiz, 'contexts/risk/src')), ...archivos(join(raiz, 'apps/risk/src'))].filter((f) => f !== runner)
    assert.ok(fuentes.length > 20)
    for (const f of fuentes) {
      assert.doesNotMatch(readFileSync(f, 'utf8'), /\b(update\s+risk\.|delete\s+from|truncate\s)/i, f)
    }
  })
})
