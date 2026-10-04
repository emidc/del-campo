// El cliente de envío contra la forma de respuesta y de error que documenta Meta, sin
// llamadas reales. Los fixtures `send-*.documented.json` no son capturas (R-27): son la
// forma documentada, marcada como tal, hasta que la tarea de despliegue capture una.

import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { describe, it } from 'node:test'

import { cloudApiConfigProblem, cloudApiSender, redactErrorTitle, type CloudApiConfig } from './cloud-api.ts'

const fixture = (name: string): string =>
  readFileSync(new URL(`../../fixtures/${name}`, import.meta.url), 'utf8')

interface Call {
  readonly url: string
  readonly init: RequestInit & { readonly body?: string }
}

const fakeFetch = (respond: () => Response | Promise<Response>): { fetch: typeof fetch; calls: Call[] } => {
  const calls: Call[] = []
  const f = (async (input: string, init?: RequestInit & { body?: string }) => {
    calls.push({ url: input, init: init ?? {} })
    return respond()
  }) as typeof fetch
  return { fetch: f, calls }
}

const CONFIG: CloudApiConfig = { accessToken: 'token-de-prueba', phoneNumberId: '800000000000001', apiVersion: 'v23.0' }
const json = (body: string, status: number): Response =>
  new Response(body, { status, headers: { 'content-type': 'application/json' } })

describe('cliente de envío de Cloud API', () => {
  it('arma el request documentado y devuelve el wamid de una respuesta aceptada', async () => {
    const { fetch, calls } = fakeFetch(() => json(fixture('send-accepted.documented.json'), 200))
    const outcome = await cloudApiSender({ ...CONFIG, fetch })('15550199001', 'Hola')
    assert.deepEqual(outcome, { kind: 'accepted', wamid: 'wamid.SYNTH-OUTBOUND-0001' })
    assert.equal(calls.length, 1)
    const call = calls[0]
    if (call === undefined) throw new Error('sin llamada')
    assert.equal(call.url, 'https://graph.facebook.com/v23.0/800000000000001/messages')
    assert.equal(call.init.method, 'POST')
    assert.equal((call.init.headers as Record<string, string>).authorization, 'Bearer token-de-prueba')
    assert.deepEqual(JSON.parse(call.init.body ?? ''), {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: '15550199001',
      type: 'text',
      text: { preview_url: false, body: 'Hola' },
    })
  })

  it('un error 4xx documentado es un rechazo, con código y título', async () => {
    const { fetch } = fakeFetch(() => json(fixture('send-error-window.documented.json'), 400))
    const outcome = await cloudApiSender({ ...CONFIG, fetch })('15550199001', 'Hola')
    assert.deepEqual(outcome, { kind: 'rejected', code: 131047, title: '(#131047) Re-engagement message' })
  })

  it('el título del rechazo no lleva el número del destinatario', async () => {
    const { fetch } = fakeFetch(() => json(fixture('send-error-recipient.documented.json'), 400))
    const outcome = await cloudApiSender({ ...CONFIG, fetch })('15550199001', 'Hola')
    if (outcome.kind !== 'rejected') throw new Error(`se esperaba rejected, llegó ${outcome.kind}`)
    assert.ok(!outcome.title.includes('15550199001'))
    assert.ok(outcome.title.includes('131030'))
  })

  it('5xx, 2xx sin id, red caída y timeout quedan sin confirmar: pudo haber salido', async () => {
    const cases: (() => Response | Promise<Response>)[] = [
      () => json('{"error":{"message":"Something went wrong","code":131000}}', 500),
      () => json('{"messaging_product":"whatsapp","messages":[]}', 200),
      () => json('no es json', 200),
      () => Promise.reject(new TypeError('fetch failed')),
    ]
    for (const respond of cases) {
      const { fetch } = fakeFetch(respond)
      assert.equal((await cloudApiSender({ ...CONFIG, fetch })('15550199001', 'Hola')).kind, 'unconfirmed')
    }
    const slow = ((_: unknown, init?: RequestInit) =>
      new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => { reject(init.signal?.reason as Error) })
      })) as typeof fetch
    const outcome = await cloudApiSender({ ...CONFIG, fetch: slow, timeoutMs: 20 })('15550199001', 'Hola')
    assert.deepEqual(outcome, { kind: 'unconfirmed', reason: 'la API no respondió a tiempo' })
  })

  it('valida la configuración y solo deja cambiar la URL base hacia localhost', () => {
    assert.equal(cloudApiConfigProblem(CONFIG), null)
    assert.notEqual(cloudApiConfigProblem({ ...CONFIG, accessToken: '' }), null)
    assert.notEqual(cloudApiConfigProblem({ ...CONFIG, phoneNumberId: '+54 9 261' }), null)
    assert.notEqual(cloudApiConfigProblem({ ...CONFIG, apiVersion: '23' }), null)
    assert.equal(cloudApiConfigProblem({ ...CONFIG, baseUrl: 'http://localhost:4010' }), null)
    assert.notEqual(cloudApiConfigProblem({ ...CONFIG, baseUrl: 'https://otro.example.com' }), null)
    assert.throws(() => cloudApiSender({ ...CONFIG, baseUrl: 'https://otro.example.com' }))
  })

  it('el error de configuración no cita el token', () => {
    const problem = cloudApiConfigProblem({ ...CONFIG, apiVersion: 'x' }) ?? ''
    assert.ok(!problem.includes(CONFIG.accessToken))
  })

  it('la redacción saca wamids y números largos', () => {
    assert.equal(redactErrorTitle('falló wamid.HBgLMTU1NTAxOTkwMDEVAgARGBI= para +54 9 261 555-0101'), 'falló wamid.[…] para [número]')
  })
})
