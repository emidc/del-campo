// Modelo de datos de riesgos (0029). Contra Postgres real, con datos sintéticos y cada caso
// en una transacción revertida. Los casos reproducen el piloto (una bodega con hotel, una
// TRO con endosos que cambian sublímites) sin datos reales.
//
// Requiere DATABASE_URL apuntando a una base con 0029 aplicada (`pnpm db:migrate`).

import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { after, describe, it } from 'node:test'

import postgres from 'postgres'

import {
  confirmCoverage,
  coverageHistory,
  coveragesAt,
  createLocation,
  listConclusions,
  listCurrentFacts,
  portfolioWithCondition,
  recordConclusion,
  recordCoverage,
  recordFact,
  recordSurvey,
  reviewConclusion,
  tallyFindings,
} from './riesgos.ts'

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
  readonly poliza: string
  readonly endoso1: string
  readonly endoso3: string
  readonly op: string
}

const AGENTE = 'riesgos@1'

const sembrar = async (tx: postgres.TransactionSql): Promise<Mundo> => {
  const empresa = async (nombre: string): Promise<string> => {
    const id = uno(await tx<Id[]>`insert into party (kind, display_name_cache) values ('ORGANIZATION', ${nombre}) returning id`).id
    await tx`insert into organization_profile (party_id, legal_name) values (${id}, ${nombre})`
    return id
  }
  const bodega = await empresa('Bodega Sintética SA')
  const otra = await empresa('Otra Sintética SA')
  const aseguradora = await empresa('Aseguradora Sintética')
  const insurer = uno(
    await tx<Id[]>`insert into insurer (organization_party_id, canonical_name) values (${aseguradora}, 'Aseguradora Sintética') returning id`,
  ).id
  const poliza = uno(await tx<Id[]>`insert into policy (insurer_id, policy_number) values (${insurer}, 'SINT-TRO-1') returning id`).id
  await tx`
    insert into policy_version (policy_id, version_number, effective_from, holder_party_id, product_reference,
                                term_start_date, term_end_date, renewal_mode, status, source_event_type)
    values (${poliza}, 1, '2026-08-17', ${bodega}, 'TODO RIESGO OPERATIVO', '2026-08-17', '2027-08-17', 'MANUAL',
            'ACTIVE', 'ISSUANCE')
  `
  const endoso = async (numero: string, desde: string): Promise<string> =>
    uno(
      await tx<Id[]>`
        insert into endorsement (policy_id, number, kind, effective_from, source_reference)
        values (${poliza}, ${numero}, 'MODIFICACION', ${desde}, ${'sintetico:' + numero}) returning id
      `,
    ).id
  const endoso1 = await endoso('0001', '2026-09-29')
  const endoso3 = await endoso('0003', '2026-10-30')
  const op = uno(
    await tx<Id[]>`
      insert into app_user (email, status, auth_provider, role) values ('op@sintetico.test', 'ACTIVE', 'google', 'OPERADOR') returning id
    `,
  ).id
  await tx`select set_config('authz.usuario_id', ${op}, true)`
  await tx`set local role broker_app`
  return { bodega, otra, poliza, endoso1, endoso3, op }
}

