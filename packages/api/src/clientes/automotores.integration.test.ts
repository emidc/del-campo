// Automotores del cliente y de sus pólizas como los ve y edita el equipo: por `conDatos`,
// como `broker_app`, con RLS decidiendo. Contra Postgres real, con datos sintéticos y cada
// caso en una transacción revertida. Requiere DATABASE_URL con 0035 aplicada.

import assert from 'node:assert/strict'
import { after, describe, it } from 'node:test'

import postgres from 'postgres'

import { AccesoDenegado } from '../acceso/datos.ts'
import type { Principal } from '../session/admission.ts'
import {
  agregarAutomotorCon,
  automotoresDeClienteCon,
  automotoresDePolizaCon,
  corregirAutomotorCon,
  nuevoAutomotorEnPolizaCon,
  quitarAutomotorCon,
  quitarAutomotorDePolizaCon,
  riskTypeHasVehicles,
  sumarAutomotorAPolizaCon,
} from './automotores.ts'

const databaseUrl = process.env.DATABASE_URL
if (databaseUrl === undefined || databaseUrl === '') {
  throw new Error('DATABASE_URL no está configurada: los automotores requieren PostgreSQL real.')
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

const quien: Principal = { sub: 'sub-automotores', email: 'sub-automotores@sintetico.test', displayName: null }

const uno = <T>(filas: readonly T[]): T => {
  const [fila] = filas
  if (fila === undefined) throw new Error('sin fila')
  return fila
}

interface Mundo {
  readonly usuario: string
  readonly ana: string
  readonly beto: string
  readonly poliza: string
}

const sembrar = async (tx: postgres.TransactionSql, rol = 'OPERADOR', estado = 'ACTIVE'): Promise<Mundo> => {
  const { id: usuario } = uno(await tx<{ id: string }[]>`
    insert into app_user (email, status, auth_provider, role)
    values ('sub-automotores@sintetico.test', ${estado}, 'google', ${rol}) returning id`)
  await tx`insert into user_credential (user_id, provider, subject) values (${usuario}, 'google', 'sub-automotores')`
  const { id: ana } = uno(await tx<{ id: string }[]>`insert into party (kind) values ('PERSON') returning id`)
  const { id: beto } = uno(await tx<{ id: string }[]>`insert into party (kind) values ('PERSON') returning id`)
  const { id: org } = uno(await tx<{ id: string }[]>`insert into party (kind) values ('ORGANIZATION') returning id`)
  const { id: aseguradora } = uno(await tx<{ id: string }[]>`
    insert into insurer (organization_party_id, canonical_name) values (${org}, 'Aseguradora Sintética') returning id`)
  const { id: poliza } = uno(await tx<{ id: string }[]>`
    insert into policy (insurer_id, policy_number) values (${aseguradora}, 'SIN-AUTO-1') returning id`)
  await tx`
    insert into policy_version (
      policy_id, version_number, effective_from, holder_party_id, term_start_date, term_end_date, renewal_mode, product_reference
    ) values (${poliza}, 1, '2026-01-01', ${ana}, '2026-01-01', '2027-01-01', 'MANUAL', 'Automotor')`
  return { usuario, ana, beto, poliza }
}

const datos = (patente: string, marca = '', modelo = '', anio = '') => ({ patente, marca, modelo, anio })

const patentes = async (tx: postgres.TransactionSql, parte: string): Promise<string[]> =>
  (await automotoresDeClienteCon(tx, quien, parte)).map((a) => a.plate)

describe('automotores del cliente', () => {
  it('el equipo agrega un automotor con la patente normalizada, y queda quién lo cargó', async () => {
    await descartable(async (tx) => {
      const m = await sembrar(tx)
      assert.equal(await agregarAutomotorCon(tx, quien, m.ana, datos('ab 123-cd', 'Renault', 'Sandero', '2010')), 'guardado')
      const [a] = await automotoresDeClienteCon(tx, quien, m.ana)
      assert.deepEqual({ ...a, id: undefined, partyId: undefined }, { id: undefined, partyId: undefined, plate: 'AB123CD', brand: 'Renault', model: 'Sandero', year: 2010 })
      const { autor } = uno(await tx<{ autor: string }[]>`select created_by_user_id as autor from vehicle where party_id = ${m.ana}`)
      assert.equal(autor, m.usuario)
    })
  })

  it('no repite una patente en todo Broker OS ni guarda lo que no sirve', async () => {
    await descartable(async (tx) => {
      const m = await sembrar(tx)
      assert.equal(await agregarAutomotorCon(tx, quien, m.ana, datos('AB123CD')), 'guardado')
      assert.equal(await agregarAutomotorCon(tx, quien, m.ana, datos('ab-123-cd')), 'repetido')
      assert.equal(await agregarAutomotorCon(tx, quien, m.beto, datos('AB 123 CD')), 'repetido')
      assert.equal(await agregarAutomotorCon(tx, quien, m.ana, datos('')), 'invalido')
      assert.equal(await agregarAutomotorCon(tx, quien, m.ana, datos('A/D')), 'invalido')
      assert.equal(await agregarAutomotorCon(tx, quien, m.ana, datos('AC456DE', '', '', '1578')), 'invalido')
      assert.deepEqual(await patentes(tx, m.beto), [])
    })
  })

  it('corrige y elimina; la patente corregida tampoco puede repetirse', async () => {
    await descartable(async (tx) => {
      const m = await sembrar(tx)
      await agregarAutomotorCon(tx, quien, m.ana, datos('AB123CD'))
      await agregarAutomotorCon(tx, quien, m.beto, datos('AC456DE'))
      const [a] = await automotoresDeClienteCon(tx, quien, m.ana)
      if (a === undefined) throw new Error('sin automotor')
      assert.equal(await corregirAutomotorCon(tx, quien, m.ana, a.id, datos('AC456DE')), 'repetido')
      assert.equal(await corregirAutomotorCon(tx, quien, m.ana, a.id, datos('AB123CD', 'Ford', 'Ka', '2015')), 'guardado')
      assert.equal(await corregirAutomotorCon(tx, quien, m.beto, a.id, datos('AB123CD')), 'inexistente')
      assert.equal(await quitarAutomotorCon(tx, quien, m.beto, a.id), 'inexistente')
      assert.equal(await quitarAutomotorCon(tx, quien, m.ana, a.id), 'quitado')
      assert.deepEqual(await patentes(tx, m.ana), [])
    })
  })

  it('quien fue dado de baja no lee ni carga automotores', async () => {
    await descartable(async (tx) => {
      const m = await sembrar(tx, 'OPERADOR', 'INACTIVE')
      await assert.rejects(automotoresDeClienteCon(tx, quien, m.ana), AccesoDenegado)
      await assert.rejects(agregarAutomotorCon(tx, quien, m.ana, datos('AB123CD')), AccesoDenegado)
    })
  })
})

describe('automotores de la póliza', () => {
  it('se elige uno del tomador; uno nuevo se suma también al tomador', async () => {
    await descartable(async (tx) => {
      const m = await sembrar(tx)
      await agregarAutomotorCon(tx, quien, m.ana, datos('AB123CD'))
      await agregarAutomotorCon(tx, quien, m.beto, datos('AC456DE'))
      const antes = await automotoresDePolizaCon(tx, quien, m.poliza)
      assert.deepEqual(antes.enLaPoliza, [])
      assert.deepEqual(antes.delTomador.map((a) => a.plate), ['AB123CD'])

      const [deAna] = antes.delTomador
      const [deBeto] = await automotoresDeClienteCon(tx, quien, m.beto)
      if (deAna === undefined || deBeto === undefined) throw new Error('sin automotor')
      assert.equal(await sumarAutomotorAPolizaCon(tx, quien, m.poliza, deBeto.id), 'inexistente')
      assert.equal(await sumarAutomotorAPolizaCon(tx, quien, m.poliza, deAna.id), 'guardado')
      assert.equal(await nuevoAutomotorEnPolizaCon(tx, quien, m.poliza, datos('ad 789 ef', 'Fiat', 'Cronos', '2022')), 'guardado')
      assert.equal(await nuevoAutomotorEnPolizaCon(tx, quien, m.poliza, datos('AC456DE')), 'repetido')

      const despues = await automotoresDePolizaCon(tx, quien, m.poliza)
      assert.deepEqual(despues.enLaPoliza.map((a) => a.plate), ['AB123CD', 'AD789EF'])
      assert.deepEqual(despues.delTomador, [])
      assert.deepEqual(await patentes(tx, m.ana), ['AB123CD', 'AD789EF'])

      assert.equal(await quitarAutomotorDePolizaCon(tx, quien, m.poliza, deAna.id), 'quitado')
      assert.deepEqual((await automotoresDePolizaCon(tx, quien, m.poliza)).enLaPoliza.map((a) => a.plate), ['AD789EF'])
      assert.deepEqual(await patentes(tx, m.ana), ['AB123CD', 'AD789EF'])
    })
  })

  it('al eliminar la póliza o el automotor se va el vínculo', async () => {
    await descartable(async (tx) => {
      const m = await sembrar(tx)
      await nuevoAutomotorEnPolizaCon(tx, quien, m.poliza, datos('AB123CD'))
      const [a] = await automotoresDeClienteCon(tx, quien, m.ana)
      if (a === undefined) throw new Error('sin automotor')
      assert.equal(await quitarAutomotorCon(tx, quien, m.ana, a.id), 'quitado')
      assert.deepEqual((await automotoresDePolizaCon(tx, quien, m.poliza)).enLaPoliza, [])
      const { n } = uno(await tx<{ n: number }[]>`select count(*)::int as n from policy_vehicle`)
      assert.equal(n, 0)
    })
  })

  it('la sección se muestra sólo para automotor, motovehículo, flota automotor y trailer', () => {
    for (const t of ['Automotor', 'Motovehículo', 'MOTOVEHICULO', 'Flota automotor', 'TRAILER', ' trailer ']) assert.equal(riskTypeHasVehicles(t), true, t)
    for (const t of ['Hogar', 'Integral de comercio', '', null]) assert.equal(riskTypeHasVehicles(t), false, String(t))
  })
})
