// Listas de riesgos de una empresa (0030, T-0061). Contra Postgres real, con datos sintéticos
// y cada caso en una transacción revertida. Requiere DATABASE_URL con 0030 aplicada.

import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { after, describe, it } from 'node:test'

import postgres from 'postgres'

import {
  cleanRiskItemCode,
  cleanRiskItemFields,
  commentRiskItem,
  createRiskItem,
  listRiskItems,
  retireRiskItem,
  updateRiskItem,
} from './listas-de-riesgos.ts'

const RAIZ = resolve(import.meta.dirname, '..', '..', '..')

const leerEnv = (): Record<string, string> => {
  const archivo = join(RAIZ, '.env')
  if (!existsSync(archivo)) return {}
  const pares: Record<string, string> = {}
  for (const linea of readFileSync(archivo, 'utf8').split('\n')) {
    const limpia = linea.trim()
    if (limpia === '' || limpia.startsWith('#')) continue
    const corte = limpia.indexOf('=')
    if (corte === -1) continue
    pares[limpia.slice(0, corte).trim()] = limpia.slice(corte + 1).trim()
  }
  return pares
}

const databaseUrl = process.env.DATABASE_URL ?? leerEnv().DATABASE_URL
if (databaseUrl === undefined || databaseUrl === '') {
  throw new Error('DATABASE_URL no está configurada: el modelo de riesgos requiere PostgreSQL real.')
}

const sql = postgres(databaseUrl, { max: 1, prepare: false, onnotice: () => undefined })

after(async () => {
  await sql.end()
})

class Rollback extends Error {}

const descartable = async (accion: (tx: postgres.TransactionSql) => Promise<void>): Promise<void> => {
  try {
    await sql.begin(async (tx) => {
      await accion(tx)
      throw new Rollback()
    })
  } catch (error) {
    if (!(error instanceof Rollback)) throw error
  }
}

interface Id {
  readonly id: string
}

const uno = <T>(filas: readonly T[]): T => {
  const [fila] = filas
  if (fila === undefined) throw new Error('se esperaba una fila')
  return fila
}

interface Mundo {
  readonly bodega: string
  readonly otra: string
  readonly ana: string
  readonly beto: string
}

const sembrar = async (tx: postgres.TransactionSql): Promise<Mundo> => {
  const empresa = async (nombre: string): Promise<string> => {
    const id = uno(await tx<Id[]>`insert into party (kind, display_name_cache) values ('ORGANIZATION', ${nombre}) returning id`).id
    await tx`insert into organization_profile (party_id, legal_name) values (${id}, ${nombre})`
    return id
  }
  const usuario = async (email: string, nombre: string, rol: string): Promise<string> =>
    uno(
      await tx<Id[]>`
        insert into app_user (email, status, auth_provider, role, display_name)
        values (${email}, 'ACTIVE', 'google', ${rol}, ${nombre}) returning id
      `,
    ).id
  const bodega = await empresa('Bodega Sintética SA')
  const otra = await empresa('Otra Sintética SA')
  const ana = await usuario('ana@sintetico.test', 'Ana', 'OPERADOR')
  const beto = await usuario('beto@sintetico.test', 'Beto', 'OPERADOR')
  await tx`set local role broker_app`
  return { bodega, otra, ana, beto }
}

const comoUsuario = async (tx: postgres.TransactionSql, id: string): Promise<void> => {
  await tx`select set_config('authz.usuario_id', ${id}, true)`
}

