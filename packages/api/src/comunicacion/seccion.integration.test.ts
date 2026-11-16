// T-0066 — La sección Comunicación como la ve el equipo: por `conDatos`, como `broker_app`,
// con RLS decidiendo. Contra Postgres real, con datos sintéticos y cada caso en una
// transacción revertida. Requiere DATABASE_URL con 0021 aplicada.

import assert from 'node:assert/strict'
import { after, describe, it } from 'node:test'

import postgres from 'postgres'

import { AccesoDenegado } from '../acceso/datos.ts'
import type { Principal } from '../session/admission.ts'
import type { SendOutcome } from './integration/cloud-api.ts'
import { conversacionesCon, responderCon, type EnvioConfigurado } from './seccion.ts'

const databaseUrl = process.env.DATABASE_URL
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

const principal = (sub: string): Principal => ({ sub, email: `${sub}@sintetico.test`, displayName: null })

const NUMERO = '800000000000001'
const KEY = '00000000-0000-4000-8000-000000000001'

interface Mundo {
  readonly ana: string
  readonly usuario: string
}

/** Ana tiene cargado el teléfono como lo escribiría alguien; escribieron ella y un desconocido. */
const sembrar = async (tx: postgres.TransactionSql, estado = 'ACTIVE'): Promise<Mundo> => {
  const [ana] = await tx<{ id: string }[]>`insert into party (kind) values ('PERSON') returning id`
  const [usuario] = await tx<{ id: string }[]>`
    insert into app_user (email, status, auth_provider, role)
    values ('sub-com@sintetico.test', ${estado}, 'google', 'OPERADOR') returning id`
  if (ana === undefined || usuario === undefined) throw new Error('sin semilla')
  await tx`insert into user_credential (user_id, provider, subject) values (${usuario.id}, 'google', 'sub-com')`
  await tx`insert into person_profile (party_id, first_name, last_name) values (${ana.id}, 'Ana', 'Sintética')`
  await tx`
    insert into contact_point (party_id, channel, value, normalized_value)
    values (${ana.id}, 'PHONE', '+54 9 261 555-0101', '+54 9 261 555-0101'),
           (${ana.id}, 'PHONE', '4250101', '4250101')`
  await tx`
    insert into communication.message (wamid, direction, phone_number_id, wa_id, profile_name, body, wa_timestamp)
    values ('wamid.SINT-1', 'inbound', ${NUMERO}, '5492615550101', 'Ana', 'Hola, consulta sintética.', now() - interval '1 hour'),
           ('wamid.SINT-2', 'inbound', ${NUMERO}, '5492615550999', 'Desconocido', 'Quiero cotizar.', now() - interval '2 hours')`
  return { ana: ana.id, usuario: usuario.id }
}

const envio = (outcome: SendOutcome, enviados: string[]): EnvioConfigurado => ({
  phoneNumberId: NUMERO,
  send: (to, body) => {
    enviados.push(`${to}: ${body}`)
    return Promise.resolve(outcome)
  },
})

describe('sección Comunicación (T-0066)', () => {
  it('el equipo ve las conversaciones, vinculadas al cliente cuyo teléfono coincide', async () => {
    await descartable(async (tx) => {
      const m = await sembrar(tx)
      const todas = await conversacionesCon(tx, principal('sub-com'))
      assert.deepEqual(
        todas.conversaciones.map((c) => [c.profileName, c.waIdLast4, c.clientes]),
        [
          ['Ana', '0101', [{ partyId: m.ana, name: 'Ana Sintética' }]],
          ['Desconocido', '0999', []],
        ],
      )
      const deAna = await conversacionesCon(tx, principal('sub-com'), m.ana)
      assert.deepEqual(deAna.conversaciones.map((c) => c.profileName), ['Ana'])
    })
  })

  it('quien fue dado de baja no ve nada', async () => {
    await descartable(async (tx) => {
      await sembrar(tx, 'INACTIVE')
      await assert.rejects(conversacionesCon(tx, principal('sub-com')), AccesoDenegado)
    })
  })

  it('una respuesta sale una vez, queda en el hilo y a nombre de quien la escribió', async () => {
    await descartable(async (tx) => {
      const m = await sembrar(tx)
      const [conv] = (await conversacionesCon(tx, principal('sub-com'))).conversaciones
      assert.ok(conv)
      const enviados: string[] = []
      const pedido = { idempotencyKey: KEY, conversationId: conv.id, body: 'Respuesta sintética' }
      const sender = envio({ kind: 'accepted', wamid: 'wamid.SINT-OUT' }, enviados)

      const primero = await responderCon(tx, principal('sub-com'), sender, pedido)
      assert.equal(primero.kind, 'sent')
      // La misma clave no vuelve a enviar.
      assert.equal((await responderCon(tx, principal('sub-com'), sender, pedido)).kind, 'sent')
      assert.deepEqual(enviados, ['5492615550101: Respuesta sintética'])

      const intentos = await tx<{ state: string; autor: string; body: string | null }[]>`
        select state, sent_by_user_id as autor, body from communication.outbound_attempt`
      assert.deepEqual([...intentos], [{ state: 'accepted', autor: m.usuario, body: null }])
      const salientes = await tx<{ body: string }[]>`select body from communication.message where direction = 'outbound'`
      assert.deepEqual(salientes.map((s) => s.body), ['Respuesta sintética'])
    })
  })

  it('un rechazo de WhatsApp queda registrado y no deja mensaje', async () => {
    await descartable(async (tx) => {
      await sembrar(tx)
      const [conv] = (await conversacionesCon(tx, principal('sub-com'))).conversaciones
      assert.ok(conv)
      const r = await responderCon(tx, principal('sub-com'), envio({ kind: 'rejected', code: 131047, title: 'fuera de ventana' }, []), {
        idempotencyKey: KEY, conversationId: conv.id, body: 'Respuesta sintética',
      })
      assert.equal(r.kind, 'rejected')
      const [intento] = await tx<{ state: string; error_code: number }[]>`select state, error_code from communication.outbound_attempt`
      assert.deepEqual({ ...intento }, { state: 'rejected', error_code: 131047 })
      assert.equal((await tx`select 1 from communication.message where direction = 'outbound'`).length, 0)
    })
  })

  it('sin envío configurado no se intenta nada', async () => {
    await descartable(async (tx) => {
      await sembrar(tx)
      const r = await responderCon(tx, principal('sub-com'), null, { idempotencyKey: KEY, conversationId: 1, body: 'x' })
      assert.equal(r.kind, 'not-configured')
      assert.equal((await tx`select 1 from communication.outbound_attempt`).length, 0)
    })
  })
})
