// T-0062 — Las herramientas del agente de riesgos como las llama Claude: por `conDatos`, como
// `broker_app`, a nombre de quien conectó el agente. Contra Postgres real, con datos sintéticos
// y cada caso en una transacción revertida. Requiere DATABASE_URL con 0030 aplicada.

import assert from 'node:assert/strict'
import { after, describe, it } from 'node:test'

import postgres from 'postgres'

import type { Principal } from '../session/admission.ts'
import type { ContextoRiesgos } from './herramientas-riesgos.ts'
import { HERRAMIENTAS_RIESGOS } from './herramientas-riesgos.ts'
import { ErrorDeHerramienta } from './servidor.ts'

const databaseUrl = process.env.DATABASE_URL
if (databaseUrl === undefined || databaseUrl === '') {
  throw new Error('DATABASE_URL no está configurada: T-0062 requiere PostgreSQL real.')
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

const quien: Principal = { sub: 'sub-agente', email: 'sub-agente@sintetico.test', displayName: null }

const uno = <T>(filas: readonly T[]): T => {
  const [fila] = filas
  if (fila === undefined) throw new Error('se esperaba una fila')
  return fila
}

interface Mundo {
  readonly empresa: string
  readonly otra: string
  readonly poliza: string
  readonly endoso: string
}

const sembrar = async (tx: postgres.TransactionSql): Promise<Mundo> => {
  const org = async (nombre: string): Promise<string> => {
    const id = uno(await tx<{ id: string }[]>`insert into party (kind, display_name_cache) values ('ORGANIZATION', ${nombre}) returning id`).id
    await tx`insert into organization_profile (party_id, legal_name) values (${id}, ${nombre})`
    return id
  }
  const empresa = await org('Bodega Sintética SA')
  const otra = await org('Otra Sintética SA')
  const insurer = uno(
    await tx<{ id: string }[]>`insert into insurer (organization_party_id, canonical_name) values (${await org('Aseguradora Sintética')}, 'Aseguradora Sintética') returning id`,
  ).id
  const poliza = uno(await tx<{ id: string }[]>`insert into policy (insurer_id, policy_number) values (${insurer}, 'SINT-TRO-1') returning id`).id
  await tx`
    insert into policy_version (policy_id, version_number, effective_from, holder_party_id, product_reference,
                                term_start_date, term_end_date, renewal_mode, status, source_event_type)
    values (${poliza}, 1, '2026-08-17', ${empresa}, 'TODO RIESGO OPERATIVO', '2026-08-17', '2027-08-17', 'MANUAL', 'ACTIVE', 'ISSUANCE')
  `
  const endoso = uno(
    await tx<{ id: string }[]>`
      insert into endorsement (policy_id, number, kind, effective_from, source_reference)
      values (${poliza}, '0001', 'MODIFICACION', '2026-09-29', 'sintetico:0001') returning id
    `,
  ).id
  const usuario = uno(
    await tx<{ id: string }[]>`
      insert into app_user (email, status, auth_provider, role, display_name)
      values ('sub-agente@sintetico.test', 'ACTIVE', 'google', 'OPERADOR', 'Manu') returning id
    `,
  ).id
  await tx`insert into user_credential (user_id, provider, subject) values (${usuario}, 'google', 'sub-agente')`
  return { empresa, otra, poliza, endoso }
}

const herramienta = (nombre: string) => {
  const h = HERRAMIENTAS_RIESGOS.find((x) => x.name === nombre)
  if (h === undefined) throw new Error(`no existe ${nombre}`)
  return h
}

const llamar = async <T = Record<string, unknown>>(tx: postgres.TransactionSql, nombre: string, argumentos: Record<string, unknown>): Promise<T> => {
  const contexto: ContextoRiesgos = { principal: quien, conexion: tx }
  // Como lo recibe el agente: en JSON.
  return JSON.parse(JSON.stringify(await herramienta(nombre).ejecutar(contexto, argumentos))) as T
}

const rechaza = async (promesa: Promise<unknown>, patron: RegExp): Promise<void> => {
  await assert.rejects(promesa, (error) => {
    assert.ok(error instanceof ErrorDeHerramienta, String(error))
    assert.match(error.message, patron)
    return true
  })
}

describe('herramientas MCP del agente de riesgos (T-0062)', () => {
  it('el agente carga ubicación, condiciones, coberturas, relevamiento y conclusión, y lo lee firmado', async () => {
    await descartable(async (tx) => {
      const m = await sembrar(tx)
      const { ubicacion_id: hotel } = await llamar<{ ubicacion_id: string }>(tx, 'registrar_ubicacion', {
        cliente_id: m.empresa, nombre: 'Hotel', localidad: 'Tupungato', provincia: 'Mendoza',
      })
      const { condicion_ids: condiciones } = await llamar<{ condicion_ids: string[] }>(tx, 'registrar_condiciones', {
        cliente_id: m.empresa,
        condiciones: [
          { ubicacion_id: hotel, atributo: 'subsuelo', valor: 'si', estado: 'declarado', fuente: 'cliente', observado_el: '2026-11-17' },
          { ubicacion_id: hotel, atributo: 'carga_ve', valor: 'probable', estado: 'PROPUESTO', fuente: 'AGENTE' },
        ],
      })
      const { cobertura_ids: coberturas } = await llamar<{ cobertura_ids: string[] }>(tx, 'registrar_coberturas', {
        poliza_id: m.poliza,
        coberturas: [
          { tipo: 'SUBLIMITE', cobertura: 'Inundación', monto: 1000000, moneda: 'usd', rige_desde: '2026-08-17', documento: 'Póliza TRO', pagina_o_clausula: 'p. 4' },
          { tipo: 'EXCLUSION', cobertura: 'Granizo sobre viñedos', rige_desde: '2026-08-17', documento: 'Póliza TRO', pagina_o_clausula: 'Cláusula 12' },
        ],
      })
      const [inundacion, granizo] = coberturas
      await llamar(tx, 'registrar_coberturas', {
        poliza_id: m.poliza, endoso_id: m.endoso,
        coberturas: [{ tipo: 'SUBLIMITE', cobertura: 'Inundación', monto: 2000000, moneda: 'USD', rige_desde: '2026-09-29', reemplaza_id: inundacion, documento: 'Endoso 0001', pagina_o_clausula: 'p. 1' }],
      })
      await llamar(tx, 'registrar_relevamiento', {
        cliente_id: m.empresa, ubicacion_id: hotel, fecha_visita: '2026-11-17', realizado_por: 'Del Campo',
        hallazgos: [{ sector: 'Sala de bombas', tema: 'bomba_incendio', aspecto: 'PRUEBA', resultado: 'NO_VERIFICADO', prioridad: 'ALTA', descripcion: 'Sin registro de prueba semanal' }],
      })
      const { conclusion_id: _c, estado } = await llamar<{ conclusion_id: string; estado: string }>(tx, 'registrar_conclusion', {
        cliente_id: m.empresa, ubicacion_id: hotel, nivel: 2, enunciado: 'El hotel está expuesto a inundación del subsuelo.',
        nota_id: 'cli-004', evidencia: [{ condicion_id: condiciones[0] }],
      })
      assert.equal(estado, 'RESPALDADA')
      const pendiente = await llamar<{ estado: string }>(tx, 'registrar_conclusion', {
        cliente_id: m.empresa, nivel: 3, poliza_id: m.poliza, sentido: 'NO_CUBRE',
        enunciado: 'No se ve cobertura de remoción de escombros.', nota_id: 'LIM-001',
        falta: 'Condiciones particulares y endosos vigentes de la póliza TRO',
      })
      assert.equal(pendiente.estado, 'PENDIENTE')
      const excluido = await llamar<{ estado: string }>(tx, 'registrar_conclusion', {
        cliente_id: m.empresa, nivel: 3, poliza_id: m.poliza, sentido: 'NO_CUBRE',
        enunciado: 'El granizo sobre viñedos está excluido.', nota_id: 'CLI-004', evidencia: [{ cobertura_id: granizo }],
      })
      assert.equal(excluido.estado, 'RESPALDADA')

      const vigentes = await llamar<{ coberturas: { coverage: string; limitAmount: string | null; confirmed: boolean }[] }>(
        tx, 'leer_coberturas_poliza', { poliza_id: m.poliza, fecha: '2026-10-01' },
      )
      assert.deepEqual(vigentes.coberturas.map((c) => [c.coverage, c.limitAmount, c.confirmed]), [
        ['Granizo sobre viñedos', null, false],
        ['Inundación', '2000000', false],
      ])

      const vista = await llamar<{
        ubicaciones: unknown[]; condiciones: { status: string }[]; relevamientos: { findings: unknown[] }[]
        conclusiones: { agent: string; status: string; review: string | null }[]
      }>(tx, 'leer_riesgos_empresa', { cliente_id: m.empresa })
      assert.equal(vista.ubicaciones.length, 1)
      assert.deepEqual(vista.condiciones.map((c) => c.status).sort(), ['DECLARADO', 'PROPUESTO'])
      assert.equal(vista.relevamientos[0]?.findings.length, 1)
      assert.deepEqual(vista.conclusiones.map((c) => [c.agent, c.status, c.review]), [
        ['riesgos@1', 'RESPALDADA', null],
        ['riesgos@1', 'PENDIENTE', null],
        ['riesgos@1', 'RESPALDADA', null],
      ])
      const firmas = await tx<{ agent: string | null; email: string }[]>`
        select f.agent, u.email from location_fact f join app_user u on u.id = f.created_by_user_id where f.party_id = ${m.empresa}`
      assert.deepEqual(firmas.map((f) => [f.agent, f.email]), [['riesgos@1', 'sub-agente@sintetico.test'], ['riesgos@1', 'sub-agente@sintetico.test']])

      const cartera = await llamar<{ resultados: { result: string; companies: number }[] }>(tx, 'cifras_de_cartera', { tema: 'bomba_incendio', aspecto: 'PRUEBA' })
      assert.deepEqual(cartera.resultados, [{ result: 'NO_VERIFICADO', companies: 1 }])
    })
  })

  it('no deja concluir "no cubre" por ausencia, ni caracterizar sin la condición declarada', async () => {
    await descartable(async (tx) => {
      const m = await sembrar(tx)
      const { cobertura_ids: [sublimite] } = await llamar<{ cobertura_ids: string[] }>(tx, 'registrar_coberturas', {
        poliza_id: m.poliza,
        coberturas: [{ tipo: 'SUBLIMITE', cobertura: 'Inundación', monto: 1, moneda: 'USD', rige_desde: '2026-08-17', documento: 'Póliza', pagina_o_clausula: 'p. 4' }],
      })
      const { condicion_ids: [propuesta] } = await llamar<{ condicion_ids: string[] }>(tx, 'registrar_condiciones', {
        cliente_id: m.empresa, condiciones: [{ atributo: 'zona_inundable', valor: 'si', estado: 'PROPUESTO', fuente: 'AGENTE' }],
      })
      await rechaza(
        llamar(tx, 'registrar_conclusion', {
          cliente_id: m.empresa, nivel: 3, poliza_id: m.poliza, sentido: 'NO_CUBRE', enunciado: 'No cubre remoción de escombros',
          nota_id: 'LIM-001', evidencia: [{ cobertura_id: sublimite }],
        }),
        /no alcanza/,
      )
      await rechaza(
        llamar(tx, 'registrar_conclusion', { cliente_id: m.empresa, nivel: 3, enunciado: 'x', nota_id: 'LIM-001' }),
        /poliza_id/,
      )
      await rechaza(
        llamar(tx, 'registrar_conclusion', {
          cliente_id: m.empresa, nivel: 2, enunciado: 'Expuesta a inundación', nota_id: 'CLI-004', evidencia: [{ condicion_id: propuesta }],
        }),
        /declarada por el cliente o confirmada/,
      )
      await rechaza(
        llamar(tx, 'registrar_conclusion', { cliente_id: m.empresa, nivel: 2, enunciado: 'x', nota_id: 'nota-libre' }),
        /nota_id/,
      )
      // La evidencia de otra empresa no sirve.
      await rechaza(
        llamar(tx, 'registrar_conclusion', {
          cliente_id: m.otra, nivel: 2, enunciado: 'x', nota_id: 'CLI-004', evidencia: [{ condicion_id: propuesta }],
        }),
        /no es de esa empresa/,
      )
      const conclusiones = await tx`select 1 from risk_conclusion where party_id in (${m.empresa}, ${m.otra})`
      assert.equal(conclusiones.length, 0)
    })
  })

  it('las reglas de la base llegan al agente como un motivo legible', async () => {
    await descartable(async (tx) => {
      const m = await sembrar(tx)
      await rechaza(
        llamar(tx, 'registrar_condiciones', {
          cliente_id: m.empresa, condiciones: [{ atributo: 'rociadores', valor: 'si', estado: 'CONFIRMADO', fuente: 'CLIENTE' }],
        }),
        /CONFIRMADO necesita fuente VISITA/,
      )
      await rechaza(
        llamar(tx, 'registrar_condiciones', {
          cliente_id: m.empresa, condiciones: [{ atributo: 'rociadores', valor: 'si', estado: 'DECLARADO', fuente: 'AGENTE' }],
        }),
        /agente va con fuente AGENTE y estado PROPUESTO/,
      )
      await rechaza(
        llamar(tx, 'registrar_condiciones', { cliente_id: m.empresa, condiciones: [{ atributo: 'Zona Inundable', estado: 'DESCONOCIDO', fuente: 'CLIENTE' }] }),
        /condiciones\[0\]: "atributo"/,
      )
      await rechaza(
        llamar(tx, 'registrar_coberturas', {
          poliza_id: m.poliza, coberturas: [{ tipo: 'SUBLIMITE', cobertura: 'Robo', monto: 5, rige_desde: '2026-08-17', documento: 'P', pagina_o_clausula: 'p. 1' }],
        }),
        /monto va con su moneda/,
      )
    })
  })

  it('crea, edita sólo lo enviado, da de baja y comenta ítems de las listas', async () => {
    await descartable(async (tx) => {
      const m = await sembrar(tx)
      const { item_id: item } = await llamar<{ item_id: string }>(tx, 'guardar_item_riesgo', {
        cliente_id: m.empresa, lista: 'RIESGO', codigo: 'r1', campos: { riesgo: 'Incendio en sala de barricas', impacto: '4' },
      })
      await rechaza(
        llamar(tx, 'guardar_item_riesgo', { cliente_id: m.empresa, lista: 'RIESGO', codigo: 'R1', campos: { riesgo: 'Otro' } }),
        /Ya hay un ítem R1/,
      )
      await rechaza(
        llamar(tx, 'guardar_item_riesgo', { cliente_id: m.empresa, lista: 'RIESGO', codigo: 'R2', campos: { puntaje: '80' } }),
        /no tiene: puntaje/,
      )
      await llamar(tx, 'guardar_item_riesgo', { cliente_id: m.empresa, lista: 'RIESGO', item_id: item, campos: { impacto: '5', sector: 'Bodega' } })
      await llamar(tx, 'guardar_item_riesgo', { cliente_id: m.empresa, lista: 'RIESGO', item_id: item, campos: { sector: '' }, dar_de_baja: true })
      await llamar(tx, 'comentar_item_riesgo', { cliente_id: m.empresa, item_id: item, texto: 'Revisar con Manuel' })
      await rechaza(llamar(tx, 'comentar_item_riesgo', { cliente_id: m.otra, item_id: item, texto: 'x' }), /No hay un ítem/)

      const vista = await llamar<{ items: { fields: Record<string, string>; retired: boolean; versions: number; updatedByAgent: string; comments: { agent: string }[] }[] }>(
        tx, 'leer_riesgos_empresa', { cliente_id: m.empresa },
      )
      const [r1] = vista.items
      assert.ok(r1)
      assert.deepEqual(r1.fields, { riesgo: 'Incendio en sala de barricas', impacto: '5' })
      assert.equal(r1.retired, true)
      assert.equal(r1.versions, 4)
      assert.equal(r1.updatedByAgent, 'riesgos@1')
      assert.deepEqual(r1.comments.map((c) => c.agent), ['riesgos@1'])
    })
  })
})
