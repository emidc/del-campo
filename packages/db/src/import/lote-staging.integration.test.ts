// T-0037 (I1a) — dos lotes sintéticos conviven en staging sin pisarse, y ninguno exige
// editar código: cada uno se describe con su `lote.json`.
//
// Fixtures sintéticas únicamente (R-19): los lotes se escriben en un temporal con la
// misma forma que un export real (perfil de T-0004, `raw/<id>/0001.csv`, `lote.json`).
// Corre contra Postgres real (R-26) y revierte su transacción al terminar.

import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { after, describe, it } from 'node:test'

import postgres from 'postgres'

import { FORMATO_LOTE, leerLote, LoteInvalido, MODULOS } from './lote.ts'
import type { Modulo } from './lote.ts'
import { cargarLoteEnStaging, loteRegistrado, otrosLotesConFilas } from './lote-staging.ts'
import { importarContactos, importarCuentas, importarMembresias } from './parties.ts'
import { importarEndosos } from './policies.ts'
import { generarReporte } from './report.ts'
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
  throw new Error('DATABASE_URL no está configurada: lote-staging.ts se verifica contra PostgreSQL real.')
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

// ── Lote sintético en disco ──────────────────────────────────────────────────

const ENCABEZADOS: Readonly<Record<Modulo, readonly string[]>> = {
  polizas: [CAMPOS_POLIZA.idDeRegistro, CAMPOS_POLIZA.numeroDePoliza, CAMPOS_POLIZA.contactoId, CAMPOS_POLIZA.cuentaId, CAMPOS_POLIZA.companiaId],
  endosos: [CAMPOS_ENDOSO.idDeRegistro, CAMPOS_ENDOSO.perteneceAPolizaNId],
  contactos: [CAMPOS_CONTACTO.idDeRegistro, CAMPOS_CONTACTO.nombre, CAMPOS_CONTACTO.nombreDeCuentaId],
  cuentas: [CAMPOS_CUENTA.idDeRegistro, CAMPOS_CUENTA.nombreDeCuenta],
}

type Filas = Readonly<Record<Modulo, readonly (readonly string[])[]>>

interface OpcionesLote {
  readonly nombre: string
  readonly filas: Filas
  readonly exportadoEl: Readonly<Record<Modulo, string>>
}

const directorios: string[] = []

const sha256 = (contenido: string | Buffer): string => createHash('sha256').update(contenido).digest('hex')

/** Escribe un lote con perfil de T-0004 y `lote.json`, y devuelve su raíz. */
const escribirLote = ({ nombre, filas, exportadoEl }: OpcionesLote): string => {
  const raiz = mkdtempSync(join(tmpdir(), `t0037-${nombre}-`))
  directorios.push(raiz)
  const archivos = MODULOS.map((modulo) => {
    const contenido = [ENCABEZADOS[modulo], ...filas[modulo]].map((fila) => fila.join(',')).join('\n') + '\n'
    const id = sha256(`${nombre}:${modulo}:${contenido}`)
    const rawRelativePath = `raw/${id}/0001.csv`
    mkdirSync(join(raiz, 'raw', id), { recursive: true })
    writeFileSync(join(raiz, rawRelativePath), contenido, 'utf8')
    return { modulo, rawRelativePath, sha256: sha256(contenido) }
  })

  mkdirSync(join(raiz, 'profile'))
  writeFileSync(
    join(raiz, 'profile', 'perfil.json'),
    JSON.stringify({
      mode: 'profile',
      facts: [
        {
          archive_id: `ZIP-${nombre}`,
          local_archive_name: `${nombre}.zip`,
          sha256: sha256(`zip:${nombre}`),
          files: archivos.map((archivo) => ({
            file_id: archivo.rawRelativePath.split('/')[1],
            raw_relative_path: archivo.rawRelativePath,
            sha256: archivo.sha256,
          })),
        },
      ],
    }),
  )

  escribirManifiesto(raiz, exportadoEl, archivos)
  return raiz
}

