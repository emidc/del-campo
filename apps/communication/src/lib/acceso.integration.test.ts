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
import {
  emitirToken,
  generarParDeClaves,
  jwksDe,
  registroJtiEnMemoria,
  sellarHandshake,
  sellarSesion,
  type Identidad,
  type ParDeClaves,
  type Verificacion,
} from '@del-campo/identidad'
import { connect, conversationList, registroJtiPostgres } from '@del-campo/communication'
import { datosBancariosEn, TEXTO_CON_DATOS_BANCARIOS } from '@del-campo/identidad'

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
import { admitirLlamada, AUDIENCIA_COMMUNICATION } from './entre-contextos.ts'

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

// Condición previa a la fase 2 (plan de migración, «Condiciones antes de ejecutar la fase
// 2»): una negativa de la base responde igual que una cuenta no admitida, y el motivo
// específico queda sólo en `audit_event`. Se comparan las respuestas enteras —status,
// cada header (también cada `set-cookie`) y cuerpo—: un header de más ya distinguiría un caso.
describe('las negativas de la base no revelan el motivo (condición de la fase 2)', () => {
  /** Lo que ve quien está afuera: status, todos los headers y el cuerpo. */
  const deAfuera = async (response: Response): Promise<{ status: number; headers: [string, string][]; cuerpo: string }> => ({
    status: response.status,
    headers: [...response.headers.entries()].sort(([a], [b]) => a.localeCompare(b)),
    cuerpo: await response.text(),
  })

  interface Evento { actor: string | null; outcome: string; reason: string | null; object_id: string | null }
  /** Lo auditado con `accion` después del evento `desde`. La base no se revierte: se mira sólo lo nuevo. */
  const eventosDesde = async (accion: string, desde: string): Promise<Evento[]> => [
    ...(await sql<Evento[]>`
      select actor_user_id as actor, outcome, reason_code as reason, object_id
      from communication.audit_event where action = ${accion} and id > ${desde} order by id`),
  ]
  const ultimoId = async (): Promise<string> => {
    const [f] = await sql<{ id: string }[]>`select coalesce(max(id), 0)::text as id from communication.audit_event`
    return f?.id ?? '0'
  }

  /**
   * Una persona por caso: `baja` (credencial vinculada y dada de baja), `sinrol` (credencial
   * vinculada, activa y sin rol) y `vencida` (invitación vencida, sin credencial). `ajena`
   * no existe en la base. Devuelve las cookies que el callback les emitió cuando entraron.
   * `caso` separa las personas de cada test, porque la base no se revierte.
   */
  const sembrar = async (caso: string) => {
    const quienes = {
      ajena: identidad(`${caso}-ajena`), baja: identidad(`${caso}-baja`), sinRol: identidad(`${caso}-sinrol`), vencida: identidad(`${caso}-vencida`),
    }
    const baja = await invitar(quienes.baja.email, 'OPERADOR')
    const sinRol = await invitar(quienes.sinRol.email, 'OPERADOR')
    await invitar(quienes.vencida.email, 'OPERADOR', -1)
    const cookies = {
      ajena: await sellarSesion(quienes.ajena, config().sesion),
      baja: await entrar(quienes.baja),
      sinRol: await entrar(quienes.sinRol),
      vencida: await sellarSesion(quienes.vencida, config().sesion),
    }
    await sql`update communication.app_user set status = 'INACTIVE' where id = ${baja}`
    await sql`update communication.app_user set role = null where id = ${sinRol}`
    return { quienes, cookies }
  }

  it('al volver de Google, no invitada, de baja, sin rol y sin credencial reciben la misma redirección y ninguna sesión', async () => {
    const { quienes } = await sembrar('neg-login')
    const desde = await ultimoId()
    const respuestas = {
      ajena: await deAfuera(await volverDeGoogle(quienes.ajena)),
      baja: await deAfuera(await volverDeGoogle(quienes.baja)),
      sinRol: await deAfuera(await volverDeGoogle(quienes.sinRol)),
      vencida: await deAfuera(await volverDeGoogle(quienes.vencida)),
    }
    const NEGATIVA = {
      status: 303,
      headers: [
        ['cache-control', 'no-store'],
        ['location', `${ORIGIN}/login?error=1`],
        // Sólo se borra el handshake: ninguna cookie de sesión.
        ['set-cookie', `${COOKIE_HANDSHAKE}=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax`],
      ],
      cuerpo: '',
    }
    assert.deepEqual(respuestas, { ajena: NEGATIVA, baja: NEGATIVA, sinRol: NEGATIVA, vencida: NEGATIVA })

    const negada = (reason: string): Evento => ({ actor: null, outcome: 'denied', reason, object_id: null })
    assert.deepEqual(
      (await eventosDesde('acceso.ingresar', desde)).filter((e) => e.outcome === 'denied'),
      [negada('NO_INVITADO'), negada('DADO_DE_BAJA'), negada('NO_INVITADO')],
    )
    // Sin rol, la credencial existe y `ingresar` la reconoce; la base no la admite y eso
    // queda como cualquier otra negativa de la base.
    assert.deepEqual(await eventosDesde('acceso.consultar', desde), [negada('SIN_ACCESO')])
  })

  it('con la sesión ya abierta, sin credencial, de baja y sin rol reciben la misma respuesta que una cuenta no admitida', async () => {
    const { cookies } = await sembrar('neg-sesion')
    const desde = await ultimoId()
    const respuestas = {
      ajena: await deAfuera(await lista(cookies.ajena)),
      baja: await deAfuera(await lista(cookies.baja)),
      sinRol: await deAfuera(await lista(cookies.sinRol)),
      vencida: await deAfuera(await lista(cookies.vencida)),
    }
    const NEGATIVA = {
      status: 401,
      headers: [['cache-control', 'no-store'], ['content-type', 'application/json; charset=utf-8']],
      cuerpo: JSON.stringify({ error: 'sin credencial válida' }),
    }
    assert.deepEqual(respuestas, { ajena: NEGATIVA, baja: NEGATIVA, sinRol: NEGATIVA, vencida: NEGATIVA })
    // Y es la misma que la de una cookie adulterada: desde afuera, no hay sesión.
    assert.deepEqual(await deAfuera(await lista('basura')), NEGATIVA)

    const negada = (reason: string): Evento => ({ actor: null, outcome: 'denied', reason, object_id: null })
    assert.deepEqual(await eventosDesde('acceso.consultar', desde), [
      negada('SIN_CREDENCIAL'), negada('SIN_ACCESO'), negada('SIN_ACCESO'), negada('SIN_CREDENCIAL'),
    ])
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

  it('el Revisor profesional no responde: 403 explicado y no se escribe nada', async () => {
    const quien = identidad('revisorresponde')
    await invitar(quien.email, 'REVISOR')
    const sesion = await entrar(quien)
    const { id, waId } = await conversacion()
    const response = await responder(sesion, id, NO_ENVIA)
    assert.equal(response.status, 403)
    assert.deepEqual(await response.json(), { error: 'Responden conversaciones el Administrador y el Operador Del Campo.' })
    const [n] = await sql<{ n: number }[]>`select count(*)::int as n from communication.outbound_attempt where wa_id = ${waId}`
    assert.equal(n?.n, 0)
  })

  for (const rol of ['ADMINISTRADOR', 'OPERADOR'] as const) {
    it(`${rol}: ve el formulario, responde, y el envío queda a su nombre sin texto ni teléfono en la auditoría`, async () => {
      const quien = identidad(`responde-${rol.toLowerCase()}`)
      const usuario = await invitar(quien.email, rol)
      const sesion = await entrar(quien)
      const { id, waId } = await conversacion()

      const hilo = await threadGET(new Request(`${ORIGIN}/api/conversations/${String(id)}`, { headers: conCookie(sesion) }), {
        params: Promise.resolve({ id: String(id) }),
      })
      assert.equal(hilo.status, 200)
      assert.equal(((await hilo.json()) as { mayReply: boolean }).mayReply, true)

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
  }

  it('ni el texto de una respuesta ni un dato bancario que traiga llegan a la auditoría (AM-10b)', async () => {
    const operador = identidad('bancario-operador')
    await invitar(operador.email, 'OPERADOR')
    const revisor = identidad('bancario-revisor')
    await invitar(revisor.email, 'REVISOR')
    const { id, waId } = await conversacion()
    const send: TextSender = () => Promise.resolve({ kind: 'accepted', wamid: `wamid.bancario.${RUN}.${waId}` })
    // La negada y la que se envía: las dos dejan evento.
    assert.equal((await responder(await entrar(revisor), id, NO_ENVIA, TEXTO_CON_DATOS_BANCARIOS)).status, 403)
    assert.equal((await responder(await entrar(operador), id, send, TEXTO_CON_DATOS_BANCARIOS)).status, 201)

    const eventos = await sql<Record<string, unknown>[]>`
      select id, actor_user_id, origin, action, object_type, object_id, outcome, reason_code from communication.audit_event`
    assert.ok(eventos.length > 0)
    const volcado = JSON.stringify(eventos)
    assert.ok(!volcado.includes(TEXTO_CON_DATOS_BANCARIOS))
    assert.deepEqual(datosBancariosEn(volcado), [])
  })

  it('la auditoría no tiene dónde guardar un payload: sólo estas columnas, todas acotadas', async () => {
    const columnas = await sql<{ c: string }[]>`
      select column_name as c from information_schema.columns
      where table_schema = 'communication' and table_name = 'audit_event' order by ordinal_position`
    assert.deepEqual(
      columnas.map((x) => x.c),
      ['id', 'occurred_at', 'actor_user_id', 'origin', 'action', 'object_type', 'object_id', 'outcome', 'reason_code'],
    )
    await assert.rejects(
      sql`insert into communication.audit_event (origin, action, outcome, reason_code) values ('app', 'conversacion.responder', 'denied', ${'4539 1488 0343 6467'})`,
    )
  })

  it('dos personas responden en la misma conversación y cada intento queda a nombre de quien lo envió', async () => {
    const admin = identidad('autoria-admin')
    const operador = identidad('autoria-operador')
    const adminId = await invitar(admin.email, 'ADMINISTRADOR')
    const operadorId = await invitar(operador.email, 'OPERADOR')
    const sesionAdmin = await entrar(admin)
    const sesionOperador = await entrar(operador)
    const { id, waId } = await conversacion()
    let n = 0
    const send: TextSender = () => Promise.resolve({ kind: 'accepted', wamid: `wamid.autoria.${RUN}.${String(++n)}` })
    assert.equal((await responder(sesionAdmin, id, send, 'Respuesta del Administrador')).status, 201)
    assert.equal((await responder(sesionOperador, id, send, 'Respuesta del Operador')).status, 201)
    const autores = await sql<{ autor: string }[]>`
      select created_by as autor from communication.outbound_attempt where wa_id = ${waId} order by id`
    assert.deepEqual(autores.map((a) => a.autor), [adminId, operadorId])
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

describe('token entre contextos: verificado en Communication OS y con la admisión de Communication OS', () => {
  const EMISOR = 'broker-os'
  const AHORA = Math.floor(Date.now() / 1000)
  let vieja: ParDeClaves
  let nueva: ParDeClaves
  let ajena: ParDeClaves
  before(async () => {
    vieja = await generarParDeClaves()
    nueva = await generarParDeClaves()
    ajena = await generarParDeClaves()
  })
  const token = (
    quien: Identidad,
    clave: ParDeClaves = vieja,
    cambios: { audiencia?: string; emisor?: string; ahora?: number } = {},
  ): Promise<string> =>
    emitirToken(clave.privada, {
      emisor: cambios.emisor ?? EMISOR,
      audiencia: cambios.audiencia ?? AUDIENCIA_COMMUNICATION,
      proveedor: quien.proveedor,
      sujeto: quien.sujeto,
      ahora: cambios.ahora ?? AHORA,
    })
  const verificacion = (claves: ParDeClaves[] = [vieja], registro = registroJtiEnMemoria()): Verificacion => ({
    jwks: jwksDe(claves.map((c) => c.publica)),
    emisor: EMISOR,
    audiencia: AUDIENCIA_COMMUNICATION,
    registroJti: registro,
    ahora: AHORA,
  })
  const listar = (t: string, v: Verificacion = verificacion()) =>
    admitirLlamada(() => sql, t, v, 'conversacion.consultar', async (tx) => (await conversationList(tx)).conversations.length >= 0)
  const motivo = async (t: string, v?: Verificacion): Promise<string> => {
    const r = await listar(t, v)
    return r.ok ? 'OK' : 'token' in r ? r.token : 'denegado' in r ? r.denegado : 'SIN_PERMISO'
  }

  it('un token válido corre como la persona y con la matriz de Communication OS', async () => {
    const operador = identidad('token-operador')
    await invitar(operador.email, 'OPERADOR')
    await entrar(operador)
    assert.deepEqual(await listar(await token(operador)), { ok: true, valor: true })

    const revisor = identidad('token-revisor')
    const revisorId = await invitar(revisor.email, 'REVISOR')
    await entrar(revisor)
    assert.deepEqual(await listar(await token(revisor)), { ok: false, sinPermiso: 'conversacion.consultar' })
    assert.equal((await ultimoEvento('conversacion.consultar'))?.actor, revisorId)
  })

  it('se rechaza por firma, emisor, audiencia, vencimiento y reutilización, con su motivo auditado', async () => {
    const quien = identidad('token-rechazos')
    await invitar(quien.email, 'OPERADOR')
    await entrar(quien)
    assert.equal(await motivo(await token(quien, ajena)), 'KID_DESCONOCIDO')
    assert.equal(await motivo(await token(quien, vieja, { emisor: 'risk-os' })), 'EMISOR')
    assert.equal(await motivo(await token(quien, vieja, { audiencia: 'risk-os' })), 'AUDIENCIA')
    assert.equal(await motivo(await token(quien, vieja, { ahora: AHORA - 120 })), 'VENCIDO')
    const t = await token(quien)
    const v = verificacion()
    assert.equal(await motivo(t, v), 'OK')
    assert.equal(await motivo(t, v), 'REUTILIZADO')
    assert.deepEqual({ ...(await ultimoEvento('acceso.token')) }, { actor: null, outcome: 'denied', reason: 'REUTILIZADO', object_id: null })
    const [n] = await sql<{ n: number }[]>`
      select count(*)::int as n from communication.audit_event where action = 'acceso.token' and object_id is not null`
    assert.equal(n?.n, 0, 'el token no queda en la auditoría')
    await assert.rejects(
      admitirLlamada(() => sql, t, { ...v, audiencia: 'risk-os' }, 'conversacion.consultar', () => Promise.resolve(null)),
    )
  })

  it('con el registro de la base: dos instancias no aceptan el mismo token, y vencido es VENCIDO', async () => {
    const quien = identidad('token-registro')
    await invitar(quien.email, 'OPERADOR')
    await entrar(quien)
    // Dos instancias de Communication OS: cada una con su pool y su registro, sobre la misma base.
    const otraInstancia = connect(testDatabaseUrl())
    try {
      const instancia = (pool: Sql, ahora = AHORA): Verificacion => ({ ...verificacion([vieja], registroJtiPostgres(pool)), ahora })
      const t = await token(quien)
      assert.equal(await motivo(t, instancia(sql)), 'OK')
      assert.equal(await motivo(t, instancia(otraInstancia, AHORA + 30)), 'REUTILIZADO')
      // Pasado su exp (60 s más 5 de tolerancia), el token ya no llega al registro.
      assert.equal(await motivo(t, instancia(otraInstancia, AHORA + 66)), 'VENCIDO')
    } finally {
      await otraInstancia.end()
    }
  })

  it('una llamada real no se admite sin registro de jti', async () => {
    const quien = identidad('token-sin-registro')
    await assert.rejects(listar(await token(quien), { ...verificacion(), registroJti: null }), /registro de jti/)
  })

  it('la admisión es la de Communication OS: sin credencial vinculada o dada de baja, un token válido no entra', async () => {
    assert.deepEqual(await listar(await token(identidad('token-nadie'))), { ok: false, denegado: 'SIN_CREDENCIAL' })
    const quien = identidad('token-baja')
    const usuario = await invitar(quien.email, 'OPERADOR')
    await entrar(quien)
    assert.equal(await motivo(await token(quien)), 'OK')
    await sql`update communication.app_user set status = 'INACTIVE' where id = ${usuario}`
    assert.deepEqual(await listar(await token(quien)), { ok: false, denegado: 'SIN_ACCESO' })
  })

  it('rotación de claves: durante el solapamiento valen la vieja y la nueva; después, sólo la nueva', async () => {
    const quien = identidad('token-rotacion')
    await invitar(quien.email, 'OPERADOR')
    await entrar(quien)
    const solapadas = verificacion([vieja, nueva])
    assert.equal(await motivo(await token(quien, vieja), solapadas), 'OK')
    assert.equal(await motivo(await token(quien, nueva), solapadas), 'OK')
    const rotada = verificacion([nueva])
    assert.equal(await motivo(await token(quien, vieja), rotada), 'KID_DESCONOCIDO')
    assert.equal(await motivo(await token(quien, nueva), rotada), 'OK')
  })
})
