// Registro persistente de `jti` (T-0035, migración 0006) contra Postgres: una sola aceptación
// por (emisor, jti), aunque dos instancias reciban el mismo token a la vez.
//
// Las pruebas de carrera confirman de verdad, con transacciones en conexiones distintas.
// `truncateAll` no vacía la tabla: cada prueba usa un `jti` nuevo, así que lo que queda no
// cambia ninguna otra.

import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { after, before, describe, it } from 'node:test'
import { setTimeout as esperar } from 'node:timers/promises'

import type { Sql, TransactionSql } from './database.ts'
import { registrarJti, registroJtiPostgres, type UsoJti } from './jti.ts'
import { openTestDatabase } from './testing.ts'

const AHORA = 1_900_000_000
const uso = (cambios: Partial<UsoJti> = {}): UsoJti => ({ emisor: 'broker-os', jti: randomUUID(), venceEn: AHORA + 60, ahora: AHORA, ...cambios })

let sql: Sql
before(async () => {
  sql = await openTestDatabase()
})
after(async () => {
  await sql.end()
})

class Revertir extends Error {}
const enTransaccionRevertida = async (cuerpo: (tx: TransactionSql) => Promise<void>): Promise<void> => {
  await assert.rejects(sql.begin(async (tx) => {
    await cuerpo(tx)
    throw new Revertir()
  }), Revertir)
}

const hayEsperandoLock = async (): Promise<void> => {
  for (let i = 0; i < 200; i++) {
    const [f] = await sql<{ n: number }[]>`
      select count(*)::int as n from pg_stat_activity
      where datname = current_database() and wait_event_type = 'Lock' and query like '%registrar_jti%'`
    if ((f?.n ?? 0) > 0) return
    await esperar(10)
  }
  throw new Error('ninguna inserción quedó esperando el lock')
}

const codigo = async (tx: TransactionSql, sentencia: () => Promise<unknown>): Promise<string> => {
  await tx.unsafe('savepoint intento')
  try {
    await sentencia()
  } catch (e) {
    await tx.unsafe('rollback to savepoint intento')
    return String((e as { code?: string }).code)
  }
  await tx.unsafe('release savepoint intento')
  return 'sin error'
}

describe('registro de jti en la base de Communication OS', () => {
  it('acepta cada jti una sola vez por emisor, y guarda su vencimiento', async () => {
    await enTransaccionRevertida(async (tx) => {
      const u = uso()
      assert.equal(await registrarJti(tx, u), true)
      assert.equal(await registrarJti(tx, { ...u, ahora: AHORA + 30 }), false)
      // Broker OS y Risk OS emiten los dos hacia Communication OS: el jti es único por emisor.
      assert.equal(await registrarJti(tx, { ...u, emisor: 'risk-os' }), true)
      const [f] = await tx<{ vence: Date }[]>`select vence_en as vence from communication.jti_aceptado where emisor = 'broker-os' and jti = ${u.jti}`
      assert.equal(f?.vence.getTime(), (AHORA + 60) * 1000)
    })
  })

  it('carrera: dos instancias con el mismo token a la vez, sólo una lo acepta', async () => {
    const u = uso()
    let segunda: Promise<boolean> | undefined
    const primera = await sql.begin(async (a) => {
      const ok = await registrarJti(a, u)
      segunda = sql.begin((b) => registrarJti(b, u))
      await hayEsperandoLock()
      return ok
    })
    assert.equal(primera, true)
    assert.equal(await segunda, false)
  })

  it('carrera: si la primera se revierte, la que esperaba lo acepta', async () => {
    const u = uso()
    let segunda: Promise<boolean> | undefined
    await assert.rejects(sql.begin(async (a) => {
      assert.equal(await registrarJti(a, u), true)
      segunda = sql.begin((b) => registrarJti(b, u))
      await hayEsperandoLock()
      throw new Error('revertir la primera')
    }), /revertir la primera/)
    assert.equal(await segunda, true)
  })

  it('ráfaga: muchas aceptaciones simultáneas del mismo token, una sola pasa', async () => {
    const u = uso()
    const resultados = await Promise.all(Array.from({ length: 20 }, () => registroJtiPostgres(sql).registrar(u)))
    assert.equal(resultados.filter(Boolean).length, 1)
  })

  it('con el pool, el jti queda registrado aunque la acción del pedido se revierta', async () => {
    const u = uso()
    const registro = registroJtiPostgres(sql)
    await assert.rejects(sql.begin(async () => {
      assert.equal(await registro.registrar(u), true)
      throw new Error('la acción falló')
    }), /la acción falló/)
    assert.equal(await registro.registrar(u), false)
  })

  it('purga: cada registro borra los jti vencidos hace más de 10 minutos y deja los demás', async () => {
    await enTransaccionRevertida(async (tx) => {
      const viejo = randomUUID()
      const reciente = randomUUID()
      await tx`insert into communication.jti_aceptado (emisor, jti, vence_en) values
        ('broker-os', ${viejo}, now() - interval '11 minutes'), ('broker-os', ${reciente}, now() - interval '9 minutes')`
      const u = uso()
      assert.equal(await registrarJti(tx, u), true)
      const quedan = await tx<{ jti: string }[]>`select jti from communication.jti_aceptado where jti in (${viejo}, ${reciente}, ${u.jti}) order by jti`
      assert.deepEqual(quedan.map((f) => f.jti), [reciente, u.jti].sort())
    })
  })

  it('communication_app no lee, no escribe, no borra ni ejecuta el registro', async () => {
    await enTransaccionRevertida(async (tx) => {
      await tx.unsafe('set local role communication_app')
      assert.equal(await codigo(tx, () => tx`select 1 from communication.jti_aceptado`), '42501')
      assert.equal(await codigo(tx, () => tx`delete from communication.jti_aceptado`), '42501')
      assert.equal(await codigo(tx, () => registrarJti(tx, uso())), '42501')
    })
  })

  it('con una transacción no se construye: el registro es el del pool', async () => {
    await enTransaccionRevertida((tx) => {
      assert.throws(() => registroJtiPostgres(tx as unknown as Sql), /con el pool/)
      return Promise.resolve()
    })
  })
})
