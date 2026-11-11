// C4-03a: GET /api/entre-contextos/empresas/:empresa/riesgos de punta a punta, detrás de
// `withLlamada`, contra delcampo_risk_test dentro de una transacción que se revierte. Lo de la
// app corre como `risk_oidc`; la preparación (lo que haría el owner con la CLI), como el dueño.

import assert from 'node:assert/strict'
import { fileURLToPath } from 'node:url'
import { after, before, describe, it } from 'node:test'

import { emitirToken, generarParDeClaves, jwksDe, registroJtiEnMemoria, type ParDeClaves } from '@del-campo/identidad'
import {
  asignar, connect, importarLote, invitar, leerArchivosDeLote, leerContrato, migrate, riesgosDeEmpresa, VERSION_METODOLOGIA, verificarVinculo,
  vincular, vistaLista, type Sql, type TransactionSql,
} from '@del-campo/risk'

import { json, type Deps } from './guard.ts'
import { withLlamada } from './llamada.ts'

const TEST_DATABASE = 'delcampo_risk_test'
const SINTETICOS = fileURLToPath(new URL('../../../../SPIKES/T-0021/v0/fase-15/sinteticos/', import.meta.url))
const ORIGIN = 'http://localhost:3200'
const ORG = 'ORG-01M3QSRT00VT0W3XH3JG6NDTEX'
const EMPRESA = '00000000-0000-4000-8000-0000000000a1'
const AJENA = '00000000-0000-4000-8000-0000000000a2'

const testUrl = (): string => {
  const own = process.env.RISK_DATABASE_URL
  const url = new URL(own !== undefined && own !== '' ? own : (process.env.DATABASE_URL ?? 'postgres://localhost:5432/postgres'))
  if (own === undefined || own === '') url.pathname = `/${TEST_DATABASE}`
  if (url.pathname !== `/${TEST_DATABASE}`) throw new Error(`este test importa y revierte: sólo corre sobre ${TEST_DATABASE}`)
  return url.href
}

let sql: Sql
let broker: ParDeClaves
before(async () => {
  const url = new URL(testUrl())
  const admin = new URL(url.href)
  admin.pathname = '/postgres'
  const root = connect(admin.href)
  try {
    const existe = await root`select 1 from pg_database where datname = ${TEST_DATABASE}`
    if (existe.length === 0) await root.unsafe(`create database ${TEST_DATABASE}`)
  } finally {
    await root.end()
  }
  sql = connect(url.href)
  await migrate(sql)
  broker = await generarParDeClaves()
})
after(async () => {
  await sql.end()
})

interface Escenario {
  readonly tx: TransactionSql
  readonly admin: string
  readonly operadora: string
  readonly otraOrg: string
  /** Llama al endpoint con un token de Broker OS para ese sujeto; `token` lo reusa. */
  readonly get: (sujeto: string, empresa: string, token?: string) => Promise<{ status: number; body: unknown; token: string }>
}

class Revertir extends Error {}

const conEscenario = async (cuerpo: (e: Escenario) => Promise<void>): Promise<void> => {
  try {
    await sql.begin(async (tx) => {
      const r = await importarLote(tx, leerContrato(), leerArchivosDeLote(SINTETICOS), { origen: 'test', importadoPor: 'test C4-03a', fechaCorte: '2026-10-14' })
      assert.equal(r.estado, 'importado')
      // Una persona que entra con Google: su invitación, consumida por su credencial externa.
      const entra = async (actor: string | null, nombre: string, rol: 'ADMINISTRADOR' | 'OPERADOR'): Promise<string> => {
        const i = await invitar(tx, { actor, email: `${nombre}@ejemplo.invalid`, rol, nombre })
        assert.ok(i.ok)
        await tx`insert into risk.credencial_externa (persona_id, proveedor, sujeto, invitacion_id)
                 values (${i.valor.personaId}, 'google', ${`sub-${nombre}`}, ${i.valor.invitacionId})`
        return i.valor.personaId
      }
      const admin = await entra(null, 'admin', 'ADMINISTRADOR')
      const operadora = await entra(admin, 'operadora', 'OPERADOR')
      assert.ok((await asignar(tx, { actor: admin, personaId: operadora, organizacionId: ORG, vigente: true })).ok)
      const [otra] = await tx<{ o: string }[]>`select distinct organizacion_id as o from risk.riesgo where organizacion_id <> ${ORG} order by 1 limit 1`
      assert.ok(otra !== undefined)

      const env = { AUTH_MODE: 'oidc', RISK_OIDC_DATABASE_URL: 'postgres://no-se-usa', RISK_JWKS_BROKER: JSON.stringify(jwksDe([broker.publica])) }
      const deps = (): Deps => ({ env, db: () => tx })
      // El mismo handler que el `route.ts`, con la transacción como base y un registro de jti en
      // memoria (el de la base se construye con el pool: ver `jti.integration.test.ts`).
      const registro = registroJtiEnMemoria()
      const GET = withLlamada<{ params: Promise<{ empresa: string }> }>(
        async (_r, s, db, { params }) => json(await riesgosDeEmpresa(db, s, VERSION_METODOLOGIA, (await params).empresa)), deps, () => registro)
      const get: Escenario['get'] = async (sujeto, empresa, reusado) => {
        const token = reusado ?? await emitirToken(broker.privada, { emisor: 'broker-os', audiencia: 'risk-os', proveedor: 'google', sujeto })
        const request = new Request(`${ORIGIN}/api/entre-contextos/empresas/${empresa}/riesgos`, { headers: { authorization: `Bearer ${token}` } })
        await tx`set local role risk_oidc`
        try {
          const res = await GET(request, { params: Promise.resolve({ empresa }) })
          assert.equal(res.headers.get('cache-control'), 'no-store')
          return { status: res.status, body: await res.json(), token }
        } finally {
          await tx`reset role`
        }
      }
      await cuerpo({ tx, admin, operadora, otraOrg: otra.o, get })
      throw new Revertir()
    })
  } catch (e) {
    if (!(e instanceof Revertir)) throw e
  }
}

