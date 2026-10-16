// El conteo de ciclos de A7 (T-0031; decisión 7 del owner) contra `delcampo_risk_test`: un
// recorrido sintético de diez ciclos en cinco empresas, con los tres tipos de disparador, cumple
// A7; un ciclo que viene de los CSV y una revisión abierta no cuentan.

import assert from 'node:assert/strict'
import { after, before, describe, it } from 'node:test'

import { contarCiclos, informeCiclos } from '../domain/ciclos.ts'
import { revisionesParaContar } from '../persistence/actualizacion.ts'
import type { Sql } from '../persistence/database.ts'
import { openTestDatabase } from '../persistence/testing.ts'
import { conEscenario, filaR01, filasSinteticas, id, reevaluacionDeFila } from '../testing/actualizacion.ts'
import { cambiarEstadoAccion, cargarReevaluacion, cerrarConReevaluacion, cerrarSinCambio, registrarNovedad } from './actualizacion.ts'

const F = filasSinteticas()
const orgDe = (origen: string): string => F['risks.csv'].find((r) => r.risk_id === id(origen))?.organizacion_id ?? ''

let sql: Sql
before(async () => {
  sql = await openTestDatabase()
})
after(async () => {
  await sql.end()
})

describe('conteo de ciclos (A7)', () => {
  it('diez ciclos cerrados en cinco empresas con tres tipos cumplen A7; los de los CSV y los abiertos no cuentan', () =>
    conEscenario(sql, async ({ tx, sesion }) => {
      const riesgos = ['S06-R01', 'S15-R01', 'S28-R01', 'S32-R01', 'S36-R01']
      const empresas = riesgos.map(orgDe)
      assert.equal(new Set(empresas).size, 5)
      // 15B-A01 (S07): accion_ejecutada, cerrada con su reevaluación aceptada.
      const a = F['action-plan.csv'].find((x) => x.id_origen === '15B-A01')
      const r = await cambiarEstadoAccion(tx, sesion, {
        accionId: id('15B-A01'), estado: 'cumplida', fechaCumplida: a?.fecha_cumplida ?? '', evidencia: a?.evidencia_ejecucion ?? '', comentario: 'Cumplida.',
      })
      assert.ok(r.revisionId !== null)
      const { evaluacionId } = await cargarReevaluacion(tx, sesion, reevaluacionDeFila(filaR01(F)))
      await cerrarConReevaluacion(tx, sesion, { revisionId: r.revisionId, evaluacionId })
      // En cada una de las cinco empresas, una informacion_nueva; en cuatro, además un cambio_contexto.
      for (const [i, origen] of riesgos.entries()) {
        const tipos = i === 0 ? ['informacion_nueva'] : ['informacion_nueva', 'cambio_contexto']
        for (const tipo of tipos) {
          const n = await registrarNovedad(tx, sesion, { riskId: id(origen), tipo, texto: `Novedad sintética ${String(i)}`, evidencia: 'DOC-SINT' })
          assert.ok(n.revisionId !== null)
          await cerrarSinCambio(tx, sesion, { revisionId: n.revisionId, fundamento: 'Sin cambio en los factores.' })
        }
      }
      // Una revisión abierta, que no cuenta.
      await registrarNovedad(tx, sesion, { riskId: id('S36-R02'), tipo: 'cambio_contexto', texto: 'Abierta.', evidencia: 'DOC-SINT' })
      // Un ciclo que viene de los CSV (origen importacion): no cuenta.
      const a02 = F['action-plan.csv'].find((x) => x.id_origen === '15B-A02')?.risk_id ?? ''
      await tx`insert into risk.revision_pendiente (id, risk_id, riesgo_tipo, disparador, accion_id, origen, abierta_en)
               values ('REV-01M50T00000000000000000099', ${a02}, 'riesgo', 'accion_ejecutada', ${id('15B-A02')}, 'importacion', '2026-10-01')`
      await tx`insert into risk.cierre_revision (revision_id, risk_id, resultado, fundamento, cerrada_por)
               values ('REV-01M50T00000000000000000099', ${a02}, 'sin_cambio', 'del CSV', ${sesion.personaId})`

      const c = contarCiclos(await revisionesParaContar(tx), empresas)
      assert.equal(c.ciclos, 10)
      assert.deepEqual(c.porDisparador, { accion_ejecutada: 1, cambio_contexto: 4, informacion_nueva: 5 })
      assert.deepEqual(c.noCuentan, { abiertas: 1, deLosCsv: 1 })
      assert.deepEqual(c.empresasSinCiclo, [])
      assert.equal(c.cumpleA7, true, c.faltas.join('; '))

      // Con una empresa histórica más, sin ningún ciclo: no cumple.
      const otra = contarCiclos(await revisionesParaContar(tx), [...empresas, orgDe('S05-P01')])
      assert.equal(otra.cumpleA7, false)
      assert.deepEqual(otra.empresasSinCiclo, [orgDe('S05-P01')])

      // La salida tiene sólo códigos de empresa, conteos y fechas.
      const salida = informeCiclos(c).join('\n')
      assert.doesNotMatch(salida, /Novedad sintética|Operadora|DOC-SINT|RSK-|EVA-|REV-|ACC-/)
      for (const e of empresas) assert.match(salida, new RegExp(e))
    }))
})
