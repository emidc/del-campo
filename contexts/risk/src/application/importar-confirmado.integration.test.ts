// La importación con transacciones confirmadas de verdad (T-0029; RO01 §6, A3 y A4): reimportar
// lo que quedó escrito, una falla inyectada en la base a mitad de la escritura, una conexión
// cortada y la línea de comandos. El esquema es sólo de inserción, así que estos tests lo
// rehacen (db:down y migrate) antes de cada caso y al terminar, y la base queda vacía y
// migrada como la encontraron.

import assert from 'node:assert/strict'
import { spawn, spawnSync } from 'node:child_process'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { after, before, beforeEach, describe, it } from 'node:test'

import type { Resultado } from '../domain/informe.ts'
import type { Sql } from '../persistence/database.ts'
import { contarFilas } from '../persistence/importacion.ts'
import { down, migrate } from '../persistence/migrations.ts'
import { openTestDatabase, testDatabaseUrl } from '../persistence/testing.ts'
import { ARCHIVOS, aLote, casoInvalido, FECHA_CORTE, filasBase, filasDe, INVALIDOS, leerCarpeta, SINTETICOS, type Lote } from '../testing/lotes.ts'
import { importarLote, leerContrato } from './importar.ts'

const contrato = leerContrato()
const CLI = fileURLToPath(new URL('./cli-importar.ts', import.meta.url))
let sql: Sql

const rehacer = async (): Promise<void> => {
  while ((await down(sql)) !== null) {
    // revierte todas las migraciones del contexto
  }
  await migrate(sql)
}

before(async () => {
  sql = await openTestDatabase()
})
beforeEach(rehacer)
after(async () => {
  await rehacer()
  await sql.end()
})

const importar = (db: Sql, lote: Lote): Promise<Resultado> =>
  importarLote(db, contrato, lote, { origen: 'test', importadoPor: 'test T-0029', fechaCorte: FECHA_CORTE })

const conFilas = async (db: Sql = sql): Promise<[string, number][]> => Object.entries(await contarFilas(db)).filter(([, n]) => n > 0)

const base = (): Lote => leerCarpeta(new URL('base/', INVALIDOS))

describe('A3: reimportación de un lote confirmado', () => {
  it('la segunda vez responde ya_importado sin escribir, y un lote distinto con los mismos ids es RV-ID-02', async () => {
    const primera = await importar(sql, base())
    assert.equal(primera.estado, 'importado')
    const despues = await contarFilas(sql)

    const segunda = await importar(sql, base())
    assert.equal(segunda.estado, 'ya_importado')
    assert.equal(segunda.registrado.id, primera.id)
    assert.deepEqual(await contarFilas(sql), despues)

    // Mismos ids, otro contenido (un título cambiado): otra huella, así que se valida, y los ids ya existen.
    const f = filasBase()
    const r0 = f['risks.csv'][0]
    assert.ok(r0 !== undefined)
    r0.titulo = `${r0.titulo ?? ''} (otra versión)`
    const distinta = await importar(sql, aLote(contrato, f))
    assert.equal(distinta.estado, 'rechazado')
    assert.ok(distinta.hallazgos.some((h) => h.regla_id === 'RV-ID-02'))
    assert.deepEqual(await contarFilas(sql), despues)
  })
})

