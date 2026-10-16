// Acceso por persona (D-0069) contra Postgres: login, registro del inicio de sesión, rotación y
// baja. Cada caso corre en una transacción que se revierte.

import assert from 'node:assert/strict'
import { after, before, describe, it } from 'node:test'

import { altaPersona, nuevaCredencial } from '../persistence/acceso.ts'
import type { Sql, TransactionSql } from '../persistence/database.ts'
import { enTransaccionRevertida, openTestDatabase } from '../persistence/testing.ts'
import { hashContrasena, iniciarSesion, leerHash, LARGO_MINIMO_CONTRASENA, sesionVigente, verificarContrasena } from './acceso.ts'

const PERSONA = 'PER-01M50T00000000000000000001'
const CLAVE = 'una contraseña de prueba larga'

let sql: Sql
before(async () => {
  sql = await openTestDatabase()
})
after(async () => {
  await sql.end()
})

const conPersona = (cuerpo: (tx: TransactionSql) => Promise<void>): Promise<void> =>
  enTransaccionRevertida(sql, async (tx) => {
    await altaPersona(tx, { id: PERSONA, nombre: 'Persona de prueba', usuario: 'prueba', hash: await hashContrasena(CLAVE) })
    await cuerpo(tx)
  })

const inicios = async (tx: TransactionSql): Promise<number> => {
  const [f] = await tx<{ n: number }[]>`select count(*)::int as n from risk.registro_acceso where persona_id = ${PERSONA} and tipo = 'inicio_sesion'`
  return f?.n ?? 0
}

describe('hash de contraseñas (D-0069)', () => {
  it('guarda scrypt con sal y nunca la contraseña', async () => {
    const h = await hashContrasena(CLAVE)
    assert.match(h, /^scrypt:32768:8:1:[A-Za-z0-9+/=]+:[A-Za-z0-9+/=]+$/)
    assert.ok(!h.includes(CLAVE))
    assert.notEqual(await hashContrasena(CLAVE), h, 'dos hashes de la misma contraseña tienen sal distinta')
    assert.ok(await verificarContrasena(h, CLAVE))
    assert.equal(await verificarContrasena(h, `${CLAVE}x`), false)
    assert.equal(await verificarContrasena(null, CLAVE), false)
    assert.equal(await verificarContrasena('scrypt:2:8:1:AAAA:AAAA', CLAVE), false)
  })

  it('rechaza contraseñas cortas y parámetros débiles', async () => {
    await assert.rejects(hashContrasena('x'.repeat(LARGO_MINIMO_CONTRASENA - 1)))
    assert.equal(leerHash(`scrypt:1024:8:1:${Buffer.alloc(16).toString('base64')}:${Buffer.alloc(32).toString('base64')}`), null)
  })
})

describe('inicio de sesión (D-0069; RO01 §2, Acceso)', () => {
  it('con usuario y contraseña válidos, devuelve la persona y registra el inicio', async () => {
    await conPersona(async (tx) => {
      const s = await iniciarSesion(tx, 'prueba', CLAVE)
      assert.ok(s !== null)
      assert.equal(s.personaId, PERSONA)
      assert.equal(s.nombre, 'Persona de prueba')
      assert.equal(await inicios(tx), 1)
    })
  })

  it('con contraseña o usuario inválidos, null y nada registrado', async () => {
    await conPersona(async (tx) => {
      assert.equal(await iniciarSesion(tx, 'prueba', 'otra contraseña cualquiera'), null)
      assert.equal(await iniciarSesion(tx, 'nadie', CLAVE), null)
      assert.equal(await iniciarSesion(tx, 'NO VALIDO', CLAVE), null)
      assert.equal(await inicios(tx), 0)
    })
  })

  it('una contraseña nueva invalida la sesión abierta con la anterior', async () => {
    await conPersona(async (tx) => {
      const s = await iniciarSesion(tx, 'prueba', CLAVE)
      assert.ok(s !== null)
      await nuevaCredencial(tx, PERSONA, await hashContrasena('la contraseña nueva, también larga'))
      assert.equal(await sesionVigente(tx, PERSONA, s.credencialId), null)
      assert.equal(await iniciarSesion(tx, 'prueba', CLAVE), null)
      assert.ok(await iniciarSesion(tx, 'prueba', 'la contraseña nueva, también larga'))
    })
  })

  it('la baja impide entrar e invalida la sesión', async () => {
    await conPersona(async (tx) => {
      const s = await iniciarSesion(tx, 'prueba', CLAVE)
      assert.ok(s !== null)
      await nuevaCredencial(tx, PERSONA, null)
      assert.equal(await sesionVigente(tx, PERSONA, s.credencialId), null)
      assert.equal(await iniciarSesion(tx, 'prueba', CLAVE), null)
    })
  })
})
