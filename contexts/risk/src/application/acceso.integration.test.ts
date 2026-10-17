// Acceso por persona (D-0069) contra Postgres: login, registro del inicio de sesión, rotación y
// baja. Cada caso corre en una transacción que se revierte.

import assert from 'node:assert/strict'
import { after, before, describe, it } from 'node:test'

import { altaPersona, nuevaCredencial } from '../persistence/acceso.ts'
import type { Sql, TransactionSql } from '../persistence/database.ts'
import { conBaseTemporal, enTransaccionRevertida, openTestDatabase } from '../persistence/testing.ts'
import {
  hashContrasena, huellaUsuario, iniciarSesion, leerHash, LARGO_MINIMO_CONTRASENA, LOGIN_MAXIMO_FALLIDOS, LOGIN_VENTANA_MINUTOS, sesionVigente,
  verificarContrasena,
} from './acceso.ts'

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

describe('límite de intentos de login (D-0069, T-0032)', () => {
  const fallidos = async (tx: TransactionSql): Promise<{ usuario_huella: string }[]> =>
    tx<{ usuario_huella: string }[]>`select usuario_huella from risk.login_fallido order by id`

  it('cada fallido deja la huella del usuario tipeado y nunca el texto; un login válido no deja nada', async () => {
    await conPersona(async (tx) => {
      assert.ok(await iniciarSesion(tx, 'prueba', CLAVE))
      assert.equal((await fallidos(tx)).length, 0)
      await iniciarSesion(tx, 'prueba', 'otra contraseña cualquiera')
      await iniciarSesion(tx, CLAVE, CLAVE)
      const f = await fallidos(tx)
      assert.deepEqual(f.map((x) => x.usuario_huella), [huellaUsuario('prueba'), huellaUsuario(CLAVE)])
      const [todo] = await tx<{ t: string }[]>`select string_agg(t::text, ' ') as t from risk.login_fallido t`
      assert.ok(!(todo?.t ?? '').includes('prueba') && !(todo?.t ?? '').includes(CLAVE))
    })
  })

  it(`con ${String(LOGIN_MAXIMO_FALLIDOS)} fallidos en la ventana, el usuario no entra ni con la contraseña correcta, y el bloqueado no suma`, async () => {
    await conPersona(async (tx) => {
      for (let i = 0; i < LOGIN_MAXIMO_FALLIDOS; i++) assert.equal(await iniciarSesion(tx, 'prueba', `intento ${String(i)} equivocado`), null)
      assert.equal(await iniciarSesion(tx, 'prueba', CLAVE), null)
      assert.equal(await inicios(tx), 0)
      assert.equal((await fallidos(tx)).length, LOGIN_MAXIMO_FALLIDOS, 'un intento bloqueado no se registra')
      // Otro usuario, existente o no, sigue igual.
      await altaPersona(tx, { id: 'PER-01M50T00000000000000000002', nombre: 'Otra persona', usuario: 'otra', hash: await hashContrasena(CLAVE) })
      assert.ok(await iniciarSesion(tx, 'otra', CLAVE))
    })
  })

  it('los fallidos más viejos que la ventana no cuentan', async () => {
    await conPersona(async (tx) => {
      for (let i = 0; i < LOGIN_MAXIMO_FALLIDOS; i++) {
        await tx`insert into risk.login_fallido (usuario_huella, ocurrido_en)
                 values (${huellaUsuario('prueba')}, now() - make_interval(mins => ${LOGIN_VENTANA_MINUTOS + 1}))`
      }
      assert.ok(await iniciarSesion(tx, 'prueba', CLAVE))
    })
  })

  it('un usuario que no existe también se bloquea: el bloqueo no dice cuáles existen', async () => {
    await conPersona(async (tx) => {
      for (let i = 0; i < LOGIN_MAXIMO_FALLIDOS + 3; i++) await iniciarSesion(tx, 'nadie', CLAVE)
      assert.equal((await fallidos(tx)).length, LOGIN_MAXIMO_FALLIDOS)
    })
  })

  it('los intentos en paralelo de un mismo usuario esperan su turno: el límite corta también una ráfaga', () =>
    conBaseTemporal('delcampo_risk_login_t0032_test', async (base) => {
      const r = await Promise.all(Array.from({ length: 3 * LOGIN_MAXIMO_FALLIDOS }, () => iniciarSesion(base, 'rafaga', 'no es la contraseña')))
      assert.ok(r.every((x) => x === null))
      // Sólo los primeros LOGIN_MAXIMO_FALLIDOS llegan a comparar y quedan registrados; el resto ve el bloqueo.
      const [n] = await base<{ n: number }[]>`select count(*)::int as n from risk.login_fallido where usuario_huella = ${huellaUsuario('rafaga')}`
      assert.equal(n?.n, LOGIN_MAXIMO_FALLIDOS)
    }))
})
