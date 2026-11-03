// T-0035, incremento 4: la entrada con Google y el acceso por persona de Communication OS,
// de punta a punta contra los route handlers y delcampo_communication_test (R-26). El
// canje con Google se reemplaza por una identidad sintética: lo que se prueba es lo que
// pasa después (admisión en la base, sesión, guard, permisos y revocación).
//
// La base es compartida con los tests del contexto y no se revierte por request, así que
// cada corrida usa sujetos, emails y teléfonos propios.

import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { after, before, describe, it } from 'node:test'

import type { Sql, TextSender } from '@del-campo/communication'
import { sellarHandshake, sellarSesion, type Identidad } from '@del-campo/identidad'

import { GET as listGET } from '../app/api/conversations/route.ts'
import { GET as threadGET } from '../app/api/conversations/[id]/route.ts'
import { POST as loginPOST } from '../app/api/login/route.ts'
import { GET as startGET } from '../app/api/auth/google/start/route.ts'
import { GET as callbackGET } from '../app/api/auth/google/callback/route.ts'
import { withSession } from './guard.ts'
import { replyResponse } from './handlers.ts'
import { callbackResponse } from './entrada.ts'
import { COOKIE_HANDSHAKE, COOKIE_IDENTIDAD, configEntrada, PROPOSITO } from './identidad.ts'
import { database } from './server.ts'

const ORIGIN = 'http://localhost:3100'
const SECRET = 'secreto-de-sesion-de-prueba-0123456789abcdef'
const RUN = randomUUID().slice(0, 8)

const testDatabaseUrl = (): string => {
  const own = process.env.COMMUNICATION_DATABASE_URL
  if (own !== undefined && own !== '') return own
  const url = new URL(process.env.DATABASE_URL ?? 'postgres://localhost:5432/postgres')
  url.pathname = '/delcampo_communication_test'
  return url.href
}

const ENV: Record<string, string> = {
  AUTH_MODE: 'oidc',
  COMMUNICATION_BASE_URL: ORIGIN,
  COMMUNICATION_GOOGLE_CLIENT_ID: 'cliente-de-prueba.apps.example.test',
  COMMUNICATION_GOOGLE_CLIENT_SECRET: 'secreto-de-cliente-de-prueba',
  COMMUNICATION_UI_SESSION_SECRET: SECRET,
}
const saved = new Map<string, string | undefined>()
let sql: Sql

before(() => {
  const url = testDatabaseUrl()
  // Crea la base si falta y aplica las migraciones, con el runner del contexto: estos
  // tests pueden correr antes que los del contexto.
  execFileSync(process.execPath, [fileURLToPath(new URL('../../../../contexts/communication/src/persistence/cli.ts', import.meta.url)), 'create'], {
    env: { ...process.env, COMMUNICATION_DATABASE_URL: url },
    stdio: 'ignore',
  })
  for (const [k, v] of Object.entries({ ...ENV, COMMUNICATION_DATABASE_URL: url })) {
    saved.set(k, process.env[k])
    process.env[k] = v
  }
  sql = database()
})
after(async () => {
  for (const [k, v] of saved) {
    if (v === undefined) Reflect.deleteProperty(process.env, k)
    else process.env[k] = v
  }
  await sql.end()
})

const config = () => {
  const c = configEntrada(process.env)
  if (c === null) throw new Error('configuración oidc incompleta en el test')
  return c
}

const identidad = (nombre: string, email = `${nombre}-${RUN}@gmail.example`, emailVerificado = true): Identidad => ({
  proveedor: 'google',
  sujeto: `sub-${nombre}-${RUN}`,
  email,
  emailVerificado,
  nombre: null,
})

/** Una invitación vigente, como la deja la CLI (`invitar`), cargada directo. */
const invitar = async (email: string, rol: string, dias = 7): Promise<string> => {
  const [u] = await sql<{ id: string }[]>`
    insert into communication.app_user (email, role, status) values (${email.toLowerCase()}, ${rol}, 'INVITED') returning id`
  if (u === undefined) throw new Error('sin fila')
  await sql`
    insert into communication.user_invitation (user_id, email, expires_at)
    values (${u.id}, ${email.toLowerCase()}, now() + make_interval(days => ${dias}))`
  return u.id
}

