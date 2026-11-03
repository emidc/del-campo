// T-0035 — D-0027 con la precisión del owner (2026-11-03), migración 0009: asignar una
// empresa da su información comercial, sus pólizas y la identificación de sus miembros
// vigentes, pero no las pólizas personales de esos miembros, ni su perfil personal, ni
// sus contactos, ni sus documentos. Eso exige asignar a la persona. Incluye los cambios
// históricos de tomador.
//
// Contra un Postgres real (R-26), con datos sintéticos y cada caso en una transacción
// revertida (R-19). Requiere DATABASE_URL con 0009 aplicada (`pnpm db:migrate`).

import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { after, describe, it } from 'node:test'

import postgres from 'postgres'

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
  throw new Error('DATABASE_URL no está configurada: T-0035 requiere PostgreSQL real.')
}

const sql = postgres(databaseUrl, { max: 1, prepare: false, onnotice: () => undefined })

after(async () => {
  await sql.end()
})

class Rollback extends Error {}

const descartable = async <T>(accion: (tx: postgres.TransactionSql) => Promise<T>): Promise<T> => {
  let resultado: T | undefined
  try {
    await sql.begin(async (tx) => {
      resultado = await accion(tx)
      throw new Rollback('descartar')
    })
  } catch (error) {
    if (!(error instanceof Rollback)) throw error
  }
  return resultado as T
}

const uno = <T>(filas: readonly T[]): T => {
  const [fila] = filas
  if (fila === undefined) throw new Error('se esperaba una fila')
  return fila
}

interface Id {
  readonly id: string
}

// ── Semilla sintética ───────────────────────────────────────────────────────
// E1 es una empresa. P1 es empleado vigente de E1 y además tiene una póliza personal.
// PX fue empleado de E1 y ya no lo es. P2 es una persona sin relación con E1.
//
// - polE1: de E1.
// - polP1: personal de P1.
// - polCambio: v1 de E1 (vencida), v2 de P2 (vigente). Tiene un endoso y un documento.
// - polSinVigente: v1 de E1, v2 de P1; ninguna vigente hoy, la última es de P1.
//
// opE tiene asignada E1; opP tiene asignado P1; opP2 tiene asignado P2.

interface Mundo {
  readonly e1: string
  readonly p1: string
  readonly px: string
  readonly p2: string
  readonly polE1: string
  readonly polP1: string
  readonly polCambio: string
  readonly polSinVigente: string
  readonly versionE1DeCambio: string
  readonly versionP2DeCambio: string
  readonly versionE1DeSinVigente: string
  readonly versionP1DeSinVigente: string
  readonly endosoDeCambio: string
  readonly docDeCambio: string
  readonly docDeP1: string
  readonly docDeE1: string
  readonly contactoDeP1: string
  readonly contactoDeE1: string
  readonly admin: string
  readonly opE: string
  readonly opP: string
  readonly opP2: string
}

