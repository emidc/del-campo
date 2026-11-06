// Denegación (R-28) contra los route handlers reales de la app: sin sesión, con una sesión
// inválida y sin configuración, cada endpoint de datos y el de envío responden con un
// cuerpo fijo, sin datos, y sin tocar la base. Además, un test de estructura falla si una
// página o un endpoint nuevo no pasa por el guard.

import assert from 'node:assert/strict'
import { readdirSync, readFileSync } from 'node:fs'
import { join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { after, before, describe, it } from 'node:test'

import { sellarSesion, type Identidad } from '@del-campo/identidad'

import { GET as threadGET } from '../app/api/conversations/[id]/route.ts'
import { POST as replyPOST } from '../app/api/conversations/[id]/reply/route.ts'
import { GET as listGET } from '../app/api/conversations/route.ts'
import { GET as reprocessGET } from '../app/api/jobs/reprocess/route.ts'
import { GET as retentionGET } from '../app/api/jobs/retention/route.ts'
import { POST as logoutPOST } from '../app/api/logout/route.ts'
import { COOKIE_IDENTIDAD, PROPOSITO } from './identidad.ts'

const ORIGIN = 'http://localhost:3100'
const SECRET = 'secreto-de-sesion-de-prueba-0123456789abcdef'
const CONFIG: Record<string, string> = {
  COMMUNICATION_BASE_URL: ORIGIN,
  COMMUNICATION_GOOGLE_CLIENT_ID: 'cliente-de-prueba.apps.example.test',
  COMMUNICATION_GOOGLE_CLIENT_SECRET: 'secreto-de-cliente-de-prueba',
  COMMUNICATION_UI_SESSION_SECRET: SECRET,
  // Una base que no existe: si un handler llegara a consultarla, el test fallaría.
  COMMUNICATION_DATABASE_URL: 'postgres://localhost:1/no_existe_dev',
}
const VARS = [...Object.keys(CONFIG), 'AUTH_MODE'] as const

const saved = new Map<string, string | undefined>()

const configure = (): void => {
  for (const [k, v] of Object.entries(CONFIG)) process.env[k] = v
  delete process.env.AUTH_MODE
}
const unconfigure = (): void => {
  delete process.env.COMMUNICATION_GOOGLE_CLIENT_ID
  delete process.env.COMMUNICATION_GOOGLE_CLIENT_SECRET
  delete process.env.COMMUNICATION_UI_SESSION_SECRET
}

const IDENTIDAD: Identidad = {
  proveedor: 'google',
  sujeto: 'sub-sintetico-deny',
  email: 'persona@sintetico.test',
  emailVerificado: true,
  nombre: null,
}
const sesionCon = (secreto: string): Promise<string> =>
  sellarSesion(IDENTIDAD, { cookie: COOKIE_IDENTIDAD, proposito: PROPOSITO, secreto, segura: false })

/** Una sesión válida: sólo se usa donde la negativa llega antes que la base. */
let validCookie: string

before(async () => {
  for (const v of VARS) saved.set(v, process.env[v])
  configure()
  validCookie = await sesionCon(SECRET)
})
after(() => {
  for (const [k, v] of saved) {
    if (v === undefined) Reflect.deleteProperty(process.env, k)
    else process.env[k] = v
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

const CREDENTIALS: { readonly name: string; readonly headers: () => Promise<Record<string, string>> }[] = [
  { name: 'sin cookie', headers: () => Promise.resolve({}) },
  { name: 'cookie basura', headers: () => Promise.resolve({ cookie: `${COOKIE_IDENTIDAD}=basura` }) },
  { name: 'sesión sellada con otro secreto', headers: async () => ({ cookie: `${COOKIE_IDENTIDAD}=${await sesionCon(`${SECRET}-otro`)}` }) },
  {
    name: 'la sesión válida bajo el nombre de la cookie retirada de D-0066',
    headers: () => Promise.resolve({ cookie: `co01_session=${validCookie}` }),
  },
  { name: 'Basic Auth', headers: () => Promise.resolve({ authorization: `Basic ${Buffer.from('usuario:contraseña').toString('base64')}` }) },
]

describe('denegación sin sesión válida (R-28)', () => {
  for (const endpoint of ENDPOINTS) {
    for (const credential of CREDENTIALS) {
      it(`${endpoint.name}, ${credential.name}: 401 sin datos`, async () => {
        configure()
        const response = await endpoint.call(await credential.headers())
        assert.equal(response.status, 401)
        assert.deepEqual(await response.json(), { error: 'sin credencial válida' })
        assert.equal(response.headers.get('cache-control'), 'no-store')
      })
    }
  }
})

describe('sin configuración se niega todo', () => {
  for (const endpoint of ENDPOINTS) {
    it(`${endpoint.name}, aun con una sesión que antes era válida: 503 sin datos`, async () => {
      unconfigure()
      try {
        const response = await endpoint.call({ cookie: `${COOKIE_IDENTIDAD}=${validCookie}` })
        assert.equal(response.status, 503)
        assert.deepEqual(await response.json(), { error: 'la UI no está configurada' })
      } finally {
        configure()
      }
    })
  }
})

describe('AUTH_MODE retirado o desconocido (fase 5 de T-0035)', () => {
  for (const valor of ['legacy', 'oidcc']) {
    for (const endpoint of ENDPOINTS) {
      it(`${endpoint.name} con AUTH_MODE=${valor}: lanza, no entra por otra regla`, async () => {
        process.env.AUTH_MODE = valor
        try {
          await assert.rejects(endpoint.call({ cookie: `${COOKIE_IDENTIDAD}=${validCookie}` }), /se retiró en la fase 5|no es un modo válido/)
        } finally {
          configure()
        }
      })
    }
  }
})

describe('origen', () => {
  it('un POST de otro origen se niega, también con sesión válida', async () => {
    const reply = await replyPOST(
      new Request(`${ORIGIN}/api/conversations/1/reply`, {
        method: 'POST',
        headers: { origin: 'https://otro.example.test', cookie: `${COOKIE_IDENTIDAD}=${validCookie}`, 'content-type': 'application/json' },
        body: '{}',
      }),
      params('1'),
    )
    assert.equal(reply.status, 403)
    const logout = logoutPOST(new Request(`${ORIGIN}/api/logout`, { method: 'POST', headers: { origin: 'https://otro.example.test' } }))
    assert.equal(logout.status, 403)
  })

  it('el logout del mismo origen borra la sesión de Google y vuelve al login', () => {
    const logout = logoutPOST(new Request(`${ORIGIN}/api/logout`, { method: 'POST', headers: { origin: ORIGIN } }))
    assert.equal(logout.status, 303)
    assert.equal(logout.headers.get('location'), `${ORIGIN}/login`)
    const cookies = logout.headers.getSetCookie()
    assert.equal(cookies.length, 1)
    assert.match(cookies[0] ?? '', new RegExp(`^${COOKIE_IDENTIDAD}=; .*Max-Age=0`))
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
    { name: 'la sesión válida de la UI', headers: () => ({ cookie: `${COOKIE_IDENTIDAD}=${validCookie}` }) },
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

  // Las únicas excepciones, con su motivo: el login y la entrada con Google son donde se
  // obtiene la sesión (T-0035), el logout solo borra la cookie, y el webhook lo protege la
  // firma de Meta.
  const PUBLIC = new Set([
    'login/page.tsx',
    'api/logout/route.ts',
    'webhook/route.ts',
    'api/auth/google/start/route.ts',
    'api/auth/google/callback/route.ts',
  ])
  // Las tareas programadas no usan la sesión de la UI sino su propio secreto (T-0026).
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

describe('estructura: el token entre contextos no tiene endpoint todavía (T-0035)', () => {
  // Ni llamadas reales ni endpoints de prueba accesibles en producción: la verificación del
  // token se prueba contra la base, no por HTTP. El primer endpoint que lo use se agrega con
  // su tarea, su JWKS configurado y este test actualizado.
  const APP = fileURLToPath(new URL('../app/', import.meta.url))
  const walk = (dir: string): string[] =>
    readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(join(dir, e.name)) : [join(dir, e.name)]))

  const LIB = fileURLToPath(new URL('./', import.meta.url))

  it('ninguna página, endpoint ni handler importa entre-contextos.ts ni verificarToken', () => {
    const fuentes = [...walk(APP), ...walk(LIB).filter((f) => !/\.test\.ts$|entre-contextos\.ts$/.test(f))]
    const usan = fuentes.filter((f) => /entre-contextos|verificarToken|admitirLlamada/.test(readFileSync(f, 'utf8')))
    assert.deepEqual(usan.map((f) => relative(APP, f)), [])
  })
})
