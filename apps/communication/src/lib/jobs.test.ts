// El secreto de las tareas programadas y la configuración del reproceso (T-0026). La
// denegación contra los route handlers reales está en deny.test.ts; acá, que el secreto
// se compara entero (revisión fría, M32) y que el reproceso no corre sin un número con
// forma de phone_number_id (M30). Ninguno toca la base.

import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import type { Sql } from '@del-campo/communication'

import { jobDenial, reprocessJobResponse, withJobSecret } from './jobs.ts'

const CRON = 'secreto-de-cron-de-prueba-0123456789abcdef'
const ENV = { CRON_SECRET: CRON }
const URL_JOB = 'http://localhost:3100/api/jobs/reprocess'

const request = (headers: Record<string, string>, url = URL_JOB): Request => new Request(url, { headers })
const bearer = (value: string): Record<string, string> => ({ authorization: `Bearer ${value}` })

/** Una base que falla si se la consulta: lo que se niega o no está configurado no llega a ella. */
const untouchable = new Proxy(() => undefined, {
  apply: () => {
    throw new Error('consultó la base')
  },
  get: () => {
    throw new Error('consultó la base')
  },
}) as unknown as Sql

describe('CRON_SECRET se compara entero (M32)', () => {
  const ran: string[] = []
  const job = withJobSecret(() => {
    ran.push('corrió')
    return Promise.resolve(new Response('ok'))
  }, ENV)

  it('el secreto exacto en Authorization: Bearer pasa', async () => {
    assert.equal(jobDenial(request(bearer(CRON)), ENV), null)
    ran.length = 0
    const response = await job(request(bearer(CRON)))
    assert.equal(response.status, 200)
    assert.deepEqual(ran, ['corrió'])
  })

  const DENIED: [string, Record<string, string>][] = [
    ['un prefijo del secreto', bearer(CRON.slice(0, -1))],
    ['la primera letra del secreto', bearer(CRON.slice(0, 1))],
    ['el secreto más un sufijo', bearer(`${CRON}x`)],
    ['el secreto con el último carácter cambiado', bearer(`${CRON.slice(0, -1)}e`)],
    ['el secreto en mayúsculas', bearer(CRON.toUpperCase())],
    ['el secreto repetido', bearer(CRON + CRON)],
    ['el secreto con un espacio en el medio', bearer(`${CRON.slice(0, 10)} ${CRON.slice(10)}`)],
    ['Bearer vacío', { authorization: 'Bearer ' }],
    ['Bearer sin valor', { authorization: 'Bearer' }],
    ['el esquema en minúsculas', { authorization: `bearer ${CRON}` }],
    ['Basic con el secreto', { authorization: `Basic ${CRON}` }],
    ['el secreto en otro header', { 'x-cron-secret': CRON }],
    ['sin header', {}],
  ]
  for (const [name, headers] of DENIED) {
    it(`${name}: 401 sin correr la tarea`, async () => {
      ran.length = 0
      const response = await job(request(headers))
      assert.equal(response.status, 401)
      assert.deepEqual(await response.json(), { error: 'sin credencial válida' })
      assert.deepEqual(ran, [])
    })
  }

  it('el secreto en el query string no cuenta', async () => {
    ran.length = 0
    const response = await job(request({}, `${URL_JOB}?secret=${CRON}&authorization=Bearer%20${CRON}`))
    assert.equal(response.status, 401)
    assert.deepEqual(ran, [])
  })

  it('un CRON_SECRET vacío no se satisface con un Bearer vacío', () => {
    assert.equal(jobDenial(request({ authorization: 'Bearer ' }), { CRON_SECRET: '' })?.status, 503)
    assert.equal(jobDenial(request({}), {})?.status, 503)
  })
})

describe('el reproceso exige un phone_number_id válido (M30)', () => {
  for (const [name, value] of [
    ['sin la variable', undefined],
    ['vacía', ''],
    ['solo espacios', '   '],
    ['el número visible con +', '+54 9 261 555-0100'],
    ['con letras', '80000000000000l'],
  ] as const) {
    it(`${name}: 503 sin tocar la base`, async () => {
      const lines: string[] = []
      const env = value === undefined ? {} : { WHATSAPP_PHONE_NUMBER_ID: value }
      const response = await reprocessJobResponse(untouchable, env, (l) => lines.push(l))
      assert.equal(response.status, 503)
      assert.deepEqual(await response.json(), { error: 'falta WHATSAPP_PHONE_NUMBER_ID o no es numérico' })
      assert.deepEqual(lines, [])
    })
  }

  it('con un número válido, aun con espacios alrededor, llega a la base', async () => {
    await assert.rejects(
      reprocessJobResponse(untouchable, { WHATSAPP_PHONE_NUMBER_ID: ' 800000000000001\n' }, () => undefined),
      /consultó la base/,
    )
  })
})
