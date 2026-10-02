// T-0023: las funciones de las migraciones resuelven sus tablas contra `public` aunque
// la sesión que dispara el trigger tenga el `search_path` vacío, como lo deja la
// cabecera de un volcado de `pg_dump`. Contra un Postgres real (R-26), con fixtures
// sintéticas y cada caso en una transacción revertida (R-19).
//
// Requiere DATABASE_URL apuntando a una base con 0006 aplicada (`pnpm db:migrate`).

import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { after, describe, it } from 'node:test'

import postgres from 'postgres'

const RAIZ = resolve(import.meta.dirname, '..', '..', '..')
const MIGRACIONES = join(RAIZ, 'packages', 'db', 'migrations')
const UP_SQL = readFileSync(join(MIGRACIONES, '0006_function_search_path.sql'), 'utf8')
const DOWN_SQL = readFileSync(join(MIGRACIONES, 'down', '0006_function_search_path.sql'), 'utf8')

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
  throw new Error('DATABASE_URL no está configurada: T-0023 requiere PostgreSQL real.')
}

const sql = postgres(databaseUrl, { max: 5 })

class Rollback extends Error {}

const enTransaccionDescartable = async <T>(
  accion: (tx: postgres.TransactionSql) => Promise<T>,
): Promise<T> => {
  let resultado: T | undefined
  try {
    await sql.begin(async (tx) => {
      resultado = await accion(tx)
      throw new Rollback('descartar la transacción de prueba')
    })
  } catch (error) {
    if (!(error instanceof Rollback)) throw error
  }
  return resultado as T
}

interface FilaId {
  readonly id: string
}

const unaFila = <T>(filas: readonly T[], contexto: string): T => {
  const fila = filas[0]
  if (fila === undefined) throw new Error(`se esperaba al menos una fila: ${contexto}`)
  return fila
}

// ── Fixtures: todas calificadas con `public.`, porque corren con el search_path vacío ──

const crearParty = async (tx: postgres.TransactionSql, kind: 'PERSON' | 'ORGANIZATION'): Promise<string> =>
  unaFila(await tx<FilaId[]>`insert into public.party (kind) values (${kind}) returning id`, 'party').id

const crearPerson = async (tx: postgres.TransactionSql): Promise<string> => {
  const id = await crearParty(tx, 'PERSON')
  await tx`
    insert into public.person_profile (party_id, first_name, last_name)
    values (${id}, 'Sintetica', 'Apellido')
  `
  return id
}

const crearPolicy = async (tx: postgres.TransactionSql, numero: string): Promise<string> => {
  const organizacion = await crearParty(tx, 'ORGANIZATION')
  await tx`
    insert into public.organization_profile (party_id, legal_name)
    values (${organizacion}, ${`Aseguradora Sintetica ${numero}`})
  `
  const insurer = unaFila(
    await tx<FilaId[]>`
      insert into public.insurer (organization_party_id, canonical_name)
      values (${organizacion}, ${`Aseguradora Sintetica ${numero}`})
      returning id
    `,
    'insurer',
  )
  return unaFila(
    await tx<FilaId[]>`
      insert into public.policy (insurer_id, policy_number) values (${insurer.id}, ${numero}) returning id
    `,
    'policy',
  ).id
}

const crearExternalReference = async (tx: postgres.TransactionSql, relationType: string): Promise<string> =>
  unaFila(
    await tx<FilaId[]>`
      insert into public.external_reference (
        source_system, source_entity_type, source_external_id, relation_type,
        resolution_status, unresolved_reason
      ) values (
        'fixture', 'SyntheticDocument', gen_random_uuid()::text, ${relationType},
        'UNRESOLVED', 'MOTIVO_SINTETICO'
      ) returning id
    `,
    'external_reference',
  ).id

const crearDocumentLink = async (
  tx: postgres.TransactionSql,
  resourceType: 'POLICY' | 'PARTY',
  resourceId: string,
): Promise<void> => {
  await tx`
    insert into public.document_link (
      resource_type, resource_id, drive_file_id, drive_item_type, reconciliation_status, link_level
    ) values (${resourceType}, ${resourceId}, 'drive-sintetico', 'FILE', 'NOT_REFERENCED', 'HUMAN')
  `
}

// ── Comparación de comportamiento entre los dos search_path ──────────────────────

type Modo = 'por defecto' | 'vacío'
type Resultado = { readonly acepta: true } | { readonly acepta: false; readonly mensaje: string }

/** Los mensajes llevan ids generados en cada corrida; se comparan sin ellos. */
const normalizar = (mensaje: string): string =>
  mensaje.replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/g, '<uuid>')

/**
 * Corre el caso entero —fixtures, escritura y triggers diferidos— bajo `modo`, en una
 * transacción que se revierte. Los triggers diferidos se fuerzan con `set constraints
 * all immediate`, porque el commit que los dispararía nunca llega.
 */
