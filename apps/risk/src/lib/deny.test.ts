// Denegación (R-28) contra los route handlers reales de la app: sin credencial, con una cookie
// inválida, vencida, adulterada o firmada con otro secreto, y sin configuración, cada endpoint de
// datos responde con un cuerpo fijo, sin datos, y sin tocar la base. Además, un test de
// estructura falla si una página o un endpoint nuevo no pasa por el guard.

import assert from 'node:assert/strict'
import { readdirSync, readFileSync } from 'node:fs'
import { join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { after, before, describe, it } from 'node:test'

import { GET as googleCallbackGET } from '../app/api/auth/google/callback/route.ts'
import { GET as googleStartGET } from '../app/api/auth/google/start/route.ts'
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
import { GET as riesgosDeEmpresaGET } from '../app/api/entre-contextos/empresas/[empresa]/riesgos/route.ts'
import { emitirToken, generarParDeClaves, jwksDe } from '@del-campo/identidad'
import { guardRequest } from './guard.ts'
import { COOKIE_IDENTIDAD } from './identidad.ts'
import { modoAcceso } from './modo.ts'
import { variableDeConexion } from './server.ts'
import { issueSession, SESSION_COOKIE, SESSION_TTL_SECONDS, verifySession } from './sesion.ts'

const ORIGIN = 'http://localhost:3200'
const SECRET = 'secreto-de-sesion-de-prueba-0123456789abcdef'
const OTRO = 'otro-secreto-de-sesion-de-prueba-0123456789'
const PERSONA = 'PER-01M50T00000000000000000002'
const ORG = 'ORG-01M3QSRT003GPNZ7ZJSV8AHDAR'
const RIESGO = 'RSK-01M3QSRT00DSK3VYVBFPTPJXM6'
const VARS = ['RISK_UI_SESSION_SECRET', 'RISK_DATABASE_URL', 'RISK_OIDC_DATABASE_URL', 'AUTH_MODE', 'RISK_BASE_URL', 'RISK_GOOGLE_CLIENT_ID', 'RISK_GOOGLE_CLIENT_SECRET', 'RISK_JWKS_BROKER'] as const
const saved: Partial<Record<(typeof VARS)[number], string | undefined>> = {}

const configure = (): void => {
  for (const v of ['AUTH_MODE', 'RISK_OIDC_DATABASE_URL', 'RISK_BASE_URL', 'RISK_GOOGLE_CLIENT_ID', 'RISK_GOOGLE_CLIENT_SECRET', 'RISK_JWKS_BROKER'] as const) Reflect.deleteProperty(process.env, v)
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
  // la cookie. Ninguna de las dos muestra datos. La entrada con Google es donde se obtiene la
  // sesión del modo oidc, y en legacy no existe (T-0035).
  const PUBLIC = new Set([
    'login/page.tsx', 'api/login/route.ts', 'api/logout/route.ts', 'api/auth/google/start/route.ts', 'api/auth/google/callback/route.ts',
  ])

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
        // Toda lectura pasa por `sesion.datos`, que en oidc corre como la persona (T-0035): una
        // página no usa la conexión de la app.
        assert.doesNotMatch(source, /lib\/server\.ts|database\(/, `${file} lee con la conexión de la app en vez de sesion.datos`)
        return
      }
      const handlers = source.match(/export (const|function|async function) (GET|POST|PUT|PATCH|DELETE)\b/g) ?? []
      assert.ok(handlers.length > 0, `${file} no exporta handlers`)
      // Lo que llama otro contexto pasa por el token (C4-03a), sólo lee y nunca por la cookie.
      if (file.startsWith('api/entre-contextos/')) {
        assert.equal((source.match(/withLlamada\b[^(]*\(/g) ?? []).length, handlers.length, `${file}: cada handler pasa por withLlamada`)
        assert.doesNotMatch(source, /withSesion/, `${file} no usa la sesión`)
        assert.ok(handlers.every((h) => h.endsWith('GET')), `${file} sólo exporta GET`)
        return
      }
      const guarded = source.match(/withSesion\b[^(]*\(/g) ?? []
      assert.equal(guarded.length, handlers.length, `${file}: cada handler pasa por withSesion`)
      assert.doesNotMatch(source, /withLlamada/, `${file}: el token sólo vale bajo api/entre-contextos/`)
    })
  }
})

describe('AUTH_MODE (T-0035)', () => {
  const oidc = (): void => {
    process.env.AUTH_MODE = 'oidc'
    process.env.RISK_BASE_URL = ORIGIN
    process.env.RISK_GOOGLE_CLIENT_ID = 'cliente-de-prueba.apps.example.test'
    process.env.RISK_GOOGLE_CLIENT_SECRET = 'secreto-de-cliente-de-prueba'
    // La conexión de `risk_oidc` (0009), también una base que no existe.
    process.env.RISK_OIDC_DATABASE_URL = 'postgres://localhost:1/no_existe_oidc_test'
  }

  it('sin valor es legacy; un valor desconocido falla en vez de elegir un modo', () => {
    assert.equal(modoAcceso(undefined), 'legacy')
    assert.equal(modoAcceso(' legacy '), 'legacy')
    assert.equal(modoAcceso('oidc'), 'oidc')
    assert.throws(() => modoAcceso('OIDC'))
  })

  it('en legacy la entrada con Google no existe', async () => {
    assert.equal((await googleStartGET()).status, 404)
    assert.equal((await googleCallbackGET(new Request(`${ORIGIN}/api/auth/google/callback?code=c&state=s`))).status, 404)
  })

  describe('en oidc, sin una sesión de Google válida: 401 sin datos y sin tocar la base', () => {
    for (const e of ENDPOINTS) {
      for (const [nombre, headers] of [
        ['sin cookie', {}],
        ['con una sesión de usuario y contraseña bien firmada', cookie(valida())],
        ['con una cookie de Google adulterada', { cookie: `${COOKIE_IDENTIDAD}=v1.no-es-una-sesion` }],
      ] as const) {
        it(`${e.name}, ${nombre}`, async () => {
          oidc()
          try {
            const r = await e.call(headers)
            assert.equal(r.status, 401)
            assert.deepEqual(await r.json(), { error: 'sin credencial válida' })
          } finally {
            configure()
          }
        })
      }
    }
  })

  it('en oidc sin la configuración de Google, todo 503', async () => {
    process.env.AUTH_MODE = 'oidc'
    try {
      for (const e of ENDPOINTS) assert.equal((await e.call({})).status, 503, e.name)
      assert.equal((await googleStartGET()).status, 503)
    } finally {
      configure()
    }
  })

  it('en oidc la conexión es la de risk_oidc: con sólo la de risk_app (RISK_DATABASE_URL), todo 503 (0009)', async () => {
    oidc()
    Reflect.deleteProperty(process.env, 'RISK_OIDC_DATABASE_URL')
    try {
      assert.ok((process.env.RISK_DATABASE_URL ?? '') !== '')
      for (const e of ENDPOINTS) assert.equal((await e.call({})).status, 503, e.name)
      assert.equal((await googleStartGET()).status, 503)
      assert.equal(variableDeConexion({ AUTH_MODE: 'oidc' }), 'RISK_OIDC_DATABASE_URL')
      assert.equal(variableDeConexion({}), 'RISK_DATABASE_URL')
      assert.equal(variableDeConexion({ AUTH_MODE: 'legacy' }), 'RISK_DATABASE_URL')
    } finally {
      configure()
    }
  })

  it('en oidc, POST /api/login no existe', async () => {
    oidc()
    try {
      const r = await loginPOST(new Request(`${ORIGIN}/api/login`, { method: 'POST', headers: { origin: ORIGIN }, body: new URLSearchParams({ usuario: 'x', contrasena: 'y' }) }))
      assert.equal(r.status, 404)
    } finally {
      configure()
    }
  })
})

describe('estructura: el token entre contextos sólo entra por withLlamada (T-0035, C4-03a)', () => {
  const APP = fileURLToPath(new URL('../app/', import.meta.url))
  const walk = (dir: string): string[] =>
    readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(join(dir, e.name)) : [join(dir, e.name)]))
  const LIB = fileURLToPath(new URL('./', import.meta.url))

  it('sólo lib/llamada.ts importa entre-contextos.ts, admitirLlamada o verificarToken', () => {
    const fuentes = [...walk(APP), ...walk(LIB).filter((f) => !/\.test\.ts$|entre-contextos\.ts$/.test(f))]
    const usan = fuentes.filter((f) => /entre-contextos\.ts|verificarToken|admitirLlamada/.test(readFileSync(f, 'utf8')))
    assert.deepEqual(usan.map((f) => relative(LIB, f)), ['llamada.ts'])
  })

  it('sólo las rutas bajo api/entre-contextos/ usan withLlamada', () => {
    const usan = walk(APP).filter((f) => readFileSync(f, 'utf8').includes('withLlamada')).map((f) => relative(APP, f).split('\\').join('/'))
    assert.ok(usan.length > 0)
    assert.ok(usan.every((f) => f.startsWith('api/entre-contextos/')), usan.join(', '))
  })
})

