// T-0036: la ficha de la organización evaluada y su vínculo con la empresa de Broker OS, sobre
// los registros sintéticos de `base`, en una transacción que se revierte. `base` deja a ORG_A
// vinculada con EMPRESA_SINTETICA, sin verificar.

import assert from 'node:assert/strict'
import { after, before, describe, it } from 'node:test'

import type { Sql, TransactionSql } from '../persistence/database.ts'
import { B, base, EMPRESA_SINTETICA, fila, insertar, ORG_A, ORG_B } from '../persistence/fixtures.ts'
import { conBaseTemporal, enTransaccionRevertida, openTestDatabase } from '../persistence/testing.ts'
import { organizacionDeEmpresa, organizacionesEvaluadas, registrarFicha, verificarVinculo, vincular, vinculoDeEmpresa } from './organizacion-evaluada.ts'

const OTRA_EMPRESA = '00000000-0000-4000-8000-000000000002'

let sql: Sql
before(async () => {
  sql = await openTestDatabase()
})
after(async () => {
  await sql.end()
})

/** `base`, con `B.persona` como Administradora activa (ya entra con Google). */
const conAdmin = (cuerpo: (tx: TransactionSql) => Promise<void>): Promise<void> =>
  enTransaccionRevertida(sql, async (tx) => {
    await base(tx)
    await tx`insert into risk.rol_persona (persona_id, rol) values (${B.persona}, 'ADMINISTRADOR')`
    await cuerpo(tx)
  })

const estado = async (tx: TransactionSql, org: string) => (await organizacionesEvaluadas(tx)).find((o) => o.organizacionId === org)

