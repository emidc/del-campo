// T-0037 (I1c) — U8 contra PostgreSQL real (R-26). Sólo fixtures sintéticas (R-19):
// pólizas, partes y URLs inventadas, dentro de una transacción que se revierte.
//
// Cubre el criterio de C3-01c: cada póliza cuenta una sola vez, en uno de cuatro niveles,
// los niveles suman el total y la salida no trae datos de clientes.

import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { after, describe, it } from 'node:test'

import postgres from 'postgres'

import { coberturaDePolicies, medirCoberturaDocumental, NIVELES_U8, tablaU8 } from './cobertura.ts'
import type { CoberturaDocumental, NivelU8 } from './cobertura.ts'

const ROOT = resolve(import.meta.dirname, '..', '..', '..', '..')

const readEnv = (): Record<string, string> => {
  const path = join(ROOT, '.env')
  if (!existsSync(path)) return {}
  const pairs: Record<string, string> = {}
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const trimmed = line.trim()
    if (trimmed === '' || trimmed.startsWith('#')) continue
    const separator = trimmed.indexOf('=')
    if (separator === -1) continue
    pairs[trimmed.slice(0, separator).trim()] = trimmed.slice(separator + 1).trim()
  }
  return pairs
}

const databaseUrl = process.env.DATABASE_URL ?? readEnv().DATABASE_URL
if (databaseUrl === undefined || databaseUrl === '') {
  throw new Error('DATABASE_URL no está configurada: U8 (T-0037) requiere PostgreSQL real.')
}

const sql = postgres(databaseUrl, { max: 5 })

after(async () => {
  await sql.end()
})

class Rollback extends Error {}

const enTransaccionRevertida = async (accion: (tx: postgres.TransactionSql) => Promise<void>): Promise<void> => {
  try {
    await sql.begin(async (tx) => {
      await accion(tx)
      throw new Rollback('descartar fixture sintética')
    })
  } catch (error) {
    if (!(error instanceof Rollback)) throw error
  }
}

const uno = <T>(filas: readonly T[], contexto: string): T => {
  const fila = filas[0]
  if (fila === undefined) throw new Error(`se esperaba una fila: ${contexto}`)
  return fila
}

const ARCHIVO = (n: string): string => `https://drive.google.com/file/d/SINTETICO-U8-${n}/view`
const CARPETA = (n: string): string => `https://drive.google.com/drive/folders/SINTETICO-U8-${n}`

// ── Fixtures de dominio, con la forma que dejan T-0013, T-0017 y T-0022 ─────

const crearOrganizacion = async (tx: postgres.TransactionSql, nombre: string): Promise<string> => {
  const party = uno(
    await tx<{ id: string }[]>`insert into party (kind) values ('ORGANIZATION') returning id`,
    'party',
  )
  await tx`insert into organization_profile (party_id, legal_name) values (${party.id}, ${nombre})`
  return party.id
}

interface Escenario {
  readonly tx: postgres.TransactionSql
  readonly aseguradora: string
  readonly cliente: string
}

const escenario = async (tx: postgres.TransactionSql): Promise<Escenario> => {
  const organizacion = await crearOrganizacion(tx, 'Aseguradora Sintetica U8 Sociedad')
  const aseguradora = uno(
    await tx<{ id: string }[]>`
      insert into insurer (organization_party_id, canonical_name)
      values (${organizacion}, 'Aseguradora Sintetica U8')
      returning id
    `,
    'insurer',
  ).id
  return { tx, aseguradora, cliente: await crearOrganizacion(tx, 'Cliente Sintetico U8') }
}

const crearPoliza = async (e: Escenario, numero: string, tomador = e.cliente): Promise<string> => {
  const id = uno(
    await e.tx<{ id: string }[]>`
      insert into policy (insurer_id, policy_number) values (${e.aseguradora}, ${numero}) returning id
    `,
    'policy',
  ).id
  await e.tx`
    insert into policy_version (
      policy_id, version_number, effective_from, holder_party_id,
      term_start_date, term_end_date, renewal_mode, source_event_type, source_event_id
    ) values (
      ${id}, 1, '2026-01-01', ${tomador}, '2026-01-01', '2027-01-01', 'MANUAL', 'Polizas', ${`Z-${numero}`}
    )
  `
  return id
}

