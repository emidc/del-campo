// Las entradas sin sesión de Comunicación: el secreto de las tareas se compara entero, y
// nada llega a la base sin secreto o sin configuración. Ninguno de estos casos la toca.

import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { jobDenial, tareaDeReproceso, tareaDeRetencion, whatsappWebhook } from './entrada.ts'
import type { Sql } from './persistence/database.ts'

const CRON = 'secreto-de-cron-de-prueba-0123456789abcdef'
const ENV = { CRON_SECRET: CRON }
const URL_JOB = 'http://localhost:3000/api/jobs/reprocess'

const request = (headers: Record<string, string>, url = URL_JOB): Request => new Request(url, { headers })
const bearer = (value: string): Record<string, string> => ({ authorization: `Bearer ${value}` })

/** Una base que falla si se la pide: lo que se niega o no está configurado no llega a ella. */
const untouchable = (): Sql => {
  throw new Error('consultó la base')
}

describe('CRON_SECRET se compara entero', () => {
  it('el secreto exacto en Authorization: Bearer pasa', () => {
    assert.equal(jobDenial(request(bearer(CRON)), ENV), null)
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
    it(`${name}: 401 sin correr ninguna tarea`, async () => {
      for (const tarea of [tareaDeRetencion, tareaDeReproceso]) {
        const response = await tarea(request(headers), ENV, untouchable)
        assert.equal(response.status, 401)
        assert.deepEqual(await response.json(), { error: 'sin credencial válida' })
      }
    })
  }

  it('el secreto en el query string no cuenta', async () => {
    const response = await tareaDeRetencion(request({}, `${URL_JOB}?secret=${CRON}&authorization=Bearer%20${CRON}`), ENV, untouchable)
    assert.equal(response.status, 401)
  })

  it('un CRON_SECRET vacío no se satisface con un Bearer vacío', () => {
    assert.equal(jobDenial(request({ authorization: 'Bearer ' }), { CRON_SECRET: '' })?.status, 503)
    assert.equal(jobDenial(request({}), {})?.status, 503)
  })

  it('con el secreto, la tarea llega a la base', async () => {
    await assert.rejects(tareaDeRetencion(request(bearer(CRON)), ENV, untouchable), /consultó la base/)
  })
})

describe('el reproceso exige un phone_number_id válido', () => {
  for (const [name, value] of [
    ['sin la variable', undefined],
    ['vacía', ''],
    ['solo espacios', '   '],
    ['el número visible con +', '+54 9 261 555-0100'],
    ['con letras', '80000000000000l'],
  ] as const) {
    it(`${name}: 503 sin tocar la base`, async () => {
      const env = value === undefined ? ENV : { ...ENV, WHATSAPP_PHONE_NUMBER_ID: value }
      const response = await tareaDeReproceso(request(bearer(CRON)), env, untouchable)
      assert.equal(response.status, 503)
      assert.deepEqual(await response.json(), { error: 'falta WHATSAPP_PHONE_NUMBER_ID o no es numérico' })
    })
  }

  it('con un número válido, aun con espacios alrededor, llega a la base', async () => {
    await assert.rejects(
      tareaDeReproceso(request(bearer(CRON)), { ...ENV, WHATSAPP_PHONE_NUMBER_ID: ' 800000000000001\n' }, untouchable),
      /consultó la base/,
    )
  })
})

describe('el webhook no recibe sin configuración', () => {
  const post = (): Request => new Request('http://localhost:3000/api/whatsapp/webhook', { method: 'POST', body: '{}' })
  const COMPLETA = { WHATSAPP_APP_SECRET: 'secreto', WHATSAPP_VERIFY_TOKEN: 'token', WHATSAPP_PHONE_NUMBER_ID: '800000000000001' }

  for (const falta of Object.keys(COMPLETA)) {
    it(`sin ${falta}: 503 sin tocar la base`, async () => {
      const { response, process } = await whatsappWebhook(post(), { ...COMPLETA, [falta]: '' }, untouchable)
      assert.equal(response.status, 503)
      assert.equal(process, null)
    })
  }
})
