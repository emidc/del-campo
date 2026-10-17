// El rol de la app en la base hosteada (T-0032; D-0063, R-22): `deploy/rol-app.sql` contra
// `delcampo_risk_test`, dentro de una transacción que se revierte (crear un rol y dar permisos
// también se revierte). Con ese rol, la app importa, lee y escribe lo que escribe; no puede
// actualizar, borrar ni vaciar una tabla, ni desactivar el trigger de sólo inserción, ni crear
// nada, ni leer otro esquema. `verificar` lo dice y distingue al rol administrativo.

import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { after, before, describe, it } from 'node:test'
import { fileURLToPath } from 'node:url'

import type { Sql, TransactionSql } from '../persistence/database.ts'
import { enTransaccionRevertida, openTestDatabase } from '../persistence/testing.ts'
import { puntosVerificacion, verificar } from '../persistence/verificacion.ts'
import { altaPersona } from '../persistence/acceso.ts'
import { HASH_SINTETICO } from '../persistence/fixtures.ts'
import { FECHA_CORTE, leerCarpeta, SINTETICOS } from '../testing/lotes.ts'
import { id } from '../testing/actualizacion.ts'
import { iniciarSesion, sesionVigente } from './acceso.ts'
import { registrarNovedad } from './actualizacion.ts'
import { importarLote, leerContrato } from './importar.ts'
import { vistaLista } from './vistas.ts'
import { VERSION_METODOLOGIA } from '../domain/modelo.ts'

const ARCHIVO = fileURLToPath(new URL('../../deploy/rol-app.sql', import.meta.url))

/** El archivo sin su `begin;` y `commit;`: acá ya corre dentro de una transacción que se revierte. */
const rolApp = (): string => {
  const texto = readFileSync(ARCHIVO, 'utf8')
  assert.match(texto, /^begin;$/m)
  assert.match(texto, /^commit;$/m)
  return texto.replace(/^(begin|commit);$/gm, '')
}

let sql: Sql
before(async () => {
  sql = await openTestDatabase()
})
after(async () => {
  await sql.end()
})

/** El código de error de Postgres de una sentencia que tiene que fallar. */
const codigo = async (tx: TransactionSql, sentencia: string): Promise<string> => {
  await tx.unsafe('savepoint intento')
  try {
    await tx.unsafe(sentencia)
  } catch (e) {
    await tx.unsafe('rollback to savepoint intento')
    return String((e as { code?: string }).code)
  }
  await tx.unsafe('release savepoint intento')
  return 'sin error'
}

const comoApp = async (tx: TransactionSql): Promise<void> => {
  await tx.unsafe(rolApp())
  await tx.unsafe('set local role risk_app')
}