/** Vínculo comprobado por una persona (T-0017, nivel HUMAN). */
const documentoComprobado = async (e: Escenario, policyId: string, n: string): Promise<void> => {
  const link = uno(
    await e.tx<{ id: string }[]>`
      insert into document_link (
        resource_type, resource_id, drive_file_id, drive_url, drive_item_type, reconciliation_status, link_level
      ) values ('POLICY', ${policyId}, ${n}, ${ARCHIVO(n)}, 'FILE', 'SYNCED', 'HUMAN')
      returning id
    `,
    'document_link humano',
  )
  const referencia = uno(
    await e.tx<{ id: string }[]>`
      insert into external_reference (
        source_system, source_entity_type, source_value, relation_type,
        resolution_status, resolved_target_type, resolved_target_id
      ) values (
        'T-0017', 'PolicyDocumentReference', ${`u8-${n}`}, 'POLICY_DOCUMENT', 'RESOLVED', 'DRIVE_FILE', ${link.id}
      )
      returning id
    `,
    'external_reference humana',
  )
  await e.tx`insert into policy_document_reference (external_reference_id, policy_id) values (${referencia.id}, ${policyId})`
}

/** Enlace que informa el lote de Zoho (T-0022, nivel ZOHO_UNVERIFIED). */
const documentoDeZoho = async (e: Escenario, policyId: string, n: string): Promise<void> => {
  await e.tx`
    insert into document_link (
      resource_type, resource_id, drive_file_id, drive_url, drive_item_type, reconciliation_status, link_level
    ) values ('POLICY', ${policyId}, ${n}, ${ARCHIVO(n)}, 'FILE', 'NOT_REFERENCED', 'ZOHO_UNVERIFIED')
  `
}

/** Pendiente registrado por una persona, con motivo. */
const pendiente = async (e: Escenario, policyId: string, n: string): Promise<void> => {
  const referencia = uno(
    await e.tx<{ id: string }[]>`
      insert into external_reference (
        source_system, source_entity_type, source_value, relation_type, resolution_status, unresolved_reason
      ) values ('T-0017', 'PolicyDocumentReference', ${`u8-pend-${n}`}, 'POLICY_DOCUMENT', 'UNRESOLVED', 'INACCESSIBLE')
      returning id
    `,
    'external_reference pendiente',
  )
  await e.tx`insert into policy_document_reference (external_reference_id, policy_id) values (${referencia.id}, ${policyId})`
}

/** Carpeta del cliente: no es el documento de la póliza, sea cual sea su nivel. */
const carpetaDelCliente = async (
  e: Escenario,
  partyId: string,
  n: string,
  nivel: 'HUMAN' | 'ZOHO_UNVERIFIED' = 'HUMAN',
): Promise<void> => {
  await e.tx`
    insert into document_link (
      resource_type, resource_id, drive_file_id, drive_url, drive_item_type, reconciliation_status, link_level
    ) values ('PARTY', ${partyId}, ${n}, ${CARPETA(n)}, 'FOLDER', 'SYNCED', ${nivel})
  `
}

const suma = (cobertura: CoberturaDocumental): number =>
  NIVELES_U8.reduce((total, nivel) => total + cobertura.niveles[nivel], 0)

const nivelDe = async (tx: postgres.TransactionSql, policyId: string): Promise<NivelU8> => {
  const cobertura = await coberturaDePolicies(tx, [policyId])
  const niveles = NIVELES_U8.filter((nivel) => cobertura.niveles[nivel] === 1)
  assert.equal(niveles.length, 1, `la póliza cae en ${String(niveles.length)} niveles`)
  return uno(niveles, 'nivel')
}

