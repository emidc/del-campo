// T-0060 — Usuarios del equipo desde la app, contra Postgres real con datos sintéticos;
// cada caso corre en una transacción que se revierte.

import assert from 'node:assert/strict'
import { after, describe, it } from 'node:test'

import postgres from 'postgres'

import type { Principal } from '../session/admission.ts'
import { ingresar } from './base.ts'
import { cambiarEmailDelEquipoCon, darDeBajaDelEquipoCon, invitarAlEquipoCon, leerEquipo } from './usuarios.ts'

const databaseUrl = process.env.DATABASE_URL
if (databaseUrl === undefined || databaseUrl === '') {
  throw new Error('DATABASE_URL no está configurada: T-0060 requiere PostgreSQL real.')
}

const sql = postgres(databaseUrl, { max: 1, prepare: false, onnotice: () => undefined })

after(async () => {
  await sql.end()
})

class Rollback extends Error {}

const descartable = async <T>(accion: (tx: postgres.TransactionSql) => Promise<T>): Promise<T> => {
  let resultado: T | undefined
  try {
    await sql.begin(async (tx) => {
      resultado = await accion(tx)
      throw new Rollback('descartar')
    })
  } catch (error) {
    if (!(error instanceof Rollback)) throw error
  }
  return resultado as T
}

const principal = (sub: string): Principal => ({ sub, email: `${sub}@sintetico.test`, displayName: null })

const usuario = async (tx: postgres.TransactionSql, sub: string, rol: string): Promise<string> => {
  const [fila] = await tx<{ id: string }[]>`
    insert into app_user (email, status, auth_provider, role)
    values (${`${sub}@sintetico.test`}, 'ACTIVE', 'google', ${rol}) returning id
  `
  if (fila === undefined) throw new Error('sin usuario')
  await tx`insert into user_credential (user_id, provider, subject) values (${fila.id}, 'google', ${sub})`
  return fila.id
}