const sembrar = async (tx: postgres.TransactionSql): Promise<Mundo> => {
  const party = async (kind: 'PERSON' | 'ORGANIZATION'): Promise<string> =>
    uno(await tx<Id[]>`insert into party (kind) values (${kind}) returning id`).id
  const e1 = await party('ORGANIZATION')
  const p1 = await party('PERSON')
  const px = await party('PERSON')
  const p2 = await party('PERSON')
  const aseguradora = await party('ORGANIZATION')

  await tx`
    insert into person_profile (party_id, first_name, last_name, dni, cuil) values
      (${p1}, 'Uno', 'Sintético', '00000001', '20-00000001-0'),
      (${px}, 'Ex', 'Sintético', '00000002', null),
      (${p2}, 'Dos', 'Sintético', '00000003', null)
  `
  await tx`insert into organization_profile (party_id, legal_name) values (${e1}, 'Empresa Sintética')`
  await tx`
    insert into organization_membership (organization_party_id, person_party_id, kind, valid_from, valid_to)
    values (${e1}, ${p1}, 'EMPLOYEE', now() - interval '1 year', null),
           (${e1}, ${px}, 'EMPLOYEE', now() - interval '1 year', now() - interval '1 day')
  `
  const contacto = async (parte: string, valor: string): Promise<string> =>
    uno(
      await tx<Id[]>`
        insert into contact_point (party_id, channel, value, normalized_value)
        values (${parte}, 'EMAIL', ${valor}, ${valor}) returning id
      `,
    ).id
  const contactoDeP1 = await contacto(p1, 'uno@sintetico.test')
  const contactoDeE1 = await contacto(e1, 'empresa@sintetico.test')

  const insurer = uno(
    await tx<Id[]>`insert into insurer (organization_party_id, canonical_name) values (${aseguradora}, 'Aseguradora Sintética') returning id`,
  ).id
  const poliza = async (numero: string): Promise<string> =>
    uno(await tx<Id[]>`insert into policy (insurer_id, policy_number) values (${insurer}, ${numero}) returning id`).id
  const version = async (
    polizaId: string,
    numero: number,
    tomador: string,
    desde: number,
    hasta: number | null,
  ): Promise<string> =>
    uno(
      await tx<Id[]>`
        insert into policy_version (
          policy_id, version_number, effective_from, effective_to, holder_party_id,
          term_start_date, term_end_date, renewal_mode, status, source_event_type
        )
        values (
          ${polizaId}, ${numero}, current_date + ${desde}::int,
          ${hasta === null ? null : sql`current_date + ${hasta}::int`}, ${tomador},
          current_date + ${desde}::int, current_date + ${desde + 365}::int, 'MANUAL', 'ACTIVE', 'ISSUANCE'
        )
        returning id
      `,
    ).id

  const polE1 = await poliza('SINT-E1')
  await version(polE1, 1, e1, -30, null)
  const polP1 = await poliza('SINT-P1')
  await version(polP1, 1, p1, -30, null)
  const polCambio = await poliza('SINT-CAMBIO')
  const versionE1DeCambio = await version(polCambio, 1, e1, -400, -30)
  const versionP2DeCambio = await version(polCambio, 2, p2, -30, null)
  const polSinVigente = await poliza('SINT-SIN-VIGENTE')
  const versionE1DeSinVigente = await version(polSinVigente, 1, e1, -800, -400)
  const versionP1DeSinVigente = await version(polSinVigente, 2, p1, -400, -35)

  const endosoDeCambio = uno(
    await tx<Id[]>`
      insert into endorsement (policy_id, kind, source_reference)
      values (${polCambio}, 'HOLDER_CHANGE', ${`sint-${polCambio}`}) returning id
    `,
  ).id
  const documento = async (tipo: 'POLICY' | 'PARTY', recurso: string): Promise<string> =>
    uno(
      await tx<Id[]>`
        insert into document_link (resource_type, resource_id, drive_file_id, drive_item_type, reconciliation_status, link_level)
        values (${tipo}, ${recurso}, ${`sint-${recurso}`}, 'FILE', 'UNKNOWN', 'HUMAN') returning id
      `,
    ).id
  const docDeCambio = await documento('POLICY', polCambio)
  const docDeP1 = await documento('PARTY', p1)
  const docDeE1 = await documento('PARTY', e1)

  const usuario = async (email: string, role: string): Promise<string> =>
    uno(
      await tx<Id[]>`
        insert into app_user (email, status, auth_provider, role) values (${email}, 'ACTIVE', 'google', ${role}) returning id
      `,
    ).id
  const admin = await usuario('admin@sintetico.test', 'ADMINISTRADOR')
  const opE = await usuario('ope@sintetico.test', 'OPERADOR')
  const opP = await usuario('opp@sintetico.test', 'OPERADOR')
  const opP2 = await usuario('opp2@sintetico.test', 'OPERADOR')
  await tx`
    insert into client_assignment (user_id, client_party_id, valid) values
      (${opE}, ${e1}, tstzrange(now() - interval '1 day', null, '[)')),
      (${opP}, ${p1}, tstzrange(now() - interval '1 day', null, '[)')),
      (${opP2}, ${p2}, tstzrange(now() - interval '1 day', null, '[)'))
  `
  return {
    e1, p1, px, p2, polE1, polP1, polCambio, polSinVigente, versionE1DeCambio, versionP2DeCambio,
    versionE1DeSinVigente, versionP1DeSinVigente,
    endosoDeCambio, docDeCambio, docDeP1, docDeE1, contactoDeP1, contactoDeE1, admin, opE, opP, opP2,
  }
}

const como = async (tx: postgres.TransactionSql, rol: string, usuario: string): Promise<void> => {
  await tx`select set_config('authz.usuario_id', ${usuario}, true)`
  await tx.unsafe(`set local role ${rol}`)
}