describe('organización evaluada (T-0036)', () => {
  it('la ficha vigente es la última, y las zonas no repiten', async () => {
    await conAdmin(async (tx) => {
      assert.ok((await registrarFicha(tx, { actor: B.persona, organizacionId: ORG_B, sector: 'Industria', tamano: 'Mediana', zonas: ['Planta'] })).ok)
      assert.ok((await registrarFicha(tx, { actor: B.persona, organizacionId: ORG_B, sector: 'Logística', tamano: null, zonas: ['Depósito', 'Depósito', 'Oficina'] })).ok)
      const o = await estado(tx, ORG_B)
      assert.deepEqual({ sector: o?.sector, tamano: o?.tamano, zonas: o?.zonas }, { sector: 'Logística', tamano: null, zonas: ['Depósito', 'Oficina'] })
    })
  })

  it('rechaza una organización sin riesgos, una ficha inválida y a quien no es Administrador', async () => {
    await conAdmin(async (tx) => {
      const ficha = { sector: null, tamano: null, zonas: [] }
      assert.deepEqual(await registrarFicha(tx, { actor: B.persona, organizacionId: 'ORG-QUE-NO-EXISTE', ...ficha }), { ok: false, motivo: 'ORGANIZACION_INVALIDA' })
      assert.deepEqual(await registrarFicha(tx, { actor: B.persona, organizacionId: ORG_A, ...ficha, zonas: [' '] }), { ok: false, motivo: 'FICHA_INVALIDA' })
      assert.deepEqual(await registrarFicha(tx, { actor: B.otraPersona, organizacionId: ORG_A, ...ficha }), { ok: false, motivo: 'ACTOR_NO_AUTORIZADO' })
    })
  })

  it('un vínculo pendiente no se ve desde la empresa hasta verificarlo', async () => {
    await conAdmin(async (tx) => {
      assert.equal((await estado(tx, ORG_A))?.vinculo, 'pendiente')
      assert.equal(await organizacionDeEmpresa(tx, EMPRESA_SINTETICA), null)
      assert.deepEqual(await vinculoDeEmpresa(tx, EMPRESA_SINTETICA), { organizacionId: ORG_A, estado: 'pendiente' })
      assert.ok((await verificarVinculo(tx, { actor: B.persona, organizacionId: ORG_A })).ok)
      assert.deepEqual(await vinculoDeEmpresa(tx, EMPRESA_SINTETICA), { organizacionId: ORG_A, estado: 'verificado' })
      assert.equal(await vinculoDeEmpresa(tx, OTRA_EMPRESA), null)
      assert.equal((await organizacionDeEmpresa(tx, EMPRESA_SINTETICA))?.organizacionId, ORG_A)
      assert.equal(await organizacionDeEmpresa(tx, OTRA_EMPRESA), null)
    })
  })

  it('una empresa tiene como mucho una organización, y una organización una empresa', async () => {
    await conAdmin(async (tx) => {
      assert.deepEqual(await vincular(tx, { actor: B.persona, organizacionId: ORG_B, empresaId: EMPRESA_SINTETICA }), { ok: false, motivo: 'EMPRESA_YA_VINCULADA' })
      assert.deepEqual(await vincular(tx, { actor: B.persona, organizacionId: ORG_B, empresaId: 'Empresa por nombre' }), { ok: false, motivo: 'EMPRESA_INVALIDA' })
      assert.ok((await vincular(tx, { actor: B.persona, organizacionId: ORG_B, empresaId: OTRA_EMPRESA })).ok)
      // Cambiar la empresa de ORG_A deja el vínculo nuevo pendiente y libera la anterior.
      assert.ok((await verificarVinculo(tx, { actor: B.persona, organizacionId: ORG_A })).ok)
      assert.ok((await vincular(tx, { actor: B.persona, organizacionId: ORG_A, empresaId: '00000000-0000-4000-8000-000000000003' })).ok)
      assert.equal((await estado(tx, ORG_A))?.vinculo, 'pendiente')
      assert.ok((await vincular(tx, { actor: B.persona, organizacionId: ORG_B, empresaId: EMPRESA_SINTETICA })).ok)
    })
  })

  it('desvincular deja la organización sin vínculo, y cada operación queda auditada', async () => {
    await conAdmin(async (tx) => {
      assert.ok((await vincular(tx, { actor: B.persona, organizacionId: ORG_A, empresaId: null })).ok)
      assert.equal((await estado(tx, ORG_A))?.vinculo, 'sin_vinculo')
      assert.deepEqual(await verificarVinculo(tx, { actor: B.persona, organizacionId: ORG_A }), { ok: false, motivo: 'SIN_VINCULO' })
      const eventos = await tx<{ accion: string; resultado: string }[]>`
        select accion, resultado from risk.evento_auditoria where tipo_objeto = 'organizacion' order by id`
      assert.deepEqual(eventos.map((e) => `${e.accion}:${e.resultado}`), ['organizacion.desvincular:ok', 'organizacion.verificar_vinculo:denied'])
    })
  })

  it('RLS: una persona sólo lee la ficha y el vínculo de lo que tiene asignado, y no los escribe', async () => {
    await enTransaccionRevertida(sql, async (tx) => {
      await base(tx)
      await tx`insert into risk.asignacion (persona_id, organizacion_id, vigente) values (${B.persona}, ${ORG_B}, true)`
      await tx`insert into risk.vinculo_empresa (organizacion_id, empresa_id, autor_persona_id) values (${ORG_B}, ${OTRA_EMPRESA}, ${B.persona})`
      await tx`select set_config('authz.persona_id', ${B.persona}, true)`
      await tx`set local role risk_persona`
      const vistos = await tx<{ organizacion_id: string }[]>`select organizacion_id from risk.vinculo_empresa`
      assert.deepEqual(vistos.map((v) => v.organizacion_id), [ORG_B])
      // ORG_A no está asignada: su empresa se ve igual que una sin vínculo.
      assert.equal(await vinculoDeEmpresa(tx, EMPRESA_SINTETICA), null)
      assert.deepEqual(await vinculoDeEmpresa(tx, OTRA_EMPRESA), { organizacionId: ORG_B, estado: 'pendiente' })
      await assert.rejects(tx`insert into risk.vinculo_empresa (organizacion_id, empresa_id, autor_persona_id) values (${ORG_B}, ${OTRA_EMPRESA}, ${B.persona})`, /permission denied/)
    })
  })

  it('dos vincular a la vez de la misma empresa en dos organizaciones: uno se rechaza', async () => {
    // Necesita dos conexiones que confirmen de verdad: en una base temporal, no en la de tests.
    await conBaseTemporal('delcampo_risk_vinculo_test', async (db) => {
      // Lo mínimo que la operación lee: una Administradora activa y un riesgo en cada organización.
      await db.begin(async (tx) => {
        await insertar(tx, 'persona', fila('persona', { id: B.persona }))
        await insertar(tx, 'riesgo', fila('riesgo', { id: B.riesgo }))
        await insertar(tx, 'riesgo', fila('riesgo', { id: B.riesgoOrgB, organizacion_id: ORG_B }))
        await insertar(tx, 'invitacion', fila('invitacion', { persona_id: B.persona }))
        const [inv] = await tx<{ id: string }[]>`select max(id)::text as id from risk.invitacion`
        await insertar(tx, 'credencial_externa', fila('credencial_externa', { persona_id: B.persona, invitacion_id: Number(inv?.id) }))
        await insertar(tx, 'rol_persona', fila('rol_persona', { rol: 'ADMINISTRADOR' }))
      })
      const resultados = await Promise.all([ORG_A, ORG_B].map((organizacionId) =>
        vincular(db, { actor: B.persona, organizacionId, empresaId: OTRA_EMPRESA })))
      assert.deepEqual(resultados.map((r) => (r.ok ? 'ok' : r.motivo)).sort(), ['EMPRESA_YA_VINCULADA', 'ok'])
    })
  })
})
