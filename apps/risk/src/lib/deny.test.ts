// Denegación (R-28) contra los route handlers reales de la app: sin credencial, con una cookie
// inválida, vencida, adulterada o firmada con otro secreto, y sin configuración, cada endpoint de
// datos responde con un cuerpo fijo, sin datos, y sin tocar la base. Además, un test de
// estructura falla si una página o un endpoint nuevo no pasa por el guard.

import assert from 'node:assert/strict'
import { readdirSync, readFileSync } from 'node:fs'
import { join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { after, before, describe, it } from 'node:test'

import { POST as loginPOST } from '../app/api/login/route.ts'
import { POST as logoutPOST } from '../app/api/logout/route.ts'
import { POST as ordenPrevioPOST } from '../app/api/o/[org]/orden-previo/route.ts'
import { POST as reordenarPOST } from '../app/api/o/[org]/reordenar/route.ts'
import { POST as actualizarPOST } from '../app/api/r/[id]/actualizar/route.ts'
import { GET as actividadGET } from '../app/api/o/[org]/actividad/route.ts'
import { GET as escenariosGET } from '../app/api/o/[org]/escenarios/route.ts'
import { GET as listaGET } from '../app/api/o/[org]/lista/route.ts'
import { GET as planGET } from '../app/api/o/[org]/plan/route.ts'
import { GET as transferenciaGET } from '../app/api/o/[org]/transferencia/route.ts'
import { GET as organizacionesGET } from '../app/api/organizaciones/route.ts'
import { GET as detalleGET } from '../app/api/r/[id]/route.ts'
import { guardRequest } from './guard.ts'
import { issueSession, SESSION_COOKIE, SESSION_TTL_SECONDS, verifySession } from './sesion.ts'

const ORIGIN = 'http://localhost:3200'
const SECRET = 'secreto-de-sesion-de-prueba-0123456789abcdef'
const OTRO = 'otro-secreto-de-sesion-de-prueba-0123456789'
const PERSONA = 'PER-01M50T00000000000000000002'
const ORG = 'ORG-01M3QSRT003GPNZ7ZJSV8AHDAR'
const RIESGO = 'RSK-01M3QSRT00DSK3VYVBFPTPJXM6'
const VARS = ['RISK_UI_SESSION_SECRET', 'RISK_DATABASE_URL'] as const
const saved: Partial<Record<(typeof VARS)[number], string | undefined>> = {}

const configure = (): void => {
  process.env.RISK_UI_SESSION_SECRET = SECRET
  // Una base que no existe: si un handler llegara a consultarla, el test fallaría.
  process.env.RISK_DATABASE_URL = 'postgres://localhost:1/no_existe_test'
}

before(() => {
  for (const v of VARS) saved[v] = process.env[v]
  configure()
})
after(() => {
  for (const v of VARS) {
    const value = saved[v]
    if (value === undefined) Reflect.deleteProperty(process.env, v)
    else process.env[v] = value
  }
})

const org = { params: Promise.resolve({ org: ORG }) }
const post = (path: string, headers: Record<string, string>): Request =>
  new Request(`${ORIGIN}${path}`, { method: 'POST', headers, body: new URLSearchParams({ op: 'novedad', texto: 'x' }) })
// Los POST de la actualización (T-0031). Sin `origin` son de otro origen; ENDPOINTS les pone el propio.
const ESCRITURAS: { readonly name: string; readonly call: (headers: Record<string, string>) => Promise<Response> }[] = [
  { name: 'POST /api/r/:id/actualizar', call: (headers) => actualizarPOST(post(`/api/r/${RIESGO}/actualizar`, headers), { params: Promise.resolve({ id: RIESGO }) }) },
  { name: 'POST /api/o/:org/reordenar', call: (headers) => reordenarPOST(post(`/api/o/${ORG}/reordenar`, headers), org) },
  { name: 'POST /api/o/:org/orden-previo', call: (headers) => ordenPrevioPOST(post(`/api/o/${ORG}/orden-previo`, headers), org) },
]
const ENDPOINTS: { readonly name: string; readonly call: (headers: Record<string, string>) => Promise<Response> }[] = [
  { name: 'GET /api/organizaciones', call: (headers) => organizacionesGET(new Request(`${ORIGIN}/api/organizaciones`, { headers }), {}) },
  { name: 'GET /api/o/:org/lista', call: (headers) => listaGET(new Request(`${ORIGIN}/api/o/${ORG}/lista`, { headers }), org) },
  { name: 'GET /api/o/:org/escenarios', call: (headers) => escenariosGET(new Request(`${ORIGIN}/api/o/${ORG}/escenarios`, { headers }), org) },
  { name: 'GET /api/o/:org/plan', call: (headers) => planGET(new Request(`${ORIGIN}/api/o/${ORG}/plan`, { headers }), org) },
  { name: 'GET /api/o/:org/transferencia', call: (headers) => transferenciaGET(new Request(`${ORIGIN}/api/o/${ORG}/transferencia`, { headers }), org) },
  { name: 'GET /api/o/:org/actividad', call: (headers) => actividadGET(new Request(`${ORIGIN}/api/o/${ORG}/actividad`, { headers }), org) },
  {
    name: 'GET /api/r/:id',
    call: (headers) => detalleGET(new Request(`${ORIGIN}/api/r/${RIESGO}`, { headers }), { params: Promise.resolve({ id: RIESGO }) }),
  },
  ...ESCRITURAS.map((e) => ({ name: e.name, call: (headers: Record<string, string>) => e.call({ origin: ORIGIN, ...headers }) })),
]

const valida = (): string => issueSession(SECRET, { personaId: PERSONA, credencialId: '1' })
const cookie = (v: string): Record<string, string> => ({ cookie: `${SESSION_COOKIE}=${v}` })

const CASOS: { readonly name: string; readonly headers: () => Record<string, string> }[] = [
  { name: 'sin cookie', headers: () => ({}) },
  { name: 'con una cookie que no es de sesión', headers: () => cookie('cualquier-cosa') },
  { name: 'con la firma de otro secreto', headers: () => cookie(issueSession(OTRO, { personaId: PERSONA, credencialId: '1' })) },
  { name: 'con la persona cambiada', headers: () => cookie(valida().replace(PERSONA, 'PER-01M50T00000000000000000003')) },
  { name: 'con la credencial cambiada', headers: () => cookie(valida().replace('.1.', '.2.')) },
  {
    name: 'vencida',
    headers: () => cookie(issueSession(SECRET, { personaId: PERSONA, credencialId: '1' }, new Date(Date.now() - (SESSION_TTL_SECONDS + 60) * 1000))),
  },
]

describe('endpoints de datos sin una sesión válida: 401 sin datos y sin tocar la base (R-28)', () => {
  for (const e of ENDPOINTS) {
    for (const c of CASOS) {
      it(`${e.name}, ${c.name}`, async () => {
        const r = await e.call(c.headers())
        assert.equal(r.status, 401)
        assert.equal(r.headers.get('cache-control'), 'no-store')
        assert.deepEqual(await r.json(), { error: 'sin credencial válida' })
      })
    }
  }
})

describe('sin configuración, la app niega todo (503)', () => {
  for (const e of ENDPOINTS) {
    it(`${e.name}, aun con una cookie bien firmada`, async () => {
      delete process.env.RISK_UI_SESSION_SECRET
      try {
        const r = await e.call(cookie(valida()))
        assert.equal(r.status, 503)
        assert.deepEqual(await r.json(), { error: 'la UI no está configurada' })
      } finally {
        configure()
      }
    })
  }
  it('con un secreto corto, también', async () => {
    process.env.RISK_UI_SESSION_SECRET = 'corto'
    try {
      const r = await ENDPOINTS[0]?.call(cookie(valida()))
      assert.equal(r?.status, 503)
    } finally {
      configure()
    }
  })
  it('POST /api/login sin configuración: 503', async () => {
    delete process.env.RISK_UI_SESSION_SECRET
    try {
      const r = await loginPOST(new Request(`${ORIGIN}/api/login`, { method: 'POST', headers: { origin: ORIGIN }, body: new URLSearchParams({ usuario: 'x', contrasena: 'y' }) }))
      assert.equal(r.status, 503)
    } finally {
      configure()
    }
  })
})

describe('login y logout desde otro origen: 403', () => {
  it('POST /api/login', async () => {
    const r = await loginPOST(new Request(`${ORIGIN}/api/login`, { method: 'POST', headers: { origin: 'https://otro.example' }, body: new URLSearchParams({ usuario: 'x', contrasena: 'y' }) }))
    assert.equal(r.status, 403)
  })
  it('POST /api/logout', () => {
    const r = logoutPOST(new Request(`${ORIGIN}/api/logout`, { method: 'POST' }))
    assert.equal(r.status, 403)
  })
  it('un logout del mismo origen borra la cookie', () => {
    const r = logoutPOST(new Request(`${ORIGIN}/api/logout`, { method: 'POST', headers: { origin: ORIGIN } }))
    assert.equal(r.status, 303)
    assert.match(r.headers.get('set-cookie') ?? '', /^risk_session=; .*Max-Age=0/)
  })
})

describe('escrituras desde otro origen o sin origen: 403 aun con una sesión válida, sin tocar la base', () => {
  for (const e of ESCRITURAS) {
    it(`${e.name}, desde otro origen`, async () => {
      const r = await e.call({ origin: 'https://otro.example', ...cookie(valida()) })
      assert.equal(r.status, 403)
      assert.deepEqual(await r.json(), { error: 'origen no permitido' })
    })
    it(`${e.name}, sin origen`, async () => {
      const r = await e.call(cookie(valida()))
      assert.equal(r.status, 403)
    })
  }
})

describe('guard: la base se pide sólo con una cookie bien firmada', () => {
  it('una cookie inválida no llama a la base', async () => {
    let llamadas = 0
    const deps = { env: { RISK_UI_SESSION_SECRET: SECRET, RISK_DATABASE_URL: 'postgres://x/y' }, db: () => { llamadas++; throw new Error('no debía llamarse') } }
    for (const c of CASOS) {
      const o = await guardRequest(new Request(`${ORIGIN}/api/organizaciones`, { headers: c.headers() }), deps)
      assert.equal(o.ok, false)
    }
    assert.equal(llamadas, 0)
  })
})

describe('cookie de sesión (D-0069)', () => {
  it('lleva persona, credencial y vencimiento firmados, y no se acepta vencida ni adulterada', () => {
    const v = valida()
    assert.deepEqual(verifySession(SECRET, v), { personaId: PERSONA, credencialId: '1' })
    assert.equal(verifySession(OTRO, v), null)
    assert.equal(verifySession(SECRET, `${v}x`), null)
    assert.equal(verifySession(SECRET, v, new Date(Date.now() + (SESSION_TTL_SECONDS + 1) * 1000)), null)
    assert.throws(() => issueSession(SECRET, { personaId: 'no-es-un-id', credencialId: '1' }))
  })
})

describe('estructura: toda página y todo endpoint pasan por el guard', () => {
  const APP = fileURLToPath(new URL('../app/', import.meta.url))
  const walk = (dir: string): string[] =>
    readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(join(dir, e.name)) : [join(dir, e.name)]))
  const files = walk(APP).map((f) => relative(APP, f).split('\\').join('/'))

  // Las únicas excepciones: el login es donde se obtiene la credencial y el logout sólo borra
  // la cookie. Ninguna de las dos muestra datos.
  const PUBLIC = new Set(['login/page.tsx', 'api/login/route.ts', 'api/logout/route.ts'])

  it('hay páginas y endpoints que revisar', () => {
    assert.ok(files.includes('page.tsx'))
    assert.ok(files.includes('r/[id]/page.tsx'))
    assert.ok(files.includes('api/r/[id]/route.ts'))
  })

  for (const file of files.filter((f) => /(^|\/)(page\.tsx|route\.ts)$/.test(f))) {
    it(file, () => {
      const source = readFileSync(join(APP, file), 'utf8')
      if (PUBLIC.has(file)) return
      if (file.endsWith('page.tsx')) {
        // La primera sentencia del componente de la página, antes de leer parámetros o datos.
        assert.match(source, /export default async function \w+\([^)]*(\([^)]*\)[^)]*)*\) \{\n {2}const sesion = await requireSession\(\)\n/, `${file} no llama a requireSession() primero`)
        return
      }
      const handlers = source.match(/export (const|function|async function) (GET|POST|PUT|PATCH|DELETE)\b/g) ?? []
      const guarded = source.match(/withSesion\b[^(]*\(/g) ?? []
      assert.ok(handlers.length > 0, `${file} no exporta handlers`)
      assert.equal(guarded.length, handlers.length, `${file}: cada handler pasa por withSesion`)
    })
  }
})