const cookieDe = (response: Response, nombre: string): string | null => {
  for (const c of response.headers.getSetCookie()) {
    const [par] = c.split(';')
    const [k, ...v] = (par ?? '').split('=')
    if (k === nombre) return v.join('=')
  }
  return null
}

/** Vuelve de Google con `quien` y devuelve la respuesta del callback. */
const volverDeGoogle = async (quien: Identidad, conHandshake = true): Promise<Response> => {
  const handshake = await sellarHandshake({ state: 's', nonce: 'n', codeVerifier: 'v' }, SECRET, PROPOSITO)
  const request = new Request(`${ORIGIN}/api/auth/google/callback?code=c&state=s`, {
    headers: conHandshake ? { cookie: `${COOKIE_HANDSHAKE}=${handshake}` } : {},
  })
  return callbackResponse(request, process.env, {
    pedir: () => Promise.reject(new Error('no se usa')),
    canjear: () => Promise.resolve(quien),
    conexion: () => sql,
  })
}

const entrar = async (quien: Identidad): Promise<string> => {
  const response = await volverDeGoogle(quien)
  assert.equal(response.headers.get('location'), `${ORIGIN}/`)
  const sesion = cookieDe(response, COOKIE_IDENTIDAD)
  assert.ok(sesion !== null && sesion !== '', 'el callback emite la sesión')
  return sesion
}

const conCookie = (sesion: string, extra: Record<string, string> = {}) => ({ cookie: `${COOKIE_IDENTIDAD}=${sesion}`, ...extra })
const lista = (sesion: string) => listGET(new Request(`${ORIGIN}/api/conversations`, { headers: conCookie(sesion) }))

const ultimoEvento = async (accion: string) => {
  const [e] = await sql<{ actor: string | null; outcome: string; reason: string | null; object_id: string | null }[]>`
    select actor_user_id as actor, outcome, reason_code as reason, object_id
    from communication.audit_event where action = ${accion} order by id desc limit 1`
  return e
}

/** Una conversación con la ventana abierta, de un teléfono sintético propio de esta corrida. */
const conversacion = async (): Promise<{ id: number; waId: string }> => {
  const waId = `549119${String(Math.floor(Math.random() * 1e7)).padStart(7, '0')}`
  const [m] = await sql<{ id: string }[]>`
    insert into communication.message (wamid, direction, phone_number_id, wa_id, body, wa_timestamp)
    values (${`wamid.${RUN}.${waId}`}, 'inbound', '100000000000001', ${waId}, 'texto sintético', now())
    returning id`
  return { id: Number(m?.id), waId }
}

const responder = (sesion: string, conversacionId: number, send: TextSender, texto = 'Respuesta sintética') =>
  withSession((req, datos) =>
    replyResponse(req, String(conversacionId), {
      sql: () => sql,
      datos,
      setup: { send, phoneNumberId: '100000000000001' },
    }),
  )(
    new Request(`${ORIGIN}/api/conversations/${String(conversacionId)}/reply`, {
      method: 'POST',
      headers: conCookie(sesion, { origin: ORIGIN, 'content-type': 'application/json' }),
      body: JSON.stringify({ idempotencyKey: randomUUID(), body: texto }),
    }),
  )

const NO_ENVIA: TextSender = () => Promise.reject(new Error('no debería enviar'))