type Tabla =
  | 'party'
  | 'policy'
  | 'policy_version'
  | 'endorsement'
  | 'document_link'
  | 'contact_point'
const ids = async (tx: postgres.TransactionSql, tabla: Tabla): Promise<string[]> =>
  (await tx.unsafe<Id[]>(`select id from ${tabla} order by id`)).map((fila) => fila.id)

const perfilesDePersona = async (tx: postgres.TransactionSql): Promise<string[]> =>
  (await tx<{ partyId: string }[]>`select party_id as "partyId" from person_profile order by 1`).map((f) => f.partyId)

const ordenados = (...valores: string[]): string[] => [...valores].sort()

/** Lo que ve `usuario` como `rol`, en todas las tablas que importan acá. */
const vista = async (tx: postgres.TransactionSql, rol: string, usuario: string) => {
  await como(tx, rol, usuario)
  return {
    partes: await ids(tx, 'party'),
    perfiles: await perfilesDePersona(tx),
    contactos: await ids(tx, 'contact_point'),
    polizas: await ids(tx, 'policy'),
    versiones: await ids(tx, 'policy_version'),
    endosos: await ids(tx, 'endorsement'),
    documentos: await ids(tx, 'document_link'),
    miembros: [
      ...(await tx<{ persona: string; empresa: string; nombre: string; apellido: string }[]>`
        select person_party_id as persona, organization_party_id as empresa,
               first_name as nombre, last_name as apellido
        from miembro_de_empresa_asignada order by 1
      `),
    ],
  }
}

// ── Empresa asignada: lo que da y lo que no ─────────────────────────────────

describe('D-0027: asignar una empresa no abre lo personal de sus miembros', () => {
  for (const rol of ['broker_app', 'broker_mcp']) {
    it(`${rol}: el Operador de E1 no ve la póliza personal, el perfil, los contactos ni los documentos de su empleado`, async () => {
      const r = await descartable(async (tx) => {
        const m = await sembrar(tx)
        return { m, v: await vista(tx, rol, m.opE) }
      })
      const { m, v } = r
      assert.ok(!v.polizas.includes(m.polP1), 'póliza personal del empleado')
      assert.ok(!v.perfiles.includes(m.p1), 'perfil personal (DNI, CUIL) del empleado')
      assert.ok(!v.contactos.includes(m.contactoDeP1), 'contacto del empleado')
      assert.ok(!v.documentos.includes(m.docDeP1), 'documento del empleado')
    })
  }

  it('el Operador de E1 sí ve lo de la empresa: su perfil, su contacto, su documento y sus pólizas', async () => {
    const r = await descartable(async (tx) => {
      const m = await sembrar(tx)
      const v = await vista(tx, 'broker_app', m.opE)
      const perfilEmpresa = await tx`select 1 from organization_profile where party_id = ${m.e1}`
      return { m, v, perfilEmpresa: perfilEmpresa.length }
    })
    const { m, v } = r
    assert.equal(r.perfilEmpresa, 1)
    assert.deepEqual(v.contactos, [m.contactoDeE1])
    assert.deepEqual(v.documentos, [m.docDeE1])
    assert.ok(v.polizas.includes(m.polE1))
  })

  it('del empleado vigente ve sólo la fila de party y su nombre en la vista de miembros; del ex empleado, nada', async () => {
    const r = await descartable(async (tx) => {
      const m = await sembrar(tx)
      return { m, v: await vista(tx, 'broker_app', m.opE) }
    })
    const { m, v } = r
    assert.deepEqual(v.partes, ordenados(m.e1, m.p1))
    assert.ok(!v.partes.includes(m.px), 'ex empleado')
    assert.deepEqual(v.miembros, [{ persona: m.p1, empresa: m.e1, nombre: 'Uno', apellido: 'Sintético' }])
  })

  it('la vista de miembros no expone DNI, CUIL, fecha de nacimiento ni contactos', async () => {
    const columnas = await sql<{ columna: string }[]>`
      select column_name as columna from information_schema.columns
      where table_schema = 'public' and table_name = 'miembro_de_empresa_asignada' order by ordinal_position
    `
    assert.deepEqual(
      columnas.map((c) => c.columna),
      ['organization_party_id', 'person_party_id', 'kind', 'first_name', 'last_name'],
    )
  })

  it('la vista de miembros está vacía para quien no tiene empresas asignadas, también para el Operador de la persona', async () => {
    const r = await descartable(async (tx) => {
      const m = await sembrar(tx)
      const deP = (await vista(tx, 'broker_app', m.opP)).miembros
      await tx`reset role`
      const deP2 = (await vista(tx, 'broker_app', m.opP2)).miembros
      return { deP, deP2 }
    })
    assert.deepEqual(r.deP, [])
    assert.deepEqual(r.deP2, [])
  })

  it('el worker no puede leer la vista de miembros (deny-by-default)', async () => {
    const r = await descartable(async (tx) => {
      const m = await sembrar(tx)
      await como(tx, 'broker_worker', m.opE)
      try {
        await tx`select 1 from miembro_de_empresa_asignada`
        return 'leyó'
      } catch (error) {
        return (error as { code?: string }).code
      }
    })
    assert.equal(r, '42501')
  })
})

