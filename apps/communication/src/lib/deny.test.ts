// Denegación (R-28) contra los route handlers reales de la app: sin credencial, con
// credencial inválida y sin configuración, cada endpoint de datos y el de envío
// responden con un cuerpo fijo, sin datos, y sin tocar la base. Además, un test de
// estructura falla si una página o un endpoint nuevo no pasa por el guard.

import assert from 'node:assert/strict'
import { readdirSync, readFileSync } from 'node:fs'
import { join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { after, before, describe, it } from 'node:test'

import { GET as threadGET } from '../app/api/conversations/[id]/route.ts'
import { POST as replyPOST } from '../app/api/conversations/[id]/reply/route.ts'
import { GET as listGET } from '../app/api/conversations/route.ts'
import { POST as loginPOST } from '../app/api/login/route.ts'
import { GET as reprocessGET } from '../app/api/jobs/reprocess/route.ts'
import { GET as retentionGET } from '../app/api/jobs/retention/route.ts'
import { POST as logoutPOST } from '../app/api/logout/route.ts'
import { authConfigFromEnv, hashPassword, issueSession, SESSION_COOKIE } from './auth.ts'

const ORIGIN = 'http://localhost:3100'
const USER = 'operador-de-prueba'
const PASSWORD = 'contraseña-de-prueba-larga-0001'
const SECRET = 'secreto-de-sesion-de-prueba-0123456789abcdef'
const VARS = ['COMMUNICATION_UI_USER', 'COMMUNICATION_UI_PASSWORD_HASH', 'COMMUNICATION_UI_SESSION_SECRET', 'COMMUNICATION_DATABASE_URL'] as const

const saved: Partial<Record<(typeof VARS)[number], string | undefined>> = {}
let hash: string
let validCookie: string

const configure = (): void => {
  process.env.COMMUNICATION_UI_USER = USER
  process.env.COMMUNICATION_UI_PASSWORD_HASH = hash
  process.env.COMMUNICATION_UI_SESSION_SECRET = SECRET
  // Una base que no existe: si un handler llegara a consultarla, el test fallaría.
  process.env.COMMUNICATION_DATABASE_URL = 'postgres://localhost:1/no_existe_dev'
}
const unconfigure = (): void => {
  delete process.env.COMMUNICATION_UI_USER
  delete process.env.COMMUNICATION_UI_PASSWORD_HASH
  delete process.env.COMMUNICATION_UI_SESSION_SECRET
}

before(async () => {
  for (const v of VARS) saved[v] = process.env[v]
  hash = await hashPassword(PASSWORD)
  configure()
  const result = authConfigFromEnv(process.env)
  if (!result.ok) throw new Error(result.reason)
  validCookie = issueSession(result.config)
})
after(() => {
  for (const v of VARS) {
    const value = saved[v]
    if (value === undefined) Reflect.deleteProperty(process.env, v)
    else process.env[v] = value
  }
})

const params = (id: string) => ({ params: Promise.resolve({ id }) })

interface Endpoint {
  readonly name: string
  readonly call: (headers: Record<string, string>) => Promise<Response>
}

const ENDPOINTS: Endpoint[] = [
  { name: 'GET /api/conversations', call: (headers) => listGET(new Request(`${ORIGIN}/api/conversations`, { headers })) },
  {
    name: 'GET /api/conversations/1',
    call: (headers) => threadGET(new Request(`${ORIGIN}/api/conversations/1`, { headers }), params('1')),
  },
  {
    name: 'POST /api/conversations/1/reply',
    call: (headers) =>
      replyPOST(
        new Request(`${ORIGIN}/api/conversations/1/reply`, {
          method: 'POST',
          headers: { origin: ORIGIN, 'content-type': 'application/json', ...headers },
          body: JSON.stringify({ idempotencyKey: '3f1c2a9e-5b7d-4c1e-9a2b-0d4e6f8a1b2c', body: 'hola' }),
        }),
        params('1'),
      ),
  },
]

const otherSecretCookie = (): string => {
  const other = authConfigFromEnv({ ...process.env, COMMUNICATION_UI_SESSION_SECRET: `${SECRET}-otro` })
  if (!other.ok) throw new Error(other.reason)
  return issueSession(other.config)
}

const CREDENTIALS: { readonly name: string; readonly headers: () => Record<string, string> }[] = [
  { name: 'sin cookie', headers: () => ({}) },
  { name: 'cookie basura', headers: () => ({ cookie: `${SESSION_COOKIE}=basura` }) },
  { name: 'cookie con otro secreto', headers: () => ({ cookie: `${SESSION_COOKIE}=${otherSecretCookie()}` }) },
  {
    name: 'cookie vencida',
    headers: () => {
      const r = authConfigFromEnv(process.env)
      if (!r.ok) throw new Error(r.reason)
      return { cookie: `${SESSION_COOKIE}=${issueSession(r.config, new Date(Date.now() - 9 * 3600 * 1000))}` }
    },
  },
  { name: 'Basic Auth con la contraseña correcta', headers: () => ({ authorization: `Basic ${Buffer.from(`${USER}:${PASSWORD}`).toString('base64')}` }) },
]

describe('denegación sin credencial válida (R-28)', () => {
  for (const endpoint of ENDPOINTS) {
    for (const credential of CREDENTIALS) {
      it(`${endpoint.name}, ${credential.name}: 401 sin datos`, async () => {
        configure()
        const response = await endpoint.call(credential.headers())
        assert.equal(response.status, 401)
        assert.deepEqual(await response.json(), { error: 'sin credencial válida' })
        assert.equal(response.headers.get('cache-control'), 'no-store')
      })
    }
  }
})

describe('sin configuración se niega todo (D-0066)', () => {
  for (const endpoint of ENDPOINTS) {
    it(`${endpoint.name}, aun con una cookie que antes era válida: 503 sin datos`, async () => {
      unconfigure()
      try {
        const response = await endpoint.call({ cookie: `${SESSION_COOKIE}=${validCookie}` })
        assert.equal(response.status, 503)
        assert.deepEqual(await response.json(), { error: 'la UI no está configurada' })
      } finally {
        configure()
      }
    })
  }

  it('el login sin configuración responde 503 y no emite cookie', async () => {
    unconfigure()
    try {
      const response = await loginPOST(loginRequest(USER, PASSWORD))
      assert.equal(response.status, 503)
      assert.equal(response.headers.get('set-cookie'), null)
    } finally {
      configure()
    }
  })
})

const loginRequest = (user: string, password: string, origin: string | null = ORIGIN): Request =>
  new Request(`${ORIGIN}/api/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded', ...(origin === null ? {} : { origin }) },
    body: new URLSearchParams({ user, password }).toString(),
  })

describe('login y origen', () => {
  it('con la credencial correcta emite la cookie y redirige a la lista', async () => {
    const response = await loginPOST(loginRequest(USER, PASSWORD))
    assert.equal(response.status, 303)
    assert.equal(response.headers.get('location'), `${ORIGIN}/`)
    assert.match(response.headers.get('set-cookie') ?? '', /^co01_session=v1\.\d+\.[A-Za-z0-9_-]{43}; Path=\/; HttpOnly; SameSite=Strict/)
  })

  it('con la credencial incorrecta vuelve al login sin cookie', async () => {
    for (const [user, password] of [[USER, 'otra-contraseña-de-prueba-larga'], ['otro', PASSWORD], ['', '']] as const) {
      const response = await loginPOST(loginRequest(user, password))
      assert.equal(response.status, 303)
      assert.equal(response.headers.get('location'), `${ORIGIN}/login?error=1`)
      assert.equal(response.headers.get('set-cookie'), null)
    }
  })

  it('un POST de otro origen o sin Origin se niega, también con cookie válida', async () => {
    assert.equal((await loginPOST(loginRequest(USER, PASSWORD, 'https://otro.example.test'))).status, 403)
    assert.equal((await loginPOST(loginRequest(USER, PASSWORD, null))).status, 403)
    const reply = await replyPOST(
      new Request(`${ORIGIN}/api/conversations/1/reply`, {
        method: 'POST',
        headers: { origin: 'https://otro.example.test', cookie: `${SESSION_COOKIE}=${validCookie}`, 'content-type': 'application/json' },
        body: '{}',
      }),
      params('1'),
    )
    assert.equal(reply.status, 403)
    const logout = logoutPOST(new Request(`${ORIGIN}/api/logout`, { method: 'POST', headers: { origin: 'https://otro.example.test' } }))
    assert.equal(logout.status, 403)
  })
})

describe('tareas programadas: sin CRON_SECRET no corre nada (T-0026)', () => {
  const CRON = 'secreto-de-cron-de-prueba-0123456789abcdef'
  const JOB_ENDPOINTS = [
    { name: 'GET /api/jobs/retention', call: retentionGET, url: `${ORIGIN}/api/jobs/retention` },
    { name: 'GET /api/jobs/reprocess', call: reprocessGET, url: `${ORIGIN}/api/jobs/reprocess` },
  ]
  const DENIED: { readonly name: string; readonly headers: () => Record<string, string> }[] = [
    { name: 'sin header', headers: () => ({}) },
    { name: 'otro secreto', headers: () => ({ authorization: `Bearer ${CRON}-otro` }) },
    { name: 'el secreto sin Bearer', headers: () => ({ authorization: CRON }) },
    { name: 'Bearer vacío', headers: () => ({ authorization: 'Bearer ' }) },
    { name: 'la cookie válida de la UI', headers: () => ({ cookie: `${SESSION_COOKIE}=${validCookie}` }) },
  ]
  let savedCron: string | undefined
  before(() => {
    savedCron = process.env.CRON_SECRET
  })
  after(() => {
    if (savedCron === undefined) Reflect.deleteProperty(process.env, 'CRON_SECRET')
    else process.env.CRON_SECRET = savedCron
  })

  for (const endpoint of JOB_ENDPOINTS) {
    for (const denied of DENIED) {
      it(`${endpoint.name}, ${denied.name}: 401 sin datos`, async () => {
        process.env.CRON_SECRET = CRON
        const response = await endpoint.call(new Request(endpoint.url, { headers: denied.headers() }))
        assert.equal(response.status, 401)
        assert.deepEqual(await response.json(), { error: 'sin credencial válida' })
      })
    }
    it(`${endpoint.name}, sin CRON_SECRET configurado: 503 aun con un Bearer`, async () => {
      delete process.env.CRON_SECRET
      const response = await endpoint.call(new Request(endpoint.url, { headers: { authorization: `Bearer ${CRON}` } }))
      assert.equal(response.status, 503)
      assert.deepEqual(await response.json(), { error: 'las tareas no están configuradas' })
    })
    it(`${endpoint.name}, con un CRON_SECRET corto: 503`, async () => {
      process.env.CRON_SECRET = 'corto'
      const response = await endpoint.call(new Request(endpoint.url, { headers: { authorization: 'Bearer corto' } }))
      assert.equal(response.status, 503)
    })
  }
})

describe('estructura: toda página y todo endpoint pasan por el guard', () => {
  const APP = fileURLToPath(new URL('../app/', import.meta.url))
  const walk = (dir: string): string[] =>
    readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
      e.isDirectory() ? walk(join(dir, e.name)) : [join(dir, e.name)],
    )
  const files = walk(APP).map((f) => relative(APP, f).split('\\').join('/'))

  // Las únicas excepciones, con su motivo: el login es donde se obtiene la credencial,
  // el logout solo borra la cookie, y el webhook lo protege la firma de Meta (D-0066).
  const PUBLIC = new Set(['login/page.tsx', 'api/login/route.ts', 'api/logout/route.ts', 'webhook/route.ts'])
  // Las tareas programadas no usan la credencial de la UI sino su propio secreto (T-0026).
  const JOBS = 'api/jobs/'

  it('hay páginas y endpoints que revisar', () => {
    assert.ok(files.includes('page.tsx'))
    assert.ok(files.includes('api/conversations/[id]/reply/route.ts'))
  })

  for (const file of files.filter((f) => /(^|\/)(page\.tsx|route\.ts)$/.test(f))) {
    it(file, () => {
      const source = readFileSync(join(APP, file), 'utf8')
      if (PUBLIC.has(file)) return
      if (file.startsWith(JOBS)) {
        const handlers = source.match(/export (const|function|async function) (GET|POST|PUT|PATCH|DELETE)\b/g) ?? []
        const guarded = source.match(/withJobSecret\(/g) ?? []
        assert.ok(handlers.length > 0, `${file} no exporta handlers`)
        assert.equal(guarded.length, handlers.length, `${file}: cada handler pasa por withJobSecret`)
        return
      }
      if (file.endsWith('page.tsx')) assert.match(source, /await requireSession\(\)/, `${file} no llama a requireSession()`)
      else {
        const handlers = source.match(/export (const|function|async function) (GET|POST|PUT|PATCH|DELETE)\b/g) ?? []
        const guarded = source.match(/withSession\(/g) ?? []
        assert.ok(handlers.length > 0, `${file} no exporta handlers`)
        assert.equal(guarded.length, handlers.length, `${file}: cada handler pasa por withSession`)
      }
    })
  }
})