describe('entrada con Google por invitación (AUTH_MODE=oidc)', () => {
  it('una cuenta externa invitada entra, vincula su credencial y ve las conversaciones', async () => {
    const quien = identidad('operadora')
    const usuario = await invitar(quien.email, 'OPERADOR')
    const sesion = await entrar(quien)
    const response = await lista(sesion)
    assert.equal(response.status, 200)
    const [c] = await sql<{ n: number }[]>`
      select count(*)::int as n from communication.user_credential where user_id = ${usuario} and subject = ${quien.sujeto}`
    assert.equal(c?.n, 1)
    assert.equal((await ultimoEvento('acceso.vincular'))?.actor, usuario)
  })

  it('una cuenta no invitada vuelve al login sin sesión, y el motivo queda sólo en la auditoría', async () => {
    const response = await volverDeGoogle(identidad('ajena'))
    assert.equal(response.status, 303)
    assert.equal(response.headers.get('location'), `${ORIGIN}/login?error=1`)
    assert.equal(cookieDe(response, COOKIE_IDENTIDAD), null)
    assert.deepEqual({ ...(await ultimoEvento('acceso.ingresar')) }, { actor: null, outcome: 'denied', reason: 'NO_INVITADO', object_id: null })
  })

  it('el email sin verificar, una invitación vencida o un callback sin handshake no entran', async () => {
    const sinVerificar = identidad('sinverificar', undefined, false)
    await invitar(sinVerificar.email, 'OPERADOR')
    const vencida = identidad('vencida')
    await invitar(vencida.email, 'OPERADOR', -1)
    const sinHandshake = identidad('sinhandshake')
    await invitar(sinHandshake.email, 'OPERADOR')
    for (const response of [await volverDeGoogle(sinVerificar), await volverDeGoogle(vencida), await volverDeGoogle(sinHandshake, false)]) {
      assert.equal(response.headers.get('location'), `${ORIGIN}/login?error=1`)
      assert.equal(cookieDe(response, COOKIE_IDENTIDAD), null)
    }
  })

  it('una sesión vencida, adulterada o ausente responde 401 sin datos', async () => {
    const vencida = await sellarSesion(identidad('vieja'), { ...config().sesion, duracionSegundos: -10 })
    for (const headers of [conCookie(vencida), conCookie('basura'), {}]) {
      const response = await listGET(new Request(`${ORIGIN}/api/conversations`, { headers }))
      assert.equal(response.status, 401)
      assert.deepEqual(await response.json(), { error: 'sin credencial válida' })
    }
  })
})

describe('revocación inmediata (D-0022, condición 6)', () => {
  it('la baja corta una sesión abierta en el request siguiente, igual que una cookie inválida', async () => {
    const quien = identidad('revocada')
    const usuario = await invitar(quien.email, 'OPERADOR')
    const sesion = await entrar(quien)
    assert.equal((await lista(sesion)).status, 200)

    await sql`update communication.app_user set status = 'INACTIVE' where id = ${usuario}`
    const response = await lista(sesion)
    assert.equal(response.status, 401)
    assert.deepEqual(await response.json(), { error: 'sin credencial válida' })
    assert.equal((await ultimoEvento('acceso.consultar'))?.reason, 'SIN_ACCESO')

    // Y no vuelve a entrar con Google.
    const otra = await volverDeGoogle(quien)
    assert.equal(otra.headers.get('location'), `${ORIGIN}/login?error=1`)
  })

  it('una cookie con una identidad sin credencial no ve nada', async () => {
    const ajena = await sellarSesion(identidad('sincredencial'), config().sesion)
    assert.equal((await lista(ajena)).status, 401)
    assert.equal((await ultimoEvento('acceso.consultar'))?.reason, 'SIN_CREDENCIAL')
  })
})

