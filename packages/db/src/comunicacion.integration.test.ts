// T-0066 — Las tablas de mensajes en la base de Broker OS (0021_comunicacion.sql). Contra
// Postgres real, con datos sintéticos y cada caso en una transacción revertida.
//
// Requiere DATABASE_URL apuntando a una base con 0021 aplicada (`pnpm db:migrate`).

import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { after, describe, it } from 'node:test'

import postgres from 'postgres'

const RAIZ = resolve(import.meta.dirname, '..', '..', '..')

const leerEnv = (): Record<string, string> => {
  const archivo = join(RAIZ, '.env')
  if (!existsSync(archivo)) return {}
  const pares: Record<string, string> = {}
  for (const linea of readFileSync(archivo, 'utf8').split('\n')) {
    const limpia = linea.trim()
    if (limpia === '' || limpia.startsWith('#')) continue
    const corte = limpia.indexOf('=')
    if (corte === -1) continue
    pares[limpia.slice(0, corte).trim()] = limpia.slice(corte + 1).trim()
  }
  return pares
}

const databaseUrl = process.env.DATABASE_URL ?? leerEnv().DATABASE_URL
if (databaseUrl === undefined || databaseUrl === '') {
  throw new Error('DATABASE_URL no está configurada: T-0066 requiere PostgreSQL real.')
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

interface Id {
  readonly id: string
}

const uno = <T>(filas: readonly T[]): T => {
  const [fila] = filas
  if (fila === undefined) throw new Error('se esperaba una fila')
  return fila
}

const como = async (tx: postgres.TransactionSql, usuario: string): Promise<void> => {
  await tx`reset role`
  await tx`select set_config('authz.usuario_id', ${usuario}, true)`
  await tx`set local role broker_app`
}

const usuario = async (tx: postgres.TransactionSql, email: string, status: string, role: string): Promise<string> =>
  uno(
    await tx<Id[]>`
      insert into app_user (email, status, auth_provider, role) values (${email}, ${status}, 'google', ${role}) returning id
    `,
  ).id

/** Lo que deja el receptor: una entrega cruda y un entrante de un número sintético. */
const sembrar = async (tx: postgres.TransactionSql): Promise<void> => {
  await tx`insert into communication.webhook_delivery (signature, body_raw) values ('valid', '{}')`
  await tx`
    insert into communication.message (wamid, direction, phone_number_id, wa_id, profile_name, body, wa_timestamp)
    values ('wamid.SINT-1', 'inbound', '100000000000001', '5492610000001', 'Ana Sintética', 'Hola, consulta de prueba', now())
  `
}

const HASH = Buffer.alloc(32, 7)

describe('comunicación en la base de Broker OS (0021)', () => {
  it('cualquier integrante del equipo lee las conversaciones; quien está de baja, nada', async () => {
    await descartable(async (tx) => {
      const op = await usuario(tx, 'op@sintetico.test', 'ACTIVE', 'OPERADOR')
      const baja = await usuario(tx, 'baja@sintetico.test', 'INACTIVE', 'OPERADOR')
      await sembrar(tx)

      await como(tx, op)
      assert.equal((await tx`select 1 from communication.message`).length, 1)

      await como(tx, baja)
      assert.equal((await tx`select 1 from communication.message`).length, 0)
    })
  })

  it('la entrega cruda del webhook no se lee con la conexión de las personas', async () => {
    await descartable(async (tx) => {
      const op = await usuario(tx, 'op@sintetico.test', 'ACTIVE', 'OPERADOR')
      await sembrar(tx)
      await como(tx, op)
      await tx`savepoint antes`
      await assert.rejects(tx`select 1 from communication.webhook_delivery`, /permission denied/)
      await tx`rollback to savepoint antes`
    })
  })

  it('el equipo registra su respuesta a su nombre, y no puede escribir un entrante ni firmar por otro', async () => {
    await descartable(async (tx) => {
      const op = await usuario(tx, 'op@sintetico.test', 'ACTIVE', 'OPERADOR')
      const otro = await usuario(tx, 'op2@sintetico.test', 'ACTIVE', 'OPERADOR')
      await sembrar(tx)
      await como(tx, op)

      const intento = uno(
        await tx<Id[]>`
          insert into communication.outbound_attempt (idempotency_key, phone_number_id, wa_id, body, body_sha256, sent_by_user_id)
          values (gen_random_uuid(), '100000000000001', '5492610000001', 'Respuesta de prueba', ${HASH}, ${op})
          returning id
        `,
      ).id
      const saliente = uno(
        await tx<Id[]>`
          insert into communication.message (wamid, direction, phone_number_id, wa_id, body, wa_timestamp)
          values ('wamid.SINT-2', 'outbound', '100000000000001', '5492610000001', 'Respuesta de prueba', now())
          returning id
        `,
      ).id
      await tx`
        update communication.outbound_attempt
        set state = 'accepted', wamid = 'wamid.SINT-2', message_id = ${saliente}, body = null, settled_at = now()
        where id = ${intento}
      `
      assert.equal((await tx`select 1 from communication.outbound_attempt where state = 'accepted'`).length, 1)

      await tx`savepoint entrante`
      await assert.rejects(
        tx`
          insert into communication.message (wamid, direction, phone_number_id, wa_id, body, wa_timestamp)
          values ('wamid.SINT-3', 'inbound', '100000000000001', '5492610000001', 'Falso entrante', now())
        `,
        /row-level security/,
      )
      await tx`rollback to savepoint entrante`

      await tx`savepoint ajeno`
      await assert.rejects(
        tx`
          insert into communication.outbound_attempt (idempotency_key, phone_number_id, wa_id, body, body_sha256, sent_by_user_id)
          values (gen_random_uuid(), '100000000000001', '5492610000001', 'A nombre de otro', ${HASH}, ${otro})
        `,
        /row-level security/,
      )
      await tx`rollback to savepoint ajeno`
    })
  })
})
