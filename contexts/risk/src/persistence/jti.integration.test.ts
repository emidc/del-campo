// Registro persistente de `jti` (T-0035, migración 0009) contra Postgres: una sola aceptación
// por (emisor, jti), aunque dos instancias reciban el mismo token a la vez.
//
// Las pruebas de carrera tienen que confirmar de verdad, con transacciones en conexiones
// distintas: corren en una base temporal (`conBaseTemporal`), porque delcampo_risk_test no se
// vacía y la tabla es de sólo inserción.

import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { after, before, describe, it } from 'node:test'
import { setTimeout as esperar } from 'node:timers/promises'
import { fileURLToPath } from 'node:url'

import type { Sql, TransactionSql } from './database.ts'
import { registrarJti, registroJtiPostgres, type UsoJti } from './jti.ts'
import { conBaseTemporal, enTransaccionRevertida, openTestDatabase } from './testing.ts'

const AHORA = 1_900_000_000
const uso = (cambios: Partial<UsoJti> = {}): UsoJti => ({ emisor: 'broker-os', jti: randomUUID(), venceEn: AHORA + 60, ahora: AHORA, ...cambios })

let sql: Sql
before(async () => {
  sql = await openTestDatabase()
})
after(async () => {
  await sql.end()
})

/** Espera a que alguna sentencia de la base esté bloqueada esperando un lock. */
const hayEsperandoLock = async (db: Sql): Promise<void> => {
  for (let i = 0; i < 200; i++) {
    const [f] = await db<{ n: number }[]>`
      select count(*)::int as n from pg_stat_activity
      where datname = current_database() and wait_event_type = 'Lock' and query like '%jti_aceptado%'`
    if ((f?.n ?? 0) > 0) return
    await esperar(10)
  }
  throw new Error('ninguna inserción quedó esperando el lock')
}

/** El código de error de Postgres de una sentencia que tiene que fallar. */
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

describe('registro de jti en la base de Risk OS', () => {
  it('acepta cada jti una sola vez por emisor, y guarda su vencimiento', async () => {
    await enTransaccionRevertida(sql, async (tx) => {
      const u = uso()
      assert.equal(await registrarJti(tx, u), true)
      assert.equal(await registrarJti(tx, u), false)
      // El mismo jti de otro emisor es otro token: un emisor no quema los jti de otro.
      assert.equal(await registrarJti(tx, { ...u, emisor: 'communication-os' }), true)
      const [f] = await tx<{ vence: Date }[]>`select vence_en as vence from risk.jti_aceptado where emisor = 'broker-os' and jti = ${u.jti}`
      assert.equal(f?.vence.getTime(), (AHORA + 60) * 1000)
    })
  })

  it('carrera: dos instancias con el mismo token a la vez, sólo una lo acepta', async () => {
    await conBaseTemporal('delcampo_risk_jti_carrera_test', async (base) => {
      const u = uso()
      let segunda: Promise<boolean> | undefined
      const primera = await base.begin(async (a) => {
        const ok = await registrarJti(a, u)
        // La segunda instancia inserta la misma clave mientras la primera no confirmó: espera.
        segunda = base.begin((b) => registrarJti(b, u))
        await hayEsperandoLock(base)
        return ok
      })
      assert.equal(primera, true)
      assert.equal(await segunda, false)
    })
  })

  it('carrera: si la primera se revierte, la que esperaba lo acepta (un rechazo no quema el jti)', async () => {
    await conBaseTemporal('delcampo_risk_jti_revierte_test', async (base) => {
      const u = uso()
      let segunda: Promise<boolean> | undefined
      await assert.rejects(base.begin(async (a) => {
        assert.equal(await registrarJti(a, u), true)
        segunda = base.begin((b) => registrarJti(b, u))
        await hayEsperandoLock(base)
        throw new Error('revertir la primera')
      }), /revertir la primera/)
      assert.equal(await segunda, true)
    })
  })

  it('ráfaga: muchas aceptaciones simultáneas del mismo token, una sola pasa', async () => {
    await conBaseTemporal('delcampo_risk_jti_rafaga_test', async (base) => {
      const u = uso()
      const resultados = await Promise.all(Array.from({ length: 20 }, () => registroJtiPostgres(base).registrar(u)))
      assert.equal(resultados.filter(Boolean).length, 1)
      const [f] = await base<{ n: number }[]>`select count(*)::int as n from risk.jti_aceptado where jti = ${u.jti}`
      assert.equal(f?.n, 1)
    })
  })

  it('con el pool, el jti queda registrado aunque la acción del pedido se revierta', async () => {
    await conBaseTemporal('delcampo_risk_jti_pool_test', async (base) => {
      const u = uso()
      const registro = registroJtiPostgres(base)
      await assert.rejects(base.begin(async () => {
        assert.equal(await registro.registrar(u), true)
        throw new Error('la acción falló')
      }), /la acción falló/)
      assert.equal(await registro.registrar(u), false)
    })
  })

  it('no se actualiza ni se borra: sólo inserción', async () => {
    await enTransaccionRevertida(sql, async (tx) => {
      const u = uso()
      await registrarJti(tx, u)
      assert.equal(await codigo(tx, () => tx`delete from risk.jti_aceptado where jti = ${u.jti}`), '23001')
      assert.equal(await codigo(tx, () => tx`update risk.jti_aceptado set vence_en = now() where jti = ${u.jti}`), '23001')
    })
  })

  it('risk_app registra; risk_persona no lee ni escribe el registro', async () => {
    const rolApp = readFileSync(fileURLToPath(new URL('../../deploy/rol-app.sql', import.meta.url)), 'utf8').replace(/^(begin|commit);$/gm, '')
    await enTransaccionRevertida(sql, async (tx) => {
      await tx.unsafe(rolApp)
      await tx.unsafe('set local role risk_app')
      const u = uso()
      assert.equal(await registrarJti(tx, u), true)
      assert.equal(await registrarJti(tx, u), false)
      await tx.unsafe('reset role')
      await tx.unsafe('set local role risk_persona')
      assert.equal(await codigo(tx, () => tx`select 1 from risk.jti_aceptado`), '42501')
      assert.equal(await codigo(tx, () => registrarJti(tx, uso())), '42501')
    })
  })

  it('sin legado_risk_app, risk_app sigue registrando con su política propia', async () => {
    const rolApp = readFileSync(fileURLToPath(new URL('../../deploy/rol-app.sql', import.meta.url)), 'utf8').replace(/^(begin|commit);$/gm, '')
    await enTransaccionRevertida(sql, async (tx) => {
      await tx.unsafe(rolApp)
      await tx.unsafe('drop policy legado_risk_app on risk.jti_aceptado')
      await tx.unsafe('set local role risk_app')
      const u = uso()
      assert.equal(await registrarJti(tx, u), true)
      assert.equal(await registrarJti(tx, u), false)
    })
  })

  it('con una transacción no se construye: el registro es el del pool', async () => {
    await enTransaccionRevertida(sql, (tx) => {
      assert.throws(() => registroJtiPostgres(tx as unknown as Sql), /con el pool/)
      return Promise.resolve()
    })
  })
})