describe('permisos por rol en la app (matriz de permisos.js)', () => {
  it('el Revisor profesional no ve Comunicación: 403 con quién sí puede', async () => {
    const quien = identidad('revisor')
    const usuario = await invitar(quien.email, 'REVISOR')
    const sesion = await entrar(quien)
    const { id } = await conversacion()
    for (const response of [
      await lista(sesion),
      await threadGET(new Request(`${ORIGIN}/api/conversations/${String(id)}`, { headers: conCookie(sesion) }), {
        params: Promise.resolve({ id: String(id) }),
      }),
    ]) {
      assert.equal(response.status, 403)
      assert.deepEqual(await response.json(), { error: 'Comunicación la ven el Administrador y el Operador Del Campo.' })
    }
    const evento = await ultimoEvento('conversacion.consultar')
    assert.deepEqual({ ...evento }, { actor: usuario, outcome: 'denied', reason: 'ROL_SIN_PERMISO', object_id: null })
  })

  it('el Administrador ve el hilo pero no responde, y no se escribe nada', async () => {
    const quien = identidad('admin')
    await invitar(quien.email, 'ADMINISTRADOR')
    const sesion = await entrar(quien)
    const { id, waId } = await conversacion()
    const hilo = await threadGET(new Request(`${ORIGIN}/api/conversations/${String(id)}`, { headers: conCookie(sesion) }), {
      params: Promise.resolve({ id: String(id) }),
    })
    assert.equal(hilo.status, 200)
    const response = await responder(sesion, id, NO_ENVIA)
    assert.equal(response.status, 403)
    assert.deepEqual(await response.json(), { error: 'Responder conversaciones es del Operador Del Campo.' })
    const [n] = await sql<{ n: number }[]>`select count(*)::int as n from communication.outbound_attempt where wa_id = ${waId}`
    assert.equal(n?.n, 0)
  })

  it('el Operador responde: el intento queda a su nombre y la auditoría no guarda ni el texto ni el teléfono', async () => {
    const quien = identidad('responde')
    const usuario = await invitar(quien.email, 'OPERADOR')
    const sesion = await entrar(quien)
    const { id, waId } = await conversacion()
    const texto = `Mi CBU es 0000003100000000000001 (${RUN})`
    const send: TextSender = () => Promise.resolve({ kind: 'accepted', wamid: `wamid.salida.${RUN}.${waId}` })
    const response = await responder(sesion, id, send, texto)
    assert.equal(response.status, 201)

    const [intento] = await sql<{ id: string; autor: string; state: string }[]>`
      select id, created_by as autor, state from communication.outbound_attempt where wa_id = ${waId}`
    assert.deepEqual({ autor: intento?.autor, state: intento?.state }, { autor: usuario, state: 'accepted' })

    const eventos = await sql<Record<string, unknown>[]>`
      select * from communication.audit_event where actor_user_id = ${usuario} and action = 'conversacion.responder'`
    assert.equal(eventos.length, 1)
    assert.equal(eventos[0]?.object_id, intento?.id)
    const volcado = JSON.stringify(eventos)
    for (const sensible of [texto, '0000003100000000000001', waId, waId.slice(-4)]) {
      assert.ok(!volcado.includes(sensible), `la auditoría no contiene ${sensible}`)
    }
  })

  it('si la baja llega mientras se envía, el resultado no se registra a su nombre y el intento queda sin confirmar', async () => {
    const quien = identidad('bajaenvio')
    const usuario = await invitar(quien.email, 'OPERADOR')
    const sesion = await entrar(quien)
    const { id, waId } = await conversacion()
    const send: TextSender = async () => {
      await sql`update communication.app_user set status = 'INACTIVE' where id = ${usuario}`
      return { kind: 'accepted', wamid: `wamid.salida.${RUN}.${waId}` }
    }
    const response = await responder(sesion, id, send)
    assert.equal(response.status, 502)
    const [intento] = await sql<{ state: string }[]>`select state from communication.outbound_attempt where wa_id = ${waId}`
    assert.equal(intento?.state, 'pending', 'queda pending, que el hilo muestra como sin confirmar')
  })
})

describe('compatibilidad con legacy', () => {
  it('con AUTH_MODE=oidc la contraseña compartida no entra', async () => {
    const response = await loginPOST(
      new Request(`${ORIGIN}/api/login`, {
        method: 'POST',
        headers: { origin: ORIGIN, 'content-type': 'application/x-www-form-urlencoded' },
        body: 'user=x&password=y',
      }),
    )
    assert.equal(response.status, 404)
    assert.equal(response.headers.get('set-cookie'), null)
  })

  it('sin AUTH_MODE, la entrada con Google no existe y una sesión de Google no sirve', async () => {
    const quien = identidad('legacy')
    await invitar(quien.email, 'OPERADOR')
    const sesion = await entrar(quien)
    delete process.env.AUTH_MODE
    try {
      assert.equal((await startGET()).status, 404)
      assert.equal((await callbackGET(new Request(`${ORIGIN}/api/auth/google/callback?code=c`))).status, 404)
      // En legacy manda la credencial compartida: sin ella configurada, 503; con la cookie
      // de Google, nada.
      const response = await lista(sesion)
      assert.ok(response.status === 401 || response.status === 503, String(response.status))
    } finally {
      process.env.AUTH_MODE = 'oidc'
    }
  })

  it('un AUTH_MODE desconocido no elige un modo en silencio', async () => {
    process.env.AUTH_MODE = 'oidcc'
    try {
      await assert.rejects(lista('x'), /no es un modo válido/)
    } finally {
      process.env.AUTH_MODE = 'oidc'
    }
  })
})
