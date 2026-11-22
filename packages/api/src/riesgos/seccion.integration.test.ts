// T-0061 — La sección Riesgos de la ficha como la usa el equipo: por `conDatos`, como
// `broker_app`, con RLS decidiendo. Contra Postgres real, con datos sintéticos y cada caso en
// una transacción revertida. Requiere DATABASE_URL con 0030 aplicada.

import assert from 'node:assert/strict'
import { after, describe, it } from 'node:test'

import postgres from 'postgres'

import { AccesoDenegado } from '../acceso/datos.ts'
import type { Principal } from '../session/admission.ts'
import { comentarItemCon, crearItemCon, darDeBajaItemCon, editarItemCon, riesgosDeEmpresaCon } from './seccion.ts'

const databaseUrl = process.env.DATABASE_URL
if (databaseUrl === undefined || databaseUrl === '') {
  throw new Error('DATABASE_URL no está configurada: T-0061 requiere PostgreSQL real.')
}

const sql = postgres(databaseUrl, { max: 1, prepare: false, onnotice: () => undefined })

after(async () => {
  await sql.end()
})

class Rollback extends Error {}

const descartable = async (accion: (tx: postgres.TransactionSql) => Promise<void>): Promise<void> => {
  try {
    await sql.begin(async (tx) => {
      await accion(tx)
      throw new Rollback()
    })
  } catch (error) {
    if (!(error instanceof Rollback)) throw error
  }
}

const quien: Principal = { sub: 'sub-riesgos', email: 'sub-riesgos@sintetico.test', displayName: null }

const sembrar = async (tx: postgres.TransactionSql, rol = 'OPERADOR'): Promise<string> => {
  const [empresa] = await tx<{ id: string }[]>`insert into party (kind, display_name_cache) values ('ORGANIZATION', 'Bodega Sintética') returning id`
  const [usuario] = await tx<{ id: string }[]>`
    insert into app_user (email, status, auth_provider, role, display_name)
    values ('sub-riesgos@sintetico.test', 'ACTIVE', 'google', ${rol}, 'Manu') returning id`
  if (empresa === undefined || usuario === undefined) throw new Error('sin semilla')
  await tx`insert into organization_profile (party_id, legal_name) values (${empresa.id}, 'Bodega Sintética')`
  await tx`insert into user_credential (user_id, provider, subject) values (${usuario.id}, 'google', 'sub-riesgos')`
  return empresa.id
}

describe('sección Riesgos de la ficha (T-0061)', () => {
  it('el equipo carga, edita, comenta y da de baja ítems de las listas', async () => {
    await descartable(async (tx) => {
      const empresa = await sembrar(tx)
      assert.equal(await crearItemCon(tx, quien, empresa, 'RIESGO', 'r1', { riesgo: 'Incendio', impacto: 'Alto' }), 'guardado')
      assert.equal(await crearItemCon(tx, quien, empresa, 'RIESGO', 'R1', { riesgo: 'Otro' }), 'repetido')
      assert.equal(await crearItemCon(tx, quien, empresa, 'RIESGO', 'R 1', {}), 'codigo_invalido')
      assert.equal(await crearItemCon(tx, quien, empresa, 'TRANSFERENCIA', 'T01', { cobertura: 'Robo' }), 'guardado')

      const [r1] = (await riesgosDeEmpresaCon(tx, quien, empresa)).items
      assert.ok(r1)
      assert.equal(r1.code, 'R1')
      assert.equal(await editarItemCon(tx, quien, empresa, r1.id, 'RIESGO', { riesgo: 'Incendio', impacto: 'Medio' }), 'guardado')
      assert.equal(await comentarItemCon(tx, quien, empresa, r1.id, '  '), 'vacio')
      assert.equal(await comentarItemCon(tx, quien, empresa, r1.id, 'Confirmado en la visita'), 'guardado')
      assert.equal(await darDeBajaItemCon(tx, quien, empresa, r1.id, true), 'guardado')

      const vista = await riesgosDeEmpresaCon(tx, quien, empresa)
      const editado = vista.items.find((i) => i.code === 'R1')
      assert.ok(editado)
      assert.equal(editado.fields.impacto, 'Medio')
      assert.equal(editado.retired, true)
      assert.equal(editado.updatedByName, 'Manu')
      assert.deepEqual(editado.comments.map((c) => c.body), ['Confirmado en la visita'])
      assert.deepEqual(vista.items.map((i) => i.list), ['RIESGO', 'TRANSFERENCIA'])
    })
  })

  it('quien no es del equipo no llega a las listas', async () => {
    await descartable(async (tx) => {
      const empresa = await sembrar(tx, 'REVISOR')
      try {
        const vista = await riesgosDeEmpresaCon(tx, quien, empresa)
        assert.deepEqual([vista.items, vista.ubicaciones, vista.condiciones, vista.relevamientos, vista.conclusiones].map((l) => l.length), [0, 0, 0, 0, 0])
      } catch (error) {
        assert.ok(error instanceof AccesoDenegado, String(error))
      }
    })
  })
})