const resultadoCon = async (
  modo: Modo,
  caso: (tx: postgres.TransactionSql) => Promise<void>,
): Promise<Resultado> =>
  enTransaccionDescartable(async (tx) => {
    if (modo === 'vacío') await tx`set local search_path = ''`
    else await tx`set local search_path to default`
    try {
      await caso(tx)
      await tx`set constraints all immediate`
      return { acepta: true } as const
    } catch (error) {
      if (!(error instanceof postgres.PostgresError)) throw error
      return { acepta: false, mensaje: normalizar(error.message) } as const
    }
  })

interface Caso {
  readonly migracion: '0001' | '0002' | '0004'
  readonly funcion: string
  readonly valido: (tx: postgres.TransactionSql) => Promise<void>
  readonly invalido: (tx: postgres.TransactionSql) => Promise<void>
  readonly rechazo: RegExp
}

const CASOS: readonly Caso[] = [
  {
    migracion: '0001',
    funcion: 'require_party_kind',
    valido: async (tx) => {
      await crearPerson(tx)
    },
    invalido: async (tx) => {
      const organizacion = await crearParty(tx, 'ORGANIZATION')
      await tx`
        insert into public.person_profile (party_id, first_name, last_name)
        values (${organizacion}, 'Sintetica', 'Apellido')
      `
    },
    rechazo: /must reference a party with kind = PERSON, found ORGANIZATION/,
  },
  {
    migracion: '0001',
    funcion: 'prevent_party_merge_cycle',
    valido: async (tx) => {
      const a = await crearParty(tx, 'PERSON')
      const b = await crearParty(tx, 'PERSON')
      await tx`update public.party set status = 'MERGED', merged_into_party_id = ${b} where id = ${a}`
    },
    invalido: async (tx) => {
      const a = await crearParty(tx, 'PERSON')
      const b = await crearParty(tx, 'PERSON')
      await tx`update public.party set status = 'MERGED', merged_into_party_id = ${b} where id = ${a}`
      await tx`update public.party set status = 'MERGED', merged_into_party_id = ${a} where id = ${b}`
    },
    rechazo: /merge cycle detected/,
  },
  {
    migracion: '0001',
    funcion: 'prevent_kind_change_with_dependents',
    valido: async (tx) => {
      const id = await crearParty(tx, 'PERSON')
      await tx`update public.party set kind = 'ORGANIZATION' where id = ${id}`
    },
    invalido: async (tx) => {
      const id = await crearPerson(tx)
      await tx`update public.party set kind = 'ORGANIZATION' where id = ${id}`
    },
    rechazo: /no se puede cambiar kind de PERSON a ORGANIZATION con filas dependientes/,
  },
  {
    migracion: '0001',
    funcion: 'prevent_delete_policy_with_document_links',
    valido: async (tx) => {
      const policy = await crearPolicy(tx, 'T0023-BORRABLE')
      await tx`delete from public.policy where id = ${policy}`
    },
    invalido: async (tx) => {
      const policy = await crearPolicy(tx, 'T0023-VINCULADA')
      await crearDocumentLink(tx, 'POLICY', policy)
      await tx`delete from public.policy where id = ${policy}`
    },
    rechazo: /no se puede borrar, tiene document_link asociados/,
  },
  {
    migracion: '0002',
    funcion: 'policy_document_reference_requires_document_kind',
    valido: async (tx) => {
      const policy = await crearPolicy(tx, 'T0023-DOC')
      const referencia = await crearExternalReference(tx, 'POLICY_DOCUMENT')
      await tx`
        insert into public.policy_document_reference (external_reference_id, policy_id)
        values (${referencia}, ${policy})
      `
    },
    invalido: async (tx) => {
      const policy = await crearPolicy(tx, 'T0023-NO-DOC')
      const referencia = await crearExternalReference(tx, 'OTRA_RELACION')
      await tx`
        insert into public.policy_document_reference (external_reference_id, policy_id)
        values (${referencia}, ${policy})
      `
    },
    rechazo: /external_reference debe tener relation_type POLICY_DOCUMENT/,
  },
  {
    migracion: '0002',
    funcion: 'assert_policy_document_reference_totality (diferido)',
    valido: async (tx) => {
      await crearExternalReference(tx, 'OTRA_RELACION')
    },
    invalido: async (tx) => {
      await crearExternalReference(tx, 'POLICY_DOCUMENT')
    },
    rechazo: /POLICY_DOCUMENT requiere exactamente una Policy de pertenencia/,
  },
  {
    migracion: '0004',
    funcion: 'require_document_link_resource',
    valido: async (tx) => {
      await crearDocumentLink(tx, 'PARTY', await crearParty(tx, 'PERSON'))
    },
    invalido: async (tx) => {
      await crearDocumentLink(tx, 'PARTY', 'f9000000-0000-4000-8000-0000000000aa')
    },
    rechazo: /does not reference an existing party/,
  },
]

// ── Catálogo ─────────────────────────────────────────────────────────────────────

