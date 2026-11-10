// T-0037 (I1b) — la comparación entre lotes distingue nuevos, iguales, cambiados y
// ausentes, y cuenta los cambios por campo, sin escribir en el dominio.
//
// Fixtures sintéticas únicamente (R-19). Corre contra Postgres real (R-26) y revierte su
// transacción al terminar.

import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { after, describe, it } from 'node:test'

import postgres from 'postgres'

import { CAMPOS_COMPARADOS, ComparacionInvalida, compararLotes } from './comparar-lotes.ts'
import { leerLote, MODULOS } from './lote.ts'
import type { Modulo } from './lote.ts'
import { borrarLotesSinteticos, escribirLote, mismaFecha } from './lote-sintetico.ts'
import type { Filas } from './lote-sintetico.ts'
import { cargarLoteEnStaging } from './lote-staging.ts'
import { CAMPOS_CONTACTO, CAMPOS_CUENTA, CAMPOS_ENDOSO, CAMPOS_POLIZA } from './zoho-fields.ts'

const RAIZ = join(import.meta.dirname, '..', '..', '..', '..')

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
  throw new Error('DATABASE_URL no está configurada: comparar-lotes.ts se verifica contra PostgreSQL real.')
}

const sql = postgres(databaseUrl, { max: 3 })

class Rollback extends Error {}

const enTransaccionRevertida = async (cuerpo: (tx: postgres.TransactionSql) => Promise<void>): Promise<void> => {
  await assert.rejects(
    sql.begin(async (tx) => {
      await cuerpo(tx)
      throw new Rollback('revertir la fixture')
    }),
    Rollback,
  )
}

// `Premio` está en el crudo pero ningún importador lo lee: un cambio ahí no es CAMBIADO.
const ENCABEZADOS: Readonly<Record<Modulo, readonly string[]>> = {
  polizas: [
    CAMPOS_POLIZA.idDeRegistro,
    CAMPOS_POLIZA.numeroDePoliza,
    CAMPOS_POLIZA.estado,
    CAMPOS_POLIZA.vigenciaInicio,
    CAMPOS_POLIZA.vigenciaFin,
    CAMPOS_POLIZA.prima,
    CAMPOS_POLIZA.premio,
  ],
  endosos: [CAMPOS_ENDOSO.idDeRegistro, CAMPOS_ENDOSO.perteneceAPolizaNId],
  contactos: [CAMPOS_CONTACTO.idDeRegistro, CAMPOS_CONTACTO.nombre, CAMPOS_CONTACTO.correoElectronico],
  cuentas: [CAMPOS_CUENTA.idDeRegistro, CAMPOS_CUENTA.nombreDeCuenta],
}

const ANTERIOR: Filas = {
  polizas: [
    ['SINT-P-1', 'NUM-100', 'VIGENTE', '2026-01-01', '2026-12-31', '100', '120'],
    ['SINT-P-2', 'NUM-200', 'VIGENTE', '2026-01-01', '2026-12-31', '200', '240'],
    ['SINT-P-4', 'NUM-400', 'VIGENTE', '2026-01-01', '2026-12-31', '400', '480'],
    ['SINT-P-5', 'NUM-500', 'VIGENTE', '2026-01-01', '2026-12-31', '500', '600'],
    ['SINT-P-7', 'NUM-700', 'VIGENTE', '2026-01-01', '2026-12-31', '700', '840'],
  ],
  endosos: [['SINT-E-1', 'SINT-P-1']],
  contactos: [
    ['SINT-C-1', 'Persona Uno', 'uno@example.test'],
    ['SINT-C-2', 'Persona Dos', ''],
  ],
  cuentas: [['SINT-CTA-1', 'Cuenta Uno SA']],
}

const NUEVO: Filas = {
  polizas: [
    // P-1: cambió el número y la prima. P-2 ya no está. P-3 es nueva.
    ['SINT-P-1', 'NUM-101', 'VIGENTE', '2026-01-01', '2026-12-31', '150', '180'],
    ['SINT-P-3', 'NUM-300', 'VIGENTE', '2026-11-01', '2027-10-31', '300', '360'],
    // P-4 igual. P-5 sólo cambió el premio, que el dominio no usa.
    ['SINT-P-4', 'NUM-400', 'VIGENTE', '2026-01-01', '2026-12-31', '400', '480'],
    ['SINT-P-5', 'NUM-500', 'VIGENTE', '2026-01-01', '2026-12-31', '500', '999'],
    // P-7: vigencia y estado nuevos.
    ['SINT-P-7', 'NUM-700', 'VENCIDA', '2026-01-01', '2026-06-30', '700', '840'],
  ],
  endosos: [['SINT-E-1', 'SINT-P-1']],
  contactos: [
    // C-1 cambió el correo; C-2 sigue sin correo.
    ['SINT-C-1', 'Persona Uno', 'uno.nuevo@example.test'],
    ['SINT-C-2', 'Persona Dos', ''],
  ],
  cuentas: [['SINT-CTA-1', 'Cuenta Uno SA']],
}

const cargarDos = async (
  tx: postgres.TransactionSql,
): Promise<{ readonly anterior: string; readonly nuevo: string }> => {
  const anterior = escribirLote({
    nombre: 'cmp-anterior',
    encabezados: ENCABEZADOS,
    filas: ANTERIOR,
    exportadoEl: { polizas: '2026-09-16', endosos: '2026-09-16', contactos: '2026-09-15', cuentas: '2026-09-15' },
  })
  const nuevo = escribirLote({
    nombre: 'cmp-nuevo',
    encabezados: ENCABEZADOS,
    filas: NUEVO,
    exportadoEl: mismaFecha('2026-11-03'),
  })
  const a = await cargarLoteEnStaging(tx, leerLote(anterior), 'fixture sintética')
  const n = await cargarLoteEnStaging(tx, leerLote(nuevo), 'fixture sintética')
  return { anterior: a.batchId, nuevo: n.batchId }
}