describe('usuarios del equipo desde la app', () => {
  it('un Administrador invita y da de baja, y el equipo lo ve en la lista', async () => {
    const r = await descartable(async (tx) => {
      await usuario(tx, 'sub-admin', 'ADMINISTRADOR')
      const op = await usuario(tx, 'sub-op', 'OPERADOR')
      const invitacion = await invitarAlEquipoCon(tx, principal('sub-admin'), 'Nueva@Sintetico.test')
      const repetida = await invitarAlEquipoCon(tx, principal('sub-admin'), 'nueva@sintetico.test')
      const baja = await darDeBajaDelEquipoCon(tx, principal('sub-admin'), op)
      const visto = await leerEquipo(tx, principal('sub-admin'))
      return { invitacion, repetida, baja, visto }
    })
    assert.equal(r.invitacion, null)
    assert.equal(r.repetida, 'YA_EXISTE')
    assert.equal(r.baja, null)
    assert.equal(r.visto.administro, true)
    const estados = new Map(r.visto.usuarios.map((u) => [u.email, u.estado]))
    assert.equal(estados.get('nueva@sintetico.test'), 'INVITED')
    assert.equal(estados.get('sub-op@sintetico.test'), 'INACTIVE')
    assert.equal(estados.get('sub-admin@sintetico.test'), 'ACTIVE')
  })

  it('quien no es Administrador ve la lista pero no invita ni da de baja', async () => {
    const r = await descartable(async (tx) => {
      const admin = await usuario(tx, 'sub-admin', 'ADMINISTRADOR')
      await usuario(tx, 'sub-op', 'OPERADOR')
      return {
        invitacion: await invitarAlEquipoCon(tx, principal('sub-op'), 'otra@sintetico.test'),
        baja: await darDeBajaDelEquipoCon(tx, principal('sub-op'), admin),
        visto: await leerEquipo(tx, principal('sub-op')),
      }
    })
    assert.equal(r.invitacion, 'ACTOR_NO_AUTORIZADO')
    assert.equal(r.baja, 'ACTOR_NO_AUTORIZADO')
    assert.equal(r.visto.administro, false)
    assert.ok(r.visto.usuarios.some((u) => u.email === 'sub-admin@sintetico.test' && u.administra))
  })

  it('el único Administrador no se puede dar de baja a sí mismo', async () => {
    const r = await descartable(async (tx) => {
      const admin = await usuario(tx, 'sub-admin', 'ADMINISTRADOR')
      return darDeBajaDelEquipoCon(tx, principal('sub-admin'), admin)
    })
    assert.equal(r, 'ULTIMO_ADMINISTRADOR')
  })

  it('un Administrador corrige el correo de una invitada y ella entra con el nuevo', async () => {
    const google = (sujeto: string, email: string) =>
      ({ proveedor: 'google', sujeto, email, emailVerificado: true, nombre: null }) as const
    const r = await descartable(async (tx) => {
      await usuario(tx, 'sub-admin', 'ADMINISTRADOR')
      await invitarAlEquipoCon(tx, principal('sub-admin'), 'mal@sintetico.test')
      const [invitada] = await tx<{ id: string }[]>`select id from app_user where email = 'mal@sintetico.test'`
      if (invitada === undefined) throw new Error('sin invitada')
      const cambio = await cambiarEmailDelEquipoCon(tx, principal('sub-admin'), invitada.id, ' Bien@Sintetico.test ')
      const conViejo = await ingresar(tx, google('sub-x', 'mal@sintetico.test'))
      const conNuevo = await ingresar(tx, google('sub-bien', 'bien@sintetico.test'))
      const yaActiva = await cambiarEmailDelEquipoCon(tx, principal('sub-admin'), invitada.id, 'otro@sintetico.test')
      const [fila] = await tx<{ email: string; status: string }[]>`select email, status from app_user where id = ${invitada.id}`
      return { cambio, conViejo: conViejo.tipo, conNuevo: conNuevo.tipo, yaActiva, fila }
    })
    assert.equal(r.cambio, null)
    assert.equal(r.conViejo, 'RECHAZA')
    assert.equal(r.conNuevo, 'VINCULA')
    assert.equal(r.yaActiva, 'YA_ACTIVO')
    assert.deepEqual(r.fila, { email: 'bien@sintetico.test', status: 'ACTIVE' })
  })

  it('el correo nuevo tiene que ser válido, no estar en uso y lo cambia sólo un Administrador', async () => {
    const r = await descartable(async (tx) => {
      await usuario(tx, 'sub-admin', 'ADMINISTRADOR')
      await usuario(tx, 'sub-op', 'OPERADOR')
      await invitarAlEquipoCon(tx, principal('sub-admin'), 'una@sintetico.test')
      await invitarAlEquipoCon(tx, principal('sub-admin'), 'otra@sintetico.test')
      const [una] = await tx<{ id: string }[]>`select id from app_user where email = 'una@sintetico.test'`
      if (una === undefined) throw new Error('sin invitada')
      const admin = principal('sub-admin')
      return {
        invalido: await cambiarEmailDelEquipoCon(tx, admin, una.id, 'sin-arroba'),
        sinDominio: await cambiarEmailDelEquipoCon(tx, admin, una.id, 'a@b'),
        deOtraInvitada: await cambiarEmailDelEquipoCon(tx, admin, una.id, 'OTRA@sintetico.test'),
        deUnaActiva: await cambiarEmailDelEquipoCon(tx, admin, una.id, 'sub-op@sintetico.test'),
        noAdmin: await cambiarEmailDelEquipoCon(tx, principal('sub-op'), una.id, 'nueva@sintetico.test'),
        mismo: await cambiarEmailDelEquipoCon(tx, admin, una.id, 'una@sintetico.test'),
      }
    })
    assert.deepEqual(r, {
      invalido: 'EMAIL_INVALIDO',
      sinDominio: 'EMAIL_INVALIDO',
      deOtraInvitada: 'YA_EXISTE',
      deUnaActiva: 'YA_EXISTE',
      noAdmin: 'ACTOR_NO_AUTORIZADO',
      mismo: null,
    })
  })
})
