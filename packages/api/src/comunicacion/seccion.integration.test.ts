// T-0066 — La sección Comunicación como la ve el equipo: por `conDatos`, como `broker_app`,
// con RLS decidiendo. Contra Postgres real, con datos sintéticos y cada caso en una
// transacción revertida. Requiere DATABASE_URL con 0021 aplicada.

import assert from 'node:assert/strict'
import { after, describe, it } from 'node:test'

import postgres from 'postgres'

import { AccesoDenegado } from '../acceso/datos.ts'
import type { Principal } from '../session/admission.ts'
import type { SendOutcome } from './integration/cloud-api.ts'
import { editarResponsableDeMensajesCon, responsableDeMensajesCon } from '../clientes/edicion.ts'
import {
  avisosPendientesCon,
  conversacionesCon,
  crearProspectoDeConversacionCon,
  responderCon,
  vincularConversacionCon,
  type EnvioConfigurado,
} from './seccion.ts'

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
          ['Ana', '0101', [{ partyId: m.ana, name: 'Ana Sintética', prospect: false }]],
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
  it('vincular una conversación sin identificar le carga el teléfono al cliente (T-0068)', async () => {
    await descartable(async (tx) => {
      const m = await sembrar(tx)
      const [beto] = await tx<{ id: string }[]>`insert into party (kind) values ('PERSON') returning id`
      assert.ok(beto)
      await tx`insert into person_profile (party_id, first_name, last_name) values (${beto.id}, 'Beto', 'Sintético')`
      const desconocida = (await conversacionesCon(tx, principal('sub-com'))).conversaciones.find((c) => c.profileName === 'Desconocido')
      assert.ok(desconocida)

      assert.equal(await vincularConversacionCon(tx, principal('sub-com'), desconocida.id, beto.id), 'vinculado')
      // Repetirlo no duplica el teléfono.
      assert.equal(await vincularConversacionCon(tx, principal('sub-com'), desconocida.id, beto.id), 'vinculado')

      const deBeto = await conversacionesCon(tx, principal('sub-com'), beto.id)
      assert.deepEqual(deBeto.conversaciones.map((c) => [c.profileName, c.clientes]), [
        ['Desconocido', [{ partyId: beto.id, name: 'Beto Sintético', prospect: false }]],
      ])
      const telefonos = await tx<{ value: string; source: string; autor: string }[]>`
        select value, source, created_by_user_id as autor from contact_point where party_id = ${beto.id}`
      assert.deepEqual([...telefonos], [{ value: '+5492615550999', source: 'Broker OS', autor: m.usuario }])
    })
  })

  it('crea un prospecto desde una conversación sin identificar y queda vinculada a él', async () => {
    await descartable(async (tx) => {
      const m = await sembrar(tx)
      const desconocida = (await conversacionesCon(tx, principal('sub-com'))).conversaciones.find((c) => c.profileName === 'Desconocido')
      assert.ok(desconocida)
      assert.deepEqual(desconocida.clientes, [])

      const datos = { kind: 'PERSON', origin: 'INSTAGRAM', name: 'Cristian', lastName: 'Sintético' } as const
      const r = await crearProspectoDeConversacionCon(tx, principal('sub-com'), desconocida.id, datos)
      assert.ok(r.kind === 'ok')

      const despues = (await conversacionesCon(tx, principal('sub-com'))).conversaciones.find((c) => c.id === desconocida.id)
      assert.deepEqual(despues?.clientes, [{ partyId: r.partyId, name: 'Cristian Sintético', prospect: true }])
      const [rol] = await tx<{ origin: string; autor: string }[]>`
        select origin, created_by_user_id as autor from party_role where party_id = ${r.partyId} and role = 'PROSPECT' and valid_to is null`
      assert.deepEqual(rol, { origin: 'INSTAGRAM', autor: m.usuario })
      const telefonos = await tx<{ value: string }[]>`select value from contact_point where party_id = ${r.partyId}`
      assert.deepEqual([...telefonos], [{ value: '+5492615550999' }])

      // Sin nombre no crea nada; una conversación que no existe tampoco.
      const vacio = await crearProspectoDeConversacionCon(tx, principal('sub-com'), desconocida.id, { ...datos, name: '', lastName: '' })
      assert.equal(vacio.kind, 'invalid')
      assert.deepEqual(await crearProspectoDeConversacionCon(tx, principal('sub-com'), 999999999, datos), { kind: 'inexistente' })
    })
  })

  it('no vincula una conversación o un cliente que no existen', async () => {
    await descartable(async (tx) => {
      const m = await sembrar(tx)
      assert.equal(await vincularConversacionCon(tx, principal('sub-com'), 999999999, m.ana), 'inexistente')
      const [conv] = (await conversacionesCon(tx, principal('sub-com'))).conversaciones
      assert.ok(conv)
      assert.equal(await vincularConversacionCon(tx, principal('sub-com'), conv.id, '00000000-0000-4000-8000-00000000dead'), 'inexistente')
      assert.equal(await vincularConversacionCon(tx, principal('sub-com'), conv.id, 'no-es-un-id'), 'inexistente')
    })
  })

  it('el aviso va al responsable del cliente, a Victoria sin responsable y a Matías sin cliente (T-0072)', async () => {
    await descartable(async (tx) => {
      const m = await sembrar(tx)
      const integrante = async (correo: string): Promise<string> => {
        const [u] = await tx<{ id: string }[]>`
          insert into app_user (email, status, auth_provider, role) values (${correo}, 'ACTIVE', 'google', 'OPERADOR') returning id`
        if (u === undefined) throw new Error('sin semilla')
        await tx`insert into user_credential (user_id, provider, subject) values (${u.id}, 'google', ${correo})`
        return u.id
      }
      const victoria = await integrante('victoria@delcamposeguros.com')
      const matias = await integrante('matias@delcamposeguros.com')
      const avisos = async () =>
        (await conversacionesCon(tx, principal('sub-com'))).conversaciones.map((c) => [c.profileName, c.avisaA?.userId, c.awaitingReply])

      assert.deepEqual(await avisos(), [
        ['Ana', victoria, true],
        ['Desconocido', matias, true],
      ])
      assert.equal(await avisosPendientesCon(tx, principal('victoria@delcamposeguros.com')), 1)

      // Cualquiera del equipo asigna el responsable desde la ficha, y queda quién lo hizo.
      assert.deepEqual(await editarResponsableDeMensajesCon(tx, principal('sub-com'), m.ana, m.usuario), { kind: 'ok' })
      assert.equal(await responsableDeMensajesCon(tx, principal('sub-com'), m.ana), m.usuario)
      assert.deepEqual(await avisos(), [
        ['Ana', m.usuario, true],
        ['Desconocido', matias, true],
      ])
      assert.equal(await avisosPendientesCon(tx, principal('sub-com')), 1)
      assert.equal(await avisosPendientesCon(tx, principal('victoria@delcamposeguros.com')), 0)
      const [auditoria] = await tx<{ actor: string }[]>`
        select actor_user_id as actor from audit_event where action = 'party.update_message_owner' and object_id = ${m.ana}`
      assert.equal(auditoria?.actor, m.usuario)

      // Una respuesta del equipo saca la conversación de los pendientes.
      await tx`
        insert into communication.message (wamid, direction, phone_number_id, wa_id, body, wa_timestamp)
        values ('wamid.SINT-OUT-A', 'outbound', ${NUMERO}, '5492615550101', 'Respuesta', now())`
      assert.equal(await avisosPendientesCon(tx, principal('sub-com')), 0)

      // Sin responsable vuelve a Victoria; alguien de afuera del equipo no puede serlo.
      assert.deepEqual(await editarResponsableDeMensajesCon(tx, principal('sub-com'), m.ana, null), { kind: 'ok' })
      assert.equal(await responsableDeMensajesCon(tx, principal('sub-com'), m.ana), null)
      const otro = await editarResponsableDeMensajesCon(tx, principal('sub-com'), m.ana, '00000000-0000-4000-8000-00000000dead')
      assert.equal(otro.kind, 'invalid')
    })
  })
})