const ceros = (modulo: Modulo): Record<string, number> =>
  Object.fromEntries(CAMPOS_COMPARADOS[modulo].map((campo) => [campo, 0]))

describe('compararLotes', () => {
  after(async () => {
    await sql.end()
    borrarLotesSinteticos()
  })

  it('distingue nuevos, iguales, cambiados y ausentes, y cuenta por campo', async () => {
    await enTransaccionRevertida(async (tx) => {
      const { anterior, nuevo } = await cargarDos(tx)
      const comparacion = await compararLotes(tx, anterior, nuevo)

      assert.equal(comparacion.corteAnterior, '2026-09-15')
      assert.equal(comparacion.corteNuevo, '2026-11-03')

      const polizas = comparacion.modulos.polizas
      assert.deepEqual(
        { nuevos: polizas.nuevos, iguales: polizas.iguales, cambiados: polizas.cambiados, ausentes: polizas.ausentes },
        { nuevos: 1, iguales: 2, cambiados: 2, ausentes: 1 },
      )
      assert.equal(polizas.exportadoAnterior, '2026-09-16')
      assert.equal(polizas.exportadoNuevo, '2026-11-03')
      assert.deepEqual(polizas.cambiosPorCampo, {
        ...ceros('polizas'),
        [CAMPOS_POLIZA.numeroDePoliza]: 1,
        [CAMPOS_POLIZA.prima]: 1,
        [CAMPOS_POLIZA.estado]: 1,
        [CAMPOS_POLIZA.vigenciaFin]: 1,
      })

      const contactos = comparacion.modulos.contactos
      assert.deepEqual(
        { nuevos: contactos.nuevos, iguales: contactos.iguales, cambiados: contactos.cambiados, ausentes: contactos.ausentes },
        { nuevos: 0, iguales: 1, cambiados: 1, ausentes: 0 },
      )
      assert.deepEqual(contactos.cambiosPorCampo, { ...ceros('contactos'), [CAMPOS_CONTACTO.correoElectronico]: 1 })
      assert.equal(contactos.exportadoAnterior, '2026-09-15')

      for (const modulo of ['endosos', 'cuentas'] as const) {
        const resultado = comparacion.modulos[modulo]
        assert.deepEqual(
          { nuevos: resultado.nuevos, iguales: resultado.iguales, cambiados: resultado.cambiados, ausentes: resultado.ausentes },
          { nuevos: 0, iguales: 1, cambiados: 0, ausentes: 0 },
          modulo,
        )
        assert.deepEqual(resultado.cambiosPorCampo, ceros(modulo), modulo)
      }
    })
  })

  it('cada registro de cada lote cae en exactamente una clase', async () => {
    await enTransaccionRevertida(async (tx) => {
      const { anterior, nuevo } = await cargarDos(tx)
      const comparacion = await compararLotes(tx, anterior, nuevo)
      for (const modulo of MODULOS) {
        const r = comparacion.modulos[modulo]
        assert.equal(r.iguales + r.cambiados + r.ausentes, ANTERIOR[modulo].length, `${modulo}: lote anterior`)
        assert.equal(r.iguales + r.cambiados + r.nuevos, NUEVO[modulo].length, `${modulo}: lote nuevo`)
      }
    })
  })

  it('la salida no trae ids de registro ni valores del lote', async () => {
    await enTransaccionRevertida(async (tx) => {
      const { anterior, nuevo } = await cargarDos(tx)
      const salida = JSON.stringify(await compararLotes(tx, anterior, nuevo))
      for (const prohibido of ['SINT-', 'NUM-', 'example.test', 'Persona', anterior, nuevo]) {
        assert.ok(!salida.includes(prohibido), prohibido)
      }
    })
  })

  it('no escribe: el dominio y staging quedan igual', async () => {
    await enTransaccionRevertida(async (tx) => {
      const { anterior, nuevo } = await cargarDos(tx)
      const foto = async (): Promise<string> => {
        const filas = await tx<{ t: string; n: number }[]>`
          select 'policy' as t, count(*)::int as n from policy
          union all select 'party', count(*)::int from party
          union all select 'staging_policy', count(*)::int from staging_policy
          union all select 'staging_import_batch', count(*)::int from staging_import_batch
          union all select 'staging_import_exception', count(*)::int from staging_import_exception
        `
        return JSON.stringify(filas)
      }
      const antes = await foto()
      await compararLotes(tx, anterior, nuevo)
      assert.equal(await foto(), antes)
    })
  })

  it('rechaza lotes invertidos, el mismo lote y un lote sin fechas de export', async () => {
    await enTransaccionRevertida(async (tx) => {
      const { anterior, nuevo } = await cargarDos(tx)
      await assert.rejects(compararLotes(tx, nuevo, anterior), (e: unknown) => e instanceof ComparacionInvalida && e.message.includes('invertidos'))
      await assert.rejects(compararLotes(tx, anterior, anterior), ComparacionInvalida)

      // Un lote como el cargado antes de T-0037: tiene filas pero no módulos registrados.
      const [legado] = await tx<{ id: string }[]>`
        insert into staging_import_batch (source_manifest_sha256, notes) values ('perfil-legado.json', 'fixture sintética') returning id
      `
      assert.ok(legado)
      await assert.rejects(
        compararLotes(tx, legado.id, nuevo),
        (e: unknown) => e instanceof ComparacionInvalida && e.message.includes('no registra la fecha de export'),
      )
    })
  })
})