interface FilaFuncion {
  readonly firma: string
  readonly config: string[] | null
  readonly cuerpo: string
}

/** Funciones de `public` que no pertenecen a una extensión (btree_gist vive en public). */
const funcionesPropias = async (tx: postgres.TransactionSql | postgres.Sql): Promise<FilaFuncion[]> =>
  tx<FilaFuncion[]>`
    select p.oid::regprocedure::text as firma, p.proconfig as config, md5(p.prosrc) as cuerpo
      from pg_catalog.pg_proc p
     where p.pronamespace = 'public'::regnamespace
       and not exists (
         select 1 from pg_catalog.pg_depend d
          where d.classid = 'pg_catalog.pg_proc'::regclass
            and d.objid = p.oid
            and d.deptype = 'e'
       )
     order by 1
  `

const sinSearchPath = (filas: readonly FilaFuncion[]): string[] =>
  filas
    .filter((fila) => !(fila.config ?? []).some((opcion) => opcion.startsWith('search_path=')))
    .map((fila) => fila.firma)

after(async () => {
  await sql.end()
})

describe('T-0023 — triggers con search_path vacío se comportan como con el de por defecto', () => {
  for (const caso of CASOS) {
    it(`${caso.migracion} · ${caso.funcion}: acepta lo válido y rechaza lo inválido igual en ambos`, async () => {
      const validoDefecto = await resultadoCon('por defecto', caso.valido)
      const validoVacio = await resultadoCon('vacío', caso.valido)
      const invalidoDefecto = await resultadoCon('por defecto', caso.invalido)
      const invalidoVacio = await resultadoCon('vacío', caso.invalido)

      assert.deepEqual(validoDefecto, { acepta: true })
      assert.ok(!invalidoDefecto.acepta, 'el caso inválido debe rechazarse con el search_path por defecto')
      assert.match(invalidoDefecto.mensaje, caso.rechazo)

      assert.deepEqual(validoVacio, validoDefecto)
      assert.deepEqual(invalidoVacio, invalidoDefecto)
    })
  }

  it('cubre al menos un trigger de cada migración que define funciones', () => {
    assert.deepEqual([...new Set(CASOS.map((caso) => caso.migracion))].sort(), ['0001', '0002', '0004'])
  })

  it('causalidad: sin 0006, el search_path vacío rompe la validación como en la carga de T-0018', async () => {
    const resultado = await enTransaccionDescartable(async (tx) => {
      await tx.unsafe(DOWN_SQL)
      await tx`set local search_path = ''`
      try {
        await crearPerson(tx)
        return null
      } catch (error) {
        if (!(error instanceof postgres.PostgresError)) throw error
        return error.message
      }
    })
    assert.match(resultado ?? 'aceptado', /relation "party" does not exist/)
  })
})

describe('T-0023 — catálogo: toda función propia de public fija su search_path', () => {
  it('ninguna función de public creada por las migraciones carece de search_path en proconfig', async () => {
    const filas = await funcionesPropias(sql)
    assert.ok(filas.length >= 14, `se esperaban al menos las 14 funciones de 0001–0004, hay ${String(filas.length)}`)
    assert.deepEqual(sinSearchPath(filas), [])
  })

  it('las funciones de btree_gist quedan fuera: pertenecen a una extensión', async () => {
    const filas = await funcionesPropias(sql)
    assert.ok(!filas.some((fila) => fila.firma.startsWith('gbt_')), 'una función de btree_gist se coló en la lista')
  })

  it('causalidad: la prueba detecta una función redefinida sin SET search_path', async () => {
    const faltantes = await enTransaccionDescartable(async (tx) => {
      await tx`
        create or replace function public.party_id_is_immutable() returns trigger
        language plpgsql as $$ begin return new; end; $$
      `
      return sinSearchPath(await funcionesPropias(tx))
    })
    assert.deepEqual(faltantes, ['party_id_is_immutable()'])
  })

  it('aplicar, revertir y volver a aplicar deja configuración y cuerpos iguales', async () => {
    const { antes, revertida, despues } = await enTransaccionDescartable(async (tx) => {
      const antes = await funcionesPropias(tx)
      await tx.unsafe(DOWN_SQL)
      const revertida = await funcionesPropias(tx)
      await tx.unsafe(UP_SQL)
      const despues = await funcionesPropias(tx)
      return { antes, revertida, despues }
    })

    assert.deepEqual(despues, antes)
    assert.deepEqual(sinSearchPath(revertida), revertida.map((fila) => fila.firma))
    // La 0006 no reescribe ningún cuerpo: mismas condiciones, mismos mensajes.
    assert.deepEqual(
      revertida.map((fila) => [fila.firma, fila.cuerpo]),
      antes.map((fila) => [fila.firma, fila.cuerpo]),
    )
    for (const fila of antes) assert.deepEqual(fila.config, ['search_path=public, pg_temp'], fila.firma)
  })
})