describe('A4: una falla a mitad de la escritura no deja nada', () => {
  it('la base rechaza el registro del lote, que es lo último que se escribe', async () => {
    await sql.unsafe(`
      create function public.t0029_falla() returns trigger language plpgsql as $$
      begin raise exception 'falla inyectada (T-0029)' using errcode = 'P0001'; end $$;
      create trigger t0029_falla before insert on risk.lote_importacion for each row execute function public.t0029_falla();`)
    try {
      const r = await importar(sql, leerCarpeta(SINTETICOS))
      assert.equal(r.estado, 'falla_escritura')
      assert.equal(r.falla.codigo, 'P0001')
      assert.match(r.falla.mensaje, /falla inyectada/)
      assert.deepEqual(await conFilas(), [])
    } finally {
      await sql.unsafe(`drop trigger if exists t0029_falla on risk.lote_importacion; drop function if exists public.t0029_falla();`)
    }
    // Sin la falla, el mismo lote entra: no quedó ninguna huella a medias.
    assert.equal((await importar(sql, leerCarpeta(SINTETICOS))).estado, 'importado')
  })

  it('la conexión se corta mientras se escribe la última tabla de filas', async () => {
    // La escritura de revision_humana se queda esperando y, mientras tanto, otra conexión termina
    // la de la importación: lo mismo que un corte de red visto desde la base. La importación corre
    // en su propio proceso (la línea de comandos): postgres.js 3.4.9, cuando la conexión de un
    // `begin` se corta, rechaza la consulta y además lanza un TypeError no capturado al intentar
    // el rollback, que tira el proceso. Lo que importa es la base, y eso es lo que se mira.
    await sql.unsafe(`
      create function public.t0029_espera() returns trigger language plpgsql as $$
      begin perform pg_sleep(30); return new; end $$;
      create trigger t0029_espera before insert on risk.revision_humana for each row execute function public.t0029_espera();`)
    try {
      const hijo = spawn(process.execPath, [CLI, fileURLToPath(SINTETICOS), '--corte', FECHA_CORTE, '--sin-valores'], {
        env: { ...process.env, RISK_DATABASE_URL: testDatabaseUrl() },
        stdio: 'pipe',
      })
      const salida = new Promise<number | null>((ok) => hijo.on('close', ok))
      let cortadas = 0
      for (let i = 0; i < 300 && cortadas === 0; i++) {
        const [r] = await sql<{ n: number }[]>`
          select count(pg_terminate_backend(pid))::int as n from pg_stat_activity
          where datname = current_database() and pid <> pg_backend_pid() and wait_event = 'PgSleep'`
        cortadas = r?.n ?? 0
        if (cortadas === 0) await new Promise((ok) => setTimeout(ok, 50))
      }
      assert.equal(cortadas, 1, 'la importación llegó a revision_humana y se cortó')
      assert.notEqual(await salida, 0)
      assert.deepEqual(await conFilas(), [])
    } finally {
      await sql.unsafe(`drop trigger if exists t0029_espera on risk.revision_humana; drop function if exists public.t0029_espera();`)
    }
    assert.equal((await importar(sql, leerCarpeta(SINTETICOS))).estado, 'importado')
  })
})

describe('línea de comandos', () => {
  const correr = (carpeta: string, ...args: string[]): { status: number | null; stdout: string; stderr: string } => {
    const r = spawnSync(process.execPath, [CLI, carpeta, ...args], {
      env: { ...process.env, RISK_DATABASE_URL: testDatabaseUrl() },
      encoding: 'utf8',
    })
    return { status: r.status, stdout: r.stdout, stderr: r.stderr }
  }

  it('importa las sintéticas, después responde ya importado, y sin valores no muestra ninguna celda', async () => {
    const primera = correr(fileURLToPath(SINTETICOS), '--corte', FECHA_CORTE, '--sin-valores')
    assert.equal(primera.status, 0, primera.stderr)
    assert.match(primera.stdout, /^importado$/m)
    assert.match(primera.stdout, /^0 rechazos, 103 avisos$/m)
    const despues = await contarFilas(sql)

    // Ningún título, observación ni monto de las sintéticas aparece en el informe sin valores.
    const f = filasDe(leerCarpeta(SINTETICOS))
    const celdas = new Set<string>()
    for (const filas of Object.values(f)) {
      for (const fila of filas) {
        for (const [c, v] of Object.entries(fila)) {
          if (v !== '' && (c === 'titulo' || c.endsWith('_observacion') || c.includes('monto'))) celdas.add(v)
        }
      }
    }
    assert.ok(celdas.size > 50)
    for (const v of celdas) {
      // Un monto corto puede coincidir con un conteo del informe; los textos y los montos de más de 3 cifras, no.
      if (/^\d{1,3}$/.test(v)) continue
      assert.ok(!primera.stdout.includes(v), `el informe sin valores muestra «${v}»`)
    }

    const segunda = correr(fileURLToPath(SINTETICOS), '--corte', FECHA_CORTE, '--sin-valores')
    assert.equal(segunda.status, 0, segunda.stderr)
    assert.match(segunda.stdout, /^ya importado/m)
    assert.deepEqual(await contarFilas(sql), despues)
  })

  it('un caso inválido (RV-EVA-07, historia ramificada) sale con 1, informa su error y deja la base vacía', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'risk-t0029-'))
    try {
      const lote = casoInvalido('RV-EVA-07')
      for (const a of ARCHIVOS) writeFileSync(join(dir, a), lote[a])
      const r = correr(dir, '--corte', FECHA_CORTE)
      assert.equal(r.status, 1, r.stderr)
      assert.match(r.stdout, /^rechazado/m)
      assert.match(r.stdout, /^1 rechazos, /m)
      assert.match(r.stdout, /rechazo RV-EVA-07 risks\.csv:9 .*la historia tiene que ser lineal/)
      assert.deepEqual(await conFilas(), [])
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })

  it('una carpeta sin los tres archivos no es un lote: sale con 2 y no toca la base', async () => {
    const r = correr(fileURLToPath(new URL('RV-EVA-07/', INVALIDOS)))
    assert.equal(r.status, 2)
    assert.match(r.stderr, /falta action-plan\.csv, risk-transfer\.csv/)
    assert.deepEqual(await conFilas(), [])
  })
})