describe('U8 · cobertura documental (T-0037 I1c)', () => {
  it('ubica cada póliza en su mejor nivel, una sola vez', async () => {
    await enTransaccionRevertida(async (tx) => {
      const e = await escenario(tx)

      const comprobada = await crearPoliza(e, 'U8-001')
      await documentoComprobado(e, comprobada, '001')

      // Comprobado prevalece sobre el enlace de Zoho y sobre un pendiente (D-0064).
      const comprobadaConTodo = await crearPoliza(e, 'U8-002')
      await documentoComprobado(e, comprobadaConTodo, '002')
      await documentoDeZoho(e, comprobadaConTodo, '002z')
      await pendiente(e, comprobadaConTodo, '002')

      const deZoho = await crearPoliza(e, 'U8-003')
      await documentoDeZoho(e, deZoho, '003')

      // Con enlace de Zoho, el pendiente queda debajo: la pantalla ofrece el documento.
      const deZohoConPendiente = await crearPoliza(e, 'U8-004')
      await documentoDeZoho(e, deZohoConPendiente, '004')
      await pendiente(e, deZohoConPendiente, '004')

      const pendienteSolo = await crearPoliza(e, 'U8-005')
      await pendiente(e, pendienteSolo, '005')

      // Dos vínculos humanos: la consulta lo deja ambiguo, y Zoho no lo resuelve.
      const ambigua = await crearPoliza(e, 'U8-006')
      await documentoComprobado(e, ambigua, '006a')
      await documentoComprobado(e, ambigua, '006b')
      await documentoDeZoho(e, ambigua, '006z')

      const sinNada = await crearPoliza(e, 'U8-007')

      // La carpeta del cliente no sube a la póliza de nivel.
      const otroCliente = await crearOrganizacion(tx, 'Cliente Sintetico U8 Con Carpeta')
      await carpetaDelCliente(e, otroCliente, '008')
      const soloCarpeta = await crearPoliza(e, 'U8-008', otroCliente)

      // Dos carpetas comprobadas del tomador: la pantalla muestra «ambiguo», pero es de la
      // carpeta. Sin nada sobre el documento, la póliza queda Sin documento.
      const clienteDosCarpetas = await crearOrganizacion(tx, 'Cliente Sintetico U8 Dos Carpetas')
      await carpetaDelCliente(e, clienteDosCarpetas, '009a')
      await carpetaDelCliente(e, clienteDosCarpetas, '009b')
      const carpetaAmbigua = await crearPoliza(e, 'U8-009', clienteDosCarpetas)

      // Carpeta del cliente que sólo informa Zoho: tampoco sube de nivel.
      const clienteCarpetaZoho = await crearOrganizacion(tx, 'Cliente Sintetico U8 Carpeta Zoho')
      await carpetaDelCliente(e, clienteCarpetaZoho, '011', 'ZOHO_UNVERIFIED')
      const carpetaDeZoho = await crearPoliza(e, 'U8-011', clienteCarpetaZoho)

      // Con dos carpetas y un pendiente del documento, sigue siendo Pendiente.
      const clienteDosCarpetasB = await crearOrganizacion(tx, 'Cliente Sintetico U8 Dos Carpetas B')
      await carpetaDelCliente(e, clienteDosCarpetasB, '012a')
      await carpetaDelCliente(e, clienteDosCarpetasB, '012b')
      const carpetaAmbiguaConPendiente = await crearPoliza(e, 'U8-012', clienteDosCarpetasB)
      await pendiente(e, carpetaAmbiguaConPendiente, '012')

      const esperado: Readonly<Record<string, NivelU8>> = {
        [comprobada]: 'comprobado',
        [comprobadaConTodo]: 'comprobado',
        [deZoho]: 'sinComprobar',
        [deZohoConPendiente]: 'sinComprobar',
        [pendienteSolo]: 'pendiente',
        [ambigua]: 'pendiente',
        [sinNada]: 'sinDocumento',
        [soloCarpeta]: 'sinDocumento',
        [carpetaAmbigua]: 'sinDocumento',
        [carpetaDeZoho]: 'sinDocumento',
        [carpetaAmbiguaConPendiente]: 'pendiente',
      }
      for (const [policyId, nivel] of Object.entries(esperado)) {
        assert.equal(await nivelDe(tx, policyId), nivel, policyId)
      }

      const cobertura = await coberturaDePolicies(tx, Object.keys(esperado))
      assert.deepEqual(cobertura, {
        polizas: 11,
        niveles: { comprobado: 2, sinComprobar: 2, pendiente: 3, sinDocumento: 4 },
      })
    })
  })

  it('una póliza pedida dos veces cuenta una vez', async () => {
    await enTransaccionRevertida(async (tx) => {
      const e = await escenario(tx)
      const poliza = await crearPoliza(e, 'U8-010')
      await documentoDeZoho(e, poliza, '010')
      const cobertura = await coberturaDePolicies(tx, [poliza, poliza])
      assert.equal(cobertura.polizas, 1)
      assert.equal(cobertura.niveles.sinComprobar, 1)
      assert.equal(suma(cobertura), 1)
    })
  })

  it('la medición cubre todas las pólizas del dominio y corre en sólo lectura', async () => {
    let medida: CoberturaDocumental | undefined
    await sql.begin('read only', async (tx) => {
      medida = await medirCoberturaDocumental(tx)
    })
    assert.equal(medida === undefined ? -1 : suma(medida), medida?.polizas)

    await enTransaccionRevertida(async (tx) => {
      const e = await escenario(tx)
      const antes = await medirCoberturaDocumental(tx)
      const conDocumento = await crearPoliza(e, 'U8-020')
      await documentoComprobado(e, conDocumento, '020')
      await crearPoliza(e, 'U8-021')

      const cobertura = await medirCoberturaDocumental(tx)
      const [fila] = await tx<{ total: number }[]>`select count(*)::int as total from policy`
      assert.equal(cobertura.polizas, fila?.total)
      assert.equal(suma(cobertura), cobertura.polizas)
      assert.equal(cobertura.polizas, antes.polizas + 2)
      assert.equal(cobertura.niveles.comprobado, antes.niveles.comprobado + 1)
      assert.equal(cobertura.niveles.sinDocumento, antes.niveles.sinDocumento + 1)
    })
  })

  it('la tabla trae sólo rótulos, conteos y proporciones', async () => {
    await enTransaccionRevertida(async (tx) => {
      const e = await escenario(tx)
      const ids = [await crearPoliza(e, 'U8-030'), await crearPoliza(e, 'U8-031'), await crearPoliza(e, 'U8-032')]
      const first = ids[0]
      if (first === undefined) throw new Error('fixture')
      await documentoDeZoho(e, first, '030')
      const tabla = tablaU8(await coberturaDePolicies(tx, ids))

      assert.equal(
        tabla,
        [
          '| Nivel | Pólizas | Proporción |',
          '|---|---:|---:|',
          '| Comprobado | 0 | 0,0 % |',
          '| Sin comprobar | 1 | 33,3 % |',
          '| Pendiente | 0 | 0,0 % |',
          '| Sin documento | 2 | 66,7 % |',
          '| Total | 3 | 100 % |',
        ].join('\n'),
      )
      for (const id of ids) assert.ok(!tabla.includes(id))
      assert.ok(!tabla.includes('U8-03'))
      assert.ok(!tabla.includes('drive.google.com'))
      assert.ok(!tabla.includes('Sintetico'))
    })
  })

  it('sin pólizas, la tabla no inventa proporciones', () => {
    const tabla = tablaU8({ polizas: 0, niveles: { comprobado: 0, sinComprobar: 0, pendiente: 0, sinDocumento: 0 } })
    assert.ok(tabla.includes('| Comprobado | 0 | — |'))
    assert.ok(tabla.includes('| Total | 0 | — |'))
  })
})