describe('rol de la app (deploy/rol-app.sql)', () => {
  it('es idempotente y deja un rol sin atributos de administración', () =>
    enTransaccionRevertida(sql, async (tx) => {
      await tx.unsafe(rolApp())
      await tx.unsafe(rolApp())
      const [r] = await tx<{ super: boolean; bypass: boolean; roles: boolean; bases: boolean; login: boolean }[]>`
        select rolsuper as super, rolbypassrls as bypass, rolcreaterole as roles, rolcreatedb as bases, rolcanlogin as login
        from pg_roles where rolname = 'risk_app'`
      assert.deepEqual(r, { super: false, bypass: false, roles: false, bases: false, login: true })
    }))

  it('con ese rol entran la importación, el alta de una persona, el login, una vista y una novedad', () =>
    enTransaccionRevertida(sql, async (tx) => {
      await comoApp(tx)
      const r = await importarLote(tx, leerContrato(), leerCarpeta(SINTETICOS), { origen: 'test', importadoPor: 'test T-0032', fechaCorte: FECHA_CORTE })
      assert.equal(r.estado, 'importado')
      const persona = 'PER-01M50T00000000000000000001'
      await altaPersona(tx, { id: persona, nombre: 'Persona de prueba', usuario: 'prueba', hash: HASH_SINTETICO })
      assert.equal(await iniciarSesion(tx, 'prueba', 'no es la contraseña del hash de prueba'), null)
      const [c] = await tx<{ id: string }[]>`select max(id)::text as id from risk.credencial`
      const sesion = await sesionVigente(tx, persona, c?.id ?? '')
      assert.ok(sesion !== null)
      const [org] = await tx<{ o: string }[]>`select organizacion_id as o from risk.riesgo where id = ${id('S06-R01')}`
      assert.ok((await vistaLista(tx, sesion, VERSION_METODOLOGIA, org?.o ?? '')) !== null)
      const n = await registrarNovedad(tx, sesion, { riskId: id('S06-R01'), tipo: 'informacion_nueva', texto: 'Novedad sintética', evidencia: 'DOC-SINT' })
      assert.ok(n.revisionId !== null)
    }))

  it('no actualiza, borra, vacía, desactiva triggers, crea objetos ni lee otro esquema', () =>
    enTransaccionRevertida(sql, async (tx) => {
      await tx.unsafe('create table public.ajena_t0032 (x int)')
      await tx.unsafe('insert into public.ajena_t0032 values (1)')
      await comoApp(tx)
      await importarLote(tx, leerContrato(), leerCarpeta(SINTETICOS), { origen: 'test', importadoPor: 'test T-0032', fechaCorte: FECHA_CORTE })
      // 42501: permiso denegado por el rol, antes de llegar al trigger de sólo inserción.
      for (const s of [
        'update risk.riesgo set titulo = titulo', 'delete from risk.evaluacion', 'truncate risk.novedad',
        'alter table risk.riesgo disable trigger solo_insercion', "set session_replication_role = 'replica'",
        'create table risk.nueva (x int)', 'select * from public.ajena_t0032', 'insert into risk.schema_migrations (file) values (\'9999_x.sql\')',
        'create role otro_t0032',
      ]) {
        assert.equal(await codigo(tx, s), '42501', s)
      }
    }))

  it('verificar: el rol de la app cumple todo; el administrativo, no', () =>
    enTransaccionRevertida(sql, async (tx) => {
      await tx.unsafe(rolApp())
      const admin = puntosVerificacion(await verificar(tx))
      assert.ok(admin.some((p) => !p.cumple), 'el rol de los tests es dueño de las tablas: no puede cumplir')
      await tx.unsafe('set local role risk_app')
      const v = await verificar(tx)
      assert.equal(v.rol, 'risk_app')
      assert.deepEqual(puntosVerificacion(v).filter((p) => !p.cumple), [])
    }))

  it('verificar ve lo que el rol lee fuera de risk y los rastros de otro sistema', () =>
    enTransaccionRevertida(sql, async (tx) => {
      await tx.unsafe(rolApp())
      await tx.unsafe('create schema communication')
      await tx.unsafe('create table communication.message (x int)')
      await tx.unsafe('create table public.party (x int)')
      await tx.unsafe('grant select on public.party to risk_app')
      await tx.unsafe('set local role risk_app')
      const v = await verificar(tx)
      assert.equal(v.rastrosDeOtrosSistemas, 2)
      assert.deepEqual(v.leeFueraDeRisk, { public: 1 })
      const fallan = puntosVerificacion(v).filter((p) => !p.cumple).map((p) => p.punto)
      assert.deepEqual(fallan, ['no lee tablas fuera de risk', 'sin tablas de Broker OS ni de Communication OS en esta base'])
    }))

  it('verificar marca un rol de la app miembro del dueño, y rol-app.sql le saca la membresía', () =>
    enTransaccionRevertida(sql, async (tx) => {
      const [{ dueno } = { dueno: '' }] = await tx<{ dueno: string }[]>`select current_user as dueno`
      await tx.unsafe(rolApp())
      await tx.unsafe(`grant ${dueno} to risk_app`)
      await tx.unsafe('set local role risk_app')
      const v = await verificar(tx)
      assert.ok(v.miembroDe.includes(dueno), v.miembroDe.join(', '))
      assert.ok(v.duenoDe > 0)
      await tx.unsafe('reset role')
      await tx.unsafe(rolApp())
      await tx.unsafe('set local role risk_app')
      const despues = await verificar(tx)
      assert.deepEqual([despues.miembroDe, despues.duenoDe], [[], 0])
      // SET ROLE mira la membresía de quien abrió la sesión, que acá es el superusuario de los
      // tests: lo que se prueba es lo que dice el catálogo, que es lo que verificar lee.
    }))
})