describe('modelo de riesgos (0029)', () => {
  it('una empresa con dos ubicaciones inundables cuenta una sola vez y dice qué ubicaciones la activaron', async () => {
    await descartable(async (tx) => {
      const m = await sembrar(tx)
      const planta = await createLocation(tx, { partyId: m.bodega, name: 'Complejo bodega' })
      const hotel = await createLocation(tx, { partyId: m.bodega, name: 'Hotel' })
      const casa = await createLocation(tx, { partyId: m.bodega, name: 'Casa de finca' })
      const deposito = await createLocation(tx, { partyId: m.otra, name: 'Depósito' })

      await recordFact(tx, {
        partyId: m.bodega, locationId: planta, attribute: 'zona_inundable', value: 'si',
        status: 'CONFIRMADO', source: 'VISITA', sourceReference: 'Relevamiento 2026-09-10', observedOn: '2026-09-10',
      })
      await recordFact(tx, {
        partyId: m.bodega, locationId: hotel, attribute: 'zona_inundable', value: 'si',
        status: 'DECLARADO', source: 'CLIENTE',
      })
      // La casa: primero declarada inundable, después la visita la descarta. Vale la última.
      await recordFact(tx, {
        partyId: m.bodega, locationId: casa, attribute: 'zona_inundable', value: 'si', status: 'DECLARADO', source: 'CLIENTE',
      })
      await recordFact(tx, {
        partyId: m.bodega, locationId: casa, attribute: 'zona_inundable', value: 'no',
        status: 'CONFIRMADO', source: 'VISITA', sourceReference: 'Relevamiento 2026-09-10',
      })
      // Lo que infiere el agente no activa el filtro.
      await recordFact(tx, {
        partyId: m.otra, locationId: deposito, attribute: 'zona_inundable', value: 'si',
        status: 'PROPUESTO', source: 'AGENTE', agent: AGENTE,
      })

      const cartera = await portfolioWithCondition(tx, { attribute: 'zona_inundable', value: 'si' })
      assert.equal(cartera.length, 1)
      const [fila] = cartera
      assert.ok(fila)
      assert.equal(fila.partyId, m.bodega)
      assert.deepEqual(
        fila.locations.map((l) => [l.name, l.status]),
        [['Complejo bodega', 'CONFIRMADO'], ['Hotel', 'DECLARADO']],
      )

      const conPropuestas = await portfolioWithCondition(tx, {
        attribute: 'zona_inundable', value: 'si', statuses: ['DECLARADO', 'CONFIRMADO', 'PROPUESTO'],
      })
      assert.equal(conPropuestas.length, 2)

      const casaVigente = (await listCurrentFacts(tx, m.bodega)).find((f) => f.locationName === 'Casa de finca')
      assert.equal(casaVigente?.value, 'no')
    })
  })

  it('un endoso que cambia un sublímite conserva el valor anterior y la cita de los dos documentos', async () => {
    await descartable(async (tx) => {
      const m = await sembrar(tx)
      const base = await recordCoverage(tx, {
        policyId: m.poliza, endorsementId: null, kind: 'SUBLIMITE', coverage: 'Daño eléctrico',
        limitAmount: 2000, currency: 'USD', limitBasis: 'Primer riesgo absoluto', deductible: 'USD 200',
        effectiveFrom: '2026-08-17', sourceDocument: 'Póliza base', sourceLocation: 'Anexo 96, p. 3', agent: AGENTE,
      })
      const inundacion = await recordCoverage(tx, {
        policyId: m.poliza, endorsementId: null, kind: 'SUBLIMITE', coverage: 'Inundación',
        limitAmount: 100000, currency: 'USD', effectiveFrom: '2026-08-17',
        sourceDocument: 'Póliza base', sourceLocation: 'Anexo 96, p. 2', agent: AGENTE,
      })
      const nuevo = await recordCoverage(tx, {
        policyId: m.poliza, endorsementId: m.endoso3, kind: 'SUBLIMITE', coverage: 'Daño eléctrico',
        limitAmount: 50000, currency: 'USD', limitBasis: 'Primer riesgo absoluto', deductible: 'USD 200',
        effectiveFrom: '2026-10-30', replacesId: base,
        sourceDocument: 'Endoso 0003', sourceLocation: 'Anexo 96, p. 6', agent: AGENTE,
      })

      const antes = await coveragesAt(tx, m.poliza, '2026-10-01')
      assert.deepEqual(antes.map((c) => [c.coverage, c.limitAmount]), [['Daño eléctrico', '2000'], ['Inundación', '100000']])
      const despues = await coveragesAt(tx, m.poliza, '2026-11-15')
      assert.deepEqual(
        despues.map((c) => [c.coverage, c.limitAmount, c.endorsementNumber]),
        [['Daño eléctrico', '50000', '0003'], ['Inundación', '100000', null]],
      )

      const historia = await coverageHistory(tx, nuevo)
      assert.deepEqual(
        historia.map((c) => [c.limitAmount, c.sourceDocument, c.sourceLocation]),
        [['50000', 'Endoso 0003', 'Anexo 96, p. 6'], ['2000', 'Póliza base', 'Anexo 96, p. 3']],
      )

      // El equipo confirma lo que propuso el agente, una sola vez.
      assert.equal(await confirmCoverage(tx, inundacion), true)
      assert.equal(await confirmCoverage(tx, inundacion), false)
      assert.equal((await coveragesAt(tx, m.poliza, '2026-11-15')).find((c) => c.id === inundacion)?.confirmed, true)

      // Un reemplazo no puede regir antes que lo que reemplaza, ni tocar el valor original.
      await tx`savepoint s1`
      await assert.rejects(
        recordCoverage(tx, {
          policyId: m.poliza, endorsementId: m.endoso1, kind: 'SUBLIMITE', coverage: 'Daño eléctrico',
          limitAmount: 1, currency: 'USD', effectiveFrom: '2026-08-01', replacesId: base,
          sourceDocument: 'Endoso 0001', sourceLocation: 'p. 1',
        }),
      )
      await tx`rollback to savepoint s1`
      await tx`savepoint s2`
      await assert.rejects(tx`update policy_coverage set limit_amount = 1 where id = ${base}`, /permission denied/)
      await tx`rollback to savepoint s2`
    })
  })

  it('una conclusión con un endoso faltante se guarda como pendiente y se revisa', async () => {
    await descartable(async (tx) => {
      const m = await sembrar(tx)
      const hotel = await createLocation(tx, { partyId: m.bodega, name: 'Hotel' })
      const hecho = await recordFact(tx, {
        partyId: m.bodega, locationId: hotel, attribute: 'zona_inundable', value: 'si', status: 'DECLARADO', source: 'CLIENTE',
      })
      const pendiente = await recordConclusion(tx, {
        partyId: m.bodega, locationId: hotel, level: 3, noteId: 'CLI-004', noteVersion: '2026-11-22',
        statement: 'No se puede afirmar si la inundación alcanza al hotel: falta el endoso que lo incluyó.',
        policyId: m.poliza, missingDocument: 'Endoso 0001 (inclusión del hotel)',
        evidence: [{ locationFactId: hecho }, { document: 'Póliza base', documentLocation: 'Anexo 96, p. 2' }],
        agent: AGENTE,
      })
      const c = uno(await listConclusions(tx, m.bodega, { toReview: true }))
      assert.equal(c.id, pendiente)
      assert.equal(c.status, 'PENDIENTE')
      assert.equal(c.missingDocument, 'Endoso 0001 (inclusión del hotel)')
      assert.equal(c.evidenceCount, 2)
      assert.equal(c.agent, AGENTE)

      assert.equal(await reviewConclusion(tx, pendiente, 'ACEPTADA', 'Pedimos el endoso a la aseguradora'), true)
      assert.equal(await reviewConclusion(tx, pendiente, 'RECHAZADA', null), false)
      assert.equal((await listConclusions(tx, m.bodega, { toReview: true })).length, 0)

      // Una conclusión de cobertura sin póliza no se guarda, ni una respaldada que diga qué falta.
      await tx`savepoint s1`
      await assert.rejects(
        recordConclusion(tx, { partyId: m.bodega, level: 3, noteId: 'CLI-004', statement: 'Cubre', evidence: [] }),
        /risk_conclusion_cobertura_cita_poliza/,
      )
      await tx`rollback to savepoint s1`

      // La póliza citada tiene que ser de la misma empresa.
      await tx`savepoint s2`
      await assert.rejects(
        recordConclusion(tx, {
          partyId: m.otra, level: 3, noteId: 'CLI-004', statement: 'Cubre', policyId: m.poliza, evidence: [],
        }),
        /otro cliente/,
      )
      await tx`rollback to savepoint s2`
    })
  })

  it('un relevamiento guarda sus hallazgos y da la cifra de cartera por tema', async () => {
    await descartable(async (tx) => {
      const m = await sembrar(tx)
      const planta = await createLocation(tx, { partyId: m.bodega, name: 'Complejo bodega' })
      await recordSurvey(tx, {
        partyId: m.bodega, locationId: planta, visitedOn: '2026-09-10', performedBy: 'Equipo Del Campo',
        sourceDocument: 'Informe técnico sintético',
        findings: [
          {
            area: 'Salida interior', topic: 'extintores', aspect: 'MANTENIMIENTO', result: 'NO_CUMPLE', priority: 'ALTA',
            description: 'Extintor sin tarjeta de control vigente.', recommendation: 'Reemplazar y registrar inspección mensual.',
          },
          { topic: 'bomba_incendio', aspect: 'PRUEBA', result: 'NO_VERIFICADO', description: 'No se permitió probar la bomba.' },
        ],
      })
      await recordSurvey(tx, {
        partyId: m.otra, locationId: null, visitedOn: '2026-10-01', performedBy: 'Equipo Del Campo',
        findings: [{ topic: 'bomba_incendio', aspect: 'PRUEBA', result: 'CUMPLE', description: 'Arrancó y sostuvo presión.' }],
      })
      assert.deepEqual(
        [...(await tallyFindings(tx, { topic: 'bomba_incendio', aspect: 'PRUEBA' }))],
        [{ result: 'CUMPLE', companies: 1 }, { result: 'NO_VERIFICADO', companies: 1 }],
      )

      // Una ubicación de otra empresa no se puede usar.
      await tx`savepoint s1`
      await assert.rejects(
        recordSurvey(tx, { partyId: m.otra, locationId: planta, visitedOn: '2026-10-01', performedBy: 'X', findings: [] }),
        /survey_ubicacion_de_la_empresa/,
      )
      await tx`rollback to savepoint s1`
    })
  })

  it('el agente no puede dar por confirmado lo que infiere', async () => {
    await descartable(async (tx) => {
      const m = await sembrar(tx)
      await tx`savepoint s1`
      await assert.rejects(
        recordFact(tx, {
          partyId: m.bodega, locationId: null, attribute: 'carga_ve', value: 'si',
          status: 'CONFIRMADO', source: 'AGENTE', agent: AGENTE,
        }),
        /location_fact_/,
      )
      await tx`rollback to savepoint s1`
      await tx`savepoint s2`
      await assert.rejects(
        recordFact(tx, { partyId: m.bodega, locationId: null, attribute: 'carga_ve', value: 'si', status: 'CONFIRMADO', source: 'CLIENTE' }),
        /location_fact_confirmado_con_evidencia/,
      )
      await tx`rollback to savepoint s2`
    })
  })
})
