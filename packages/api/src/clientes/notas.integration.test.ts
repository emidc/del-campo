// Notas de una parte como las ve y edita el equipo: por `conDatos`, como `broker_app`, con
// RLS decidiendo. Contra Postgres real, con datos sintéticos y cada caso en una
// transacción revertida. Requiere DATABASE_URL con 0032 aplicada.

import assert from 'node:assert/strict'
import { after, describe, it } from 'node:test'

import postgres from 'postgres'

import { AccesoDenegado } from '../acceso/datos.ts'
import type { Principal } from '../session/admission.ts'
import { agregarNotaCon, archivarNotaCon, editarNotaCon, eliminarNotaCon, notasDeClienteCon } from './notas.ts'

const databaseUrl = process.env.DATABASE_URL
if (databaseUrl === undefined || databaseUrl === '') {
  throw new Error('DATABASE_URL no está configurada: las notas requieren PostgreSQL real.')
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

const quien: Principal = { sub: 'sub-notas', email: 'sub-notas@sintetico.test', displayName: null }

/** Una empresa con una nota importada de Zoho; quien mira es del equipo (o lo que se pida). */
const sembrar = async (tx: postgres.TransactionSql, rol = 'OPERADOR', estado = 'ACTIVE') => {
  const [empresa] = await tx<{ id: string }[]>`insert into party (kind) values ('ORGANIZATION') returning id`
  const [otra] = await tx<{ id: string }[]>`insert into party (kind) values ('PERSON') returning id`
  const [usuario] = await tx<{ id: string }[]>`
    insert into app_user (email, status, auth_provider, role, display_name)
    values ('sub-notas@sintetico.test', ${estado}, 'google', ${rol}, 'Ana Sintética') returning id`
  if (empresa === undefined || otra === undefined || usuario === undefined) throw new Error('sin semilla')
  await tx`insert into user_credential (user_id, provider, subject) values (${usuario.id}, 'google', 'sub-notas')`
  const [zoho] = await tx<{ id: string }[]>`
    insert into party_note (party_id, body, source, source_record_id, source_author, created_at)
    values (${empresa.id}, 'Exporta a Chile.', 'Zoho', 'zcrm_1', 'Manuel Sintético', '2019-08-23 12:30:49-03') returning id`
  if (zoho === undefined) throw new Error('sin semilla')
  return { empresa: empresa.id, otra: otra.id, usuario: usuario.id, zoho: zoho.id }
}

describe('notas de una parte', () => {
  it('el equipo escribe, edita, archiva, desarchiva y borra notas', async () => {
    await descartable(async (tx) => {
      const m = await sembrar(tx)
      assert.equal(await agregarNotaCon(tx, quien, m.empresa, '  Visita ', ' Tienen rociadores nuevos.\r\n'), 'guardada')
      let notas = await notasDeClienteCon(tx, quien, m.empresa)
      assert.deepEqual(
        notas.map((n) => [n.title, n.body, n.author, n.archived]),
        [
          ['Visita', 'Tienen rociadores nuevos.', 'Ana Sintética', false],
          [null, 'Exporta a Chile.', 'Manuel Sintético', false],
        ],
      )
      const nueva = notas[0]?.id ?? ''

      assert.equal(await editarNotaCon(tx, quien, m.empresa, m.zoho, '', 'Exporta a Chile y Perú.'), 'guardada')
      assert.equal(await archivarNotaCon(tx, quien, m.empresa, m.zoho, true), 'guardada')
      assert.equal(await archivarNotaCon(tx, quien, m.empresa, m.zoho, true), 'inexistente', 'ya estaba archivada')
      notas = await notasDeClienteCon(tx, quien, m.empresa)
      const zoho = notas.find((n) => n.id === m.zoho)
      assert.deepEqual([zoho?.body, zoho?.archived, zoho?.updatedBy], ['Exporta a Chile y Perú.', true, 'Ana Sintética'])

      assert.equal(await archivarNotaCon(tx, quien, m.empresa, m.zoho, false), 'guardada')
      assert.equal((await notasDeClienteCon(tx, quien, m.empresa)).find((n) => n.id === m.zoho)?.archived, false)

      assert.equal(await eliminarNotaCon(tx, quien, m.empresa, nueva), 'guardada')
      assert.deepEqual((await notasDeClienteCon(tx, quien, m.empresa)).map((n) => n.id), [m.zoho])
    })
  })

  it('no guarda una nota vacía ni toca la nota de otra parte', async () => {
    await descartable(async (tx) => {
      const m = await sembrar(tx)
      assert.equal(await agregarNotaCon(tx, quien, m.empresa, ' ', '  \n '), 'vacia')
      assert.equal(await editarNotaCon(tx, quien, m.empresa, m.zoho, '', ''), 'vacia')
      assert.equal(await editarNotaCon(tx, quien, m.otra, m.zoho, '', 'otra cosa'), 'inexistente')
      assert.equal(await archivarNotaCon(tx, quien, m.otra, m.zoho, true), 'inexistente')
      assert.equal(await eliminarNotaCon(tx, quien, m.otra, m.zoho), 'inexistente')
      assert.deepEqual((await notasDeClienteCon(tx, quien, m.otra)).length, 0)
      assert.equal((await notasDeClienteCon(tx, quien, m.empresa))[0]?.body, 'Exporta a Chile.')
    })
  })

  it('al eliminar la parte se borran sus notas', async () => {
    await descartable(async (tx) => {
      const m = await sembrar(tx)
      await tx`delete from party where id = ${m.empresa}`
      const [n] = await tx<{ n: number }[]>`select count(*)::int as n from party_note where id = ${m.zoho}`
      assert.equal(n?.n, 0)
    })
  })

  it('quien no es del equipo no ve ni escribe notas', async () => {
    await descartable(async (tx) => {
      const m = await sembrar(tx, 'OPERADOR', 'INACTIVE')
      await assert.rejects(notasDeClienteCon(tx, quien, m.empresa), AccesoDenegado)
      await assert.rejects(agregarNotaCon(tx, quien, m.empresa, '', 'hola'), AccesoDenegado)
    })
  })
})
