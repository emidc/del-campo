// T-0068 — Teléfonos y mails del cliente como los ve y edita el equipo: por `conDatos`,
// como `broker_app`, con RLS decidiendo. Contra Postgres real, con datos sintéticos y cada
// caso en una transacción revertida. Requiere DATABASE_URL con 0022 aplicada.

import assert from 'node:assert/strict'
import { after, describe, it } from 'node:test'

import postgres from 'postgres'

import { AccesoDenegado } from '../acceso/datos.ts'
import type { Principal } from '../session/admission.ts'
import { agregarContactoCon, contactosDeClienteCon, corregirContactoCon, quitarContactoCon } from './contactos.ts'

const databaseUrl = process.env.DATABASE_URL
if (databaseUrl === undefined || databaseUrl === '') {
  throw new Error('DATABASE_URL no está configurada: T-0068 requiere PostgreSQL real.')
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

const quien: Principal = { sub: 'sub-contactos', email: 'sub-contactos@sintetico.test', displayName: null }

interface Mundo {
  readonly ana: string
  readonly usuario: string
  readonly importado: string
}

/** Ana viene de la importación con un teléfono; quien mira es del equipo, o un cliente del portal. */
const sembrar = async (tx: postgres.TransactionSql, rol = 'OPERADOR', estado = 'ACTIVE'): Promise<Mundo> => {
  const [ana] = await tx<{ id: string }[]>`insert into party (kind) values ('PERSON') returning id`
  const [usuario] = await tx<{ id: string }[]>`
    insert into app_user (email, status, auth_provider, role)
    values ('sub-contactos@sintetico.test', ${estado}, 'google', ${rol}) returning id`
  if (ana === undefined || usuario === undefined) throw new Error('sin semilla')
  await tx`insert into user_credential (user_id, provider, subject) values (${usuario.id}, 'google', 'sub-contactos')`
  const [importado] = await tx<{ id: string }[]>`
    insert into contact_point (party_id, channel, value, normalized_value, source)
    values (${ana.id}, 'PHONE', '261 555-0101', '261 555-0101', 'Zoho') returning id`
  if (importado === undefined) throw new Error('sin semilla')
  return { ana: ana.id, usuario: usuario.id, importado: importado.id }
}

const valores = async (tx: postgres.TransactionSql, parte: string): Promise<string[]> =>
  (await contactosDeClienteCon(tx, quien, parte)).map((c) => `${c.channel} ${c.value}`)

describe('teléfonos y mails del cliente (T-0068)', () => {
  it('el equipo agrega un teléfono y un mail, y queda quién los cargó', async () => {
    await descartable(async (tx) => {
      const m = await sembrar(tx)
      assert.equal(await agregarContactoCon(tx, quien, m.ana, 'PHONE', '+54 9 261 555-0202'), 'guardado')
      assert.equal(await agregarContactoCon(tx, quien, m.ana, 'EMAIL', 'Ana@Sintetico.Test'), 'guardado')
      // Teléfonos primero. Dentro del caso todo se crea en el mismo instante y desempata el valor.
      assert.deepEqual(await valores(tx, m.ana), ['PHONE +54 9 261 555-0202', 'PHONE 261 555-0101', 'EMAIL ana@sintetico.test'])
      const autores = await tx<{ autor: string | null }[]>`
        select created_by_user_id as autor from contact_point where party_id = ${m.ana} and source = 'Broker OS'`
      assert.deepEqual(autores.map((a) => a.autor), [m.usuario, m.usuario])
    })
  })

  it('no guarda lo que no sirve ni lo que el cliente ya tiene', async () => {
    await descartable(async (tx) => {
      const m = await sembrar(tx)
      assert.equal(await agregarContactoCon(tx, quien, m.ana, 'PHONE', '4250101'), 'invalido')
      assert.equal(await agregarContactoCon(tx, quien, m.ana, 'EMAIL', 'ana'), 'invalido')
      // El mismo teléfono escrito de otra forma, aunque el cargado venga de la importación.
      assert.equal(await agregarContactoCon(tx, quien, m.ana, 'PHONE', '+54 9 (261) 5550101'), 'repetido')
      assert.deepEqual(await valores(tx, m.ana), ['PHONE 261 555-0101'])
    })
  })

  it('eliminar borra la fila de la base, y se puede volver a cargar', async () => {
    await descartable(async (tx) => {
      const m = await sembrar(tx)
      assert.equal(await quitarContactoCon(tx, quien, m.ana, m.importado), 'quitado')
      assert.equal(await quitarContactoCon(tx, quien, m.ana, m.importado), 'inexistente')
      assert.deepEqual(await valores(tx, m.ana), [])
      const filas = await tx`select 1 from contact_point where id = ${m.importado}`
      assert.equal(filas.length, 0)

      assert.equal(await agregarContactoCon(tx, quien, m.ana, 'EMAIL', 'ana@sintetico.test'), 'guardado')
      const [mail] = await contactosDeClienteCon(tx, quien, m.ana)
      assert.ok(mail)
      assert.equal(await quitarContactoCon(tx, quien, m.ana, mail.id), 'quitado')
      assert.equal(await agregarContactoCon(tx, quien, m.ana, 'EMAIL', 'ana@sintetico.test'), 'guardado')
      assert.deepEqual(await valores(tx, m.ana), ['EMAIL ana@sintetico.test'])
    })
  })

  it('corregir reemplaza el valor; si el nuevo no sirve o está repetido, el anterior queda', async () => {
    await descartable(async (tx) => {
      const m = await sembrar(tx)
      assert.equal(await corregirContactoCon(tx, quien, m.ana, m.importado, '261 555-0303'), 'guardado')
      assert.deepEqual(await valores(tx, m.ana), ['PHONE 261 555-0303'])

      assert.equal(await agregarContactoCon(tx, quien, m.ana, 'PHONE', '261 555-0404'), 'guardado')
      const [primero] = await contactosDeClienteCon(tx, quien, m.ana)
      assert.ok(primero)
      assert.equal(await corregirContactoCon(tx, quien, m.ana, primero.id, '555'), 'invalido')
      assert.equal(await corregirContactoCon(tx, quien, m.ana, primero.id, '(261) 555 0404'), 'repetido')
      assert.deepEqual(await valores(tx, m.ana), ['PHONE 261 555-0303', 'PHONE 261 555-0404'])
    })
  })

  it('un contacto no se toca desde la ficha de otro cliente', async () => {
    await descartable(async (tx) => {
      const m = await sembrar(tx)
      const [otro] = await tx<{ id: string }[]>`insert into party (kind) values ('PERSON') returning id`
      assert.ok(otro)
      assert.equal(await quitarContactoCon(tx, quien, otro.id, m.importado), 'inexistente')
      assert.equal(await corregirContactoCon(tx, quien, otro.id, m.importado, '261 555-0505'), 'inexistente')
      assert.deepEqual(await valores(tx, m.ana), ['PHONE 261 555-0101'])
    })
  })

  it('quien fue dado de baja no lee ni escribe', async () => {
    await descartable(async (tx) => {
      const m = await sembrar(tx, 'OPERADOR', 'INACTIVE')
      await assert.rejects(contactosDeClienteCon(tx, quien, m.ana), AccesoDenegado)
      await assert.rejects(agregarContactoCon(tx, quien, m.ana, 'PHONE', '261 555-0202'), AccesoDenegado)
    })
  })
})