describe('listas de riesgos (0030)', () => {
  it('crea, edita y da de baja un ítem, y queda quién hizo cada cambio', async () => {
    await descartable(async (tx) => {
      const m = await sembrar(tx)
      await comoUsuario(tx, m.ana)
      const creado = await createRiskItem(tx, {
        partyId: m.bodega, list: 'RIESGO', code: 'R1',
        fields: { sector: 'Bodega', riesgo: 'Incendio o explosión', impacto: 'Alto' },
      })
      assert.equal(creado.kind, 'ok')
      await createRiskItem(tx, { partyId: m.bodega, list: 'RIESGO', code: 'R10', fields: { riesgo: 'Robo' } })
      await createRiskItem(tx, { partyId: m.bodega, list: 'RIESGO', code: 'R2', fields: { riesgo: 'Sismo' } })
      await createRiskItem(tx, { partyId: m.bodega, list: 'ACCION', code: 'A01', fields: { accion: 'Despejar salidas' } })

      await comoUsuario(tx, m.beto)
      await updateRiskItem(tx, m.bodega, creado.id, { sector: 'Bodega', riesgo: 'Incendio o explosión', impacto: 'Medio' })
      await commentRiskItem(tx, m.bodega, creado.id, 'Revisado en la visita del 17/11.')

      const riesgos = await listRiskItems(tx, m.bodega, { list: 'RIESGO' })
      assert.deepEqual(riesgos.map((r) => r.code), ['R1', 'R2', 'R10'])
      const r1 = riesgos[0]
      assert.ok(r1)
      assert.equal(r1.fields.impacto, 'Medio')
      assert.equal(r1.versions, 2)
      assert.equal(r1.createdByName, 'Ana')
      assert.equal(r1.updatedByName, 'Beto')
      assert.deepEqual(r1.comments.map((c) => [c.body, c.authorName]), [['Revisado en la visita del 17/11.', 'Beto']])

      // La versión anterior queda.
      const historia = await tx<{ impacto: string }[]>`
        select fields->>'impacto' as impacto from risk_item_version where item_id = ${creado.id} order by created_at`
      assert.deepEqual(historia.map((h) => h.impacto), ['Alto', 'Medio'])

      assert.equal((await retireRiskItem(tx, m.bodega, creado.id)).kind, 'ok')
      assert.deepEqual((await listRiskItems(tx, m.bodega, { list: 'RIESGO' })).map((r) => r.code), ['R2', 'R10'])
      const conBajas = await listRiskItems(tx, m.bodega, { list: 'RIESGO', includeRetired: true })
      assert.equal(conBajas.find((r) => r.code === 'R1')?.fields.impacto, 'Medio')
      assert.equal((await listRiskItems(tx, m.bodega)).length, 3)
    })
  })

  it('no repite un código en la misma lista ni toca ítems de otra empresa', async () => {
    await descartable(async (tx) => {
      const m = await sembrar(tx)
      await comoUsuario(tx, m.ana)
      const r1 = await createRiskItem(tx, { partyId: m.bodega, list: 'RIESGO', code: 'R1', fields: {} })
      assert.equal(r1.kind, 'ok')
      assert.deepEqual(await createRiskItem(tx, { partyId: m.bodega, list: 'RIESGO', code: 'R1', fields: {} }), { kind: 'duplicate' })
      assert.equal((await createRiskItem(tx, { partyId: m.otra, list: 'RIESGO', code: 'R1', fields: {} })).kind, 'ok')
      assert.deepEqual(await updateRiskItem(tx, m.otra, r1.id, { riesgo: 'x' }), { kind: 'not_found' })
      assert.deepEqual(await retireRiskItem(tx, m.otra, r1.id), { kind: 'not_found' })
      assert.deepEqual(await commentRiskItem(tx, m.otra, r1.id, 'x'), { kind: 'not_found' })
    })
  })

  it('quien no es del equipo no ve ni escribe las listas', async () => {
    await descartable(async (tx) => {
      const m = await sembrar(tx)
      await comoUsuario(tx, m.ana)
      await createRiskItem(tx, { partyId: m.bodega, list: 'RIESGO', code: 'R1', fields: { riesgo: 'Incendio' } })
      await tx`reset role`
      const revisor = uno(
        await tx<Id[]>`
          insert into app_user (email, status, auth_provider, role) values ('rev@sintetico.test', 'ACTIVE', 'google', 'REVISOR') returning id`,
      ).id
      await tx`set local role broker_app`
      await comoUsuario(tx, revisor)
      assert.equal((await listRiskItems(tx, m.bodega)).length, 0)
      await tx`savepoint s1`
      await assert.rejects(createRiskItem(tx, { partyId: m.bodega, list: 'RIESGO', code: 'R2', fields: {} }), /row-level security/)
      await tx`rollback to savepoint s1`
    })
  })

  it('guarda sólo las columnas de la lista y códigos válidos', () => {
    assert.deepEqual(cleanRiskItemFields('ACCION', { accion: '  Despejar salidas ', riesgo: 'no es de acciones', decision: '' }), {
      accion: 'Despejar salidas',
    })
    assert.equal(cleanRiskItemFields('FUENTE', { documento: 'x'.repeat(4001) }), null)
    assert.equal(cleanRiskItemCode(' a01 '), 'A01')
    assert.equal(cleanRiskItemCode('R-1'), null)
    assert.equal(cleanRiskItemCode(''), null)
  })
})