describe('GET /api/entre-contextos/empresas/:empresa/riesgos sin un token válido (C4-03a)', () => {
  const EMPRESA = '00000000-0000-4000-8000-000000000001'
  const llamar = (headers: Record<string, string> = {}): Promise<Response> =>
    riesgosDeEmpresaGET(new Request(`${ORIGIN}/api/entre-contextos/empresas/${EMPRESA}/riesgos`, { headers }), { params: Promise.resolve({ empresa: EMPRESA }) })

  const oidcConJwks = async () => {
    const broker = await generarParDeClaves()
    process.env.AUTH_MODE = 'oidc'
    // Una base que no existe: si el endpoint la consultara, el test fallaría.
    process.env.RISK_OIDC_DATABASE_URL = 'postgres://localhost:1/no_existe_oidc_test'
    process.env.RISK_JWKS_BROKER = JSON.stringify(jwksDe([broker.publica]))
    return broker
  }
  const emision = (cambios: Partial<Parameters<typeof emitirToken>[1]> = {}): Parameters<typeof emitirToken>[1] =>
    ({ emisor: 'broker-os', audiencia: 'risk-os', proveedor: 'google', sujeto: 'sujeto-de-prueba', ...cambios })

  it('en legacy no existe: 404', async () => {
    assert.equal((await llamar()).status, 404)
  })

  it('en oidc sin RISK_JWKS_BROKER: 503', async () => {
    await oidcConJwks()
    Reflect.deleteProperty(process.env, 'RISK_JWKS_BROKER')
    try {
      const r = await llamar()
      assert.equal(r.status, 503)
      assert.deepEqual(await r.json(), { error: 'la UI no está configurada' })
    } finally {
      configure()
    }
  })

  it('sin token, con una cookie o firmado con otra clave: 401 sin tocar la base', async () => {
    await oidcConJwks()
    const otra = await generarParDeClaves()
    try {
      const casos: [string, Record<string, string>][] = [
        ['sin token', {}],
        ['con una cookie de sesión', cookie(valida())],
        ['con un bearer que no es un token', { authorization: 'Bearer no-es-un-token' }],
        ['firmado con otra clave', { authorization: `Bearer ${await emitirToken(otra.privada, emision())}` }],
      ]
      for (const [nombre, headers] of casos) {
        const r = await llamar(headers)
        assert.equal(r.status, 401, nombre)
        assert.equal(r.headers.get('cache-control'), 'no-store', nombre)
        assert.deepEqual(await r.json(), { error: 'sin credencial válida' }, nombre)
      }
    } finally {
      configure()
    }
  })

  it('un token bien firmado pero con otro iss, otro aud o vencido: 401 sin tocar la base', async () => {
    const broker = await oidcConJwks()
    try {
      const vencido = Math.floor(Date.now() / 1000) - 3600
      for (const [nombre, e] of [
        ['otro iss', emision({ emisor: 'communication-os' })],
        ['otro aud', emision({ audiencia: 'broker-os' })],
        ['vencido', emision({ ahora: vencido })],
      ] as const) {
        const r = await llamar({ authorization: `Bearer ${await emitirToken(broker.privada, e)}` })
        assert.equal(r.status, 401, nombre)
      }
    } finally {
      configure()
    }
  })
})