const escribirManifiesto = (
  raiz: string,
  exportadoEl: Readonly<Record<Modulo, string>>,
  archivos: readonly { modulo: Modulo; rawRelativePath: string }[],
): void => {
  writeFileSync(
    join(raiz, 'lote.json'),
    JSON.stringify({
      formato: FORMATO_LOTE,
      perfil: 'profile/perfil.json',
      modulos: Object.fromEntries(
        archivos.map((archivo) => [archivo.modulo, { csv: archivo.rawRelativePath, exportadoEl: exportadoEl[archivo.modulo] }]),
      ),
    }),
  )
}

const mismaFecha = (fecha: string): Record<Modulo, string> =>
  Object.fromEntries(MODULOS.map((modulo) => [modulo, fecha])) as Record<Modulo, string>

// Lote A: el export «viejo». Lote B: P-1 cambió de número, P-2 desapareció, P-3 es nueva.
const LOTE_A: OpcionesLote = {
  nombre: 'a',
  filas: {
    polizas: [
      ['SINT-P-1', 'NUM-100', 'SINT-C-1', '', 'SINT-ASEG'],
      ['SINT-P-2', 'NUM-200', 'SINT-C-1', '', 'SINT-ASEG'],
    ],
    endosos: [['SINT-E-1', 'SINT-P-1']],
    contactos: [['SINT-C-1', 'Persona Uno', 'SINT-CTA-1']],
    cuentas: [['SINT-CTA-1', 'Cuenta Uno SA']],
  },
  exportadoEl: { polizas: '2026-09-16', endosos: '2026-09-16', contactos: '2026-09-15', cuentas: '2026-09-15' },
}

const LOTE_B: OpcionesLote = {
  nombre: 'b',
  filas: {
    polizas: [
      ['SINT-P-1', 'NUM-101', 'SINT-C-1', '', 'SINT-ASEG'],
      ['SINT-P-3', 'NUM-300', 'SINT-C-2', '', 'SINT-ASEG'],
    ],
    endosos: [
      ['SINT-E-1', 'SINT-P-1'],
      ['SINT-E-3', 'SINT-P-3'],
    ],
    contactos: [
      ['SINT-C-1', 'Persona Uno', 'SINT-CTA-1'],
      ['SINT-C-2', 'Persona Dos', 'SINT-CTA-2'],
    ],
    cuentas: [
      ['SINT-CTA-1', 'Cuenta Uno SA'],
      ['SINT-CTA-2', 'Cuenta Dos SA'],
    ],
  },
  exportadoEl: mismaFecha('2026-11-03'),
}

