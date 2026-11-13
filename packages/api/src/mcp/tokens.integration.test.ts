// T-0062 — Token personal del MCP, contra Postgres real con datos sintéticos; cada caso
// corre en una transacción que se revierte. Requiere DATABASE_URL con 0019 aplicada.

import assert from 'node:assert/strict'
import { after, describe, it } from 'node:test'

import postgres from 'postgres'

import type { Principal } from '../session/admission.ts'
import { crearTokenMcp, resolverTokenMcp, revocarTokenMcp, tokenMcpVigente } from './tokens.ts'

const databaseUrl = process.env.DATABASE_URL
if (databaseUrl === undefined || databaseUrl === '') {
  throw new Error('DATABASE_URL no está configurada: T-0062 requiere PostgreSQL real.')
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

const usuario = async (tx: postgres.TransactionSql, sub: string, status = 'ACTIVE'): Promise<string> => {
  const [fila] = await tx<{ id: string }[]>`
    insert into app_user (email, status, auth_provider, role)
    values (${`${sub}@sintetico.test`}, ${status}, 'google', 'OPERADOR') returning id
  `
  if (fila === undefined) throw new Error('sin usuario')
  await tx`insert into user_credential (user_id, provider, subject) values (${fila.id}, 'google', ${sub})`
  return fila.id
}

describe('token personal del MCP', () => {
  it('el token generado resuelve a su persona, y en la base sólo queda el hash', async () => {
    const r = await descartable(async (tx) => {
      const id = await usuario(tx, 'sub-mcp')
      const token = await crearTokenMcp(tx, principal('sub-mcp'))
      const guardados = await tx<{ token_hash: string }[]>`select token_hash from mcp_token where user_id = ${id}`
      return { id, token, guardados, titular: await resolverTokenMcp(tx, token), desde: await tokenMcpVigente(tx, principal('sub-mcp')) }
    })
    assert.match(r.token, /^bos_[\w-]{43}$/)
    assert.equal(r.guardados.length, 1)
    assert.notEqual(r.guardados[0]?.token_hash, r.token)
    assert.deepEqual(r.titular, { usuarioId: r.id, principal: principal('sub-mcp') })
    assert.ok(r.desde instanceof Date)
  })

  it('generar uno nuevo deja sin efecto el anterior', async () => {
    const r = await descartable(async (tx) => {
      await usuario(tx, 'sub-mcp')
      const viejo = await crearTokenMcp(tx, principal('sub-mcp'))
      const nuevo = await crearTokenMcp(tx, principal('sub-mcp'))
      return { viejo: await resolverTokenMcp(tx, viejo), nuevo: await resolverTokenMcp(tx, nuevo) }
    })
    assert.equal(r.viejo, null)
    assert.notEqual(r.nuevo, null)
  })

  it('un token revocado, uno inventado y el de una persona dada de baja no resuelven', async () => {
    const r = await descartable(async (tx) => {
      const id = await usuario(tx, 'sub-mcp')
      const revocado = await crearTokenMcp(tx, principal('sub-mcp'))
      await revocarTokenMcp(tx, principal('sub-mcp'))
      const deBaja = await crearTokenMcp(tx, principal('sub-mcp'))
      await tx`update app_user set status = 'INACTIVE' where id = ${id}`
      return {
        revocado: await resolverTokenMcp(tx, revocado),
        inventado: await resolverTokenMcp(tx, `bos_${'x'.repeat(43)}`),
        sinPrefijo: await resolverTokenMcp(tx, 'x'.repeat(47)),
        deBaja: await resolverTokenMcp(tx, deBaja),
        vigente: await tokenMcpVigente(tx, principal('sub-otro')),
      }
    })
    assert.deepEqual(r, { revocado: null, inventado: null, sinPrefijo: null, deBaja: null, vigente: null })
  })

  it('quien no tiene acceso a Broker OS no puede generar un token', async () => {
    await assert.rejects(
      descartable(async (tx) => {
        await usuario(tx, 'sub-baja', 'INACTIVE')
        return crearTokenMcp(tx, principal('sub-baja'))
      }),
      /acceso denegado/,
    )
  })
})