describe('D-0027: asignar a la persona da su alcance completo', () => {
  it('el Operador de P1 ve su perfil, su contacto, su documento y su póliza personal; nada de E1', async () => {
    const r = await descartable(async (tx) => {
      const m = await sembrar(tx)
      return { m, v: await vista(tx, 'broker_app', m.opP) }
    })
    const { m, v } = r
    assert.deepEqual(v.partes, [m.p1])
    assert.deepEqual(v.perfiles, [m.p1])
    assert.deepEqual(v.contactos, [m.contactoDeP1])
    assert.deepEqual(v.documentos, [m.docDeP1])
    assert.ok(v.polizas.includes(m.polP1))
    assert.ok(!v.polizas.includes(m.polE1), 'póliza de la empresa')
  })
})

// ── Cambios de tomador ──────────────────────────────────────────────────────

describe('D-0027: cambios históricos de tomador', () => {
  it('de E1 a P2: el Operador de E1 conserva la cabecera y la versión de su época; ni la versión de P2, ni endosos, ni documentos', async () => {
    const r = await descartable(async (tx) => {
      const m = await sembrar(tx)
      return { m, v: await vista(tx, 'broker_app', m.opE) }
    })
    const { m, v } = r
    assert.ok(v.polizas.includes(m.polCambio), 'cabecera')
    assert.ok(v.versiones.includes(m.versionE1DeCambio), 'versión de E1')
    assert.ok(!v.versiones.includes(m.versionP2DeCambio), 'versión de P2')
    assert.ok(!v.endosos.includes(m.endosoDeCambio), 'endoso')
    assert.ok(!v.documentos.includes(m.docDeCambio), 'documento')
  })

  it('de E1 a P2: el Operador de P2, tomador vigente, ve la póliza completa con su historia', async () => {
    const r = await descartable(async (tx) => {
      const m = await sembrar(tx)
      return { m, v: await vista(tx, 'broker_app', m.opP2) }
    })
    const { m, v } = r
    assert.deepEqual(v.polizas, [m.polCambio])
    assert.deepEqual(v.versiones, ordenados(m.versionE1DeCambio, m.versionP2DeCambio))
    assert.deepEqual(v.endosos, [m.endosoDeCambio])
    assert.deepEqual(v.documentos, [m.docDeCambio])
  })

  it('sin versión vigente decide la última: de E1 a P1, la ve completa el Operador de P1; el de E1 sólo la cabecera y su versión', async () => {
    const r = await descartable(async (tx) => {
      const m = await sembrar(tx)
      const deE = await vista(tx, 'broker_app', m.opE)
      await tx`reset role`
      const deP = await vista(tx, 'broker_app', m.opP)
      return { m, deE, deP }
    })
    const { m, deE, deP } = r
    assert.ok(deE.polizas.includes(m.polSinVigente), 'E1 conserva la cabecera')
    assert.ok(deE.versiones.includes(m.versionE1DeSinVigente))
    assert.ok(!deE.versiones.includes(m.versionP1DeSinVigente), 'la versión de P1 no')
    assert.ok(deP.polizas.includes(m.polSinVigente))
    assert.ok(deP.versiones.includes(m.versionE1DeSinVigente) && deP.versiones.includes(m.versionP1DeSinVigente))
  })

  it('un empleado que es tomador vigente no abre la póliza al Operador de su empresa', async () => {
    const r = await descartable(async (tx) => {
      const m = await sembrar(tx)
      await como(tx, 'broker_app', m.opE)
      const [fila] = await tx<{ ve: boolean }[]>`select authz.ve_poliza(${m.polP1}) as ve`
      return fila?.ve
    })
    assert.equal(r, false)
  })
})
