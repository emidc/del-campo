// C4-03b: el cliente de Risk OS, con `fetch` simulado. Cada resultado de la tabla de
// docs/desarrollo/riesgos-en-la-ficha.md §3.1, y el token que sale.

import assert from 'node:assert/strict'
import { before, describe, it } from 'node:test'

import { generarParDeClaves, jwksDe, registroJtiEnMemoria, verificarToken, type ParDeClaves } from '@del-campo/identidad'

import type { Principal } from '../session/admission.ts'
import { riesgosDeEmpresa, type DepsRiesgos } from './cliente.ts'

const EMPRESA = '00000000-0000-4000-8000-000000000001'
const PRINCIPAL: Principal = { sub: 'sub-sintetico', email: 'persona@ejemplo.invalid', displayName: null }

/** El cuerpo `vinculada` del contrato (§2.2), sintético. */
export const EJEMPLO_VINCULADA = {
  estado: 'vinculada',
  organizacion: { id: 'ORG-01M3QSRT00VT0W3XH3JG6NDTEX', sector: 'Industria', tamano: null, zonas: ['Planta'] },
  version: 'metodologia v1',
  generadoEn: '2026-11-11T21:00:00.000Z',
  riesgos: [
    { riskId: 'RSK-01M3QSRT00DSK3VYVBFPTPJXM6', titulo: 'Incendio en depósito', tipoObjeto: 'riesgo', unidad: 'Planta', posicion: 1, empate: false, provisional: false, banda: 'Alta' },
    { riskId: 'RSK-01M3QSRT00DSK3VYVBFPTPJXM7', titulo: 'Corte de suministro', tipoObjeto: 'riesgo', unidad: null, posicion: 2, empate: false, provisional: true, banda: null },
  ],
  noEvaluables: 2,
  enCola: 3,
}

let broker: ParDeClaves
before(async () => {
  broker = await generarParDeClaves()
})

interface Llamada { readonly url: string; readonly init: RequestInit | undefined }

const deps = (responder: () => Promise<Response> | Response, env: Record<string, string> = {}): DepsRiesgos & { llamadas: Llamada[] } => {
  const llamadas: Llamada[] = []
  return {
    llamadas,
    env: { RISK_API_URL: 'http://localhost:3200', BROKER_TOKEN_CLAVE_PRIVADA: JSON.stringify(broker.privada), ...env },
    fetch: (async (url: string | URL, init?: RequestInit) => {
      llamadas.push({ url: String(url), init })
      return responder()
    }) as typeof fetch,
  }
}
const json = (cuerpo: unknown, status = 200): Response => new Response(JSON.stringify(cuerpo), { status, headers: { 'content-type': 'application/json' } })

describe('riesgosDeEmpresa (C4-03b)', () => {
  it('vinculada, pendiente y sin vínculo, con el cuerpo del contrato', async () => {
    const v = await riesgosDeEmpresa(PRINCIPAL, EMPRESA, deps(() => json(EJEMPLO_VINCULADA)))
    if (v.estado !== 'vinculada') throw new Error(`esperaba vinculada, vino ${v.estado}`)
    assert.equal(v.riesgos.length, 2)
    assert.equal(v.urlRisk, 'http://localhost:3200/o/ORG-01M3QSRT00VT0W3XH3JG6NDTEX')
    assert.deepEqual(await riesgosDeEmpresa(PRINCIPAL, EMPRESA, deps(() => json({ estado: 'pendiente' }))), { estado: 'pendiente' })
    assert.deepEqual(await riesgosDeEmpresa(PRINCIPAL, EMPRESA, deps(() => json({ estado: 'sin_vinculo' }))), { estado: 'sin_vinculo' })
  })

  it('401 o 403: sin acceso', async () => {
    for (const status of [401, 403]) {
      assert.deepEqual(await riesgosDeEmpresa(PRINCIPAL, EMPRESA, deps(() => json({ error: 'x' }, status))), { estado: 'sin_acceso' }, String(status))
    }
  })

  it('error de red, 404, 5xx o un cuerpo fuera del contrato: no disponible', async () => {
    const casos: [string, () => Promise<Response> | Response][] = [
      ['red', () => Promise.reject(new TypeError('fetch failed'))],
      ['404', () => json({ error: 'no existe' }, 404)],
      ['503', () => json({ error: 'la UI no está configurada' }, 503)],
      ['no es JSON', () => new Response('<html>', { status: 200 })],
      ['estado desconocido', () => json({ estado: 'otro' })],
      ['riesgo sin posición', () => json({ ...EJEMPLO_VINCULADA, riesgos: [{ ...EJEMPLO_VINCULADA.riesgos[0], posicion: 'uno' }] })],
      ['sin cantidades', () => json({ ...EJEMPLO_VINCULADA, enCola: undefined })],
    ]
    for (const [nombre, responder] of casos) {
      assert.deepEqual(await riesgosDeEmpresa(PRINCIPAL, EMPRESA, deps(responder)), { estado: 'no_disponible' }, nombre)
    }
  })

  it('sin RISK_API_URL o sin la clave: no configurado, y no llama', async () => {
    for (const env of [{ RISK_API_URL: '' }, { BROKER_TOKEN_CLAVE_PRIVADA: '' }, { BROKER_TOKEN_CLAVE_PRIVADA: '{"kty":"EC"}' }]) {
      const d = deps(() => json(EJEMPLO_VINCULADA), env)
      assert.deepEqual(await riesgosDeEmpresa(PRINCIPAL, EMPRESA, d), { estado: 'no_configurado' }, JSON.stringify(env))
      assert.equal(d.llamadas.length, 0)
    }
  })

  it('el token sale con iss, aud y el sujeto de la persona, uno nuevo por llamada, sin caché', async () => {
    const d = deps(() => json({ estado: 'sin_vinculo' }))
    await riesgosDeEmpresa(PRINCIPAL, EMPRESA, d)
    await riesgosDeEmpresa(PRINCIPAL, EMPRESA, d)
    assert.equal(d.llamadas.length, 2)
    const registro = registroJtiEnMemoria()
    for (const l of d.llamadas) {
      assert.equal(l.url, `http://localhost:3200/api/entre-contextos/empresas/${EMPRESA}/riesgos`)
      assert.equal(l.init?.cache, 'no-store')
      const token = new Headers(l.init.headers).get('authorization')?.replace(/^Bearer /, '') ?? ''
      const r = await verificarToken(token, { jwks: jwksDe([broker.publica]), emisor: 'broker-os', audiencia: 'risk-os', registroJti: registro })
      assert.ok(r.ok, r.ok ? '' : r.motivo)
      assert.equal(r.sujeto, PRINCIPAL.sub)
    }
  })

  it('un id que no es de una Party no llama', async () => {
    const d = deps(() => json(EJEMPLO_VINCULADA))
    assert.deepEqual(await riesgosDeEmpresa(PRINCIPAL, 'no-es-un-uuid', d), { estado: 'sin_vinculo' })
    assert.equal(d.llamadas.length, 0)
  })
})
