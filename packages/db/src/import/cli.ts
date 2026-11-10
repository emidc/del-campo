// T-0013 — un solo entrypoint para el importador. Cada comando es un paso separado y
// deliberadamente secuencial: `run` no arranca si `verify-manifest` no corrió antes con
// éxito en la misma invocación humana (el operador lo hace a mano, paso a paso — ver
// TASKS/T-0013-importador-una-pasada-desde-zoho.md, Verification).
//
// Toda la salida de este CLI es agregada: conteos, nombres de archivo, `failure_class`.
// Nunca una fila de staging ni un valor de columna del lote. → D-0053

import { readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

import { importarCatalogoAseguradoras, RUTA_CATALOGO_APROBADO } from './catalog.ts'
import { conectar } from './db.ts'
import { leerLote, LoteInvalido, rutaDelPerfil } from './lote.ts'
import type { Lote } from './lote.ts'
import { cargarLoteEnStaging, loteRegistrado, otrosLotesConFilas } from './lote-staging.ts'
import { importarContactos, importarCuentas, importarMembresias } from './parties.ts'
import { importarEndosos, importarPolizas, importarRenovaciones } from './policies.ts'
import { generarReporte } from './report.ts'
import { calcularFingerprint, compararFingerprints } from './verify-idempotency.ts'
import type { FingerprintPorTabla } from './verify-idempotency.ts'
import { parsearManifiesto, verificarLote } from './verify-manifest.ts'

const RAIZ = resolve(import.meta.dirname, '..', '..', '..', '..')

const morir = (mensaje: string): never => {
  process.stderr.write(`✗ ${mensaje}\n`)
  process.exit(1)
}

// T-0037 (H5): el lote es un argumento. Qué contiene lo declara su `lote.json`
// (docs/migration/zoho/lote-manifiesto.md); importar otro export no edita este archivo.
const lote = (): Lote => {
  const ruta = process.argv[3]
  if (ruta === undefined || ruta === '') {
    return morir(`uso: node packages/db/src/import/cli.ts ${process.argv[2] ?? '<comando>'} <ruta-del-lote>`)
  }
  try {
    return leerLote(resolve(ruta))
  } catch (error) {
    if (error instanceof LoteInvalido) return morir(`lote inválido: ${error.message}`)
    throw error
  }
}

/** El lote de staging que corresponde al export indicado. Lo crea `load-staging`. */
const batchDelLote = async (sql: ReturnType<typeof conectar>, elLote: Lote): Promise<string> => {
  const batchId = await loteRegistrado(sql, elLote)
  return batchId ?? morir('ese lote no está en staging; correr load-staging primero')
}

/**
 * `load-parties` y `load-policies` escriben en el dominio. En I1 un lote posterior sólo
 * se carga a staging: aplicarlo al dominio es I2 y espera la elección del owner entre
 * versión nueva o corrección (`T-0037-refresco.md` §3). Hallazgo A1 de la revisión R-33.
 */
const batchUnicoParaDominio = async (sql: ReturnType<typeof conectar>, elLote: Lote): Promise<string> => {
  const batchId = await batchDelLote(sql, elLote)
  const otros = await otrosLotesConFilas(sql, batchId)
  if (otros > 0) {
    morir(
      `staging tiene ${String(otros)} lote(s) más con filas. Mientras no exista I2 (T-0037), ` +
        'el dominio sólo se escribe desde un único lote: un lote nuevo se carga a staging y nada más.',
    )
  }
  return batchId
}

const verificarManifiesto = async (): Promise<void> => {
  const elLote = lote()
  const manifiesto = parsearManifiesto(readFileSync(rutaDelPerfil(elLote), 'utf8'))

  let total = 0
  let mismatches = 0
  for await (const resultado of verificarLote(manifiesto, elLote.raiz)) {
    total += 1
    if (!resultado.coincide) {
      mismatches += 1
      process.stderr.write(`✗ MISMATCH ${resultado.archivo}\n`)
    }
  }

  if (mismatches > 0) {
    morir(
      `${String(mismatches)} de ${String(total)} archivo(s) no coinciden con el manifiesto. ` +
        'No se continúa: el lote no es el declarado por su perfil.',
    )
  }

  process.stdout.write(`✓ manifiesto verificado: ${String(total)} archivo(s), 0 mismatches\n`)
}

const cargarStaging = async (): Promise<void> => {
  const elLote = lote()
  const sql = conectar()
  try {
    const resultado = await sql.begin((tx) => cargarLoteEnStaging(tx, elLote, 'load-staging'))
    const fechas = Object.entries(elLote.modulos)
      .map(([modulo, declarado]) => `${modulo} ${declarado.exportadoEl}`)
      .join(', ')
    process.stdout.write(
      `✓ staging cargado (batch ${resultado.batchId}, ${resultado.nuevo ? 'lote nuevo' : 'mismo lote, recargado'}): ` +
        `${String(resultado.filas.polizas)} Polizas, ${String(resultado.filas.endosos)} Endosos, ` +
        `${String(resultado.filas.contactos)} Contactos, ${String(resultado.filas.cuentas)} Cuentas\n` +
        `  exportados: ${fechas}\n`,
    )
  } catch (error) {
    if (error instanceof LoteInvalido) morir(`lote inválido: ${error.message}`)
    throw error
  } finally {
    await sql.end()
  }
}

const importarCatalogo = async (): Promise<void> => {
  const sql = conectar()
  try {
    const mapa = await importarCatalogoAseguradoras(sql, RUTA_CATALOGO_APROBADO(RAIZ))
    const filas = await sql<{ n: number }[]>`select count(*)::int as n from insurer`
    const n = filas[0]?.n ?? 0
    process.stdout.write(`✓ catálogo de aseguradoras: ${String(mapa.size)} source_id mapeados, ${String(n)} Insurer en base\n`)
  } finally {
    await sql.end()
  }
}

const importarParties = async (): Promise<void> => {
  const elLote = lote()
  const sql = conectar()
  try {
    const batchId = await batchUnicoParaDominio(sql, elLote)
    const contactos = await importarContactos(sql, batchId)
    const cuentas = await importarCuentas(sql, batchId)
    const membresias = await importarMembresias(sql, batchId)
    process.stdout.write(
      `✓ parties: ${String(contactos)} Contactos, ${String(cuentas)} Cuentas, ${String(membresias)} membresías\n`,
    )
  } finally {
    await sql.end()
  }
}

const importarPoliciesYRenovaciones = async (): Promise<void> => {
  const elLote = lote()
  const sql = conectar()
  try {
    const batch = { id: await batchUnicoParaDominio(sql, elLote) }

    const mapaAseguradoras = await importarCatalogoAseguradoras(sql, RUTA_CATALOGO_APROBADO(RAIZ))
    const resultadoPolizas = await importarPolizas(sql, batch.id, mapaAseguradoras)
    const resultadoEndosos = await importarEndosos(sql, batch.id)
    const resultadoRenovaciones = await importarRenovaciones(sql, batch.id)

    // El contador de `importarPolizas` es un acumulador de loop; este conteo es una
    // query independiente contra la base. Divergen exactamente en el escenario que la
    // revisión ciega de R-33 encontró (un `on conflict do update` que fusionaba filas
    // sin que el loop se enterara): compararlos acá es la red que evita que ese tipo de
    // bug vuelva a pasar inadvertido detrás de un número que "parece" razonable.
    const filasPolicyVersion = await sql<{ n: number }[]>`
      select count(*)::int as n from policy_version where source_event_type = 'Polizas'
    `
    const conteoPolicyVersion = filasPolicyVersion[0]?.n ?? -1
    if (conteoPolicyVersion !== resultadoPolizas.importadas) {
      morir(
        `discrepancia entre el conteo de importarPolizas (${String(resultadoPolizas.importadas)}) y ` +
          `policy_version real (${String(conteoPolicyVersion)}). No se continúa: el contador del loop y ` +
          'el estado de la base dejaron de coincidir.',
      )
    }

    process.stdout.write(
      `✓ policies: ${String(resultadoPolizas.enScope)} en scope, ${String(resultadoPolizas.importadas)} importadas\n` +
        `  excepciones: ${JSON.stringify(resultadoPolizas.excepciones)}\n` +
        `✓ endosos: ${String(resultadoEndosos.importados)} importados, ${String(resultadoEndosos.sinPolicyPadre)} sin Policy padre\n` +
        `✓ renovaciones: ${String(resultadoRenovaciones.resueltas)} resueltas, ${String(resultadoRenovaciones.unresolved)} unresolved\n`,
    )
  } finally {
    await sql.end()
  }
}

// Fuera del repositorio a propósito: es un archivo de trabajo entre dos invocaciones del
// CLI (`snapshot-fingerprint` y `verify-idempotency`), no evidencia versionada. Lo que
// se versiona es el resultado de la comparación en `ops/evidence/T-0013.md`.
const RUTA_FINGERPRINT =
  process.env.T0013_FINGERPRINT_PATH ?? join(tmpdir(), 't0013-fingerprint.json')

const guardarFingerprint = async (): Promise<void> => {
  const sql = conectar()
  try {
    const fingerprint = await calcularFingerprint(sql)
    writeFileSync(RUTA_FINGERPRINT, JSON.stringify(fingerprint, null, 2))
    const totalFilas = Object.values(fingerprint).reduce((acc, f) => acc + f.filas, 0)
    process.stdout.write(`✓ fingerprint guardado (${String(totalFilas)} filas de dominio en total)\n`)
  } finally {
    await sql.end()
  }
}

const compararFingerprint = async (): Promise<void> => {
  const antes = JSON.parse(readFileSync(RUTA_FINGERPRINT, 'utf8')) as FingerprintPorTabla
  const sql = conectar()
  try {
    const despues = await calcularFingerprint(sql)
    const diferencias = compararFingerprints(antes, despues)
    if (diferencias.length > 0) {
      for (const diferencia of diferencias) {
        process.stderr.write(
          `✗ ${diferencia.tabla}: antes ${String(diferencia.antes.filas)} filas/${diferencia.antes.hash.slice(0, 8)}, ` +
            `después ${String(diferencia.despues.filas)} filas/${diferencia.despues.hash.slice(0, 8)}\n`,
        )
      }
      morir(`${String(diferencias.length)} tabla(s) de dominio cambiaron entre corridas: no es idempotente.`)
    }
    process.stdout.write(`✓ idempotencia confirmada: ${String(Object.keys(despues).length)} tablas de dominio, mismo estado\n`)
  } finally {
    await sql.end()
  }
}

const comando = process.argv[2]

switch (comando) {
  case 'verify-manifest':
    await verificarManifiesto()
    break
  case 'load-staging':
    await cargarStaging()
    break
  case 'load-catalog':
    await importarCatalogo()
    break
  case 'load-parties':
    await importarParties()
    break
  case 'load-policies':
    await importarPoliciesYRenovaciones()
    break
  case 'report':
    await (async () => {
      const elLote = lote()
      const sql = conectar()
      try {
        const batchId = await batchDelLote(sql, elLote)
        process.stdout.write(`${JSON.stringify(await generarReporte(sql, batchId), null, 2)}\n`)
      } finally {
        await sql.end()
      }
    })()
    break
  case 'snapshot-fingerprint':
    await guardarFingerprint()
    break
  case 'verify-idempotency':
    await compararFingerprint()
    break
  default:
    morir(
      `comando desconocido: "${comando ?? ''}". Se espera verify-manifest, load-staging, load-catalog, load-parties, load-policies, snapshot-fingerprint, verify-idempotency o report.`,
    )
}