describe('GET /api/entre-contextos/empresas/:empresa/riesgos (C4-03a)', () => {
  it('sin vínculo, pendiente y vinculada; vinculada concilia con la lista y no lleva C_raw ni el vector', async () => {
    await conEscenario(async (e) => {
      assert.deepEqual((await e.get('sub-operadora', EMPRESA)).body, { estado: 'sin_vinculo' })
      assert.deepEqual((await e.get('sub-operadora', 'no-es-un-uuid')).body, { estado: 'sin_vinculo' })
      assert.ok((await vincular(e.tx, { actor: e.admin, organizacionId: ORG, empresaId: EMPRESA })).ok)
      assert.deepEqual((await e.get('sub-operadora', EMPRESA)).body, { estado: 'pendiente' })
      assert.ok((await verificarVinculo(e.tx, { actor: e.admin, organizacionId: ORG })).ok)

      const r = await e.get('sub-operadora', EMPRESA)
      assert.equal(r.status, 200)
      const body = r.body as { estado: string; organizacion: { id: string }; riesgos: { riskId: string; posicion: number; banda: string | null }[]; noEvaluables: number; enCola: number }
      assert.equal(body.estado, 'vinculada')
      assert.equal(body.organizacion.id, ORG)
      const lista = await vistaLista(e.tx, { personaId: e.operadora, nombre: 'Operadora', credencialId: '0' }, VERSION_METODOLOGIA, ORG)
      assert.ok(lista !== null && lista.ranking.length > 0)
      assert.deepEqual(body.riesgos.map((x) => [x.riskId, x.posicion, x.banda]), lista.ranking.map((x) => [x.riskId, x.posicion, x.lectura.banda]))
      assert.equal(body.noEvaluables, lista.noEvaluables.length)
      assert.equal(body.enCola, lista.cola.length)
      assert.doesNotMatch(JSON.stringify(body), /c_?raw|vector/i)
    })
  })

  it('una empresa de una organización que la persona no tiene asignada responde como sin vínculo', async () => {
    await conEscenario(async (e) => {
      assert.ok((await vincular(e.tx, { actor: e.admin, organizacionId: e.otraOrg, empresaId: AJENA })).ok)
      assert.ok((await verificarVinculo(e.tx, { actor: e.admin, organizacionId: e.otraOrg })).ok)
      assert.deepEqual((await e.get('sub-operadora', AJENA)).body, { estado: 'sin_vinculo' })
      // La Administradora las ve todas.
      assert.equal(((await e.get('sub-admin', AJENA)).body as { estado: string }).estado, 'vinculada')
    })
  })

  it('el mismo token otra vez, o una persona que Risk OS no admite: 401', async () => {
    await conEscenario(async (e) => {
      const primero = await e.get('sub-operadora', EMPRESA)
      assert.equal(primero.status, 200)
      const otra = await e.get('sub-operadora', EMPRESA, primero.token)
      assert.equal(otra.status, 401)
      assert.deepEqual(otra.body, { error: 'sin credencial válida' })
      assert.equal((await e.get('sub-desconocida', EMPRESA)).status, 401)
    })
  })
})