describe('cargarLoteEnStaging — dos lotes conviven', () => {
  after(async () => {
    await sql.end()
    for (const directorio of directorios) rmSync(directorio, { recursive: true, force: true })
  })

  it('un lote nuevo no pisa el crudo del anterior', async () => {
    const raizA = escribirLote(LOTE_A)
    const raizB = escribirLote(LOTE_B)

    await enTransaccionRevertida(async (tx) => {
      const a = await cargarLoteEnStaging(tx, leerLote(raizA), 'fixture sintética')
      const b = await cargarLoteEnStaging(tx, leerLote(raizB), 'fixture sintética')

      assert.equal(a.nuevo, true)
      assert.equal(b.nuevo, true)
      assert.notEqual(a.batchId, b.batchId)
      assert.deepEqual(a.filas, { polizas: 2, endosos: 1, contactos: 1, cuentas: 1 })
      assert.deepEqual(b.filas, { polizas: 2, endosos: 2, contactos: 2, cuentas: 2 })

      // P-1 existe en los dos lotes, cada uno con su propio crudo.
      const p1 = await tx<{ batch_id: string; numero: string }[]>`
        select batch_id, raw ->> ${CAMPOS_POLIZA.numeroDePoliza} as numero
        from staging_policy where source_record_id = 'SINT-P-1' and batch_id in (${a.batchId}, ${b.batchId})
      `
      assert.deepEqual(
        new Map(p1.map((fila) => [fila.batch_id, fila.numero])),
        new Map([
          [a.batchId, 'NUM-100'],
          [b.batchId, 'NUM-101'],
        ]),
      )

      // P-2 sigue en el lote A aunque el B no la traiga; P-3 está sólo en el B.
      const porLote = await tx<{ batch_id: string; ids: string[] }[]>`
        select batch_id, array_agg(source_record_id order by source_record_id) as ids
        from staging_policy where batch_id in (${a.batchId}, ${b.batchId})
        group by batch_id
      `
      assert.deepEqual(
        new Map(porLote.map((fila) => [fila.batch_id, fila.ids])),
        new Map([
          [a.batchId, ['SINT-P-1', 'SINT-P-2']],
          [b.batchId, ['SINT-P-1', 'SINT-P-3']],
        ]),
      )

      // Los demás módulos también conservan cada lote.
      for (const tabla of ['staging_endorsement', 'staging_contact', 'staging_account'] as const) {
        const [conteo] = await tx<{ lotes: number }[]>`
          select count(distinct batch_id)::int as lotes from ${tx(tabla)}
          where source_record_id = ${tabla === 'staging_endorsement' ? 'SINT-E-1' : tabla === 'staging_contact' ? 'SINT-C-1' : 'SINT-CTA-1'}
            and batch_id in (${a.batchId}, ${b.batchId})
        `
        assert.equal(conteo?.lotes, 2, tabla)
      }
    })
  })

  it('registra la fecha de export de cada módulo, separada de la de importación', async () => {
    const raizA = escribirLote(LOTE_A)

    await enTransaccionRevertida(async (tx) => {
      const { batchId } = await cargarLoteEnStaging(tx, leerLote(raizA), 'fixture sintética')
      const modulos = await tx<{ module: string; exported_on: string; row_count: number }[]>`
        select module, exported_on::text as exported_on, row_count
        from staging_import_batch_module where batch_id = ${batchId} order by module
      `
      assert.deepEqual(
        modulos.map((fila) => [fila.module, fila.exported_on, fila.row_count]),
        [
          ['Contactos', '2026-09-15', 1],
          ['Cuentas', '2026-09-15', 1],
          ['Endosos', '2026-09-16', 1],
          ['Polizas', '2026-09-16', 2],
        ],
      )
    })
  })

  it('recargar el mismo export reutiliza su lote y no duplica filas', async () => {
    const raizA = escribirLote(LOTE_A)

    await enTransaccionRevertida(async (tx) => {
      const primera = await cargarLoteEnStaging(tx, leerLote(raizA), 'fixture sintética')
      const segunda = await cargarLoteEnStaging(tx, leerLote(raizA), 'fixture sintética')

      assert.equal(segunda.nuevo, false)
      assert.equal(segunda.batchId, primera.batchId)
      assert.equal(await loteRegistrado(tx, leerLote(raizA)), primera.batchId)

      const [conteo] = await tx<{ filas: number; lotes: number }[]>`
        select count(*)::int as filas,
               (select count(*)::int from staging_import_batch b
                 where b.source_manifest_sha256 = (select source_manifest_sha256 from staging_import_batch where id = ${primera.batchId})) as lotes
        from staging_policy where batch_id = ${primera.batchId}
      `
      assert.deepEqual(conteo, { filas: 2, lotes: 1 })
    })
  })

  it('un export ya cargado no acepta otra fecha de export', async () => {
    const raizA = escribirLote(LOTE_A)

    await enTransaccionRevertida(async (tx) => {
      await cargarLoteEnStaging(tx, leerLote(raizA), 'fixture sintética')

      const manifiesto = JSON.parse(readFileSync(join(raizA, 'lote.json'), 'utf8')) as {
        modulos: Record<Modulo, { csv: string }>
      }
      escribirManifiesto(
        raizA,
        { ...LOTE_A.exportadoEl, polizas: '2026-09-17' },
        MODULOS.map((modulo) => ({ modulo, rawRelativePath: manifiesto.modulos[modulo].csv })),
      )

      await assert.rejects(
        cargarLoteEnStaging(tx, leerLote(raizA), 'fixture sintética'),
        (error: unknown) => error instanceof LoteInvalido && error.message.includes('otro CSV o fecha de export para polizas'),
      )
    })
  })

  it('no carga un CSV que no coincide con el perfil', async () => {
    const raizA = escribirLote(LOTE_A)
    const lote = leerLote(raizA)
    writeFileSync(join(raizA, lote.modulos.cuentas.csv), `${ENCABEZADOS.cuentas.join(',')}\nSINT-CTA-9,Otra\n`)

    await enTransaccionRevertida(async (tx) => {
      await assert.rejects(
        cargarLoteEnStaging(tx, lote, 'fixture sintética'),
        (error: unknown) => error instanceof LoteInvalido && error.message.includes('cuentas.csv: el archivo no coincide'),
      )
      assert.equal(await loteRegistrado(tx, lote), undefined)
    })
  })

  it('cada lector de staging lee sólo el lote que recibe', async () => {
    const raizA = escribirLote(LOTE_A)
    const raizB = escribirLote(LOTE_B)

    await enTransaccionRevertida(async (tx) => {
      const a = await cargarLoteEnStaging(tx, leerLote(raizA), 'fixture sintética')
      const b = await cargarLoteEnStaging(tx, leerLote(raizB), 'fixture sintética')

      assert.equal(await importarCuentas(tx, a.batchId), 1)
      assert.equal(await importarCuentas(tx, b.batchId), 2)
      assert.equal(await importarContactos(tx, a.batchId), 1)
      assert.equal(await importarContactos(tx, b.batchId), 2)
      // C-1↔CTA-1 está en los dos lotes; C-2↔CTA-2 sólo en el B.
      assert.equal(await importarMembresias(tx, a.batchId), 1)
      assert.equal(await importarMembresias(tx, b.batchId), 1)

      // Sin pólizas en el dominio, todo endoso del lote queda sin Policy padre.
      assert.deepEqual(await importarEndosos(tx, a.batchId), { importados: 0, sinPolicyPadre: 1 })
      assert.deepEqual(await importarEndosos(tx, b.batchId), { importados: 0, sinPolicyPadre: 2 })

      const reporteA = await generarReporte(tx, a.batchId)
      const reporteB = await generarReporte(tx, b.batchId)
      assert.equal(reporteA.endosos.fuente, 1)
      assert.equal(reporteB.endosos.fuente, 2)
    })
  })

  it('cuenta los otros lotes con filas, que impiden escribir el dominio antes de I2', async () => {
    const raizA = escribirLote(LOTE_A)
    const raizB = escribirLote(LOTE_B)

    await enTransaccionRevertida(async (tx) => {
      const a = await cargarLoteEnStaging(tx, leerLote(raizA), 'fixture sintética')
      const base = await otrosLotesConFilas(tx, a.batchId)
      const b = await cargarLoteEnStaging(tx, leerLote(raizB), 'fixture sintética')
      assert.equal(await otrosLotesConFilas(tx, a.batchId), base + 1)
      assert.equal(await otrosLotesConFilas(tx, b.batchId), base + 1)

      // Un lote sin filas (como el que registra el seed sintético) no cuenta.
      await tx`insert into staging_import_batch (source_manifest_sha256, notes) values ('vacio', 'fixture sintética')`
      assert.equal(await otrosLotesConFilas(tx, b.batchId), base + 1)
    })
  })
})
